# Lint-Fix Workflow — Architecture Plan

## 1. Overview

An automated, parallelised lint-fix system for Claude Code that minimises LLM involvement to only the three tasks that require judgement: triaging which rule to fix next, planning the fix with regression/emergent analysis, and producing the corrected code. Everything else — running tools, writing files, computing diffs, composing commits, managing retries — is handled by a deterministic TypeScript orchestrator script.

## 2. Design Principles

1. **LLMs only do what LLMs are good at.** Triage (which rule is lowest effort), planning (how to fix it safely), and implementation (produce corrected code). Nothing else.
2. **Everything else is deterministic.** ESLint, Prettier, file I/O, git, post-mortem assembly, prompt composition — all scripted in TypeScript.
3. **LLMs never touch the filesystem.** They receive file contents as text in their prompt. They return JSON to stdout. The script writes files.
4. **JSON between processes, XML into agents.** Inter-process data (post-mortems, eslint output, commit data) is JSON for programmatic composition. Agent prompts are XML — parsed from the JSON by the orchestrator — because XML tags give the LLM clear structural boundaries for each piece of context.
5. **Minimal context per agent.** Each agent invocation gets only what it needs — no irrelevant files, no repo exploration, no tool access. The analyser gets errors + file. The planner gets errors + file + lint rules summary + rule interactions + canonical patterns + post-mortem. The implementor gets the chosen plan + file.
6. **Prettier before every lint.** Every invocation of `eslint` must be preceded by `npx prettier --write`. Prettier changes ternary expressions and indentation; `--fix` converts them back. Running eslint without prettier first produces phantom errors (PM1: 16/39 errors were formatting disagreements).
7. **Worktree isolation.** Each parallel file worker runs in its own git worktree. This gives every worker a canonical file namespace (`POST_MORTEM.json`, not `POST_MORTEM_rules_foo.json`) and eliminates any possibility of cross-worker filesystem interference, even though commits don't conflict.

## 3. Components

### 3.1. Slash Command

**File:** `.claude/commands/lint-fix.md`

**Purpose:** Entry point. User types `/lint-fix rules/ type-based/` (or any paths). The slash command instructs Claude to execute the orchestrator script with the provided arguments.

**Why a slash command:** It's user-initiated, accepts arguments via `$ARGUMENTS`, and the prompt just tells Claude to run the script — no LLM judgement needed at this layer.

### 3.2. Orchestrator Script

**File:** `scripts/lint-fix/index.ts`

**Language:** TypeScript (already in a TS codebase, proper JSON typing, `child_process` for shelling out).

**Responsibilities:**

1. **Initial scan:**
   - Run `npx prettier --write` on all provided paths.
   - Run `npx eslint --fix --format json` across all provided paths.
   - Parse the JSON output into a structured error map.
   - Filter out all `no-duplicate-type-structure` errors entirely (cross-file rule, not fixable per-file).
   - If zero errors remain, exit clean.

2. **File dispatch:**
   - Group remaining errors by file path.
   - For each file with errors, create a git worktree and spawn a parallel async worker inside it.
   - Await all workers.
   - Clean up worktrees.

3. **Per-file worker loop** (detailed in §4).

4. **JSON → XML transformation:**
   - All ESLint JSON output is transformed to XML before injection into agent prompts.
   - Custom rules (`local/*`) export structured XML metadata (flags, fix, pitfalls, patterns to avoid) alongside their ESLint rule definition. The orchestrator reads this at scan time and merges it into the rule summary. External rules (`@typescript-eslint/*`, `eslint/*`, etc.) are manually catalogued in the static `lint-rules.xml` since we don't control their source. Two-tier: custom rules are self-describing, external rules are a maintained list.
   - All post-mortem JSON is transformed to XML before injection.
   - Use `<![CDATA[...]]>` for diff content to avoid XML escaping issues.
   - This is a deterministic string transform — no LLM involved.

5. **Completion:**
   - Log summary: files processed, commits made, any files that hit a retry cap.

### 3.3. Lint Analyser Agent

**Purpose:** Triage. Pick the lowest-effort rule group to fix next.

**Model:** Haiku 4.5 (fast, cheap — this is a triage task).

**Tools:** None.

**Input (XML, composed by orchestrator):**

```xml
<system>
You are a lint error triage agent. You receive a file's lint
errors and pick the single lowest-effort rule group to fix next.
Output JSON only.
</system>

<errors>
  <error rule="no-unused-vars" line="4" col="1"
    message="'foo' is defined but never used." />
  <error rule="indent" line="12" col="1"
    message="Expected indentation of 8 spaces but found 4." />
</errors>

<file path="rules/foo.ts">
...file contents...
</file>

<output_format>
{
  "rule": "the-rule-id",
  "count": N,
  "effort_rank": "low|medium|high",
  "reasoning": "why this is lowest effort",
  "locations": ["line:col", ...],
  "suggested_approach": "brief description"
}
</output_format>
```

**Output:** JSON to stdout, parsed by orchestrator.

### 3.4. Fix Planner Agent

**Purpose:** Produce a fix plan with options, regression analysis, and emergent error analysis. This is the highest-effort LLM call — it reasons about rule interactions, post-mortem history, and produces multiple options with risk assessment.

**Model:** Opus 4.6 (highest effort — this is the judgement-heavy call).

**Tools:** None.

**Input (XML, composed by orchestrator):**

```xml
<system>
You are a lint fix planner. You receive a target rule to fix,
the full error context, the file, a summary of all lint rules
and their interactions, and a post-mortem of any previous failed
attempts. You must produce a plan with multiple options, each
analysed for regression and emergent risk.

Reason step-by-step inside <thinking> tags before producing
your plan.
</system>

<target_rule>
  <!-- Dynamically composed by orchestrator from analyser JSON output -->
  <rule name="restrict-return-count" count="3">
    <location line="15" col="1" />
    <location line="28" col="1" />
    <location line="41" col="1" />
  </rule>
  <suggested_approach>Convert if-chains to ternary or switch</suggested_approach>
</target_rule>

<all_errors>
  <error rule="restrict-return-count" line="15" col="1"
    message="..." />
  <error rule="indent" line="20" col="1"
    message="..." />
</all_errors>

<file path="rules/foo.ts">
...file contents...
</file>

<lint_rules>
  ...static XML summary of all rules, their flags, and fixes...
</lint_rules>

<rule_interactions>
  ...static XML of known rule interaction traps...
</rule_interactions>

<canonical_patterns>
  ...static XML of safe resolution patterns...
</canonical_patterns>

<post_mortem>
  <!-- Omitted entirely on first attempt. Only present after a failed retry. -->
  <attempt n="1">
    <plan chosen="1" reason="...">
      <option id="1">Description of what was tried</option>
    </plan>
    <diff><![CDATA[...unified diff...]]></diff>
    <remaining>
      <error rule="restrict-return-count" line="15" message="..." />
    </remaining>
  </attempt>
</post_mortem>

<instructions>
Inside <thinking>, you MUST analyse:

1. REGRESSION: For each option, check whether the change would
   re-trigger any rule in <lint_rules>. Cross-reference
   <rule_interactions> for known traps.

2. EMERGENT: For each option, check whether fixing the target
   rule could cause NEW violations of other rules not currently
   failing. Check <canonical_patterns> for safe approaches.

3. POST-MORTEM: If <post_mortem> contains previous attempts,
   your new plan MUST differ from all previous approaches.
   Explain what went wrong and why your new approach avoids it.

Then produce your plan JSON.
</instructions>

<output_format>
{
  "plan": {
    "options": [
      {
        "id": 1,
        "description": "...",
        "solves_error_because": "...",
        "regression_risk": "...",
        "emergent_risk": "...",
        "differs_from_previous": "..." or null
      }
    ],
    "chosen_option": N,
    "chosen_reason": "..."
  }
}
</output_format>
```

**Output:** JSON plan to stdout. The orchestrator selects the `chosen_option` and passes it to the implementor.

### 3.5. Fix Implementor Agent

**Purpose:** Execute the chosen plan. Produce the corrected file contents. No reasoning about alternatives — that's already done.

**Model:** Sonnet 4.6.

**Tools:** None.

**Input (XML, composed by orchestrator):**

```xml
<system>
You are a code fix executor. You receive a plan and a file.
Apply the plan exactly. Return the complete fixed file as JSON.
Do not deviate from the plan. Do not add improvements beyond
what the plan specifies. Respect the regression and emergent
risk notes — avoid any patterns flagged there.
</system>

<chosen_option id="1">
  <description>Convert 3 if-return chains to switch+let</description>
  <solves_error_because>Reduces to single return</solves_error_because>
  <regression_risk>None — switch at depth 2</regression_risk>
  <emergent_risk>functional/no-let will fire on the let declaration — accepted trade-off per canonical switch-dispatch pattern</emergent_risk>
  <differs_from_previous>null</differs_from_previous>
</chosen_option>

<target_errors>
  <error rule="restrict-return-count" line="15" col="1"
    message="Function has 3 return statements. Maximum allowed is 1." />
  <error rule="restrict-return-count" line="28" col="1"
    message="Function has 3 return statements. Maximum allowed is 1." />
</target_errors>

<file path="rules/foo.ts">
...file contents...
</file>

<output_format>
{
  "fixed_file": "...complete file contents..."
}
</output_format>
```

**Output:** JSON with the complete fixed file text. The orchestrator writes it.

## 4. Per-File Worker Loop

Each file worker runs in its own git worktree. The loop is entirely deterministic except for the three LLM calls.

**Canonical worktree files:**
- `POST_MORTEM.json` — accumulated attempts for the current rule group.

```
┌─── WORKTREE SETUP ──────────────────────────────────────────────┐
│  git worktree add .worktrees/<file-hash> -b lint-fix/<file>     │
│  cd .worktrees/<file-hash>                                      │
└─────────────────────────────────────────────────────────────────┘

┌─── OUTER LOOP (until zero errors) ──────────────────────────────┐
│                                                                  │
│  STEP 1 — SCAN (deterministic)                                   │
│    a. Run: npx prettier --write <file>                           │
│    b. Run: npx eslint --fix --format json <file>                 │
│    c. Parse JSON output → error list for this file               │
│    d. Filter out no-duplicate-type-structure                     │
│    e. If zero errors → commit any auto-fix changes, DONE         │
│                                                                  │
│  STEP 2 — TRIAGE (LLM: lint-analyser, Haiku)                    │
│    a. Transform error JSON → XML                                 │
│    b. Compose prompt: error XML + file text                      │
│    c. Invoke: claude --print -m haiku ...                        │
│    d. Parse JSON response → target rule group                    │
│    e. Reset POST_MORTEM.json (new rule group)                    │
│                                                                  │
│  ┌─── INNER LOOP (retry until this rule passes) ──────────────┐  │
│  │                                                             │  │
│  │  STEP 3 — PLAN (LLM: fix-planner, Opus)                    │  │
│  │    a. Transform POST_MORTEM.json → XML                      │  │
│  │    b. Compose prompt: target rule XML + all errors XML      │  │
│  │       + file text + lint_rules + rule_interactions           │  │
│  │       + canonical_patterns + post_mortem XML                 │  │
│  │    c. Invoke: claude --print -m opus ...                    │  │
│  │    d. Parse JSON response → plan with chosen option         │  │
│  │                                                             │  │
│  │  STEP 4 — IMPLEMENT (LLM: fix-implementor, Sonnet)          │  │
│  │    a. Compose prompt: chosen option XML + target errors     │  │
│  │       XML + file text                                       │  │
│  │    b. Invoke: claude --print -m sonnet ...                  │  │
│  │    c. Parse JSON response → fixed file text                 │  │
│  │                                                             │  │
│  │  STEP 5 — VERIFY (deterministic)                            │  │
│  │    a. Write fixed file text to disk                         │  │
│  │    b. Run: npx prettier --write <file>                      │  │
│  │    c. Run: npx eslint --fix --format json <file>            │  │
│  │    d. Parse new errors → check if target rule is resolved   │  │
│  │                                                             │  │
│  │  STEP 6 — PASS/FAIL (deterministic)                         │  │
│  │    IF target rule has zero errors:                           │  │
│  │      → Compute diff                                         │  │
│  │      → Compose commit message from plan JSON                │  │
│  │      → git add <file> && git commit (body = POST_MORTEM)    │  │
│  │      → Delete POST_MORTEM.json                              │  │
│  │      → Break inner loop                                     │  │
│  │    IF target rule still has errors:                          │  │
│  │      → Compute diff of what was attempted                   │  │
│  │      → Append to POST_MORTEM.json:                          │  │
│  │        { plan, diff, remaining_errors }                     │  │
│  │      → Revert file to pre-fix state                         │  │
│  │      → Continue inner loop (back to STEP 3)                 │  │
│  │                                                             │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  → Back to STEP 1 (re-scan for remaining/new errors)             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌─── WORKTREE CLEANUP ────────────────────────────────────────────┐
│  Merge worktree branch into main working branch                  │
│  git worktree remove .worktrees/<file-hash>                      │
└─────────────────────────────────────────────────────────────────┘
```

## 5. Post-Mortem Structure

`POST_MORTEM.json` lives in the worktree root. It accumulates across retry attempts for a single rule group. It is deleted when the rule passes (its contents become the commit body).

**Internal format (JSON, for deterministic processes):**

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
  }
]
```

**Injected format (XML, transformed by orchestrator before planner prompt):**

```xml
<post_mortem>
  <attempt n="1">
    <plan chosen="2" reason="...">
      <option id="1">Description</option>
      <option id="2">Description</option>
    </plan>
    <diff><![CDATA[--- a/rules/foo.ts
+++ b/rules/foo.ts
@@ -10,3 +10,5 @@
...]]></diff>
    <remaining>
      <error rule="no-unused-vars" line="12"
        message="'x' is defined but never used." />
    </remaining>
  </attempt>
</post_mortem>
```

## 6. Static Context: Lint Rules Summary

A static XML file (`scripts/lint-fix/prompts/lint-rules.xml`) injected into every planner prompt. Generated once from the rule metadata. Contains three sections:

### 6.1. Rule Definitions

Each rule: name, config value, what it flags, canonical fix.

```xml
<lint_rules>
  <rule name="local/restrict-return-count" config="1">
    <flags>More than 1 return statement, or any non-final return</flags>
    <fix>Ternary for 2-3 branches. Switch+let+single-return for 4+.</fix>
  </rule>
  <rule name="local/max-total-depth" config="3">
    <flags>Indentation deeper than 3 levels</flags>
    <fix>Extract nested logic into separate functions</fix>
  </rule>
  <rule name="local/no-nested-function">
    <flags>Parameterized function inside parameterized function</flags>
    <fix>Top-level extract, PA thunk, IIFE, or .bind()</fix>
  </rule>
  <rule name="indent" config="4">
    <flags>Non-4-space indentation</flags>
    <fix>Auto-fixable. WARNING: --fix on ternaries cascades.</fix>
  </rule>
  <rule name="functional/no-let">
    <flags>Any let declaration</flags>
    <fix>Use const. Known exception: switch dispatch pattern.</fix>
  </rule>
  <rule name="@typescript-eslint/consistent-type-assertions" config="never">
    <flags>Any type assertion (as, angle-bracket)</flags>
    <fix>Remove assertion. Use type narrowing or switch dispatch.</fix>
  </rule>
  <rule name="max-len" config="80">
    <flags>Lines exceeding 80 chars</flags>
    <fix>Break into multiple lines or extract sub-expressions.</fix>
  </rule>
  <rule name="max-lines-per-function" config="40">
    <flags>Functions exceeding 40 lines</flags>
    <fix>Extract helper functions.</fix>
  </rule>
  <rule name="complexity" config="5">
    <flags>Cyclomatic complexity > 5</flags>
    <fix>Extract branches into functions or use dispatch pattern.</fix>
  </rule>
  <rule name="@typescript-eslint/typedef" config="variableDeclaration">
    <flags>Variable without type annotation</flags>
    <fix>Add explicit type: const x: T = ...</fix>
  </rule>
  <rule name="func-style" config="expression">
    <flags>Function declarations</flags>
    <fix>const f: T = (...) => ...</fix>
  </rule>
  <rule name="arrow-body-style" config="as-needed">
    <flags>Block body when expression body suffices</flags>
    <fix>Remove braces and return keyword.</fix>
  </rule>
  <rule name="local/require-extracted-function-type">
    <flags>Inline complex types in annotations</flags>
    <fix>Extract to named type alias.</fix>
  </rule>
  <rule name="local/enforce-record-type">
    <flags>Object literal types { key: T }</flags>
    <fix>Use Record&lt;K, V&gt;</fix>
  </rule>
  <rule name="local/no-single-field-type">
    <flags>Type alias with exactly one property (non-call-sig)</flags>
    <fix>Use the field type directly.</fix>
  </rule>
  <rule name="local/prefer-call-signature">
    <flags>Function type syntax (...) => T in type alias</flags>
    <fix>type TFoo = { (x: A): B }</fix>
  </rule>
  <rule name="local/max-type-nesting" config="1">
    <flags>Nested type constructs in type alias</flags>
    <fix>Extract inner types to named aliases.</fix>
  </rule>
  <rule name="@typescript-eslint/consistent-type-definitions" config="type">
    <flags>Interface declarations</flags>
    <fix>Convert to type alias.</fix>
  </rule>
  <rule name="@typescript-eslint/consistent-type-imports">
    <flags>Non-type imports of type-only symbols</flags>
    <fix>import type { ... }</fix>
  </rule>
  <rule name="@typescript-eslint/explicit-function-return-type">
    <flags>Function without explicit return type</flags>
    <fix>Add return type annotation.</fix>
  </rule>
  <rule name="no-warning-comments" config="prettier-ignore">
    <flags>Comments containing "prettier-ignore"</flags>
    <fix>Remove comment. Restructure code.</fix>
  </rule>
  <rule name="no-restricted-syntax" config="TSTypePredicate">
    <flags>Type predicates (x is T)</flags>
    <fix>Discriminated unions or type narrowing.</fix>
  </rule>
  <rule name="id-length" config="min:3">
    <flags>Identifiers &lt; 3 chars (exceptions: id,i,j,k,x,y,z,_,fs,db,ui,el,e)</flags>
    <fix>Use descriptive names.</fix>
  </rule>
  <rule name="@typescript-eslint/array-type" config="generic">
    <flags>T[] syntax</flags>
    <fix>Array&lt;T&gt;. Tuples still allowed.</fix>
  </rule>
  <rule name="@typescript-eslint/no-unsafe-type-assertion">
    <flags>Unsafe type assertions</flags>
    <fix>Use type narrowing.</fix>
  </rule>
  <rule name="@typescript-eslint/no-unnecessary-condition">
    <flags>Conditions that are always true/false</flags>
    <fix>Remove condition. Use Map instead of Record for T|undefined.</fix>
  </rule>
  <rule name="eslint-comments/no-use" config="allow:[]">
    <flags>Any eslint directive comment</flags>
    <fix>Fix the underlying issue instead of suppressing.</fix>
  </rule>
  <rule name="@typescript-eslint/no-confusing-void-expression" config="ignoreArrowShorthand">
    <flags>Void expressions in non-statement position</flags>
    <fix>Arrow shorthand is exempt. Otherwise use statement form.</fix>
  </rule>
</lint_rules>
```

### 6.2. Rule Interactions

Known traps discovered through post-mortem experience.

```xml
<rule_interactions>
  <interaction>
    indent --fix + ternary chains → cascading max-total-depth violations.
    Prettier reformats ternaries; --fix re-indents; depth exceeds 3.
    Solution: use switch+let for 4+ branches.
  </interaction>
  <interaction>
    restrict-return-count + if-chains → multiple returns.
    Solution: ternary (2-3 branches) or switch+let+single-return (4+).
  </interaction>
  <interaction>
    consistent-type-assertions:never + Map-based dispatch → cannot cast.
    Solution: switch dispatch with type narrowing in each case.
  </interaction>
  <interaction>
    functional/no-let + switch dispatch → tension.
    Known: switch+let is the only pattern satisfying
    return-count + depth + assertions simultaneously. Accepted trade-off.
  </interaction>
  <interaction>
    Record access + no-unnecessary-condition → ?? flagged.
    Record&lt;K,V&gt;[k] returns V (never undefined), so ?? is unnecessary.
    Solution: use Map for lookups needing T|undefined.
  </interaction>
  <interaction>
    prettier ternary formatting + indent → permanent incompatibility
    on deep ternaries. No prettier config fixes this.
    Solution: max 3 ternary branches.
  </interaction>
  <interaction>
    no-nested-function + ESLint handler pattern → need PA boundary.
    Solution: IIFE (() => (node) => work)() or .bind(null, context).
  </interaction>
</rule_interactions>
```

### 6.3. Canonical Patterns

Safe resolution patterns that satisfy multiple rules simultaneously.

```xml
<canonical_patterns>
  <pattern name="try-dispatch">
    For T|undefined returns: tryX(node) ?? tryY(node) ?? fallback.
    Each tryX returns T|undefined.
    Satisfies: single return, no let, no depth issues.
  </pattern>
  <pattern name="switch-dispatch">
    For mandatory returns:
    let result: T; switch(x) { case A: result = f(x); break; } return result;
    Satisfies: single return, depth ≤3, type narrowing in cases.
    Violates: no-let (accepted trade-off).
  </pattern>
  <pattern name="pa-thunk">
    IIFE: (() => (node: T) => work)()
    Or .bind(): handler.bind(null, context)
    Both valid PA boundaries for no-nested-function.
  </pattern>
  <pattern name="string-concat">
    Use "a" + "b" over template literals for long strings.
    Template literals cannot be broken across lines under max-len: 80.
  </pattern>
  <pattern name="type-first">
    Define type alias before every const:
    type TFoo = (x: A) => B;
    const foo: TFoo = (x) => ...;
    Satisfies: typedef, explicit-function-return-type,
    require-extracted-function-type.
  </pattern>
</canonical_patterns>
```

## 7. Commit Message Structure

Assembled programmatically from the plan JSON. The script composes it, not the LLM. On success, the full post-mortem history becomes the commit body.

```
fix(<rule-name>): <file-path>

Chosen approach: <plan.chosen_reason>

Options considered:
  1. <option.description> — <option.regression_risk>
  2. <option.description> — <option.regression_risk>

Attempts: <n>

<full POST_MORTEM.json contents if retries occurred>
```

## 8. File Structure

```
project/
├── .claude/
│   └── commands/
│       └── lint-fix.md              ← slash command entry point
├── scripts/
│   └── lint-fix/
│       ├── index.ts                 ← orchestrator (main entry)
│       ├── scan.ts                  ← prettier + eslint runner + JSON parser
│       ├── worker.ts                ← per-file worker loop (runs in worktree)
│       ├── worktree.ts              ← git worktree create/merge/cleanup
│       ├── agents.ts                ← claude --print invocation helpers
│       ├── xml.ts                   ← JSON → XML transforms
│       ├── prompts/
│       │   ├── lint-analyser.md     ← prompt template for triage
│       │   ├── fix-planner.md       ← prompt template for planning
│       │   ├── fix-implementor.md   ← prompt template for implementation
│       │   └── lint-rules.xml       ← static rule summary (§6)
│       ├── commit.ts                ← commit message composer
│       └── types.ts                 ← shared TypeScript types
├── .worktrees/                      ← git worktrees (gitignored)
└── ...
```

## 9. Invocation

```bash
# In Claude Code terminal:
/lint-fix rules/ type-based/

# Or with specific files:
/lint-fix rules/no-magic-numbers.ts type-based/prefer-interface.ts

# Or the entire project:
/lint-fix src/
```

## 10. Edge Cases

1. **Retry cap:** If a rule fails N times (e.g. 5), the worker should log a warning and skip that rule rather than looping forever. The POST_MORTEM.json is preserved in the worktree for manual review.
2. **Empty diff after fix:** If the implementor returns a file identical to the input, skip the verify step and append to POST_MORTEM.json as a no-op attempt.
3. **eslint --fix resolves everything in the scan step:** No LLM needed. Just commit the auto-fix changes and move on.
4. **New errors emerge after a fix:** The outer loop catches these — after committing a successful fix, we re-scan, and any new errors get picked up and triaged fresh.
5. **Worktree merge conflicts:** Should not occur since each worktree operates on a different file. If they do (e.g. shared type files), the orchestrator serialises those workers.
6. **JSON parse failure from agent:** If an agent returns malformed JSON, append the raw output to POST_MORTEM.json as a failed attempt and retry. Count toward the retry cap.

## 11. What Each Component Does

| Component | Does | Does NOT do |
|---|---|---|
| **Orchestrator** | Runs prettier/eslint, creates worktrees, composes XML prompts, writes files, computes diffs, makes commits, manages POST_MORTEM.json | Reason about code, choose fix strategies |
| **Analyser (Haiku)** | Pick lowest-effort rule group from error list | Reason about rule interactions, plan fixes |
| **Planner (Opus)** | Produce fix plan with regression/emergent analysis, reason about post-mortem, choose between options | Write code, touch filesystem |
| **Implementor (Sonnet)** | Execute a specific plan, produce corrected file text | Choose strategy, reason about alternatives |
