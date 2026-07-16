Problem Statement: ERH26_PS_10: Crime OS AI

Background
Investigators handle both cyber and conventional crime with
limited time and heavy documentation burdens. An agentic AI platform can assist
across the investigation lifecycle — ingesting complaints, suggesting
investigation paths, automating legal requests to service providers, analyzing
responses, and maintaining case summaries — enhancing investigative speed,
efficiency, and scale.
Problem Statement
Develop Crime OS AI, an agentic AI platform for
intelligence-led investigations that assists police with both cyber and
conventional crime. The platform leverages AI, automation, and multi-source
intelligence across the lifecycle: multimodal complaint ingestion, AI-suggested
investigation paths grounded in SOPs, automated generation and dispatch of
legal requests to service providers, analytics over the responses received, and
auto-generated case logs and summaries.
Key Objectives
•     Ingest and process complaints from multiple
formats and languages.
•     Provide AI-suggested investigation paths
grounded in standard operating procedures.
•     Automate legal-request generation and dispatch
to service providers.
•     Analyse provider responses and auto-generate
case logs and summaries.
Functional Requirements

 Multimodal
     Complaint Ingestion

 
  Ingest
      and process complaints from PDFs, audio recordings, and images.

  Multilingual
      support: Gujarati, Hindi, and English.

  Structured
      extraction of entities, sections, and key facts.

 

 AI-Powered
     Investigation Paths

 
  Suggest
      potential investigation paths based on provided SOPs.

  Optional
      step-by-step guidance for the officer.

  Recommend
      relevant legal sections (BNS/BNSS/BSA) and case laws.

 

 Automated
     Workflows

 
  Auto-generate
      legal requests and dispatch to telecom operators, banks, and platforms
      via email automation.

  Use
      LERS/compliant request templates where applicable.

  Track
      request status and responses.

 

 Response
     Analytics & Case Summaries

 
  Download
      and analyse data returned by service providers (subject to
      technical/regulatory feasibility).

  Auto-generate
      case logs and summaries from investigation activity.

  Search,
      version history, and audit trail.

 
Evaluation Criteria
•     Accuracy of multimodal/multilingual ingestion.
•     Usefulness of AI investigation-path and
legal-section suggestions.
•     Reliability of automated request generation and
dispatch.
•     Quality of response analytics and
auto-summaries.
•     Usability for non-technical officers and
integration readiness.
Suggested Tools / Technologies
•     LLMs (with RAG over SOPs/legal datasets), spaCy,
BERT
•     Whisper-style ASR (audio), Tesseract / Vision
OCR (images)
•     Node.js / Django / Flask, email automation
•     PostgreSQL / MongoDB, React.js
Bonus Points
•     Role-based access (IO, SHO, Legal Advisor).
•     Integration with CCTNS / eGujcop mock APIs.
•     Evidence image upload and tagging.
•     Offline-first support for low-network stations.
Deliverables
•     Working prototype demonstrating ingestion, path
suggestions, and automated requests.
•     Demo: complaint → investigation path → generated
request → case summary.
•     Documentation (architecture, SOP grounding,
automation logic).
•     Sample (anonymized) datasets used.