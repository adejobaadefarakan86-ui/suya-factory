"use client";
// "Welcome back, Daniel" right after logging in (or "Welcome to Suya Factory" after
// signing up). Reads the one-minute note left by the login action, shows it for
// a few seconds as a glass message, then removes the note so it shows only once.
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Note = { kind: "back" | "new"; name: string };

function readNote(): Note | null {
  const raw = document.cookie.split("; ").find((c) => c.startsWith("sf_welcome="));
  if (!raw) return null;
  document.cookie = "sf_welcome=; path=/; max-age=0";
  try {
    const n = JSON.parse(decodeURIComponent(raw.slice("sf_welcome=".length))) as Note;
    return n.kind === "back" || n.kind === "new" ? n : null;
  } catch {
    return null;
  }
}

export function Welcome() {
  const [note, setNote] = useState<Note | null>(null);
  const [leaving, setLeaving] = useState(false);
  const path = usePathname();

  // Look for the note whenever the page changes (logging in moves you to a new page).
  useEffect(() => {
    const n = readNote();
    if (!n) return;
    setNote(n); // eslint-disable-line react-hooks/set-state-in-effect -- the note lives in a cookie, readable only in the browser
    setLeaving(false);
    const a = setTimeout(() => setLeaving(true), 3500);
    const b = setTimeout(() => setNote(null), 4300);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [path]);

  if (!note) return null;
  const who = note.name ? `, ${note.name}` : "";
  return (
    <div role="status" aria-live="polite"
      className={`welcome-in pointer-events-none fixed inset-x-0 top-20 z-[80] flex justify-center px-4 transition-opacity duration-700 ease-out ${leaving ? "opacity-0" : ""}`}>
      <p className="flex items-center gap-3 rounded-2xl border border-white/40 bg-accent/90 px-5 py-3 text-white shadow-[0_20px_50px_-20px_rgba(60,15,0,0.7)] backdrop-blur-xl">
        <span className="font-display text-lg font-semibold">
          {note.kind === "new" ? `Welcome to Suya Factory${who}!` : `Welcome back${who}`}
        </span>
        <span aria-hidden="true">👋</span>
      </p>
    </div>
  );
}
