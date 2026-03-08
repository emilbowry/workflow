# Overall Roadmap

## Phase 1: LINT_META format + rule updates

1. Define `TLintMeta` type in `type-based/type-based.types.ts`
2. Add `LINT_META` export to each custom rule file (`rules/*`, `type-based/*`):
   - Rewrite MSG → diagnosis only, max ~80 chars
   - Sharpen DESC → full semantic intent, imperative mood
   - Add LINT_META const with: flags, fix, pitfalls, avoid, related
3. Create `scripts/lint-fix/external-rules.ts` — registry mapping external rule IDs (`@typescript-eslint/*`, `eslint/*`, `functional/*`) to `TLintMeta` objects
4. Validate: every rule in `eslint.config.ts` has a corresponding `TLintMeta` (custom export or external registry entry)

## Phase 2: First draft of workflow implementation

Implement `scripts/lint-fix/` per `notes/workflow.md`:

1. `types.ts` — shared types (eslint error, post-mortem entry, plan, chosen option)
2. `xml.ts` — JSON → XML transforms (errors, post-mortem, lint-meta to lint-rules XML)
3. `scan.ts` — prettier --write + eslint --fix --format json runner + parser
4. `agents.ts` — claude --print invocation helpers for analyser/planner/implementor
5. `prompts/lint-analyser.md` — triage prompt template
6. `prompts/fix-planner.md` — planning prompt template (with thinking, regression/emergent analysis)
7. `prompts/fix-implementor.md` — implementation prompt template
8. `prompts/lint-rules.xml` — generated from LINT_META exports + external registry at build time
9. `worker.ts` — per-file worker loop (outer + inner loop)
10. `worktree.ts` — git worktree create/merge/cleanup
11. `commit.ts` — commit message composer from plan JSON
12. `index.ts` — orchestrator entry (scan, dispatch, await, summary)
13. `.claude/commands/lint-fix.md` — slash command entry point

## Phase 3: Testing

Create `testing/` with end-to-end validation:

1. Fixture files with known lint errors (one per common error pattern)
2. Test: orchestrator scan correctly identifies and groups errors
3. Test: JSON → XML transforms produce valid XML matching prompt schemas
4. Test: LINT_META coverage — every config rule has metadata
5. Test: worker loop on a fixture file (mock agent responses) — verify commit output
6. Test: worktree lifecycle (create, commit, merge, cleanup)
7. Test: retry cap and POST_MORTEM.json accumulation
8. Integration test: run full workflow on a fixture file with real agent calls

## Phase 4: Package

Package as reusable `@scope/lint-workflow`:

1. Define package.json with exports (rules, config, orchestrator, LINT_META)
2. Base `eslint.config.ts` that consumers extend
3. Bundle .prettierrc.json
4. Ship slash command and prompt templates
5. Consumer can: `import { config } from "@scope/lint-workflow"` and `/lint-fix src/`
6. Consumer can add own rules with LINT_META — orchestrator auto-discovers
7. Document: README with setup, usage, adding custom rules
