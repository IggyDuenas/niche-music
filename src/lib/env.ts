/** Reads configuration, with errors that say exactly which variable is missing. */

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function required(name: string, why: string): string {
  const value = optional(name);
  if (!value) throw new ConfigError(`${name} is not set. ${why}`);
  return value;
}

export class ConfigError extends Error {
  readonly status = 500;
}

export const env = {
  get appUrl(): string {
    return optional("APP_URL") ?? "http://127.0.0.1:3000";
  },
  get sessionSecret(): string {
    return required(
      "SESSION_SECRET",
      "Generate one with: openssl rand -base64 32",
    );
  },
  get lastfmApiKey(): string | undefined {
    return optional("LASTFM_API_KEY");
  },
  spotify: {
    get clientId(): string {
      return required("SPOTIFY_CLIENT_ID", "Create an app at developer.spotify.com/dashboard.");
    },
    get clientSecret(): string {
      return required("SPOTIFY_CLIENT_SECRET", "Found in your Spotify app settings.");
    },
    get configured(): boolean {
      return Boolean(optional("SPOTIFY_CLIENT_ID") && optional("SPOTIFY_CLIENT_SECRET"));
    },
  },
  apple: {
    get teamId(): string {
      return required("APPLE_TEAM_ID", "Your 10-character Apple Developer team id.");
    },
    get keyId(): string {
      return required("APPLE_KEY_ID", "The Key ID of your MusicKit private key.");
    },
    /** The .p8 private key contents. Newlines may be escaped as \n. */
    get privateKey(): string {
      return required(
        "APPLE_PRIVATE_KEY",
        "Paste the contents of your MusicKit .p8 file.",
      ).replace(/\\n/g, "\n");
    },
    get configured(): boolean {
      return Boolean(optional("APPLE_TEAM_ID") && optional("APPLE_KEY_ID") && optional("APPLE_PRIVATE_KEY"));
    },
  },
};
