import type { SocialProfile } from "../../types/osint";
import { SocialProfileCard } from "./SocialProfileCard";

interface SocialProfileGridProps {
  profiles: SocialProfile[];
}

export function SocialProfileGrid({ profiles }: SocialProfileGridProps) {
  if (profiles.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-950/95 p-6 text-sm text-slate-400">
        No public profiles discovered for this identifier.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {profiles.map((profile) => (
        <SocialProfileCard key={profile.id} profile={profile} />
      ))}
    </div>
  );
}
