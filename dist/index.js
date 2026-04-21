#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolveAuth } from "./auth-core.js";
import { GscClient } from "./gsc-client.js";
import { registerTools } from "./tools.js";
const PACKAGE_NAME = "mcp-gsc-lucky";
const PACKAGE_VERSION = "0.1.0";
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
      ""
    ].join("\n")
  );
  process.exit(0);
}
if (process.argv.includes("--version") || process.argv.includes("-v")) {
  process.stdout.write(`${PACKAGE_VERSION}
`);
  process.exit(0);
}
async function main() {
  let auth;
  try {
    auth = await resolveAuth();
  } catch (err) {
    process.stderr.write(`[startup] ${err.message}
`);
    process.exit(1);
  }
  process.stderr.write(
    `[startup] ${PACKAGE_NAME} v${PACKAGE_VERSION} \u2014 auth mode: ${auth.mode}` + (auth.defaultSiteUrl ? ` \u2014 default site: ${auth.defaultSiteUrl}` : "") + "\n"
  );
  const gsc = new GscClient(auth);
  try {
    const sites = await gsc.listSites();
    process.stderr.write(`[startup] Auth OK \u2014 ${sites.length} property(ies) accessible.
`);
  } catch (err) {
    process.stderr.write(
      `[startup] Warning: initial auth check failed \u2014 ${err.message}
`
    );
    process.stderr.write("[startup] Server will start anyway; tool calls may fail.\n");
  }
  const server = new McpServer({
    name: PACKAGE_NAME,
    version: PACKAGE_VERSION
  });
  registerTools(server, gsc);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`[startup] MCP server ready on stdio.
`);
}
const shutdown = (sig) => {
  process.stderr.write(`[shutdown] ${sig} received \u2014 exiting.
`);
  process.exit(0);
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  process.stderr.write(`[error] Unhandled rejection: ${String(reason)}
`);
});
main().catch((err) => {
  process.stderr.write(`[fatal] ${err.stack || String(err)}
`);
  process.exit(1);
});
