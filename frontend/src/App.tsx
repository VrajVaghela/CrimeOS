import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CaseProvider } from "./context/CaseContext";
import IntakeReview from "./pages/IntakeReview";
import LersConsole from "./pages/LersConsole";
import DispatchTracker from "./pages/DispatchTracker";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import "./App.css";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route
            path="/cases/:caseId/intake"
            element={
              <CaseProvider>
                <IntakeReview />
              </CaseProvider>
            }
          />
          <Route
            path="/cases/:caseId/lers"
            element={
              <CaseProvider>
                <LersConsole />
              </CaseProvider>
            }
          />
          <Route
            path="/cases/:caseId/dispatch"
            element={
              <CaseProvider>
                <DispatchTracker />
              </CaseProvider>
            }
          />
          <Route
            path="/cases/:caseId/analytics"
            element={
              <CaseProvider>
                <AnalyticsDashboard />
              </CaseProvider>
            }
          />
          <Route
            path="*"
            element={
              <div>
                <h1>404 Not Found</h1>
                <p>Please navigate to /cases/:caseId/... path</p>
              </div>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
