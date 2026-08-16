"""
faster-whisper provider client — local audio transcription and translation.

Called only by app.ai.gemini_client (the single AI gateway). This module is a leaf: it
imports neither the gateway nor ollama_client, and never touches the database.

Why translation happens here rather than via the local LLM: Whisper has a native
translate head trained on exactly this task, so `task="translate"` beats round-tripping
through qwen2.5:3b — and it keeps ASR working when the Ollama server is down.

Output contract (must match what Gemini produces, because ingestion_service parses it):
  - English audio  -> the bare transcript, no separator.
  - Other language -> "ORIGINAL TEXT:\\n{native}\\n\\nEnglish translation:\\n{english}",
    which ingestion_service splits on its first separator, "English translation:\\n".
  Either way _detect_language_from_text sees the native script and reports hi/gu/en.

transcribe_bytes() returns None for every "let Gemini handle it" condition and never
raises, mirroring how video_service._get_video_duration degrades on a missing ffprobe.
"""
import io
import logging
import threading
from pathlib import Path
from typing import Any

from app.config import settings

logger = logging.getLogger("crime_os.ai.whisper")

# Explicit allowlist rather than mime.startswith("audio/"). ingestion_service already uses
# the loose prefix test for its own branching; duplicating it here would mean any future
# MIME_MAP addition silently changes AI routing. An allowlist forces a visible edit.
# Aliases are included because a browser's File.type can differ from a suffix lookup.
_WHISPER_MIME_TYPES: frozenset[str] = frozenset(
    {
        "audio/mp3",
        "audio/mpeg",
        "audio/wav",
        "audio/x-wav",
        "audio/wave",
        "audio/mp4",
        "audio/m4a",
        "audio/x-m4a",
        "audio/webm",
        "audio/ogg",
        "audio/flac",
    }
)

_model: Any | None = None
_load_lock = threading.Lock()
# Serialize inference. CTranslate2 is thread-safe, so this is a latency fix, not a
# correctness one: two concurrent medium-model transcriptions contend for the same cores,
# and running them serially finishes the first in half the time and the second no later.
_infer_lock = threading.Lock()
# Sticky: a failed load costs seconds and will not fix itself mid-process.
_load_failed = False
# os.add_dll_directory returns a handle that REMOVES the directory when garbage-collected,
# so these must be kept alive for the process lifetime.
_dll_handles: list[Any] = []
_dll_registered = False
# Set once CUDA has been proven unusable at inference time, so we stop retrying it.
_cuda_disabled = False


def model_label() -> str:
    """Canonical provenance label for the local ASR model."""
    return f"whisper:{Path(settings.WHISPER_MODEL_DIR).name}"


def handles_mime(mime_type: str) -> bool:
    """True when this mime is an audio container Whisper can decode.

    Deliberately excludes application/octet-stream: ingestion_service falls back to it for
    unrecognised extensions, and guessing wrong would send a PDF to an ASR model.
    """
    return mime_type.lower().split(";")[0].strip() in _WHISPER_MIME_TYPES


def is_available() -> bool:
    """Cheap eligibility check — no import, no model load, never raises."""
    if not settings.WHISPER_ENABLED or _load_failed:
        return False
    try:
        return Path(settings.WHISPER_MODEL_DIR).is_dir()
    except OSError:
        return False


def _register_cuda_dlls() -> None:
    """Put cuBLAS/cuDNN from the nvidia-*-cu12 wheels where CTranslate2 can find them.

    Those wheels install DLLs under site-packages/nvidia/*/bin, which is on no search path.
    CTranslate2 resolves them from inside its C++ extension via LoadLibrary, which searches
    PATH and ignores os.add_dll_directory — so PATH is what has to change. Verified: without
    this, CUDA loads and then fails at inference with "cublas64_12.dll is not found".

    This writes to os.environ["PATH"] only, never reads app configuration from the
    environment — settings still come exclusively from config.py.
    """
    global _dll_registered
    if _dll_registered:
        return
    try:
        import os

        import nvidia  # type: ignore[import-not-found]

        dll_dirs = [str(path) for root in nvidia.__path__ for path in Path(root).glob("*/bin")]
        if not dll_dirs:
            return
        os.environ["PATH"] = os.pathsep.join(dll_dirs) + os.pathsep + os.environ.get("PATH", "")
        # Also register for any pure-Python ctypes loads that do respect DLL directories.
        for dll_dir in dll_dirs:
            _dll_handles.append(os.add_dll_directory(dll_dir))
        _dll_registered = True
        logger.info("whisper_cuda_dlls_registered dirs=%d", len(dll_dirs))
    except Exception as exc:
        logger.debug("whisper_cuda_dll_registration_skipped error=%s", type(exc).__name__)


def _load_model() -> Any:
    """Build a WhisperModel, falling back from CUDA to CPU when CUDA libraries are missing."""
    # Imported here, not at module scope: a top-level import would break the project's
    # `python -c "import app.main"` verification gate on any machine without faster-whisper.
    from faster_whisper import WhisperModel

    device = settings.WHISPER_DEVICE
    compute_type = settings.WHISPER_COMPUTE_TYPE
    if device == "cuda" and _cuda_disabled:
        logger.info("whisper_cuda_disabled using cpu/int8 after an earlier inference failure")
        device, compute_type = "cpu", "int8"
    if device == "cuda":
        _register_cuda_dlls()

    try:
        return WhisperModel(settings.WHISPER_MODEL_DIR, device=device, compute_type=compute_type)
    except Exception as exc:
        if device == "cpu":
            raise
        # get_cuda_device_count() reports the driver and says nothing about whether
        # cuBLAS/cuDNN are loadable, so CUDA can only be validated by trying it.
        logger.warning("whisper_cuda_unavailable falling back to cpu/int8 error=%s", exc)
        return WhisperModel(settings.WHISPER_MODEL_DIR, device="cpu", compute_type="int8")


def _get_model() -> Any:
    """Double-checked lazy singleton. Sets the sticky failure flag and re-raises on error."""
    global _model, _load_failed
    if _model is not None:
        return _model
    with _load_lock:
        if _model is not None:
            return _model
        try:
            _model = _load_model()
        except Exception as exc:
            _load_failed = True
            logger.error("whisper_load_failed dir=%s error=%s", settings.WHISPER_MODEL_DIR, exc)
            raise
        logger.info(
            "whisper_loaded dir=%s device=%s compute=%s",
            settings.WHISPER_MODEL_DIR,
            settings.WHISPER_DEVICE,
            settings.WHISPER_COMPUTE_TYPE,
        )
        return _model


def _escalate_languages() -> set[str]:
    return {part.strip().lower() for part in settings.WHISPER_ESCALATE_LANGUAGES.split(",") if part.strip()}


def _is_cuda_library_error(exc: Exception) -> bool:
    """True when a failure looks like a missing CUDA library rather than a bad audio file."""
    message = str(exc).lower()
    return "cannot be loaded" in message or "cublas" in message or "cudnn" in message


def _disable_cuda() -> None:
    """Drop the CUDA model and force CPU for the rest of the process."""
    global _model, _cuda_disabled
    with _load_lock:
        _cuda_disabled = True
        _model = None


def _run(model: Any, audio: Any, *, task: str, language: str | None) -> tuple[Any, Any]:
    """One transcription pass. `segments` is a lazy generator; `info` is populated eagerly."""
    return model.transcribe(
        audio,
        task=task,
        language=language,
        beam_size=settings.WHISPER_BEAM_SIZE,
        # Police audio contains dead air, and Whisper's signature failure on silence is a
        # repeated-phrase loop. VAD trims it; disabling previous-text conditioning stops a
        # loop that does start from feeding itself.
        vad_filter=settings.WHISPER_VAD_FILTER,
        vad_parameters={"min_silence_duration_ms": 500},
        condition_on_previous_text=False,
    )


def transcribe_bytes(content: bytes, *, mime_type: str) -> str | None:
    """Transcribe audio locally, translating to English when it is not already English.

    Returns None to mean "escalate to Gemini" — unavailable, unsupported mime, a language
    Whisper handles too poorly, an empty transcript, or any unexpected error.
    """
    if not is_available() or not handles_mime(mime_type):
        return None

    try:
        model = _get_model()
    except Exception:
        return None  # already logged; the sticky flag stops us retrying

    try:
        from faster_whisper.audio import decode_audio

        # Decode once into an array both passes can reuse. Handing BytesIO to a second
        # pass without seek(0) is the classic consumed-stream bug.
        audio = decode_audio(io.BytesIO(content), sampling_rate=16000)

        with _infer_lock:
            segments, info = _run(model, audio, task="transcribe", language=None)
            language = (info.language or "").lower()

            # Language ID completes before any segment is decoded, so bailing here is
            # nearly free — we skip the expensive part entirely.
            if language in _escalate_languages():
                logger.info(
                    "whisper_escalate_language language=%s prob=%.2f — deferring to Gemini",
                    language,
                    info.language_probability or 0.0,
                )
                return None

            native = "".join(segment.text for segment in segments).strip()
            if not native:
                # VAD can filter everything out. Returning "" would make
                # extraction_service silently bail, so escalate instead.
                logger.warning("whisper_empty_transcript language=%s mime=%s", language, mime_type)
                return None

            if language == "en":
                logger.info("whisper_transcribed language=en chars=%d", len(native))
                return native

            translated_segments, _ = _run(model, audio, task="translate", language=language)
            english = "".join(segment.text for segment in translated_segments).strip()

        if not english:
            logger.warning("whisper_empty_translation language=%s — deferring to Gemini", language)
            return None

        logger.info(
            "whisper_transcribed language=%s native_chars=%d english_chars=%d",
            language,
            len(native),
            len(english),
        )
        # Exactly the layout INGESTION_TRANSCRIPTION_PROMPT specifies and
        # ingestion_service splits on. Do not reformat without checking that parser.
        return f"ORIGINAL TEXT:\n{native}\n\nEnglish translation:\n{english}"

    except Exception as exc:
        # CUDA can load successfully and only fail once inference touches cuBLAS/cuDNN, so
        # the load-time fallback above cannot catch every case. Without this, a bad CUDA
        # setup would silently defer every complaint to Gemini for the process lifetime.
        if _is_cuda_library_error(exc) and not _cuda_disabled:
            logger.warning("whisper_cuda_inference_failed switching to cpu/int8 error=%s", exc)
            _disable_cuda()
            return transcribe_bytes(content, mime_type=mime_type)
        logger.warning("whisper_transcribe_failed mime=%s error=%s", mime_type, exc)
        return None
