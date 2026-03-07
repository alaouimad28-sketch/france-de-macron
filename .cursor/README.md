# MCP (Model Context Protocol) — Cursor

This project configures MCP servers in **`.cursor/mcp.json`** so Cursor (and Cloud Agents) can use them during chat.

## Configured servers

| Server             | Type  | Purpose                                                                                      |
| ------------------ | ----- | -------------------------------------------------------------------------------------------- |
| **supabase-local** | URL   | Supabase local: SQL, tables, migrations, types, logs. Requires local Supabase to be running. |
| **fetch**          | `npx` | Fetch URLs and get content as markdown (docs, APIs, etc.). Uses `mcp-fetch-node`.            |

## Prerequisites

- **supabase-local**: run `pnpm run db:start` so the MCP is available at `http://127.0.0.1:54321/mcp`.
- **fetch**: Node.js (already used by the project). First use may run `npx -y mcp-fetch-node` to install the package.

## How to use in Cursor

1. **Restart Cursor** after changing `.cursor/mcp.json`.
2. Open **Settings** → **Tools & MCP** (or `Ctrl+Shift+J` / `Cmd+Shift+J`) to see connected servers and toggle them.
3. In chat, the agent can use MCP tools when relevant (you may be asked to approve tool use).
4. **Logs**: Output panel → “MCP Logs” (`Ctrl+Shift+U` / `Cmd+Shift+U`).

## Adding or changing servers

Edit `.cursor/mcp.json`:

- **URL-based** (e.g. Supabase local):
  ```json
  "server-name": {
    "url": "http://127.0.0.1:54321/mcp"
  }
  ```
- **Command-based** (e.g. npx):
  ```json
  "server-name": {
    "command": "npx",
    "args": ["-y", "some-mcp-package"],
    "env": { "API_KEY": "optional-secret" }
  }
  ```

Then save and restart Cursor.

## References

- [Cursor: MCP integrations](https://cursor.com/help/customization/mcp)
- [Cursor Marketplace](https://cursor.com/marketplace) — discover and add MCP servers
- Project docs: `docs/INDEX.md`, `docs/TESTER-LE-SITE.md`, `docs/kickoff.md` (Supabase MCP usage)
