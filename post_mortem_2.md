# Post-Mortem 2: no-duplicate-type-structure.ts Final Cleanup

## Starting State

- **23 eslint errors**, 0 warnings
- Carried over from post-mortem 1 (which went 317 -> 23)

## Final State

- **0 eslint errors**
- 6 commits, incremental with lint verification between each

## What Worked

**Lowest-hanging-fruit-first pattern.** Instead of planning all fixes upfront, each cycle was: lint, fix the easiest category, commit, relint. This prevented wasted work when earlier fixes shifted line numbers or revealed new constraints.

**`eslint --fix` on the original if-chains.** With no ternary conversions in play, the 13 indent auto-fixes applied cleanly with zero new errors. The key insight: `--fix` only causes problems when the indentation it produces is deep enough to trigger `max-total-depth` — which only happens with nested ternaries, not if-chains.

**Switch + `let` + single return.** The pattern for dispatch functions:

```ts
let result: TMaybeString = undefined;
switch (node.type) {
    case AST_NODE_TYPES.X:
        result = handler(node);
        break;
}
return result;
```

Satisfies `restrict-return-count` (1 return), avoids `max-total-depth` (case bodies at depth 2-3), and TypeScript narrows inside each case block for free.

## What Didn't Work

**Ternary chains.** Attempted three times:

1. With `experimentalTernaries: true` in prettier — prettier and eslint disagreed on `:` alignment (expected 8, found 4)
2. Without `experimentalTernaries` — prettier used 2-space ternary nesting despite `tabWidth: 4` (expected 12, found 10)
3. Without prettier — `eslint --fix` produced correct indentation but nested ternaries hit `max-total-depth` (depth 4-5 on 5-branch chains)

The lint rules are designed to reject deeply nested ternaries. This is intentional, not a formatting conflict to work around.

**Map-based dispatch with type assertions.** Handlers take specific node types (e.g., `TSESTree.TSTypeLiteral`), but Map values need a common type. Casting via `as TMemberHandler` was blocked by both `consistent-type-assertions` ("Do not use any type assertions") and `no-unsafe-type-assertion` ("type is more narrow than the original").

**Prettier for ternary formatting.** Prettier's ternary formatting cannot be disabled independently — it has no option to skip just ternary expressions. `experimentalTernaries` changes the style but doesn't disable formatting. The only escape hatch is `// prettier-ignore` per expression, which is unmaintainable.

## Lessons Learned

**Let the lint rules guide the pattern.** Three rules (`restrict-return-count`, `max-total-depth`, `consistent-type-assertions`) collectively rule out if-chains, deep ternaries, and cast-based Maps. The only remaining option — switch with a result variable — is what the rules are steering toward. Fighting the rules wastes time.

**`eslint --fix` is safe on non-ternary code.** The indent fixer only causes cascading problems when it pushes ternary branches deeper. For if/switch/assignment code, it's reliably mechanical.

**Commit after each lint cycle.** Makes it trivial to revert failed experiments (reverted 3 times during ternary attempts) without losing unrelated progress.

**Uninitialized `let` with exhaustive switch.** When a switch has a `default` case, TypeScript recognizes the variable is always assigned — no need to initialize with a dummy value. Initializing triggers `no-useless-assignment`.

## Commit Log

1. `5a860c2` — eslint --fix indent (23 -> 10)
2. `72aa1dc` — Extract 3 inline types to named aliases (10 -> 7)
3. `054291b` — Narrow TIndexParam for no-unsafe-argument (7 -> 6)
4. `ed58013` — Refactor handleTypeReference to single return (6 -> 5)
5. `a030e7c` — Convert tryComposite to switch (5 -> 4)
6. `cdcbbcc` — Convert tryReference, tryLiteral, tryAdvanced to switch (4 -> 1)
7. `ed1edbe` — Convert canonicalMember to switch (1 -> 0)
