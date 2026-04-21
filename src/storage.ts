/**
 * Stockage persistant des credentials OAuth.
 * Chemin : ~/.config/mcp-gsc-lucky/credentials.json (Linux/macOS)
 *          %APPDATA%/mcp-gsc-lucky/credentials.json (Windows)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "fs";
import { homedir, platform } from "os";
import { dirname, join } from "path";

export interface StoredCredentials {
  version: 1;
  client_id: string;
  client_secret: string;
  refresh_token: string;
  primary_site_url?: string;
  available_site_urls?: string[];
  saved_at: string;
}

function getConfigDir(): string {
  if (platform() === "win32") {
    const appData = process.env.APPDATA || join(homedir(), "AppData", "Roaming");
    return join(appData, "mcp-gsc-lucky");
  }
  // macOS + Linux : XDG_CONFIG_HOME ou ~/.config
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg && xdg.trim() !== "" ? xdg : join(homedir(), ".config");
  return join(base, "mcp-gsc-lucky");
}

export const CREDENTIALS_PATH = join(getConfigDir(), "credentials.json");

export function readStoredCredentials(path: string = CREDENTIALS_PATH): StoredCredentials | null {
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw) as StoredCredentials;
    if (parsed.version !== 1) {
      console.error(`[storage] Credentials file version ${parsed.version} unsupported (expected 1).`);
      return null;
    }
    return parsed;
  } catch (err) {
    console.error(`[storage] Failed to read credentials: ${(err as Error).message}`);
    return null;
  }
}

export function writeStoredCredentials(
  creds: StoredCredentials,
  path: string = CREDENTIALS_PATH,
): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  writeFileSync(path, JSON.stringify(creds, null, 2), "utf-8");
  try {
    chmodSync(path, 0o600);
  } catch {
    // Windows : pas de chmod POSIX
  }
}
