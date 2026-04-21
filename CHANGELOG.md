# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] — 2026-04-21

### Added
- Initial release.
- 7 tools: `gsc_list_sites`, `gsc_list_sitemaps`, `gsc_search_analytics`, `gsc_inspect_url`, `gsc_compare_performance`, `gsc_find_keyword_opportunities`, `gsc_get_top_pages`.
- Three auth modes:
  - Service account (via `GOOGLE_APPLICATION_CREDENTIALS`) — best for agency multi-client setups.
  - OAuth via env vars (`GSC_LUCKY_CLIENT_ID`, `GSC_LUCKY_CLIENT_SECRET`, `GSC_LUCKY_REFRESH_TOKEN`) — configured directly in `claude_desktop_config.json`, no external file.
  - OAuth via credentials file — saved automatically at `~/.config/mcp-gsc-lucky/credentials.json` (chmod 600).
- OAuth helper CLI (`dist/auth.js`):
  - Loopback-based browser sign-in with state verification.
  - Interactive property picker.
  - Prints two ready-to-paste JSON config blocks at the end (env-vars mode and file-mode).
- Build via esbuild (fast, no typecheck needed for emit — typecheck available via `npm run typecheck`).
