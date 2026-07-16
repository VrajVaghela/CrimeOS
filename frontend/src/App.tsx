/**
 * App Component — Root Application Shell
 * ========================================
 * Orchestrates the Video Incident Analyzer dashboard flow:
 *
 *   1. Upload State: Shows VideoUploader with drag-and-drop zone
 *   2. Dashboard State: Shows VideoTimelineViewer split-screen dashboard
 *
 * Transitions from upload to dashboard when analysis completes successfully.
 *
 * @module App
 */

import { useState } from "react";
import VideoUploader from "./components/VideoUploader";
import VideoTimelineViewer from "./components/VideoTimelineViewer";
import { tokens } from "./design-tokens";

type AppView = "upload" | "dashboard";

function App() {
  const [view, setView] = useState<AppView>("upload");
  const [caseId, setCaseId] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");

  /**
   * Handle analysis completion — transition to dashboard view.
   */
  const handleAnalysisComplete = (completedCaseId: string, url: string) => {
    setCaseId(completedCaseId);
    setVideoUrl(url);
    setView("dashboard");
  };

  /**
   * Handle navigation back to upload view.
   */
  const handleNewAnalysis = () => {
    setView("upload");
    setCaseId("");
    setVideoUrl("");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: tokens.colors.bgPrimary,
        color: tokens.colors.textPrimary,
        fontFamily: tokens.fonts.body,
      }}
    >
      {/* ── Header ───────────────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          borderBottom: `1px solid ${tokens.colors.borderDefault}`,
          background: tokens.colors.bgSecondary,
          height: "64px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              fontSize: "24px",
              filter: "drop-shadow(0 0 8px rgba(6, 182, 212, 0.5))",
            }}
          >
            🔍
          </span>
          <h1
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 700,
              letterSpacing: "0.02em",
              background: `linear-gradient(135deg, ${tokens.colors.cyan}, ${tokens.colors.magenta})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Video Incident Analyzer
          </h1>
        </div>

        {view === "dashboard" && (
          <button
            onClick={handleNewAnalysis}
            style={{
              background: "transparent",
              color: tokens.colors.cyan,
              border: `1px solid ${tokens.colors.cyan}40`,
              borderRadius: tokens.radius.md,
              padding: "6px 16px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
              transition: `all ${tokens.transitions.fast}`,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = tokens.colors.cyanGlow;
              e.currentTarget.style.borderColor = tokens.colors.cyan;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = `${tokens.colors.cyan}40`;
            }}
          >
            + New Analysis
          </button>
        )}
      </header>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main>
        {view === "upload" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "calc(100vh - 64px)",
              padding: "32px",
            }}
          >
            {/* Hero Text */}
            <div style={{ textAlign: "center", marginBottom: "40px" }}>
              <h2
                style={{
                  fontSize: "28px",
                  fontWeight: 700,
                  marginBottom: "8px",
                  color: tokens.colors.textPrimary,
                }}
              >
                AI-Powered Video Evidence Analysis
              </h2>
              <p
                style={{
                  fontSize: "15px",
                  color: tokens.colors.textSecondary,
                  maxWidth: "500px",
                  lineHeight: "1.5",
                }}
              >
                Upload surveillance footage for automated incident detection,
                timeline extraction, and tamper-evident chain-of-custody tracking.
              </p>
            </div>

            <VideoUploader onAnalysisComplete={handleAnalysisComplete} />

            {/* Feature Highlights */}
            <div
              style={{
                display: "flex",
                gap: "24px",
                marginTop: "48px",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {[
                {
                  icon: "🤖",
                  title: "Gemini AI Analysis",
                  desc: "Powered by Google Gemini 2.5 Flash",
                },
                {
                  icon: "🔒",
                  title: "Chain of Custody",
                  desc: "Tamper-evident hash-chained ledger",
                },
                {
                  icon: "📊",
                  title: "Incident Timeline",
                  desc: "Chronological event tracking",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  style={{
                    textAlign: "center",
                    padding: "16px",
                    width: "160px",
                  }}
                >
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>
                    {feature.icon}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: tokens.colors.textPrimary,
                      marginBottom: "4px",
                    }}
                  >
                    {feature.title}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: tokens.colors.textMuted,
                    }}
                  >
                    {feature.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "dashboard" && caseId && videoUrl && (
          <VideoTimelineViewer caseId={caseId} videoUrl={videoUrl} />
        )}
      </main>
    </div>
  );
}

export default App;
