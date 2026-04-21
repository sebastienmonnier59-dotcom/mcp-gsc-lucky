import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "fs";
import { homedir, platform } from "os";
import { dirname, join } from "path";
function getConfigDir() {
  if (platform() === "win32") {
    const appData = process.env.APPDATA || join(homedir(), "AppData", "Roaming");
    return join(appData, "mcp-gsc-lucky");
  }
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg && xdg.trim() !== "" ? xdg : join(homedir(), ".config");
  return join(base, "mcp-gsc-lucky");
}
const CREDENTIALS_PATH = join(getConfigDir(), "credentials.json");
function readStoredCredentials(path = CREDENTIALS_PATH) {
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1) {
      console.error(`[storage] Credentials file version ${parsed.version} unsupported (expected 1).`);
      return null;
    }
    return parsed;
  } catch (err) {
    console.error(`[storage] Failed to read credentials: ${err.message}`);
    return null;
  }
}
function writeStoredCredentials(creds, path = CREDENTIALS_PATH) {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 448 });
  }
  writeFileSync(path, JSON.stringify(creds, null, 2), "utf-8");
  try {
    chmodSync(path, 384);
  } catch {
  }
}
export {
  CREDENTIALS_PATH,
  readStoredCredentials,
  writeStoredCredentials
};
