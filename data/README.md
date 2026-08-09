# Test Data — Crime OS AI

Real, publicly-sourced data for exercising every feature end to end. Regenerate
or refresh everything with:

```bash
python data/fetch_datasets.py                 # all sections
python data/fetch_datasets.py --skip-video    # skip the CCTV transcode
python data/fetch_datasets.py --only legal --only regional
```

The script is idempotent — existing files are left alone, so re-runs only fetch
what is missing. CCTV transcoding needs `ffmpeg`; if it is not on `PATH` the
script falls back to the bundled binary from `pip install imageio-ffmpeg`.

## What is here, and which feature it tests

| Folder | Contents | Feature exercised |
| :--- | :--- | :--- |
| `01_legal_corpus/` | Full official text of BNS, BNSS and BSA (2023) as PDF; IPC 1860 and Indian Evidence Act 1872 as section-level JSON | SOP grounding, BNS/BNSS/BSA section suggestion, citation popovers, IPC→BNS mapping |
| `02_fir_scans/` | 12 real handwritten Indian FIR pages + OCR ground truth + a 2-page scanned PDF bundle | Handwritten FIR ingestion, OCR, entity extraction, low-confidence warnings |
| `03_complaints_multilingual/` | 3 complaints (Hindi, Gujarati, English) each as `.txt`, `.pdf` and spoken `.mp3` | Multilingual intake, transcription, side-by-side translation review, entity extraction |
| `04_cctv_video/` | Public-domain surveillance clips as MP4 + extracted still frames | Video evidence workspace, forensic event log, click-to-seek, CCTV timeline pinning, SHA-256 chain of custody |
| `05_provider_responses/` | CDR, bank and platform reply CSVs, plus a raw LERS-format CDR | Response analytics, entity correlation, promote-to-case-diary, suspicious pattern callouts |
| `06_osint/` | Have I Been Pwned breach catalogue (1,026 breaches) + India subset + pivot target list | OSINT digital footprint scans, breach risk profiling, pivot suggestions, dossier export |
| `07_regional_geospatial/` | India state and Gujarat district boundaries (GeoJSON); NCRB crime counts by state, head and year | Regional analytics, jurisdiction handling, crime-trend context |

## Sources

All artifacts come from public sources. Nothing is taken from a live police
system, and no real complainant data is reproduced.

- **Statutes** — Ministry of Home Affairs gazette PDFs (BNS, BSA) and PRS
  Legislative Research (BNSS). Predecessor acts as JSON from
  [civictech-India/Indian-Law-Penal-Code-Json](https://github.com/civictech-India/Indian-Law-Penal-Code-Json).
- **FIR scans** — [FIR_Dataset_ICDAR2023](https://github.com/LegalDocumentProcessing/FIR_Dataset_ICDAR2023),
  an academic corpus of FIR pages (printed forms with handwritten entries) with
  bounding-box OCR ground truth.
- **CCTV footage** — Wikimedia Commons public-domain / freely-licensed
  surveillance recordings, transcoded from WebM to MP4 because
  `backend/app/routers/video.py` accepts only `.mp4` / `.mov` / `.avi`.
- **Breach corpus** — [Have I Been Pwned](https://haveibeenpwned.com) public
  `/api/v3/breaches` endpoint (no key required).
- **Crime statistics** — NCRB *Crime in India* figures, mirrored as CSV.
- **Boundaries** — [udit-001/india-maps-data](https://github.com/udit-001/india-maps-data).

## Complaint narratives

The three complaints in `03_complaints_multilingual/` are written to match the
fraud patterns published in MHA / I4C cybercrime advisories — digital-arrest
extortion, UPI KYC/OTP theft, and Telegram task-job fraud. The narratives are
composed for testing rather than copied from real FIRs, so no actual victim's
details appear, but every field an officer would extract is present: names,
addresses, phone numbers, bank accounts, IFSC codes, UPI handles, UTR numbers,
amounts, timestamps and helpline acknowledgement numbers.

Identifiers are **consistent across folders**. The suspects, accounts, UPI
handles, emails and IP addresses in the English Telegram-fraud complaint are the
same ones appearing in `05_provider_responses/` and
`06_osint/osint_pivot_targets.json`. That is deliberate: it lets the correlation
engine actually match provider response rows against extracted case entities,
which is the behaviour worth testing.

## Suggested end-to-end run

1. Ingest `03_complaints_multilingual/complaint_gujarati_upi_kyc_fraud.pdf` —
   check the translation panel and extracted entities.
2. Ingest `02_fir_scans/fir_scanned_handwritten_bundle.pdf` — check handwriting
   OCR and the low-confidence amber flags.
3. Ingest `complaint_hindi_digital_arrest_extortion.mp3` — check transcription.
4. Generate the investigation path and BNS sections; open a citation and confirm
   it resolves against the statute corpus.
5. Draft a CDR request and a bank freeze letter, approve as SHO, dispatch.
6. Upload `05_provider_responses/telecom_cdr_response.csv` and
   `bank_transaction_response.csv` as the replies; confirm the layering chain and
   the shared `103.240.172.44` origin get flagged.
7. Run an OSINT scan on an identifier from `osint_pivot_targets.json`.
8. Upload a clip from `04_cctv_video/`, pin a frame from `pinned_frames/` to the
   timeline, then generate the case summary and review the audit trail.

## Licensing note

Sources carry their own licences — Government of India publications, Wikimedia
Commons per-file licences, and the academic FIR corpus terms. These files are
here for local development and demo purposes. Check the upstream licence before
redistributing any of it.
