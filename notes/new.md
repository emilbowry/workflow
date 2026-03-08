Here is my inital plan, and my initial analysis and todo list:
````plan
# Lint-Fix Workflow — Architecture Plan

## 1. Overview

An automated, parallelised lint-fix system for Claude Code that minimises LLM involvement to only the two tasks that require judgement: analysing which rule to fix next, and producing the fix. Everything else — running tools, writing files, computing diffs, composing commits, managing retries — is handled by a deterministic TypeScript orchestrator script.

## 2. Design Principles

1. **LLMs only do what LLMs are good at.** Analysis (which rule is lowest effort) and code fixing (produce a corrected file). Nothing else.
2. **Everything else is deterministic.** ESLint, Prettier, file I/O, git, post-mortem assembly, prompt composition — all scripted in TypeScript.
3. **LLMs never touch the filesystem.** They receive file contents as text in their prompt. They return JSON to stdout. The script writes files.
4. **Structured JSON everywhere.** Agent inputs and outputs are JSON. Post-mortems are JSON. Commit messages are assembled from JSON. This enables programmatic composition and avoids free-text parsing.
5. **Minimal context per agent.** Each agent invocation gets only what it needs — no irrelevant files, no repo exploration, no tool access beyond Read (for the analyser) or Read/Write/Edit (for the fixer, though the script handles actual writes).

## 3. Components

### 3.1. Slash Command

**File:** `.claude/commands/lint-fix.md`

**Purpose:** Entry point. User types `/lint-fix rules/ type-based/` (or any paths). The slash command simply instructs Claude to execute the orchestrator script with the provided arguments.

**Why a slash command:** It's user-initiated, accepts arguments via `$ARGUMENTS`, and the prompt just tells Claude to run the script — no LLM judgement needed at this layer.

### 3.2. Orchestrator Script

**File:** `scripts/lint-fix.ts`

**Language:** TypeScript (already in a TS codebase, proper JSON typing, `child_process` for shelling out).

**Responsibilities:**

1. **Initial scan:**
   - Run `npx eslint --fix --format json` across all provided paths.
   - Parse the JSON output into a structured error map.
   - Filter out all `no-duplicate-type-structure` errors entirely (cross-file rule, not fixable per-file).
   - If zero errors remain, exit clean.

2. **File dispatch:**
   - Group remaining errors by file path.
   - For each file with errors, spawn a parallel async worker.
   - Await all workers.

3. **Per-file worker loop** (detailed in §4).

4. **Completion:**
   - Log summary: files processed, commits made, any files that hit a retry cap (if we add one).

### 3.3. Lint Analyser Agent

**Invoked via:** `claude --print --agents '{ "lint-analyser": { ... } }'`

**Input (composed by script into the prompt):**

```xml
<eslint_errors>
{ structured JSON of all errors for this file }
</eslint_errors>

<file_contents>
{ the current file text }
</file_contents>
```

**Output:** JSON to stdout.

```json
{
  "rule": "no-unused-vars",
  "count": 3,
  "effort_rank": "low",
  "reasoning": "All three are simple removals of unused imports",
  "locations": ["4:1", "12:1", "27:1"],
  "suggested_approach": "Remove the three unused import statements"
}
```

**Model:** Haiku (fast, cheap — this is a triage task).

**Tools:** None. It receives everything it needs in the prompt.

### 3.4. Fix Executor Agent

**Invoked via:** `claude --print --agents '{ "fix-executor": { ... } }'`

**Input (composed by script into the prompt):**

```xml
<target_rule>
{ the rule name, error locations, suggested approach from analyser }
</target_rule>

<all_lint_errors>
{ full error list for context on what else is broken }
</all_lint_errors>

<file_contents>
{ the current file text }
</file_contents>

<post_mortem>
{ JSON array of previous failed attempts, or null if first try }
</post_mortem>
```

**Output:** JSON to stdout.

```json
{
  "plan": {
    "options": [
      {
        "id": 1,
        "description": "Remove unused imports",
        "solves_error_because": "Directly eliminates the no-unused-vars violations",
        "regression_risk": "None — these imports aren't referenced anywhere",
        "emergent_risk": "None — removing imports can't trigger new rules",
        "differs_from_previous": null
      },
      {
        "id": 2,
        "description": "Comment out unused imports with TODO",
        "solves_error_because": "Suppresses the lint error",
        "regression_risk": "None",
        "emergent_risk": "May trigger no-commented-code if that rule exists",
        "differs_from_previous": null
      }
    ],
    "chosen_option": 1,
    "chosen_reason": "Clean removal is better than suppression"
  },
  "fixed_file": "...the complete fixed file contents..."
}
```

**Model:** Sonnet (needs to reason about code and produce correct fixes).

**Tools:** None. Receives text, returns JSON. The script writes the file.

## 4. Per-File Worker Loop

This is the core loop that the orchestrator runs for each file. Entirely deterministic except for the two LLM calls.

```
┌─── OUTER LOOP (until zero errors) ──────────────────────────────┐
│                                                                  │
│  STEP 1 — SCAN (deterministic)                                   │
│    a. Run: npx eslint --fix --format json <file>                 │
│    b. Parse JSON output → error list for this file               │
│    c. Filter out no-duplicate-type-structure                     │
│    d. If zero errors → commit any eslint --fix changes, DONE     │
│                                                                  │
│  STEP 2 — ANALYSE (LLM: lint-analyser)                           │
│    a. Script composes prompt: error JSON + file text              │
│    b. Invoke: claude --print --agents <lint-analyser>             │
│    c. Parse JSON response → target rule group                    │
│                                                                  │
│  ┌─── INNER LOOP (retry until this rule passes) ──────────────┐  │
│  │                                                             │  │
│  │  STEP 3 — FIX (LLM: fix-executor)                          │  │
│  │    a. Script composes prompt: target rule + all errors      │  │
│  │       + file text + post_mortem JSON                        │  │
│  │    b. Invoke: claude --print --agents <fix-executor>        │  │
│  │    c. Parse JSON response → plan + fixed file text          │  │
│  │                                                             │  │
│  │  STEP 4 — VERIFY (deterministic)                            │  │
│  │    a. Write fixed file text to disk                         │  │
│  │    b. Run: npx prettier --write <file>                      │  │
│  │    c. Run: npx eslint --fix --format json <file>            │  │
│  │    d. Parse new errors → check if target rule is resolved   │  │
│  │                                                             │  │
│  │  STEP 5 — PASS/FAIL (deterministic)                         │  │
│  │    IF target rule has zero errors:                           │  │
│  │      → Compute diff                                         │  │
│  │      → Compose commit message from plan JSON                │  │
│  │      → git add <file> && git commit                         │  │
│  │      → Clear post_mortem for this rule                      │  │
│  │      → Break inner loop                                     │  │
│  │    IF target rule still has errors:                          │  │
│  │      → Compute diff of what was attempted                   │  │
│  │      → Append to post_mortem: { plan, diff, new_errors }    │  │
│  │      → Revert file to pre-fix state                         │  │
│  │      → Continue inner loop (back to STEP 3)                 │  │
│  │                                                             │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  → Back to STEP 1 (re-scan for remaining/new errors)             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## 5. Post-Mortem Structure

The post-mortem is a JSON array that accumulates across retry attempts for a single rule group. It is cleared when the rule passes.

```json
[
  {
    "attempt": 1,
    "plan": {
      "options": [ ... ],
      "chosen_option": 2,
      "chosen_reason": "..."
    },
    "diff": "--- a/rules/foo.ts\n+++ b/rules/foo.ts\n@@ ...",
    "remaining_errors": [
      { "rule": "no-unused-vars", "line": 12, "message": "..." }
    ]
  },
  {
    "attempt": 2,
    "plan": { ... },
    "diff": "...",
    "remaining_errors": [ ... ]
  }
]
```

Each entry is small: the plan (a few options), a diff (typically short for a single rule), and the remaining errors. Even after several retries this stays compact.

## 6. Commit Message Structure

Assembled programmatically from the plan JSON. The script composes it, not the LLM.

```
fix(<rule-name>): <file-path>

Chosen approach: <plan.chosen_reason>

Options considered:
  1. <option.description> — <option.solves_error_because>
  2. <option.description> — <option.solves_error_because>

Attempts: <n>
<if post_mortem history exists, include it in the body>
```

## 7. File Structure

```
project/
├── .claude/
│   └── commands/
│       └── lint-fix.md              ← slash command entry point
├── scripts/
│   └── lint-fix/
│       ├── index.ts                 ← orchestrator (main entry)
│       ├── scan.ts                  ← eslint runner + JSON parser
│       ├── worker.ts                ← per-file worker loop
│       ├── agents.ts                ← claude --print invocation helpers
│       ├── prompts/
│       │   ├── lint-analyser.md     ← prompt template for analyser
│       │   └── fix-executor.md      ← prompt template for fixer
│       ├── commit.ts                ← commit message composer
│       └── types.ts                 ← shared TypeScript types
└── ...
```

## 8. Invocation

```bash
# In Claude Code terminal:
/lint-fix rules/ type-based/

# Or with specific files:
/lint-fix rules/no-magic-numbers.ts type-based/prefer-interface.ts

# Or the entire project:
/lint-fix src/
```

## 9. Edge Cases

1. **Retry cap:** If a rule fails N times (e.g. 5), the worker should log a warning and skip that rule rather than looping forever. The post-mortem is preserved in a log file for manual review.
2. **Empty diff after fix:** If the fix-executor returns a file identical to the input, skip the verify step and append to post-mortem as a no-op attempt.
3. **eslint --fix resolves everything in the scan step:** No LLM needed. Just commit the auto-fix changes and move on.
4. **New errors emerge after a fix:** The outer loop catches these — after committing a successful fix, we re-scan, and any new errors get picked up and planned fresh.
5. **Parallel commit ordering:** Since each worker operates on a different file, git commits won't collide. Commit ordering across files is non-deterministic (whichever worker finishes first commits first), which is fine.

## 10. What the LLM Does vs. Does Not Do

| LLM does | LLM does NOT do |
|---|---|
| Analyse error list → pick lowest-effort rule | Run eslint or prettier |
| Produce fix plan with options + analysis | Write files to disk |
| Return fixed file as text in JSON | Make git commits |
| Reason about regressions and emergent errors | Parse eslint output |
| Adapt based on post-mortem context | Compose commit messages |
| | Decide when to retry or move on |
| | Open or read other files in the repo |
````

**TODO**
Some requisites need fullfilling:
1. Provide a consistent structure for our current lint descriptions and messages. I suggest perhaps an XML like format to be both decomposable and human readable.
2. Analyse improvements to the current lint descriptions and messages
3. Analyse my current post mortem documents to see if we need anything currently adding to the messages.
4. Analyse any patterns in my codebase, that may hint at unidentified solutions in our lint message suggestions.
5. Decide on the format to inject the summary of current lints, perhaps we may choose our lint descriptions, or compose a small markdown file: It needs to be less verbose than our descriptions, since this is injected every time to the fix agent. Potential things it needs to include. Pattern, and potentially the philosophy behind the pattern but this may be irrelevant. It is purely for our regression and emergent analysis.
6. Ensure the prompts use the principles outlined here: `https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview`. In particular the XML format, incourage it by telling it to output in <thinking> for the Fix Executor agent planning, when analysing for:
    1. Analysis on an regression lint errors in terms of the file
    2. Analysis on any emergent lint errors due to other lints.
7. I do not think we should input json into our agents context directly. We use the json for commincation between our different deterministic processes. Instead we want to parse our json, into relevant XML tags, to inject into our XML format prompts.
8. Ensure any usage of `eslint` strictly runs: prettier write beforehand, then eslint must use --fix. Since prettier often changes terniary expressions, and --fix converts them back into their correct form.

The post mortem documents are:
- `post_mortem.md`
- `post_mortem_2.md`
- `post_mortem_3.md`
The lints are contained in:
- `eslint.config.ts`
- `type-based/`
- `rules/`
Prettier config is in:
- `.prettierrc.json`
And tsconfig is in:
- `tsconfig.json`


These shall be the only files you need to read. If you need any other files you shall ask me first. 