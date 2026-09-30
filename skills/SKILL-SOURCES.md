# Installed skill sources (2026-09-28)

Provenance for skills installed from external repos. Update = re-fetch at newer ref and overwrite the dir.

| Skill | Source repo | Ref / SHA at install | Notes |
| --- | --- | --- | --- |
| playwright-cli | `microsoft/playwright-cli` (npm `@playwright/cli` 0.1.21) | installed by `playwright-cli install --skills=agents -g` | official; CLI lives in `~/.local/opt/playwright-cli`, bin symlinked to `~/.local/bin/playwright-cli` |
| impeccable | `pbakaus/impeccable` | HEAD `114ea1d3838fca73b253af45f873b9c4f5f213c8` (skill version 4.4.0) | copied from repo dir `.agents/skills/impeccable`; binary launcher inside `scripts/` |
| web-design-guidelines | `vercel-labs/agent-skills` | HEAD `063bee94c3f4df8453406c830b0a7df0f2860278` | copied from repo dir `skills/web-design-guidelines` |
| chrome-devtools | `ChromeDevTools/chrome-devtools-mcp` | tag `chrome-devtools-mcp-v1.10.1` | matches installed MCP server version; other skills in repo `skills/` (a11y-debugging, troubleshooting, etc.) not installed |
| pixel-perfect | `Huc91/pixel-perfect-skill` | HEAD `2c677882743ebf0fcdc0bedebf055283182a04ce` | QA-only (capture/compare vs Figma or image reference, no code edits); 0-star personal repo, reviewed before install; `context: fork` frontmatter field is Claude-specific, ignored here |

Companion MCP server (not a skill): `chrome-devtools` in `~/.zcode/cli/config.json` — npm `chrome-devtools-mcp@latest` (1.10.1), `--headless --isolated --executablePath=~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome --no-usage-statistics --no-performance-crux`. No system Chrome on this machine; Playwright's chromium build is used instead.
