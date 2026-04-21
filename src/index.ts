#!/usr/bin/env node
/**
 * mcp-gsc-lucky — serveur MCP pour Google Search Console.
 * Transport : stdio (pour Claude Desktop, Claude Code, etc.).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolveAuth } from "./auth-core.js";
import { GscClient } from "./gsc-client.js";
import { registerTools } from "./tools.js";

const PACKAGE_NAME = "mcp-gsc-lucky";
const PACKAGE_VERSION = "0.1.0";

// CLI flags de base
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  process.stderr.write(
    [
      `${PACKAGE_NAME} v${PACKAGE_VERSION}`,
      "",
      "MCP server for Google Search Console. Communicates over stdio.",
      "",
      "Usage:",
      `  ${PACKAGE_NAME}                 Start the MCP server (usually launched by Claude)`,
      `  ${PACKAGE_NAME}-auth            Run the OAuth helper (one-time setup)`,
      `  ${PACKAGE_NAME} --version       Print version`,
      `  ${PACKAGE_NAME} --help          Show this help`,
      "",
      "Environment variables:",
      "  GOOGLE_APPLICATION_CREDENTIALS   Path to a service account JSON key (takes priority).",
      "  GSC_DEFAULT_SITE_URL             Default property when site_url is omitted.",
      "",
    ].join("\n"),
  );
  process.exit(0);
}

if (process.argv.includes("--version") || process.argv.includes("-v")) {
  process.stdout.write(`${PACKAGE_VERSION}\n`);
  process.exit(0);
}

async function main(): Promise<void> {
  let auth;
  try {
    auth = await resolveAuth();
  } catch (err) {
    process.stderr.write(`[startup] ${(err as Error).message}\n`);
    process.exit(1);
  }

  process.stderr.write(
    `[startup] ${PACKAGE_NAME} v${PACKAGE_VERSION} — auth mode: ${auth.mode}` +
      (auth.defaultSiteUrl ? ` — default site: ${auth.defaultSiteUrl}` : "") +
      "\n",
  );

  const gsc = new GscClient(auth);

  // Sanity check : on fait un appel pour valider que les credentials fonctionnent.
  // Si ça échoue, on log mais on démarre quand même (certains SA peuvent avoir des scopes limités).
  try {
    const sites = await gsc.listSites();
    process.stderr.write(`[startup] Auth OK — ${sites.length} property(ies) accessible.\n`);
  } catch (err) {
    process.stderr.write(
      `[startup] Warning: initial auth check failed — ${(err as Error).message}\n`,
    );
    process.stderr.write("[startup] Server will start anyway; tool calls may fail.\n");
  }

  const server = new McpServer({
    name: PACKAGE_NAME,
    version: PACKAGE_VERSION,
  });

  registerTools(server, gsc);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`[startup] MCP server ready on stdio.\n`);
}

// Handlers de signaux propres
const shutdown = (sig: string) => {
  process.stderr.write(`[shutdown] ${sig} received — exiting.\n`);
  process.exit(0);
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  process.stderr.write(`[error] Unhandled rejection: ${String(reason)}\n`);
});

main().catch((err) => {
  process.stderr.write(`[fatal] ${(err as Error).stack || String(err)}\n`);
  process.exit(1);
});
