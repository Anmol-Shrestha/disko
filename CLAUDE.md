# DiskPilot

An interface that helps users analyze their Mac's System Data space and make informed decisions about what to delete.

**Script → File & folder data → Process & clean → Dashboard**

## Version 1: keep it simple

Do not make it more complicated than it has to be. This section overrides anything below that goes further.

- **audit.txt is the only data source.** The scanner runs the audit (a port of `scripts/mac_space_audit.sh`) and writes `audit.txt` with the same sections as the script. Everything in v1 is built from that one audit.
- **Claude's context is audit.txt, and only audit.txt.** `get_storage_snapshot` returns the latest audit.txt text. Claude explains items, drills down and proposes cleanups from it.
- **The dashboard shows only what's in audit.txt:** disk overview, local snapshots, known space hogs, top folders in `~/Library`, `Application Support`, `Caches`, home dot-folders, `node_modules` and venvs, each item with what / where / how much / safe. Nothing the audit doesn't contain.
- **Not in v1** (later, when users need it): SQLite history, trends, growth alerts, FSEvents watching, menu bar item, treemaps, extra metrics. Don't build them, and don't add hooks for them yet.
- The scanner keeps the same audit data as typed JSON for the UI to render (code never parses `du -h` text); audit.txt is rendered from that same data, so the two always match.

## Core workflow (the product, in the owner's words)

1. Scout the entire system by running a script (`scripts/mac_space_audit.sh`, ported into the scanner).
2. Get insight into the storage system (the dashboard).
3. For each file or folder, answer four questions. Every item in the UI and in Claude's tools must expose all four:
   - **What** is taking up storage? (name + category, e.g. "uv cache", "old ChatGPT extension version")
   - **Where** is it? (full path)
   - **How much** space is it taking? (exact bytes, shown formatted)
   - **Is it safe to delete?** (tier 1 safe / tier 2 review / tier 3 keep, with a one-line reason)
   - **If any answer is unclear, drill down.** Look inside the item (its largest children, sorted by size) and ask the four questions again, level by level, until the cause is found. Example from the first cleanup: `~/.vscode` was 23 GB → `extensions` was 23 GB → 122 folders were old versions of the same extensions (ChatGPT, Claude Code, Gemini…) not listed in `extensions.json` → safe to delete, ~20 GB freed. A big folder is a question, not an answer.
4. If it is safe to delete, Claude writes the commands to perform the operation, based on that insight.
5. The file gets deleted (moved to the Trash; see Safety rules).
6. Repeat until all unnecessary files are gone.

Model these four answers as fields on every `AuditItem`: `what`, `path`, `bytes`, `safety: { tier, reason, recommended }`, where `recommended` is `'remove' | 'keep' | 'review'` (e.g. a stale school venv is tier 2 / remove, an active project's venv tier 2 / keep, an ML model tier 2 / review). The dashboard's item list and `audit.txt` both show them in that order. `CleanupPlan` items carry `path`, `bytes`, `tier`, `action` and optional `preSteps` (e.g. removing pnpm's stray `.DS_Store`).

**Acceptance test:** `tests/acceptance/first-cleanup.test.ts` replays the first manual cleanup against a fixture built from the real audit (`tests/fixtures/first-cleanup.ts`). It is the definition of "the app works". Never weaken its assertions to make it pass; fix the code. History and reasoning: `docs/DECISIONS.md`.

### Drill-down and pattern detectors

- Items with no matching rule get `safety.tier = "unknown"` and a **Drill down** action (dashboard) / `drill_down(path, depth)` tool (Claude) that returns the top children by size, each as an `AuditItem`. Drilling stops when a rule or detector explains the item, or at a depth limit (default 4).
- **Pattern detectors** turn a drill-down discovery into something the scanner finds automatically next time. Each one takes a folder and returns items with a reason. Start with:
  - `duplicateVersions`: sibling folders named `<id>-<version>[-<platform>]` where only one version is in use (VS Code / Cursor extensions via `extensions.json`; `~/.nvm/versions/node`; Homebrew Cellar old versions)
  - `staleEnvironments`: `node_modules` / `.venv` / `venv` whose project hasn't changed in 90+ days
  - `rebuildableCache`: folders a known tool regenerates (uv, npm, pnpm, gradle, pip, bun)
- When the user and Claude find a new pattern while drilling down, add it as a detector (with a fixture test) so the next scan catches it without manual investigation.

## The app

It combines three things in one window:

1. **Storage dashboard**: the latest audit, shown visually (v1: audit.txt contents only).
2. **Claude chat**: an agent that reads the dashboard's data, explains what's using space and proposes cleanups.
3. **Terminal**: a real shell. Commands the agent runs are shown here too.

The panels share state: chat answers come from the scanner's data, agent actions appear in the terminal, and the dashboard refreshes after every cleanup.

UI reference: the "DiskPilot – Main Window" design (dark, title bar + sidebar, a dashboard row of Free space / Categories / Bloat alerts, then Chat and Terminal side by side). Build PLAN.md phase by phase.

## Where it starts: the audit

The app is built on `scripts/mac_space_audit.sh`, the read-only audit used for the first manual cleanup. The scanner is a port of that script, but it produces structured data instead of text:

- `scanner` runs the same checks (disk overview, local snapshots, known space hogs, top children of `~/Library`, `Application Support`, `Caches`, `Group Containers` and home dot-folders, `node_modules`, venvs) and returns one `AuditSnapshot` (JSON, sizes in exact bytes, per-item category, tier and last-modified).
- That snapshot is the **single source of truth**: the dashboard renders it, and Claude receives it as audit.txt through `get_storage_snapshot`. Never parse `du -h` text output in app code.
- After each scan, write `audit.txt` (same sections as the script's output) to the app's userData folder, with an "Open latest audit" menu item. It's the file the user can read, share or paste, and Claude's context.
- Keep `scripts/mac_space_audit.sh` unchanged in the repo. An integration test (macOS only, opt-in) runs it and checks that the scanner's totals per section match within 5%.

## Stack

- **Electron + React + TypeScript**, scaffolded with `electron-vite` (react-ts template)
- **Terminal:** `xterm.js` (+ `@xterm/addon-fit`) in the renderer, `node-pty` in the main process
- **Agent:** Claude Agent SDK (TypeScript) in the main process, with custom tools exposed through an in-process MCP server. API key read from the macOS Keychain (`keytar` or `safeStorage`), never hard-coded or committed
- **Scanner:** `du -sk` subprocesses and Node `fs` walks in a `worker_thread`; `fs.statfs('/')` for free/total space
- **Watching:** `@parcel/watcher` (native FSEvents) on tracked folders, debounced rescans
- **Storage:** `better-sqlite3` in the app's userData folder
- **Charts:** Recharts
- **Styling:** CSS variables matching the design (ground `#0F1114`, panel `#171A1F`, border `#2A2F37`, text `#E8EAED`, muted `#9AA3AE`, accent `#6EE7B7`); Inter for UI, JetBrains Mono for code/terminal

Native modules (`node-pty`, `better-sqlite3`, `@parcel/watcher`) must be rebuilt for Electron with `@electron/rebuild` (run in `postinstall`).

## Architecture

```
src/
  main/            Electron main process (Node)
    scanner/       folder sizing, category rules, worker thread
    watcher/       (later) FSEvents subscriptions, debounce
    db/            (later) SQLite history and trends
    agent/         Claude Agent SDK session + custom tools
    cleanup/       dry-run planner + executor (Trash only)
    pty/           node-pty sessions
    ipc.ts         all ipcMain handlers, typed
  preload/         contextBridge API (the ONLY bridge to the renderer)
  renderer/        React app
    panels/        Dashboard, Chat, Terminal
    components/
    state/         store (Zustand) fed by IPC events
  shared/          types shared by main and renderer (IPC contracts, Category, Snapshot, CleanupPlan)
```

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` for the renderer. The renderer never touches `fs`, `child_process` or the API key.
- Every IPC channel is typed in `src/shared/ipc.ts`; the preload exposes only those functions.

## Safety rules (non-negotiable)

These come from doing the cleanup by hand. The app must enforce them in code, not only in the agent's prompt.

1. **Delete = move to Trash** via Electron `shell.trashItem()`. Never `rm -rf`, `fs.rm` or `unlink` on user paths, so every cleanup can be undone.
2. **Every cleanup is a plan first.** The executor only accepts a `CleanupPlan` produced by the dry-run planner, with an explicit user approval from the UI (an approval card in chat or a button on the dashboard). The agent cannot approve its own plan.
3. **Allowlist, not blocklist.** The executor only deletes paths that match a rule in `scanner/rules.ts` marked `deletable`, under the user's home folder, after resolving symlinks. Anything else is rejected with an error.
4. **Never touch:** `/System`, `/Library`, `/private`, `/usr`, OS update snapshots, `~/Library/Application Support/*`, `~/Library/Group Containers/*`, `~/Library/Messages`, `~/Library/Mail`, `~/Library/Keychains`. App data is report-only, with in-app instructions (e.g. "WhatsApp › Settings › Storage").
5. **No `sudo`**, ever, in the agent or the app.
6. **Quit-before-clean:** before clearing an app's cache, check if the app is running (`pgrep`/`NSRunningApplication` via `osascript`) and ask the user to quit it.
7. **Agent shell access is gated.** The agent's built-in Bash tool is disabled. It reaches the shell only through the shared-terminal tools below, and every command passes through `pty/commandPolicy.ts` first.

## Shared terminal

One real shell (node-pty) that both the user and Claude use. The user types normally at all times; Claude's commands are written into the same pty and tagged `claude ›` in the output.

Control modes (toggle in the terminal header, default **Shared**):

| Mode | User | Claude |
|---|---|---|
| Me | types freely | can read output only; no suggestions |
| Shared | types freely | auto-runs **read-only** commands; anything else appears as a suggestion card (Run / Edit first / Skip) |
| Claude | input locked, `Esc` or "Take over" returns control instantly | runs read-only commands and approved plans; still cannot run anything outside the policy |

`commandPolicy.ts` classifies every agent command before it touches the pty:

- **read-only** (auto-run in Shared/Claude): `du`, `df`, `ls`, `find` without `-delete`/`-exec`, `stat`, `tmutil listlocalsnapshots`, `nvm ls`, `pgrep`, `cat`/`head`/`tail` on files under `$HOME`. Parse with a shell-word parser (`shell-quote`) and reject pipes into anything not on this list, `;`, `&&` into non-read-only commands, redirection (`>`, `>>`), backticks and `$(...)`.
- **needs approval**: tool cleanup commands from the rules table (`uv cache clean`, `npm cache clean --force`, `brew cleanup -s`, `pnpm store prune`, `nvm uninstall <v>`). Shown as a suggestion card; runs only after the user clicks Run.
- **blocked**: everything else, including `rm`, `sudo`, `mv`, `chmod`, `curl | sh` and editors. Claude must use `plan_cleanup` → `request_approval` → `execute_cleanup` (Trash) instead.

User keystrokes are never filtered: it's the user's own shell. While Claude's command is running, user input is buffered and replayed after it finishes, so the two never interleave mid-line.

## Category rules (from the real audit)

Seed `scanner/rules.ts` with these. Tier 1 = safe cache (rebuilds itself), Tier 2 = needs per-item review, Tier 3 = report only.

| Category | Paths | Tier | Clean action |
|---|---|---|---|
| App update leftovers | `~/Library/Caches/*.ShipIt` | 1 | Trash |
| Browser caches | `~/Library/Caches/Mozilla`, `~/Library/Caches/Firefox`, `~/Library/Caches/Google` | 1 | Trash |
| Package caches | `~/.npm/_cacache`, `~/Library/Caches/pnpm`, `~/Library/pnpm/store`, `~/Library/Caches/pip`, `~/Library/Caches/pipenv`, `~/.cache/uv`, `~/.bun/install/cache`, `~/Library/Caches/Homebrew` | 1 | Prefer the tool's own command (`npm cache clean --force`, `uv cache clean`, `brew cleanup -s`, `pnpm store prune`); fall back to Trash |
| Build caches | `~/.gradle/caches`, `~/.gradle/wrapper/dists`, `~/Library/Developer/Xcode/DerivedData` | 1 | Trash |
| Test browsers | `~/.cache/selenium`, `~/.cache/puppeteer` | 1 | Trash |
| VS Code caches | `~/Library/Application Support/Code/{Cache,CachedData,CachedExtensionVSIXs,Code Cache,GPUCache,logs}` | 1 | Trash (only these subfolders) |
| Duplicate extensions | folders in `~/.vscode/extensions` (and `~/.cursor/extensions`) not listed in that folder's `extensions.json` (`relativeLocation`) | 2 | Trash; VS Code must be quit |
| Old Node versions | `~/.nvm/versions/node/*` except `nvm current` / default alias | 2 | `nvm uninstall` |
| Project environments | `node_modules`, `.venv`, `venv` under `~` (excluding `~/Library`) | 2 | Trash; flag "stale" when the project's last commit / mtime is older than 90 days |
| ML models | `~/.cache/huggingface/hub/*`, `~/.ollama/models` | 2 | Trash per model |
| App data | `~/Library/Application Support/*`, `~/Library/Group Containers/*` | 3 | Report + in-app instructions |
| macOS | swap, `/private/var/folders`, update snapshots (`tmutil listlocalsnapshots /`) | 3 | Report; a pending `MSUPrepareUpdate` snapshot means "install the macOS update" |

Known gotchas: a stray `.DS_Store` in `~/Library/Caches/pnpm/dlx` breaks `pnpm store prune` (remove it first); `pip` is `pip3` on macOS; `bun pm cache rm` needs a project dir; `nvm` is a shell function, so run it as `bash -lc 'source ~/.nvm/nvm.sh && nvm …'`.

## Conventions

- TypeScript strict mode; no `any` in `src/shared`.
- Sizes are stored as bytes (integers) and formatted only in the UI (`formatBytes`, base 1000 to match Finder).
- Tests: Vitest. Rules, the planner, the allowlist check and the extension-dedupe logic must have unit tests with fixture folders in a temp dir. Never run tests against the real home folder.
- Scans run off the main thread and never block the UI; the first full scan should finish in under 60 s on a 256 GB disk.
- Commit after each completed PLAN.md task.