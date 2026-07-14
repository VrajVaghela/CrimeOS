
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface AuthContextType {
  officerId: string;
  policeStation: string;
  setOfficerId: (id: string) => void;
  setPoliceStation: (station: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// TODO: Replace with real auth integration (JWT, OAuth, etc.)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [officerId, setOfficerId] = useState(() => {
    const stored = localStorage.getItem("officer_id");
    if (stored) return stored;
    const defaultId = "officer_123";
    localStorage.setItem("officer_id", defaultId);
    return defaultId;
  });

  const [policeStation, setPoliceStation] = useState(() => {
    const stored = localStorage.getItem("police_station");
    if (stored) return stored;
    const defaultStation = "Central Police Station";
    localStorage.setItem("police_station", defaultStation);
    return defaultStation;
  });

  const updateOfficerId = (id: string) => {
    setOfficerId(id);
    localStorage.setItem("officer_id", id);
  };

  const updatePoliceStation = (station: string) => {
    setPoliceStation(station);
    localStorage.setItem("police_station", station);
  };

  return (
    <AuthContext.Provider
      value={{
        officerId,
        policeStation,
        setOfficerId: updateOfficerId,
        setPoliceStation: updatePoliceStation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
