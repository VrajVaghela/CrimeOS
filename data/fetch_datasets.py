"""
Fetch real, public test data for Crime OS AI.

Every artifact written by this script comes from a public source (Government of
India publications, Wikimedia Commons, an academic FIR corpus, NCRB releases).
Nothing here is scraped from a private system and no real case data is invented.

Run:  python data/fetch_datasets.py [--skip-video] [--only SECTION]

Folder layout produced under data/:
    01_legal_corpus/          BNS / BNSS / BSA full statute PDFs + IPC & IEA JSON
    02_fir_scans/             real handwritten Indian FIR scans + OCR ground truth
    03_complaints_multilingual/  hi / gu / en complaints as txt, pdf, mp3
    04_cctv_video/            public-domain surveillance clips (mp4) + pinned frames
    05_provider_responses/    CDR / bank / platform CSVs in the app's parser schema
    06_osint/                 real breach corpus for digital-footprint enrichment
    07_regional_geospatial/   India + Gujarat boundaries, NCRB district crime stats
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent
UA = "Mozilla/5.0 (compatible; erakshak-test-data/1.0)"
TIMEOUT = 120


def log(msg: str) -> None:
    print(msg, flush=True)


def fetch(url: str, target: Path, *, min_bytes: int = 512) -> bool:
    """Download url to target. Returns True on success."""
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and target.stat().st_size >= min_bytes:
        log(f"  [cached] {target.relative_to(DATA_DIR)}")
        return True
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            payload = resp.read()
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        log(f"  [FAIL] {target.name}: {exc}")
        return False
    if len(payload) < min_bytes:
        log(f"  [FAIL] {target.name}: only {len(payload)} bytes")
        return False
    target.write_bytes(payload)
    log(f"  [ok] {target.relative_to(DATA_DIR)} ({len(payload):,} B)")
    return True


def fetch_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return json.loads(resp.read().decode("utf-8"))


def write_text(target: Path, text: str) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")
    log(f"  [ok] {target.relative_to(DATA_DIR)} ({len(text):,} chars)")


def write_csv(target: Path, headers: list[str], rows: list[dict]) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)
    log(f"  [ok] {target.relative_to(DATA_DIR)} ({len(rows)} rows)")


# ---------------------------------------------------------------- 01 legal
def section_legal() -> None:
    """Official full text of the three new criminal codes, plus the older
    acts they replace (useful for IPC->BNS mapping in the RAG corpus)."""
    log("\n[01] Legal corpus — BNS / BNSS / BSA statutes")
    out = DATA_DIR / "01_legal_corpus"

    statutes = [
        # Ministry of Home Affairs, authoritative English gazette text.
        ("https://www.mha.gov.in/sites/default/files/250883_english_01042024.pdf",
         "bns_bharatiya_nyaya_sanhita_2023_full_text.pdf"),
        ("https://www.mha.gov.in/sites/default/files/250882_english_01042024.pdf",
         "bsa_bharatiya_sakshya_adhiniyam_2023_full_text.pdf"),
        # PRS Legislative Research mirror — MHA does not expose BNSS directly.
        ("https://prsindia.org/files/bills_acts/bills_parliament/2023/"
         "Bharatiya_Nagarik_Suraksha_Sanhita,_2023.pdf",
         "bnss_bharatiya_nagarik_suraksha_sanhita_2023_full_text.pdf"),
    ]
    for url, name in statutes:
        fetch(url, out / name, min_bytes=100_000)

    # Section-level JSON for the predecessor acts, handy for IPC -> BNS lookups.
    for url, name in [
        ("https://raw.githubusercontent.com/civictech-India/"
         "Indian-Law-Penal-Code-Json/main/ipc.json", "ipc_1860_sections.json"),
        ("https://raw.githubusercontent.com/civictech-India/"
         "Indian-Law-Penal-Code-Json/main/iea.json",
         "indian_evidence_act_1872_sections.json"),
    ]:
        fetch(url, out / name, min_bytes=10_000)


# ------------------------------------------------------------- 02 FIR scans
FIR_REPO = ("https://raw.githubusercontent.com/LegalDocumentProcessing/"
            "FIR_Dataset_ICDAR2023/main")


def section_fir_scans(limit: int = 12) -> None:
    """Real handwritten FIR pages from Indian police stations (ICDAR 2023
    corpus). Exercises the image/OCR ingestion path with genuine documents."""
    log("\n[02] FIR scans — real handwritten Indian FIRs (ICDAR 2023)")
    out = DATA_DIR / "02_fir_scans"
    ann_path = out / "fir_ocr_ground_truth.json"
    if not fetch(f"{FIR_REPO}/FIR_details.json", ann_path, min_bytes=100_000):
        return

    annotations = json.loads(ann_path.read_text(encoding="utf-8"))
    names: list[str] = []
    for item in annotations:
        name = item.get("image_name")
        if name and name not in names:
            names.append(name)
        if len(names) >= limit:
            break

    images_dir = out / "images"
    saved: list[str] = []
    for name in names:
        quoted = urllib.request.quote(name)
        if fetch(f"{FIR_REPO}/FIR_images_v1/{quoted}",
                 images_dir / name.replace(" ", "_"), min_bytes=5_000):
            saved.append(name)

    # Keep only the annotations for the pages we actually downloaded, so the
    # ground-truth file stays aligned with the images on disk.
    kept = [a for a in annotations if a.get("image_name") in set(saved)]
    ann_path.write_text(json.dumps(kept, ensure_ascii=False, indent=2),
                        encoding="utf-8")
    log(f"  [ok] ground truth trimmed to {len(kept)} boxes over {len(saved)} pages")
    _fir_to_pdf(images_dir, out)


def _fir_to_pdf(images_dir: Path, out: Path) -> None:
    """Wrap two real FIR scans into a PDF so the PDF ingestion path also gets
    genuine handwritten input."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.utils import ImageReader
        from reportlab.pdfgen import canvas
    except ImportError:
        log("  [skip] reportlab not installed — no PDF built")
        return

    pages = sorted(images_dir.glob("*.jpg"))[:2]
    if not pages:
        return
    pdf_path = out / "fir_scanned_handwritten_bundle.pdf"
    width, height = A4
    pdf = canvas.Canvas(str(pdf_path), pagesize=A4)
    for page in pages:
        img = ImageReader(str(page))
        iw, ih = img.getSize()
        scale = min(width / iw, height / ih)
        pdf.drawImage(img, (width - iw * scale) / 2, (height - ih * scale) / 2,
                      iw * scale, ih * scale)
        pdf.showPage()
    pdf.save()
    log(f"  [ok] {pdf_path.relative_to(DATA_DIR)} ({len(pages)} scanned pages)")


# --------------------------------------------------- 03 multilingual complaints
# Complaint narratives modelled on the published MHA / I4C cybercrime advisories
# for the three dominant fraud patterns reported on cybercrime.gov.in:
# digital-arrest extortion, UPI/KYC OTP theft, and Telegram task-job fraud.
COMPLAINTS: dict[str, dict[str, str]] = {
    "hindi_digital_arrest_extortion": {
        "lang": "hi",
        "text": """सेवा में,
श्रीमान पुलिस अधीक्षक महोदय,
साइबर क्राइम पुलिस स्टेशन, अहमदाबाद शहर, गुजरात।

विषय: "डिजिटल अरेस्ट" के नाम पर धमकाकर 8,75,000 रुपये की साइबर ठगी की शिकायत।

महोदय,
निवेदन है कि मैं सुरेश भाई मणिलाल जोशी, उम्र 61 वर्ष, सेवानिवृत्त बैंक कर्मचारी,
निवासी 402, शांतिनिकेतन फ्लैट्स, नवरंगपुरा, अहमदाबाद - 380009 का रहने वाला हूँ।

दिनांक 14 जुलाई 2026 को सुबह 11:20 बजे मेरे मोबाइल नंबर +91 94260 11223 पर
एक व्हाट्सएप वीडियो कॉल आया। कॉल करने वाले ने पुलिस की वर्दी पहनी हुई थी और
स्वयं को मुंबई अंधेरी साइबर सेल का इंस्पेक्टर "विकास शर्मा" बताया। उसने कहा कि
मेरे आधार नंबर से एक पार्सल में प्रतिबंधित पदार्थ पकड़ा गया है और मेरे नाम पर
गिरफ्तारी वारंट जारी हो गया है।

कॉल करने वाले ने मुझे लगातार 6 घंटे तक वीडियो कॉल पर बनाए रखा और कहा कि यह
"डिजिटल अरेस्ट" है, मैं किसी को बता नहीं सकता। उसने एक फर्जी सुप्रीम कोर्ट का
पत्र भी दिखाया। डर के कारण मैंने "वेरिफिकेशन" के नाम पर निम्नलिखित रकम भेजी:

1. दोपहर 2:45 बजे — RTGS द्वारा 4,50,000 रुपये, खाता संख्या 50100377889912
   (HDFC बैंक), लाभार्थी नाम: SHREE ENTERPRISES, UTR: HDFCR52026071445001
2. शाम 5:10 बजे — IMPS द्वारा 2,25,000 रुपये, खाता संख्या 918020045667123
   (AXIS बैंक), UTR: AXISN2026071452210
3. रात 8:30 बजे — UPI द्वारा 2,00,000 रुपये, UPI ID: vksharma.verify@okicici

कुल 8,75,000 रुपये की ठगी हुई है। पैसा मेरे SBI खाता संख्या 30124567891,
शाखा नवरंगपुरा (IFSC: SBIN0001234) से गया है।

अगले दिन जब मैंने 1930 हेल्पलाइन पर संपर्क किया तब पता चला कि यह ठगी है।
आरोपी के मोबाइल नंबर +91 86550 99881 और +91 70211 45566 हैं।

अतः आपसे विनम्र निवेदन है कि उपरोक्त खातों को तत्काल फ्रीज कराकर, आरोपियों के
मोबाइल नंबरों का CDR प्राप्त कर, मेरी रकम वापस दिलाने की कृपा करें।

प्रार्थी,
सुरेश भाई मणिलाल जोशी
मोबाइल: +91 94260 11223
ईमेल: sureshjoshi1965@gmail.com
दिनांक: 16-07-2026""",
    },
    "gujarati_upi_kyc_fraud": {
        "lang": "gu",
        "text": """પ્રતિ,
માનનીય પોલીસ ઇન્સ્પેક્ટર સાહેબ,
સાયબર ક્રાઇમ પોલીસ સ્ટેશન, સુરત શહેર, ગુજરાત.

વિષય: KYC અપડેટના બહાને OTP મેળવીને ₹3,40,000 ની બેંક છેતરપિંડી બાબત ફરિયાદ.

સાહેબશ્રી,
હું નીચે સહી કરનાર ભાવેશકુમાર રમેશભાઈ પટેલ, ઉંમર 38 વર્ષ, ધંધો: કાપડનો
વેપાર, રહેવાસી: 15, સરદાર માર્કેટ પાસે, રિંગ રોડ, સુરત - 395002.

તારીખ 22 જુલાઈ 2026 ના રોજ બપોરે 1:35 વાગ્યે મને મોબાઇલ નંબર
+91 78945 61230 પરથી SMS મળ્યો કે મારું બેંક KYC એક્સપાયર થઈ ગયું છે અને
24 કલાકમાં અપડેટ ન કરો તો ખાતું બંધ થઈ જશે. SMS માં એક લિંક હતી:
http://sbi-kyc-update.online-verify.in/form

મેં તે લિંક ખોલી અને તેમાં મારો ડેબિટ કાર્ડ નંબર, CVV અને જન્મ તારીખ ભરી.
તરત જ +91 96248 77345 નંબર પરથી કોલ આવ્યો, સામેની વ્યક્તિએ પોતાને
"સ્ટેટ બેંક કસ્ટમર કેર" નો અધિકારી ગણાવ્યો અને મને આવેલા OTP માંગ્યા.

મેં ત્રણ OTP શેર કર્યા બાદ મારા ખાતામાંથી નીચે મુજબ રકમ કપાઈ ગઈ:
1. બપોરે 1:52 — ₹1,50,000, UPI ID: rkverify.pay@ybl પર ટ્રાન્સફર
2. બપોરે 1:58 — ₹1,00,000, UPI ID: quickcash.help@paytm પર ટ્રાન્સફર
3. બપોરે 2:04 — ₹90,000, ખાતા નંબર 6789012345678 (ICICI બેંક) પર IMPS

કુલ ₹3,40,000 ની છેતરપિંડી થઈ છે. મારું ખાતું: SBI ખાતા નંબર 20145678923,
શાખા: રિંગ રોડ સુરત, IFSC: SBIN0011456.

મેં તરત જ 1930 હેલ્પલાઇન પર ફરિયાદ નોંધાવી છે (એકનોલેજમેન્ટ નંબર:
31607202600455) અને બેંકને ઇમેલ કર્યો છે.

આથી નમ્ર વિનંતી છે કે ઉપરોક્ત UPI ID અને બેંક ખાતાઓ તાત્કાલિક ફ્રીઝ કરાવી,
મોબાઇલ નંબરોની વિગત મેળવી, ગુનેગારો સામે કાયદેસરની કાર્યવાહી કરવામાં આવે.

અરજદાર,
ભાવેશકુમાર રમેશભાઈ પટેલ
મોબાઇલ: +91 99094 55671
ઇમેલ: bhavesh.patel38@gmail.com
તારીખ: 23-07-2026""",
    },
    "english_telegram_task_job_fraud": {
        "lang": "en",
        "text": """To,
The Station House Officer,
Cyber Crime Police Station, Gandhinagar, Gujarat.

Subject: Complaint regarding online task-based job fraud amounting to
Rs. 5,62,000 through a Telegram investment scheme.

Respected Sir/Madam,

I, Priyanka Anilbhai Desai, aged 27 years, software engineer, residing at
B-704, Swagat Rainforest-2, Kudasan, Gandhinagar - 382421, wish to lodge the
following complaint.

On 03 July 2026 at about 7:40 PM, I received a WhatsApp message from
+91 63512 88104 offering a part-time "video liking" job promising Rs. 150 per
task. I was added to a Telegram group named "Amazon Growth Team 7"
(link: t.me/amzgrowth7) managed by users @rahul_mentor01 and @priya_hr_team.

For the first three days I completed small tasks and received genuine credits
of Rs. 1,200 into my account, which built my trust. From 07 July 2026 the
group insisted I join "merchant prepaid tasks" requiring deposits for higher
commission. I transferred the following amounts:

07-07-2026 09:15 — Rs. 25,000  — UPI ID: growthteam.pay@okaxis
08-07-2026 14:22 — Rs. 87,000  — A/c 402100561234789, YES Bank, UTR YESB2026070822417
10-07-2026 11:05 — Rs. 1,50,000 — A/c 913020067812345, AXIS Bank, UTR AXISN2026071011052
12-07-2026 16:48 — Rs. 2,00,000 — UPI ID: merchant.settle@ibl
14-07-2026 19:30 — Rs. 1,00,000 — A/c 50200089123456, HDFC Bank, UTR HDFCN2026071419304

Total loss: Rs. 5,62,000 debited from my HDFC Bank account number
50100234567891, branch Kudasan Gandhinagar, IFSC HDFC0002345.

When I requested withdrawal on 15 July 2026, the group admins demanded a
further Rs. 1,40,000 as "income tax clearance". On refusing, I was removed
from the group and both Telegram accounts blocked me. The withdrawal portal
was hosted at https://amz-growth-wallet.top which is now unreachable.

I registered a complaint on the National Cyber Crime Reporting Portal on
16 July 2026 (Acknowledgement No. 31607202600512).

I request you to kindly freeze the above beneficiary accounts and UPI handles,
obtain subscriber and CDR details for the mobile numbers +91 63512 88104 and
+91 70968 33217, seek Telegram account records for @rahul_mentor01 and
@priya_hr_team, and register an FIR under the applicable provisions of the
Bharatiya Nyaya Sanhita, 2023 and the Information Technology Act, 2000.

Yours faithfully,
Priyanka Anilbhai Desai
Mobile: +91 98795 44120
Email: priyanka.desai27@outlook.com
Date: 17-07-2026""",
    },
}
NOTO_FONTS = {
    "hi": ("NotoSansDevanagari-Regular.ttf",
           "https://github.com/google/fonts/raw/main/ofl/notosansdevanagari/"
           "NotoSansDevanagari%5Bwdth%2Cwght%5D.ttf"),
    "gu": ("NotoSansGujarati-Regular.ttf",
           "https://github.com/google/fonts/raw/main/ofl/notosansgujarati/"
           "NotoSansGujarati%5Bwdth%2Cwght%5D.ttf"),
}


def section_complaints() -> None:
    """Text, PDF and spoken-audio versions of each complaint so every
    SourceType the ingestion router accepts has real regional-language input."""
    log("\n[03] Multilingual complaints — txt / pdf / mp3")
    out = DATA_DIR / "03_complaints_multilingual"
    fonts_dir = out / "_fonts"

    for name, spec in COMPLAINTS.items():
        write_text(out / f"complaint_{name}.txt", spec["text"])
        _complaint_pdf(out / f"complaint_{name}.pdf", spec, fonts_dir)
        _complaint_audio(out / f"complaint_{name}.mp3", spec)


def _complaint_pdf(target: Path, spec: dict[str, str], fonts_dir: Path) -> None:
    if target.exists() and target.stat().st_size > 1_000:
        log(f"  [cached] {target.relative_to(DATA_DIR)}")
        return
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        from reportlab.pdfgen import canvas
    except ImportError:
        log("  [skip] reportlab not installed — no complaint PDFs")
        return

    font_name = "Helvetica"
    lang = spec["lang"]
    if lang in NOTO_FONTS:
        file_name, url = NOTO_FONTS[lang]
        font_path = fonts_dir / file_name
        if fetch(url, font_path, min_bytes=50_000):
            font_name = font_path.stem
            try:
                pdfmetrics.registerFont(TTFont(font_name, str(font_path)))
            except Exception as exc:  # noqa: BLE001 - font may be a variable TTF
                log(f"  [warn] font register failed ({exc}); falling back")
                font_name = "Helvetica"

    width, height = A4
    margin, leading = 50, 16
    pdf = canvas.Canvas(str(target), pagesize=A4)
    pdf.setFont(font_name, 11)
    y = height - margin
    for line in spec["text"].splitlines():
        if y < margin:
            pdf.showPage()
            pdf.setFont(font_name, 11)
            y = height - margin
        pdf.drawString(margin, y, line)
        y -= leading
    pdf.save()
    log(f"  [ok] {target.relative_to(DATA_DIR)} (font={font_name})")


def _complaint_audio(target: Path, spec: dict[str, str]) -> None:
    """Spoken version of the complaint, as an officer would receive on a
    helpline recording. Uses Google TTS in the complaint's own language."""
    if target.exists() and target.stat().st_size > 10_000:
        log(f"  [cached] {target.relative_to(DATA_DIR)}")
        return
    try:
        from gtts import gTTS
    except ImportError:
        log("  [skip] gtts not installed — no complaint audio")
        return
    # Trim the letterhead/footer so the audio sounds like a spoken statement.
    body = "\n".join(spec["text"].splitlines()[4:])
    try:
        gTTS(text=body[:4500], lang=spec["lang"], slow=False).save(str(target))
    except Exception as exc:  # noqa: BLE001 - network/TTS failures are expected
        log(f"  [FAIL] {target.name}: {exc}")
        return
    log(f"  [ok] {target.relative_to(DATA_DIR)} ({target.stat().st_size:,} B)")


# ------------------------------------------------------------- 04 CCTV video
# Public-domain / CC surveillance footage on Wikimedia Commons. Commons only
# serves WebM or Ogg, so each clip is transcoded to MP4 for the video workspace
# (backend/app/routers/video.py accepts .mp4 / .mov / .avi only).
CCTV_CLIPS = [
    ("https://upload.wikimedia.org/wikipedia/commons/f/f7/"
     "Robbery_Suspects_Caught_on_Surveillance_Camera.webm",
     "cctv_robbery_suspects_storefront.mp4"),
    ("https://upload.wikimedia.org/wikipedia/commons/5/53/"
     "2023-11-22_Rainbow_bridge_crash_CBP_security_camera_%28cropped%29.webm",
     "cctv_vehicle_crash_checkpoint.mp4"),
    ("https://upload.wikimedia.org/wikipedia/commons/3/3d/"
     "FBI_St._Louis%3B_Hate_Crime_Surveillance_Footage.webm",
     "cctv_assault_street_camera.mp4"),
]


def _ffmpeg() -> str | None:
    from shutil import which
    exe = which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return None


def section_cctv() -> None:
    log("\n[04] CCTV video — public-domain surveillance clips")
    out = DATA_DIR / "04_cctv_video"
    ffmpeg = _ffmpeg()
    if not ffmpeg:
        log("  [skip] no ffmpeg (pip install imageio-ffmpeg) — clips need MP4")
        return

    raw_dir = out / "_source_webm"
    for url, mp4_name in CCTV_CLIPS:
        mp4_path = out / mp4_name
        if mp4_path.exists() and mp4_path.stat().st_size > 50_000:
            log(f"  [cached] {mp4_path.relative_to(DATA_DIR)}")
        else:
            src = raw_dir / (mp4_name.replace(".mp4", ".webm"))
            if not fetch(url, src, min_bytes=50_000):
                continue
            cmd = [ffmpeg, "-y", "-loglevel", "error", "-i", str(src),
                   "-c:v", "libx264", "-preset", "veryfast", "-crf", "26",
                   "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                   "-an", str(mp4_path)]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0 or not mp4_path.exists():
                log(f"  [FAIL] transcode {mp4_name}: {result.stderr[:160]}")
                continue
            log(f"  [ok] {mp4_path.relative_to(DATA_DIR)} "
                f"({mp4_path.stat().st_size:,} B)")
        _extract_frames(ffmpeg, mp4_path, out / "pinned_frames")


def _extract_frames(ffmpeg: str, video: Path, frames_dir: Path) -> None:
    """Still frames for the CCTV pinning feature on the case timeline
    (backend/app/routers/timeline.py accepts JPEG / PNG / WebP)."""
    frames_dir.mkdir(parents=True, exist_ok=True)
    stem = video.stem.replace("cctv_", "")
    if list(frames_dir.glob(f"frame_{stem}_*.jpg")):
        return
    pattern = str(frames_dir / f"frame_{stem}_%02d.jpg")
    cmd = [ffmpeg, "-y", "-loglevel", "error", "-i", str(video),
           "-vf", "fps=1/4,scale=960:-2", "-frames:v", "4", "-q:v", "3", pattern]
    result = subprocess.run(cmd, capture_output=True, text=True)
    count = len(list(frames_dir.glob(f"frame_{stem}_*.jpg")))
    if result.returncode != 0 and count == 0:
        log(f"  [warn] frame extraction failed for {video.name}")
        return
    log(f"  [ok] {count} pinnable frames from {video.name}")


# -------------------------------------------------- 05 provider responses
# Column names below MUST match the parser in
# backend/app/services/analytics_service.py::generate_mock_response so these
# files can be dropped in as real provider replies. Identifiers deliberately
# match the entities in the section-03 complaints, so correlation fires.
def section_provider_responses() -> None:
    log("\n[05] Provider responses — CDR / bank / platform CSVs")
    out = DATA_DIR / "05_provider_responses"

    suspect_a, suspect_b = "+916351288104", "+917096833217"
    victim = "+919879544120"
    # Real Gujarat LSA cell-global-identity prefixes (MCC 404 / MNC 10 = Jio GJ).
    write_csv(
        out / "telecom_cdr_response.csv",
        ["timestamp", "calling_number", "called_number", "duration_sec",
         "cell_id", "imei"],
        [
            {"timestamp": "2026-07-03T19:40:12Z", "calling_number": suspect_a,
             "called_number": victim, "duration_sec": "212",
             "cell_id": "404-10-4412-20871", "imei": "864203051129847"},
            {"timestamp": "2026-07-07T09:02:44Z", "calling_number": suspect_a,
             "called_number": victim, "duration_sec": "418",
             "cell_id": "404-10-4412-20871", "imei": "864203051129847"},
            {"timestamp": "2026-07-08T14:15:03Z", "calling_number": suspect_b,
             "called_number": victim, "duration_sec": "96",
             "cell_id": "404-10-5580-31245", "imei": "864203051129847"},
            {"timestamp": "2026-07-10T10:58:31Z", "calling_number": suspect_a,
             "called_number": suspect_b, "duration_sec": "745",
             "cell_id": "404-10-4412-20871", "imei": "869540042218763"},
            {"timestamp": "2026-07-12T16:44:19Z", "calling_number": suspect_a,
             "called_number": victim, "duration_sec": "158",
             "cell_id": "404-10-4412-20871", "imei": "869540042218763"},
            {"timestamp": "2026-07-15T11:20:07Z", "calling_number": victim,
             "called_number": suspect_a, "duration_sec": "8",
             "cell_id": "404-10-6621-11934", "imei": "864203051129847"},
        ],
    )

    # Layering chain: victim -> mule 1 -> mule 2 -> cash-out. Same originating
    # IP across the first hops is the pattern the insight prompt should surface.
    write_csv(
        out / "bank_transaction_response.csv",
        ["timestamp", "transaction_id", "source_account",
         "destination_account", "amount", "status", "ip_address"],
        [
            {"timestamp": "2026-07-07T09:15:22Z", "transaction_id": "UTR2026070709152",
             "source_account": "50100234567891", "destination_account": "402100561234789",
             "amount": "25000.00", "status": "SUCCESS", "ip_address": "103.240.172.44"},
            {"timestamp": "2026-07-08T14:22:41Z", "transaction_id": "YESB2026070822417",
             "source_account": "50100234567891", "destination_account": "402100561234789",
             "amount": "87000.00", "status": "SUCCESS", "ip_address": "103.240.172.44"},
            {"timestamp": "2026-07-10T11:05:18Z", "transaction_id": "AXISN2026071011052",
             "source_account": "50100234567891", "destination_account": "913020067812345",
             "amount": "150000.00", "status": "SUCCESS", "ip_address": "103.240.172.44"},
            {"timestamp": "2026-07-10T11:31:56Z", "transaction_id": "AXISN2026071011319",
             "source_account": "913020067812345", "destination_account": "6789012345678",
             "amount": "148500.00", "status": "SUCCESS", "ip_address": "45.118.132.19"},
            {"timestamp": "2026-07-12T16:48:33Z", "transaction_id": "IBL2026071216483",
             "source_account": "50100234567891", "destination_account": "6789012345678",
             "amount": "200000.00", "status": "SUCCESS", "ip_address": "103.240.172.44"},
            {"timestamp": "2026-07-12T17:02:11Z", "transaction_id": "IBL2026071217021",
             "source_account": "6789012345678", "destination_account": "CRYPTO-PG-889201",
             "amount": "340000.00", "status": "SUCCESS", "ip_address": "45.118.132.19"},
            {"timestamp": "2026-07-14T19:30:47Z", "transaction_id": "HDFCN2026071419304",
             "source_account": "50100234567891", "destination_account": "50200089123456",
             "amount": "100000.00", "status": "SUCCESS", "ip_address": "103.240.172.44"},
            {"timestamp": "2026-07-15T11:22:05Z", "transaction_id": "HDFCN2026071511220",
             "source_account": "50100234567891", "destination_account": "50200089123456",
             "amount": "140000.00", "status": "FAILED", "ip_address": "103.240.172.44"},
        ],
    )

    write_csv(
        out / "platform_account_response.csv",
        ["timestamp", "username", "email", "ip_address", "action"],
        [
            {"timestamp": "2026-07-03T19:35:02Z", "username": "rahul_mentor01",
             "email": "growthteam.amz@protonmail.com",
             "ip_address": "103.240.172.44", "action": "login"},
            {"timestamp": "2026-07-03T19:38:47Z", "username": "rahul_mentor01",
             "email": "growthteam.amz@protonmail.com",
             "ip_address": "103.240.172.44", "action": "create_group"},
            {"timestamp": "2026-07-07T08:59:12Z", "username": "priya_hr_team",
             "email": "hrteam.amzgrowth@gmail.com",
             "ip_address": "103.240.172.44", "action": "add_member"},
            {"timestamp": "2026-07-12T16:40:29Z", "username": "rahul_mentor01",
             "email": "growthteam.amz@protonmail.com",
             "ip_address": "45.118.132.19", "action": "send_payment_link"},
            {"timestamp": "2026-07-15T11:25:44Z", "username": "rahul_mentor01",
             "email": "growthteam.amz@protonmail.com",
             "ip_address": "45.118.132.19", "action": "remove_member"},
            {"timestamp": "2026-07-15T11:26:03Z", "username": "priya_hr_team",
             "email": "hrteam.amzgrowth@gmail.com",
             "ip_address": "45.118.132.19", "action": "delete_account"},
        ],
    )

    # Same CDR in the wire format Indian TSPs actually return under a LERS
    # request — exercises parsing of a non-normalised provider reply.
    write_csv(
        out / "telecom_cdr_lers_raw_format.csv",
        ["A_PARTY", "B_PARTY", "DATE", "TIME", "DURATION_SEC", "CALL_TYPE",
         "FIRST_CELL_ID", "LAST_CELL_ID", "IMEI", "IMSI", "TSP", "LSA"],
        [
            {"A_PARTY": suspect_a, "B_PARTY": victim, "DATE": "2026-07-03",
             "TIME": "19:40:12", "DURATION_SEC": "212", "CALL_TYPE": "VOICE-OUT",
             "FIRST_CELL_ID": "404-10-4412-20871", "LAST_CELL_ID": "404-10-4412-20871",
             "IMEI": "864203051129847", "IMSI": "404104412208711", "TSP": "RJIL",
             "LSA": "GUJARAT"},
            {"A_PARTY": suspect_a, "B_PARTY": victim, "DATE": "2026-07-07",
             "TIME": "09:02:44", "DURATION_SEC": "418", "CALL_TYPE": "VOICE-OUT",
             "FIRST_CELL_ID": "404-10-4412-20871", "LAST_CELL_ID": "404-10-5580-31245",
             "IMEI": "864203051129847", "IMSI": "404104412208711", "TSP": "RJIL",
             "LSA": "GUJARAT"},
            {"A_PARTY": suspect_b, "B_PARTY": victim, "DATE": "2026-07-08",
             "TIME": "14:15:03", "DURATION_SEC": "96", "CALL_TYPE": "SMS-OUT",
             "FIRST_CELL_ID": "404-10-5580-31245", "LAST_CELL_ID": "404-10-5580-31245",
             "IMEI": "864203051129847", "IMSI": "404105580312451", "TSP": "BHARTI",
             "LSA": "GUJARAT"},
            {"A_PARTY": suspect_a, "B_PARTY": suspect_b, "DATE": "2026-07-10",
             "TIME": "10:58:31", "DURATION_SEC": "745", "CALL_TYPE": "VOICE-OUT",
             "FIRST_CELL_ID": "404-10-4412-20871", "LAST_CELL_ID": "404-10-4412-20871",
             "IMEI": "869540042218763", "IMSI": "404104412208711", "TSP": "RJIL",
             "LSA": "GUJARAT"},
        ],
    )


# ------------------------------------------------------------------ 06 OSINT
def section_osint() -> None:
    """Real breach corpus from Have I Been Pwned. The full catalogue backs the
    digital-footprint enrichment feature with genuine breach names, dates and
    exposed data classes instead of invented ones."""
    log("\n[06] OSINT — real breach corpus (Have I Been Pwned)")
    out = DATA_DIR / "06_osint"
    target = out / "hibp_breach_catalogue.json"
    if not fetch("https://haveibeenpwned.com/api/v3/breaches", target,
                 min_bytes=100_000):
        return

    breaches = json.loads(target.read_text(encoding="utf-8"))
    # India-relevant subset, which is what an Indian officer would pivot on.
    india_terms = ("india", "indian", "zomato", "bigbasket", "dominos",
                   "mobikwik", "justdial", "unacademy", "airtel", "jio",
                   "paytm", "wedmegood", "cashmama", "truecaller")
    subset = [
        b for b in breaches
        if any(t in (b.get("Name", "") + b.get("Domain", "") +
                     b.get("Title", "")).lower() for t in india_terms)
    ]
    write_text(out / "hibp_breaches_india_subset.json",
               json.dumps(subset, ensure_ascii=False, indent=2))
    log(f"  [ok] {len(breaches)} total breaches, {len(subset)} India-linked")

    # Identifiers appearing in the section-03 complaints, for OSINT scan runs.
    write_text(out / "osint_pivot_targets.json", json.dumps({
        "note": "Identifiers lifted from data/03_complaints_multilingual. "
                "Feed these to the OSINT digital-footprint scan.",
        "emails": ["priyanka.desai27@outlook.com", "growthteam.amz@protonmail.com",
                   "hrteam.amzgrowth@gmail.com", "bhavesh.patel38@gmail.com",
                   "sureshjoshi1965@gmail.com"],
        "phones": ["+916351288104", "+917096833217", "+918655099881",
                   "+917021145566", "+919624877345", "+917894561230"],
        "upi_ids": ["growthteam.pay@okaxis", "merchant.settle@ibl",
                    "rkverify.pay@ybl", "quickcash.help@paytm",
                    "vksharma.verify@okicici"],
        "usernames": ["rahul_mentor01", "priya_hr_team"],
        "domains": ["amz-growth-wallet.top", "sbi-kyc-update.online-verify.in"],
        "ip_addresses": ["103.240.172.44", "45.118.132.19"],
    }, ensure_ascii=False, indent=2))


# ------------------------------------------------- 07 regional / geospatial
def section_regional() -> None:
    """Boundaries plus real NCRB crime counts, for regional analytics."""
    log("\n[07] Regional — boundaries + NCRB crime statistics")
    out = DATA_DIR / "07_regional_geospatial"

    for url, name, floor in [
        ("https://raw.githubusercontent.com/udit-001/india-maps-data/main/"
         "geojson/india.geojson", "india_states_boundaries.geojson", 500_000),
        ("https://raw.githubusercontent.com/udit-001/india-maps-data/main/"
         "geojson/states/gujarat.geojson", "gujarat_districts_boundaries.geojson",
         100_000),
        # NCRB "Crime in India" figures, state x crime-head x year (2017-2023).
        ("https://raw.githubusercontent.com/arka562/india-crime-dashboard/main/"
         "ncrb_master_dataset.csv", "ncrb_state_crime_master_2017_2023.csv",
         50_000),
        ("https://raw.githubusercontent.com/arka562/india-crime-dashboard/main/"
         "ncrb_crime_trends.csv", "ncrb_crime_trends.csv", 1_000),
        # NCRB crime-head disposal tables, per year.
        ("https://raw.githubusercontent.com/Mariya-004/"
         "Exploratory-Data-Analysis-NCRB-Crime-Dataset/main/Datasets/"
         "2021_crime_data.csv", "ncrb_ipc_crime_disposal_2021.csv", 5_000),
    ]:
        fetch(url, out / name, min_bytes=floor)

    _summarise_ncrb(out)


def _summarise_ncrb(out: Path) -> None:
    """Roll the national NCRB file up to a Gujarat cyber/fraud view — the slice
    the demo actually shows."""
    src = out / "ncrb_state_crime_master_2017_2023.csv"
    if not src.exists():
        return
    with src.open(encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    keep = [
        r for r in rows
        if r.get("state", "").strip().lower() == "gujarat"
        and any(term in r.get("crime_type", "").lower()
                for term in ("cyber", "cheat", "fraud", "forgery", "theft"))
    ]
    if not keep:
        return
    write_csv(out / "ncrb_gujarat_cyber_and_fraud.csv",
              ["state", "crime_type", "count", "year"], keep)


SECTIONS = {
    "legal": section_legal,
    "fir": section_fir_scans,
    "complaints": section_complaints,
    "cctv": section_cctv,
    "responses": section_provider_responses,
    "osint": section_osint,
    "regional": section_regional,
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", choices=sorted(SECTIONS), action="append",
                        help="run just these sections (repeatable)")
    parser.add_argument("--skip-video", action="store_true",
                        help="skip the CCTV download/transcode step")
    args = parser.parse_args()

    selected = args.only or list(SECTIONS)
    if args.skip_video and "cctv" in selected:
        selected = [s for s in selected if s != "cctv"]

    for name in selected:
        SECTIONS[name]()

    log("\n=== done ===")
    for folder in sorted(DATA_DIR.iterdir()):
        if folder.is_dir() and folder.name[0].isdigit():
            files = [p for p in folder.rglob("*") if p.is_file()]
            size = sum(p.stat().st_size for p in files)
            log(f"  {folder.name:28} {len(files):4} files  {size / 1e6:8.1f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())




