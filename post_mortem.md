# Post-Mortem: no-duplicate-type-structure.ts Lint Cleanup

## Starting State

- **317 eslint errors**, 0 warnings
- Single file, ~320 lines of deeply nested if-chains with string literal comparisons

## Final State

- **39 eslint errors** (88% reduction)
- 8 commits, incremental and verifiable

## What Worked

**Incremental approach.** Each commit targeted one error category, ran lint, and verified progress before moving on. This caught regressions immediately (e.g., `--fix` making things worse, dispatch refactor adding duplicate type errors).

**Targeting by error volume.** Fixing the 40 enum comparison errors first (string literals → `AST_NODE_TYPES`) was a mechanical find-and-replace that killed 65% of errors in one commit.

**Dispatch pattern.** Breaking the 311-line `canonical` function into keyword map + typed handler functions + dispatch chain eliminated complexity, max-lines, and most return-count violations simultaneously.

**Ternary chains over if-chains.** Converting `keyName`, `canonicalParam`, `typeNameToString`, `handleLiteralValue` from if/return chains to concise ternary arrows dropped return-count to 0 per function.

## What Didn't Work

**`eslint --fix`** — The `indent` auto-fixer and `max-total-depth` rule fight each other. Auto-fix reformats indentation which pushes lines deeper, creating more depth violations (40 → 125 errors). Reverted immediately.

**`Record<string, string>` for keyword map** — Accessing a `Record` always returns `string` (never `undefined`), making `??` fallback flagged as unnecessary. Had to switch to `Map` for proper `string | undefined` from `.get()`.

**`TNodeHandler` with generic `TSESTree.TypeNode` param** — Handlers needed guard clauses (`if (node.type !== X) return`) for type narrowing, doubling return count. Fixed by typing each handler with its specific node type and using if-chains in dispatch functions instead.

**`typeParameter.key`** — Didn't exist in the installed `@typescript-eslint` version. The deprecation message ("use `.key` and `.constraint`") referred to `TSMappedType` properties, not `TSTypeParameter`. Had to use `.name.name` for `TSInferType`.

## Lesson Learned

**Run prettier before linting.** We had 39 errors that dropped to 23 after running prettier — 16 errors were just formatting disagreements between our manual edits and the project's prettier config. Should have been running `prettier --write` after each edit pass.

## Remaining Work (23 errors)

| Errors | Rule                              | Fix                                                                                                                                                 |
| ------ | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13     | `indent`                          | Auto-fixable with `--fix` once return-count is resolved                                                                                             |
| 6      | `restrict-return-count`           | `tryReference`(5), `tryAdvanced`(5), `tryLiteral`(4), `tryComposite`(4), `canonicalMember`(5), `handleTypeReference`(2). Convert to ternary chains. |
| 3      | `require-extracted-function-type` | Extract 3 inline type annotations to named aliases                                                                                                  |
| 1      | `no-unsafe-argument`              | Fix `handleIndexParam` type compatibility                                                                                                           |

## Commit Log

1. `0a9b610` — String literals → AST_NODE_TYPES enum (317 → 109)
2. `97d19c1` — Structural rewrite: extract typed handlers (109 → 45)
3. `3de5691` — Remove always-true guard in canonicalMember (45 → 42)
4. `9ad7f57` — Remove unnecessary truthy check on constraint (42 → 40)
5. `5ae9c99` — Fix TSTypeParameter API: .name.name not .key.name (40 → 38)
6. `57f2550` — Extract dispatchNode, Map for keywords (38 → 38, canonical clean)
7. `a6c4e22` — Split dispatch into 4 smaller functions (39, killed complexity)
8. `1ff453d` — Convert 4 if-chains to ternary expressions (39, killed return-count)
