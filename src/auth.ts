#!/usr/bin/env node
/**
 * mcp-gsc-lucky-auth — assistant d'authentification OAuth.
 *
 * Procédure :
 *   1. Créer un OAuth client type "Desktop" dans Google Cloud Console
 *      (API Search Console activée au préalable).
 *   2. Lancer : mcp-gsc-lucky-auth
 *   3. Coller Client ID et Client Secret.
 *   4. Le navigateur s'ouvre → consent → refresh token récupéré.
 *   5. Choix de la propriété par défaut.
 *   6. Sauvegarde dans ~/.config/mcp-gsc-lucky/credentials.json (chmod 600).
 */
import http from "http";
import { createServer } from "net";
import { URL } from "url";
import { createInterface } from "readline/promises";
import openModule from "open";
import { randomBytes } from "crypto";
import { writeStoredCredentials, CREDENTIALS_PATH, type StoredCredentials } from "./storage.js";

const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const PORT_START = 8085;
const PORT_END = 8199;

// ===========================================================================
// CLI PROMPTS
// ===========================================================================

async function prompt(question: string): Promise<string> {
  process.stderr.write(`${question}: `);
  const rl = createInterface({ input: process.stdin, output: process.stderr, terminal: false });
  const answer = await rl.question("");
  rl.close();
  return answer.trim();
}

async function promptChoice<T>(
  message: string,
  choices: Array<{ label: string; value: T }>,
): Promise<T> {
  process.stderr.write(`\n${message}\n`);
  choices.forEach((c, i) => process.stderr.write(`  ${i + 1}. ${c.label}\n`));
  while (true) {
    const raw = await prompt(`Enter a number (1-${choices.length})`);
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 1 && n <= choices.length) {
      return choices[n - 1].value;
    }
    process.stderr.write(`Invalid choice. Try again.\n`);
  }
}

// ===========================================================================
// LOOPBACK OAUTH SERVER
// ===========================================================================

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = createServer();
    s.once("error", () => resolve(false));
    s.once("listening", () => s.close(() => resolve(true)));
    s.listen(port, "127.0.0.1");
  });
}

async function findFreePort(): Promise<number> {
  for (let p = PORT_START; p <= PORT_END; p++) {
    if (await isPortFree(p)) return p;
  }
  throw new Error(`No free port in ${PORT_START}-${PORT_END}.`);
}

function renderPage(title: string, body: string): string {
  const esc = (s: string) =>
    s.replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
    );
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{font:15px -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:480px;margin:80px auto;padding:0 24px;color:#222}h1{font-size:22px}p{line-height:1.5}</style>
</head><body><h1>${esc(title)}</h1><p>${esc(body)}</p></body></html>`;
}

interface OAuthCallback {
  code: string;
  state: string;
}

function waitForCallback(
  port: number,
  expectedState: string,
  authUrl: string,
): Promise<OAuthCallback> {
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      fn();
    };

    const server = http.createServer((req, res) => {
      if (!req.url) {
        res.writeHead(404).end();
        return;
      }
      const u = new URL(req.url, `http://127.0.0.1:${port}`);
      const code = u.searchParams.get("code");
      const state = u.searchParams.get("state");
      const error = u.searchParams.get("error");

      if (error) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          renderPage("Authorization denied", `Google returned: ${error}. Close this tab and retry.`),
        );
        finish(() => {
          server.close();
          reject(new Error(`OAuth denied: ${error}`));
        });
        return;
      }
      if (!code) {
        res.writeHead(204).end();
        return;
      }
      if (state !== expectedState) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderPage("Security check failed", "State mismatch. Please retry the command."));
        finish(() => {
          server.close();
          reject(new Error("OAuth state mismatch"));
        });
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        renderPage("Signed in successfully", "You can close this tab and return to your terminal."),
      );
      finish(() => {
        setTimeout(() => server.close(), 200);
        resolve({ code, state });
      });
    });

    server.on("error", (err) =>
      finish(() => reject(new Error(`Loopback server failed: ${err.message}`))),
    );

    server.listen(port, "127.0.0.1", () => {
      process.stderr.write(`\nOpening your browser to sign in with Google...\n`);
      process.stderr.write(`If it doesn't open automatically, visit:\n  ${authUrl}\n\n`);
      openModule(authUrl).catch((err: Error) => {
        process.stderr.write(`[warn] Could not auto-open browser: ${err.message}\n`);
      });
    });

    setTimeout(
      () =>
        finish(() => {
          server.close();
          reject(new Error("Timed out waiting for OAuth callback (5 min)."));
        }),
      5 * 60 * 1000,
    );
  });
}

// ===========================================================================
// MAIN FLOW
// ===========================================================================

async function run(): Promise<void> {
  process.stderr.write(
    [
      "",
      "=== mcp-gsc-lucky — OAuth setup ===",
      "",
      "Before running this helper, create an OAuth client in Google Cloud Console:",
      "  1. Enable the 'Google Search Console API' for a project.",
      "  2. Go to 'APIs & Services' > 'Credentials' > 'Create credentials' > 'OAuth client ID'.",
      "  3. Application type: 'Desktop app'.",
      "  4. Copy the Client ID and Client Secret when prompted below.",
      "",
    ].join("\n"),
  );

  const clientId =
    (process.env.GSC_LUCKY_CLIENT_ID || "").trim() ||
    (await prompt("Paste your OAuth Client ID"));
  const clientSecret =
    (process.env.GSC_LUCKY_CLIENT_SECRET || "").trim() ||
    (await prompt("Paste your OAuth Client Secret"));

  if (!clientId || !clientSecret) {
    throw new Error("Client ID and Client Secret are required.");
  }

  const port = await findFreePort();
  const redirectUri = `http://127.0.0.1:${port}`;
  const state = randomBytes(16).toString("hex");

  const authParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GSC_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`;

  const { code } = await waitForCallback(port, state, authUrl);
  process.stderr.write("Authorization code received. Exchanging for tokens...\n");

  // Échange du code → tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });
  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!tokenRes.ok || tokenJson.error) {
    throw new Error(
      `Token exchange failed: ${tokenJson.error_description || tokenJson.error || tokenRes.statusText}`,
    );
  }
  if (!tokenJson.refresh_token) {
    throw new Error(
      "Google did not return a refresh token. Revoke access at " +
        "https://myaccount.google.com/permissions and re-run this command.",
    );
  }
  if (!tokenJson.access_token) {
    throw new Error("Google did not return an access token.");
  }

  process.stderr.write("Tokens received. Listing accessible Search Console properties...\n");

  // Lister les sites via fetch direct sur l'API REST
  const sitesRes = await fetch("https://searchconsole.googleapis.com/webmasters/v3/sites", {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      Accept: "application/json",
    },
  });
  if (!sitesRes.ok) {
    throw new Error(`Failed to list sites: ${sitesRes.status} ${sitesRes.statusText}`);
  }
  const sitesJson = (await sitesRes.json()) as {
    siteEntry?: Array<{ siteUrl?: string; permissionLevel?: string }>;
  };
  const sites = (sitesJson.siteEntry || [])
    .map((s) => ({ siteUrl: s.siteUrl || "", permissionLevel: s.permissionLevel || "" }))
    .filter((s) => s.siteUrl !== "");

  if (sites.length === 0) {
    throw new Error(
      "No Search Console properties found for this Google account. " +
        "Make sure you signed in with an account that has access to at least one property.",
    );
  }

  let chosen = sites[0];
  if (sites.length > 1) {
    chosen = await promptChoice(
      "Which property should be used by default?",
      sites.map((s) => ({
        label: `${s.siteUrl}  (${s.permissionLevel})`,
        value: s,
      })),
    );
  } else {
    process.stderr.write(`\nOnly one property accessible: ${chosen.siteUrl}. Auto-selecting.\n`);
  }

  const stored: StoredCredentials = {
    version: 1,
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: tokenJson.refresh_token,
    primary_site_url: chosen.siteUrl,
    available_site_urls: sites.map((s) => s.siteUrl),
    saved_at: new Date().toISOString(),
  };
  writeStoredCredentials(stored);

  // Bloc de config Claude Desktop prêt à coller, avec les env vars OAuth.
  // On cherche à afficher le chemin absolu vers dist/index.js pour que l'utilisateur
  // n'ait plus qu'à le copier tel quel.
  const serverIndexPath = resolveServerPath();
  const claudeConfigBlock = {
    "gsc-lucky": {
      command: "node",
      args: [serverIndexPath],
      env: {
        GSC_LUCKY_CLIENT_ID: clientId,
        GSC_LUCKY_CLIENT_SECRET: clientSecret,
        GSC_LUCKY_REFRESH_TOKEN: tokenJson.refresh_token,
        GSC_DEFAULT_SITE_URL: chosen.siteUrl,
      },
    },
  };

  process.stderr.write(
    [
      "",
      "============================================================",
      "  Done! You now have TWO ways to use this MCP.",
      "============================================================",
      "",
      `  Default property: ${chosen.siteUrl}`,
      `  Permission:       ${chosen.permissionLevel}`,
      "",
      "------------------------------------------------------------",
      "  OPTION A — Use env vars in claude_desktop_config.json",
      "  (recommended: self-contained, no extra file to manage)",
      "------------------------------------------------------------",
      "",
      "  Paste this INSIDE the \"mcpServers\" object of your",
      "  claude_desktop_config.json:",
      "",
      indentJson(claudeConfigBlock),
      "",
      "  Then fully quit Claude Desktop (Cmd+Q / systray → Quit)",
      "  and reopen it.",
      "",
      "------------------------------------------------------------",
      "  OPTION B — Use the saved credentials file",
      "  (no env vars needed in Claude config)",
      "------------------------------------------------------------",
      "",
      `  Credentials saved to:  ${CREDENTIALS_PATH}`,
      "",
      "  Your claude_desktop_config.json only needs:",
      "",
      indentJson({
        "gsc-lucky": {
          command: "node",
          args: [serverIndexPath],
        },
      }),
      "",
      "============================================================",
      "",
    ].join("\n"),
  );
}

/** Indente un objet JSON de 4 espaces pour un copier-coller propre. */
function indentJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2)
    .split("\n")
    .map((line) => "    " + line)
    .join("\n");
}

/** Renvoie le chemin absolu vers dist/index.js, en s'appuyant sur import.meta.url. */
function resolveServerPath(): string {
  try {
    const thisFile = new URL(import.meta.url).pathname;
    // Sur Windows, pathname commence par /C:/..., on enlève le / initial
    const normalized = /^\/[A-Za-z]:/.test(thisFile) ? thisFile.slice(1) : thisFile;
    const dir = normalized.replace(/[\\/][^\\/]+$/, "");
    const candidate = `${dir}/index.js`;
    // Normalise les séparateurs selon la plateforme
    return process.platform === "win32" ? candidate.replace(/\//g, "\\") : candidate;
  } catch {
    return "/absolute/path/to/mcp-gsc-lucky/dist/index.js";
  }
}

run().catch((err) => {
  process.stderr.write(`\n[error] ${(err as Error).message}\n`);
  process.exit(1);
});
