
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";

interface CaseContextType {
  caseId: string | null;
  setCaseId: (caseId: string) => void;
}

const CaseContext = createContext<CaseContextType | undefined>(undefined);

// TODO: Replace with proper case selection from core platform
export function CaseProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const [caseId, setCaseId] = useState<string | null>(
    params.caseId || null
  );

  return (
    <CaseContext.Provider value={{ caseId, setCaseId }}>
      {children}
    </CaseContext.Provider>
  );
}

export function useCase() {
  const context = useContext(CaseContext);
  if (!context) {
    throw new Error("useCase must be used within a CaseProvider");
  }
  return context;
}
