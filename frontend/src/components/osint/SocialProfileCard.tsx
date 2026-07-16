import type { ProfileConfidence, SocialProfile } from "../../types/osint";

interface SocialProfileCardProps {
  profile: SocialProfile;
}

function formatFollowerCount(count?: number | null) {
  if (count == null) return null;
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return count.toString();
}

function confidenceBadge(confidence: ProfileConfidence) {
  const styles: Record<ProfileConfidence, string> = {
    CONFIRMED: "bg-emerald-500 text-slate-950 border border-emerald-500",
    LIKELY: "border border-amber-400 text-amber-200",
    UNCERTAIN: "border border-slate-600 text-slate-400",
  };

  return (
    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${styles[confidence]}`}>
      {confidence}
    </span>
  );
}

export function SocialProfileCard({ profile }: SocialProfileCardProps) {
  const initials = profile.username
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0].toUpperCase())
    .join("") || "?";

  return (
    <article className="rounded-3xl border border-slate-800 bg-slate-950/95 p-5 shadow-sm ring-1 ring-slate-800">
      <div className="flex items-start gap-4">
        <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-slate-800 text-xl font-semibold text-white">
          {profile.profile_picture_url ? (
            <img
              src={profile.profile_picture_url}
              alt={`${profile.username} profile`}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-100">
            {profile.username}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
            {profile.platform}
          </p>
          <p
            className="mt-3 text-sm leading-6 text-slate-300"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {profile.bio ?? "Public profile summary unavailable."}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
        {confidenceBadge(profile.exists_confidence)}
        {profile.follower_count != null && (
          <span className="rounded-full bg-slate-800 px-2 py-1">
            {formatFollowerCount(profile.follower_count)} followers
          </span>
        )}
      </div>

      {profile.is_verified && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          Verified account
        </div>
      )}

      {profile.profile_url && (
        <a
          href={profile.profile_url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-sm font-medium text-sky-300 hover:text-sky-100"
        >
          View profile
        </a>
      )}
    </article>
  );
}
