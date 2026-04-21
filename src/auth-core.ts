/**
 * Résolution des credentials Google et fabrication d'un AuthProvider.
 *
 * Trois modes supportés, par ordre de priorité :
 *  1. Service Account : via GOOGLE_APPLICATION_CREDENTIALS
 *  2. OAuth via env vars : GSC_LUCKY_CLIENT_ID + GSC_LUCKY_CLIENT_SECRET + GSC_LUCKY_REFRESH_TOKEN
 *     (idéal pour config Claude Desktop : pas de fichier credentials à gérer)
 *  3. OAuth via fichier : ~/.config/mcp-gsc-lucky/credentials.json (écrit par le helper)
 *
 * Scope : webmasters.readonly — lecture seule.
 */
import { GoogleAuth, OAuth2Client } from "google-auth-library";
import { existsSync } from "fs";
import { readStoredCredentials } from "./storage.js";

export const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export type AuthMode = "service_account" | "oauth_env" | "oauth_file";

export interface AuthProvider {
  mode: AuthMode;
  /** Renvoie un access token valide (la lib gère le refresh automatiquement). */
  getAccessToken(): Promise<string>;
  defaultSiteUrl?: string;
}

const trim = (v: string | undefined) => (v || "").trim();

export async function resolveAuth(): Promise<AuthProvider> {
  // ---------------------------------------------------------------
  // 1. Service account (priorité haute)
  // ---------------------------------------------------------------
  const saKeyPath = trim(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  if (saKeyPath && existsSync(saKeyPath)) {
    const auth = new GoogleAuth({
      keyFile: saKeyPath,
      scopes: [GSC_SCOPE],
    });
    const client = await auth.getClient();
    return {
      mode: "service_account",
      async getAccessToken() {
        const { token } = await client.getAccessToken();
        if (!token) throw new Error("Failed to obtain access token from service account.");
        return token;
      },
      defaultSiteUrl: trim(process.env.GSC_DEFAULT_SITE_URL) || undefined,
    };
  }

  // ---------------------------------------------------------------
  // 2. OAuth via env vars (pour config Claude Desktop directe)
  // ---------------------------------------------------------------
  const envClientId = trim(process.env.GSC_LUCKY_CLIENT_ID);
  const envClientSecret = trim(process.env.GSC_LUCKY_CLIENT_SECRET);
  const envRefreshToken = trim(process.env.GSC_LUCKY_REFRESH_TOKEN);

  if (envClientId && envClientSecret && envRefreshToken) {
    const oauth2 = new OAuth2Client(envClientId, envClientSecret);
    oauth2.setCredentials({ refresh_token: envRefreshToken });
    return {
      mode: "oauth_env",
      async getAccessToken() {
        const { token } = await oauth2.getAccessToken();
        if (!token) throw new Error("Failed to obtain access token (refresh_token may be revoked).");
        return token;
      },
      defaultSiteUrl: trim(process.env.GSC_DEFAULT_SITE_URL) || undefined,
    };
  }

  // ---------------------------------------------------------------
  // 3. OAuth via fichier credentials (~/.config/mcp-gsc-lucky/)
  // ---------------------------------------------------------------
  const stored = readStoredCredentials();
  if (stored) {
    const oauth2 = new OAuth2Client(stored.client_id, stored.client_secret);
    oauth2.setCredentials({ refresh_token: stored.refresh_token });
    return {
      mode: "oauth_file",
      async getAccessToken() {
        const { token } = await oauth2.getAccessToken();
        if (!token) throw new Error("Failed to obtain access token (refresh_token may be revoked).");
        return token;
      },
      defaultSiteUrl:
        trim(process.env.GSC_DEFAULT_SITE_URL) ||
        stored.primary_site_url ||
        stored.available_site_urls?.[0],
    };
  }

  // ---------------------------------------------------------------
  // Aucune credential trouvée : message d'aide
  // ---------------------------------------------------------------
  throw new Error(
    [
      "No Google Search Console credentials found.",
      "",
      "Option A — OAuth via environment variables (recommended for Claude Desktop):",
      "  1. Run once: node dist/auth.js",
      "  2. Copy the JSON block it prints into your claude_desktop_config.json",
      "",
      "Option B — OAuth via credentials file:",
      "  Run: node dist/auth.js  (it saves a local credentials file automatically)",
      "",
      "Option C — Service account (multi-client agency setup):",
      "  Set GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json",
    ].join("\n"),
  );
}
