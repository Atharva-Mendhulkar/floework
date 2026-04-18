import { useState } from "react";

interface UserAvatarProps {
  name?: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  status?: "focus" | "available" | "offline" | null;
  className?: string;
}

// Deterministic color palette — same name always gets same color
const AVATAR_COLORS = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-fuchsia-500",
  "bg-pink-500",
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

function getColor(name: string): string {
  return AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length];
}

const SIZE_MAP = {
  xs: { container: "w-5 h-5", text: "text-[8px]", ring: "ring-1", dot: "w-1.5 h-1.5 -bottom-0 -right-0" },
  sm: { container: "w-7 h-7", text: "text-[10px]", ring: "ring-2", dot: "w-2.5 h-2.5 -bottom-0.5 -right-0.5" },
  md: { container: "w-9 h-9", text: "text-xs", ring: "ring-2", dot: "w-3 h-3 -bottom-0.5 -right-0.5" },
  lg: { container: "w-16 h-16", text: "text-xl", ring: "ring-[3px]", dot: "w-4 h-4 -bottom-0.5 -right-0.5" },
};

export function UserAvatar({ name = "User", avatarUrl, size = "sm", status, className = "" }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const s = SIZE_MAP[size];
  const initials = getInitials(name);
  const color = getColor(name);
  const showImage = avatarUrl && !imgError;

  return (
    <div className={`relative group ${className}`}>
      <div
        className={`${s.container} rounded-full flex items-center justify-center font-bold border-2 border-white shadow-sm ring-offset-1 overflow-hidden
          ${status === "focus" ? `${s.ring} ring-[#007dff] animate-pulse-soft` : ""}
          ${showImage ? "" : `${color} text-white ${s.text}`}
        `}
        title={`${name}${status ? ` (${status === "focus" ? "In Focus" : status === "available" ? "Available" : "Offline"})` : ""}`}
      >
        {showImage ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          initials
        )}
      </div>

      {/* Presence indicator dot */}
      {status && (
        <div
          className={`absolute ${s.dot} rounded-full border-2 border-white
            ${status === "focus" ? "bg-[#007dff]" : status === "available" ? "bg-emerald-500" : "bg-slate-300"}
          `}
        />
      )}
    </div>
  );
}

// Export utilities for external use
export { getInitials, getColor };
