"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    MusicKit?: {
      configure: (options: Record<string, unknown>) => Promise<unknown>;
      getInstance: () => { authorize: () => Promise<string> };
    };
  }
}

const MUSICKIT_SRC = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";

/** Loads MusicKit once and resolves when its global is ready. */
function loadMusicKit(): Promise<NonNullable<Window["MusicKit"]>> {
  return new Promise((resolve, reject) => {
    if (window.MusicKit) return resolve(window.MusicKit);

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${MUSICKIT_SRC}"]`);
    const script = existing ?? document.createElement("script");

    const onReady = () => {
      if (window.MusicKit) resolve(window.MusicKit);
      else reject(new Error("MusicKit loaded but did not initialise."));
    };

    // MusicKit v3 fires this once its global is usable.
    document.addEventListener("musickitloaded", onReady, { once: true });
    script.addEventListener("error", () => reject(new Error("Could not load MusicKit from Apple.")));

    if (!existing) {
      script.src = MUSICKIT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

export function ConnectApple({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "working" | "error">("idle");
  const [message, setMessage] = useState("");

  const connect = useCallback(async () => {
    setState("working");
    setMessage("Opening Apple Music sign-in…");
    try {
      const tokenResponse = await fetch("/api/apple/token");
      const tokenBody = await tokenResponse.json();
      if (!tokenResponse.ok) throw new Error(tokenBody.error ?? "Could not get a developer token.");

      const MusicKit = await loadMusicKit();
      await MusicKit.configure({
        developerToken: tokenBody.token,
        app: { name: "Niche Music", build: "0.1" },
      });

      const userToken = await MusicKit.getInstance().authorize();
      if (!userToken) throw new Error("Apple Music sign-in was cancelled.");

      setMessage("Reading your library and scoring it…");
      const analysis = await fetch("/api/analyze/apple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userToken }),
      });
      const body = await analysis.json();
      if (!analysis.ok) throw new Error(body.error ?? "Analysis failed.");

      sessionStorage.setItem("nm:result", JSON.stringify(body));
      router.push("/results?source=apple");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    }
  }, [router]);

  return (
    <div>
      <button
        type="button"
        onClick={connect}
        disabled={!enabled || state === "working"}
        className="w-full rounded-xl border border-[var(--color-edge)] bg-[var(--color-panel-2)] px-5 py-3.5 text-sm font-semibold transition hover:border-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {state === "working" ? "Working…" : "Connect Apple Music"}
      </button>
      {!enabled && (
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          Needs APPLE_TEAM_ID, APPLE_KEY_ID and APPLE_PRIVATE_KEY. See the README.
        </p>
      )}
      {message && (
        <p className={`mt-2 text-xs ${state === "error" ? "text-[var(--color-hot)]" : "text-[var(--color-muted)]"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
