"use client";

declare global {
  interface Window {
    MusicKit?: {
      configure: (options: Record<string, unknown>) => Promise<unknown>;
      getInstance: () => { authorize: () => Promise<string> };
    };
  }
}

const MUSICKIT_SRC = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";
const TOKEN_KEY = "nm:apple-user-token";

/** Loads MusicKit once and resolves when its global is ready. */
function loadMusicKit(): Promise<NonNullable<Window["MusicKit"]>> {
  return new Promise((resolve, reject) => {
    if (window.MusicKit) return resolve(window.MusicKit);

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${MUSICKIT_SRC}"]`);
    const script = existing ?? document.createElement("script");

    // MusicKit v3 fires this on document once its global is usable.
    document.addEventListener(
      "musickitloaded",
      () => {
        if (window.MusicKit) resolve(window.MusicKit);
        else reject(new Error("MusicKit loaded but did not initialise."));
      },
      { once: true },
    );
    script.addEventListener("error", () => reject(new Error("Could not load MusicKit from Apple.")));

    if (!existing) {
      script.src = MUSICKIT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

/**
 * The Apple Music user token only exists in the browser. It is kept in
 * sessionStorage so moving between the picker and the results page does not
 * re-prompt, and it dies with the tab.
 */
export function storedAppleToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function forgetAppleToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage disabled; nothing to forget.
  }
}

/** Signs the user in to Apple Music and returns their user token. */
export async function authorizeApple(): Promise<string> {
  const existing = storedAppleToken();
  if (existing) return existing;

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

  try {
    sessionStorage.setItem(TOKEN_KEY, userToken);
  } catch {
    // Storage disabled; the token still works for this page load.
  }
  return userToken;
}
