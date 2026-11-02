# DiskPilot build plan

Work through the phases in order. Each phase ends in a runnable app. Read CLAUDE.md first; its safety rules apply from Phase 1.

## Phase 0: Scaffold (½ day)

- [ ] `npm create @quick-start/electron@latest diskpilot -- --template react-ts`
- [ ] Add the folder layout from CLAUDE.md, strict TS, ESLint + Prettier, Vitest
- [ ] Window: 1440×900 default, min 1100×720, `titleBarStyle: 'hiddenInset'` so the traffic lights sit in our own title bar, dark background `#0F1114`
- [ ] Secure defaults: `contextIsolation`, `sandbox`, no `nodeIntegration`; a typed `window.api` from preload
- [ ] App shell matching the design: title bar, dashboard, chat and terminal panels (v1 sidebar: Overview and Settings only)

- [ ] Add `tests/acceptance/first-cleanup.test.ts` and its fixture as-is. It fails at first (red); each phase turns its `describe` blocks green. Run it with `npm run test:acceptance`, excluded from the default `npm test` until Phase 3 is done

**Done when:** `npm run dev` opens the shell, and `npm test` passes.

## Phase 1: Scanner + dashboard, read-only (2–3 days)

- [ ] Copy `mac_space_audit.sh` into `scripts/`; it's the spec for what the scanner measures
- [ ] `shared/types.ts`: `Category`, `Tier`, `FolderSize`, `DiskInfo`, `AuditSnapshot` (one object holding every section of the audit)
- [ ] `scanner/report.ts`: renders an `AuditSnapshot` as `audit.txt` with the same sections as the script
- [ ] `scanner/rules.ts` seeded from the CLAUDE.md table
- [ ] `scanner/worker.ts`: sizes each rule's paths with `du -sk`, plus top-N children of `~/Library/Application Support`, `~/Library/Caches`, `~/Library/Group Containers` and home dot-folders; finds `node_modules` / `.venv` / `venv` (prune, skip `~/Library`)
- [ ] `scanner/drillDown.ts`: `drillDown(path, depth)` returns the largest children as `AuditItem`s (what, path, bytes, safety); unknown items show a "Drill down" action on the dashboard
- [ ] `scanner/detectors/`: `duplicateVersions` (VS Code/Cursor extensions via `extensions.json`, nvm, Homebrew Cellar), `staleEnvironments`, `rebuildableCache`, each with fixture tests. Re-create the `.vscode` case: 3 versions of one extension, only the newest listed in `extensions.json` → the 2 older ones flagged safe
- [ ] `fs.statfs('/')` for free/total; System Data estimate = used − (Applications + Documents/Desktop/Downloads + other user-visible folders)
- [ ] Full Disk Access check: if `~/Library/Mail` is unreadable, show a banner with steps to grant access
- [ ] Dashboard (v1, audit.txt contents only): the disk overview (free / used), then each audit section as a list of items with what / where / how much / safe, biggest first, with a Drill down button on unclear items
- [ ] Rescan button + "scanned N min ago"
- [ ] Unit tests: rules matching, extension dedupe, env discovery on fixture folders

- [ ] Opt-in integration test (`npm run test:audit`, macOS only) that runs `scripts/mac_space_audit.sh` and compares section totals with the scanner's

**Done when:** the dashboard shows real numbers that match `mac_space_audit.sh` within ~5%, and `audit.txt` is written after each scan.

## Phase 2: Terminal panel (1 day)

- [ ] `pty/` spawns the user's login shell (`$SHELL -l`) with `node-pty`; one session per tab
- [ ] xterm.js with fit addon, JetBrains Mono, theme from CLAUDE.md colors; resize events go to the pty
- [ ] One shared session: `pty/sharedSession.ts` owns the pty, a write queue (user vs agent), output tagging (`claude ›` prefix) and the input buffer used while an agent command runs
- [ ] Mode toggle in the header: Me / Shared / Claude (see CLAUDE.md › Shared terminal); `Esc` always returns control to the user
- [ ] `pty/commandPolicy.ts` (read-only / needs approval / blocked) with thorough unit tests: pipes, `;`, `&&`, redirects, `$(...)`, backticks, `find -delete`, quoted paths with spaces
- [ ] Detect when a command finishes (shell integration marker via `PROMPT_COMMAND`/`precmd` printing an OSC sequence) so the agent can read exactly that command's output

**Done when:** you can run `du -sh ~/.cache/*` inside the app, and a test harness can submit an agent command that is auto-run, suggested or blocked according to the policy.

## Phase 3: Cleanup engine (2 days)

- [ ] `cleanup/planner.ts`: `planCleanup(ruleIds | paths) → CleanupPlan { items: {path, bytes, rule, action}[], totalBytes }`. Read-only
- [ ] `cleanup/guard.ts`: allowlist check (realpath, under `$HOME`, matches a deletable rule, not in the never-touch list). Reject everything else
- [ ] `cleanup/executor.ts`: requires a plan id + approval token issued by the UI; runs tool commands (`uv cache clean`, …) or `shell.trashItem()`; streams progress to the Claude actions tab
- [ ] Running-app check before clearing app caches
- [ ] After execution: rescan affected paths, write a row to the cleanup log
- [ ] Dashboard actions: "Clean" on Tier 1 alerts opens the same plan → approve flow
- [ ] Tests: guard rejects `/System`, symlinks escaping `$HOME`, `Application Support` roots, `..` paths; executor refuses unapproved plans

**Done when:** Tier 1 caches can be cleared from the dashboard, the files land in the Trash, and the whole first-cleanup acceptance test passes (then add it to the default `npm test`).

## Phase 4: Claude chat (2–3 days)

- [ ] API key setup screen → stored with `safeStorage` / Keychain
- [ ] `agent/session.ts`: Claude Agent SDK session in main; built-in Bash/Write/Edit tools disabled; system prompt = the cleanup workflow + safety rules
- [ ] Custom tools (in-process MCP server):
  - `get_storage_snapshot()`: latest categories, sizes, alerts
  - `list_items(category)`: folders inside a category with sizes and last-modified
  - `drill_down(path, depth)`: largest children of a folder as `AuditItem`s, with any detector findings, so Claude can investigate an unexplained big folder the way we did with `.vscode`
  - `plan_cleanup(items)`: returns a CleanupPlan (dry run)
  - `request_approval(planId)`: renders an approval card in chat and returns when the user approves or declines
  - `execute_cleanup(planId)`: only succeeds with the UI-issued approval token
  - `explain_in_app_steps(app)`: returns in-app cleanup steps for Tier 3 items
  - `terminal_run(command)`: goes through `commandPolicy`; read-only runs and returns output, approval-needed returns "suggested, waiting for user", blocked returns an error explaining which tool to use instead
  - `terminal_suggest(command, reason, expectedBytes)`: shows a suggestion card (Run / Edit first / Skip) and returns the user's choice plus the output
  - `terminal_read(lines)`: last N lines of the shared terminal, including what the user typed, so Claude can help with commands you ran yourself
- [ ] Chat UI: streaming messages, approval cards (items, sizes, "Approve & move to Trash" / "Review items"), tool activity mirrored to the Claude actions tab
- [ ] Suggested prompts: "What's bloating my disk?", "Clean safe caches", "Find stale projects"

**Done when:** asking "free up some space" produces a plan card, and approving it frees space that the dashboard then reflects.

## Phase 5 (after v1, only if users need it): History, trends and alerts

Not part of version 1. Skip this phase until the app is in use and there's a real need.

- [ ] SQLite schema: `snapshots(id, taken_at, free_bytes, total_bytes)`, `folder_sizes(snapshot_id, path, category, bytes)`, `cleanups(id, at, plan_json, freed_bytes)`
- [ ] Snapshot daily and after every cleanup; keep daily rows for 90 days, then weekly
- [ ] `@parcel/watcher` on Tier 1/2 roots; debounce 30 s; re-size only changed roots
- [ ] History page: free space over time, top growers this week/month, cleanup events marked on the chart
- [ ] Alerts: free space below a threshold (default 20 GB), a folder growing more than 1 GB/week, duplicate extensions above 1 GB
- [ ] Menu bar item (`Tray`) with free space and alerts; native notifications

**Done when:** the History page shows a trend, and an alert fires when a test folder grows past the threshold.

## Phase 6: Polish and ship (2 days)

- [ ] Settings: thresholds, tracked folders, scan schedule, launch at login
- [ ] Empty, loading and error states for every panel
- [ ] Code signing + notarization with `electron-builder` (`.dmg`, arm64)
- [ ] README with screenshots, architecture diagram and the safety model (good for your portfolio)

## Later ideas

- Treemap / sunburst drill-down view
- Docker, Xcode simulator and Ollama support
- Export a storage report (PDF/Markdown)
- Swift helper for faster scans and `NSRunningApplication` checks
