# DiskPilot: key processes and decisions

## The simple view

**What it is:** an app that shows what's filling your Mac's System Data and helps you safely delete what you don't need.

**How it works:**

```
Run the audit script → audit.txt → Dashboard shows it → for each item:
   What is it?  Where is it?  How big?  Safe to delete?
      unclear → drill down (look inside, ask again)
      safe    → Claude writes the command → you click Run → moved to Trash
      not safe → keep it
Repeat until only what you need is left.
```

**Version 1 is deliberately small:**
- **audit.txt is the only data.** The script's output is everything the app knows.
- **Claude's context = audit.txt.** Nothing more is needed for Claude to explain and propose cleanups.
- **The dashboard shows only what's in audit.txt.** No history, trends, alerts or extra metrics yet; those come later, when real use shows what's missing.
- **Three safety rules:** move to Trash (never `rm`), you approve every deletion, never touch app data or system folders.

Everything below is the detail behind this.

---

How the project came about, the manual process it automates, and every decision made so far. The acceptance test `tests/acceptance/first-cleanup.test.ts` replays this session.

## 1. The original problem

- MacBook Air, 228 GB disk. "System Data" had grown to **80 GB**, with only **15 GB free**, leaving no room for new projects.
- After one manual session: **56.66 GB free**, System Data **52.3 GB**, about **41.7 GB recovered**.

## 2. The manual process (what the app automates)

| Step | What we did | What we learned |
|---|---|---|
| 1. Audit | Ran `mac_space_audit.sh` (read-only) → `audit.txt` | The audit is the context everything else needs. System Data was mostly dev caches and app data, not macOS |
| 2. Safe caches | Cleared ShipIt update leftovers, Firefox caches, npm, pnpm, Homebrew, pipenv, Gradle, VS Code caches | ~10 GB, and they all rebuild themselves |
| 3. Fix errors | pnpm failed on a stray `.DS_Store`; `pip` didn't exist (`pip3`); `bun pm cache rm` needs a project folder | Each tool has quirks; the app must know them |
| 4. Drill down | `.vscode` was 23 GB → `extensions` 23 GB → 122 old versions of ChatGPT, Claude Code, Gemini, etc. | A big folder is a question, not an answer. Look inside until the cause is clear |
| 5. Dry run | Listed folders not referenced in `extensions.json` and checked the in-use versions weren't on the list | Always show the list before deleting |
| 6. Delete | Removed the 122 stale folders | ~20 GB in one step, the biggest win |
| 7. Leave app data | WhatsApp (5.4 GB), Chrome (5.2 GB): cleared from inside the apps only | `rm` on app data can lose messages or logins |
| 8. Verify | Restarted, checked Storage | System Data figures lag; trust measured free space |

## 3. Product decisions

| # | Decision | Why |
|---|---|---|
| D1 | Build a desktop app, **DiskPilot**, that puts dashboard, Claude chat and terminal in one window | Switching between chat, Terminal and the Storage panel was the bottleneck |
| D2 | **Electron + React + TypeScript** (not SwiftUI or Tauri) | Matches the existing React/TS skill set; fastest route to a polished UI |
| D3 | The workflow is **Script → File & folder data → Process & clean → Dashboard** | The owner's own description of the product |
| D4 | Every item answers **four questions**: what, where (path), how much (bytes), is it safe (tier + reason) | Those are the questions asked for every folder during the manual cleanup |
| D5 | **Drill down** when any answer is unclear, and turn each discovery into a **pattern detector** | The `.vscode` case: the scanner should find it automatically next time |
| D6 | The scanner is a **port of `mac_space_audit.sh`**; it writes **`audit.txt`** (the same sections as the script) and keeps the same data as JSON for the UI | One source of truth; code reads the JSON, people and Claude read the text |
| D7 | Keep the original script in the repo as a cross-check (within 5%) | The script validates the scanner |
| D8 | **Three safety tiers**: 1 safe cache, 2 review per item, 3 report only | Mirrors how each item was treated by hand |
| D9 | **Delete = move to Trash** | Every cleanup can be undone |
| D10 | **Dry run first, user approves**; Claude can never approve its own plan | The dry-run list was what made the extension cleanup safe |
| D11 | **Allowlist** of deletable paths, plus a never-touch list (`/System`, `Application Support`, `Group Containers`, Mail, Messages, Keychains) | Safety enforced in code, not only in Claude's prompt |
| D12 | **No `sudo`**; quit apps before clearing their caches | Matches what was done by hand |
| D13 | A **shared terminal** with Me / Shared / Claude modes | The owner wants to type, and Claude to help |
| D14 | Claude's commands go through a **command policy**: read-only runs automatically, cleanup commands need a click, `rm`/`sudo`/redirects are blocked | Lets Claude help in the shell without being able to do damage |
| D15 | A **skill** (`mac-disk-cleanup`) captures the manual workflow for Claude Code / Claude desktop until the app exists | Repeatable right away |
| D16 | Build in **phases** (PLAN.md), with Claude Code working from `CLAUDE.md` | Each phase ends in a runnable app |
| D17 | **Version 1 = audit.txt only.** Claude's context is audit.txt; the dashboard shows only what's in audit.txt; history, trends, alerts and extra metrics wait | Keep it as simple as it can be; add insight when users ask for it |

## 4. Bottlenecks to optimize later

1. **Scan time** (~60 s full scan): rescan only folders FSEvents reports as changed.
2. **Claude latency and tokens**: send a compact snapshot summary, not the whole snapshot.
3. **Waiting for approval**: consider auto-approving Tier 1 caches after the user opts in.
4. **Apps that must be quit** before their caches can be cleared.

## 5. Open questions

- Dashboard details (charts, treemap, layout): to design later.
- Whether Tier 1 can ever run without a click (see bottleneck 3).
- Support for Docker, Xcode simulators and Ollama (not present on this Mac).
