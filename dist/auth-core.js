import { GoogleAuth, OAuth2Client } from "google-auth-library";
import { existsSync } from "fs";
import { readStoredCredentials } from "./storage.js";
const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const trim = (v) => (v || "").trim();
async function resolveAuth() {
  const saKeyPath = trim(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  if (saKeyPath && existsSync(saKeyPath)) {
    const auth = new GoogleAuth({
      keyFile: saKeyPath,
      scopes: [GSC_SCOPE]
    });
    const client = await auth.getClient();
    return {
      mode: "service_account",
      async getAccessToken() {
        const { token } = await client.getAccessToken();
        if (!token) throw new Error("Failed to obtain access token from service account.");
        return token;
      },
      defaultSiteUrl: trim(process.env.GSC_DEFAULT_SITE_URL) || void 0
    };
  }
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
      defaultSiteUrl: trim(process.env.GSC_DEFAULT_SITE_URL) || void 0
    };
  }
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
      defaultSiteUrl: trim(process.env.GSC_DEFAULT_SITE_URL) || stored.primary_site_url || stored.available_site_urls?.[0]
    };
  }
  throw new Error(
    [
      "No Google Search Console credentials found.",
      "",
      "Option A \u2014 OAuth via environment variables (recommended for Claude Desktop):",
      "  1. Run once: node dist/auth.js",
      "  2. Copy the JSON block it prints into your claude_desktop_config.json",
      "",
      "Option B \u2014 OAuth via credentials file:",
      "  Run: node dist/auth.js  (it saves a local credentials file automatically)",
      "",
      "Option C \u2014 Service account (multi-client agency setup):",
      "  Set GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json"
    ].join("\n")
  );
}
export {
  GSC_SCOPE,
  resolveAuth
};
