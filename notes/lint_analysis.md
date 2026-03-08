# Lint Rule Analysis

Analysis of each custom and external lint rule active in eslint.config.ts, with findings on fixes, patterns, pitfalls, and interactions drawn from the rule implementations and post-mortem experience.

---

## Custom Rules (rules/)

### local/no-nested-function

This rule forbids a parameterized function defined inside another parameterized function. The theoretical basis is lambda lifting (Johnsson 1985): every closure can be mechanically eliminated by lifting free variables into parameters. The only permitted nesting shape is the partial application thunk — `(fn, ...params) => () => fn(...params)` — where the inner function has zero parameters and therefore is not "parameterized inside parameterized."

The fix is always one of three forms. First, extract the inner function to module scope and pass its free variables as explicit arguments. Second, use the IIFE thunk `(() => (node) => work)()`, which exists in the AST as a zero-param wrapper and collapses at runtime by the `1 -> T` isomorphism. Third, use `.bind(null, arg1, arg2)` as JavaScript's native partial application primitive — this is not a function definition, so the rule does not see it.

A common pitfall is believing that object literal method shorthands are exempt. They are not. An object literal `{ foo(node) { ... } }` is syntactically a function expression assigned to a property — no prototype, no `this` contract, no class. The rule sees it as a nested function and flags it if the enclosing function is also parameterized. Every ESLint rule's `create` return object hits this: the handler methods close over `context`. The IIFE thunk or `.bind()` patterns resolve it.

Another pitfall is the `makeHandler(fn, ctx)()` anti-pattern — a thunk that is immediately invoked at the call site. The `()` just unwraps what the thunk wraps, making it a no-op (`1 -> T ≅ T`). The correct form is to have `makeHandler` *return* the thunk result directly: `const makeHandler = (fn, ctx) => (() => (node) => fn(ctx, node))()`. Here the IIFE is inside `makeHandler`, and the caller gets a plain handler back without extra invocation.

The rule implementation itself uses `findParentParamCount` as a recursive walk up `node.parent`, stopping at the first ancestor that is a function node (param count >= 0). An early bug had the while loop continuing past thunk ancestors instead of stopping at the nearest enclosing function. The fix was simple: stop at `fnParamCount(node) >= 0`.

### local/max-total-depth

This rule counts indentation depth by measuring leading whitespace (spaces divided by indent size, or tab count) and flags any line exceeding the configured maximum (default 3). It operates on the raw source text at `Program:exit`, not on AST structure.

The fix for violations is always structural: extract the deeply indented block into a separate function. With `restrict-return-count` at 1 and `complexity` at 5, deeply nested if-chains and switch statements naturally push you toward small, single-purpose functions.

The critical pitfall is the interaction with `eslint --fix` and the `indent` rule. The indent auto-fixer reformats indentation to match the configured style (4 spaces, SwitchCase 1). When code contains nested ternary expressions, auto-fix pushes the ternary branches deeper, creating *new* max-total-depth violations that did not exist before. Post-mortem 1 documents going from 40 to 125 errors after a single `--fix` run. The safe approach: only run `eslint --fix` on non-ternary code (if/switch/assignment patterns), where the fixer is reliably mechanical. For ternary-heavy code, format manually or with prettier first.

Tabs and spaces are handled separately — if a line contains a tab, the rule counts tabs; otherwise it divides space count by `INDENT_SIZE` (4). Mixed tab/space indentation will produce nonsensical depth values.

### local/restrict-return-count

This rule limits the number of return statements per function (default 1) and separately flags any return that is not the final statement in its function body. It uses a stack to track return counts across nested function scopes — push on function enter, increment on `ReturnStatement`, pop-and-check on function exit.

The fix for multiple returns depends on the code shape. For dispatch logic (many branches returning different values), the switch-with-result-variable pattern is canonical: declare a result variable, assign inside each case, return once at the end. Post-mortem 2 documents this as the only pattern that simultaneously satisfies `restrict-return-count` (1 return), `max-total-depth` (case bodies at depth 2-3), and `consistent-type-assertions` (no casts needed). For predicate chains, use the nullish coalescing chain (`tryA(x) ?? tryB(x) ?? fallback`) or a single ternary expression — each returns from one site.

The early-return check (`earlyReturn` message) specifically tests whether the return statement is the last statement in a `BlockStatement` whose parent is a function node. This means `if (bad) return;` at the top of a function is always flagged, even if there is only one return total. The intent is to forbid guard clauses entirely — the function should compute its result and return it once at the bottom.

A subtle pitfall: arrow functions with expression bodies (`=> expr`) have no explicit return statement. The rule only counts `ReturnStatement` AST nodes, so concise arrows are invisible to it. This is intentional — a concise arrow inherently has one "return."

---

## Type-Based Rules (type-based/)

### local/enforce-record-type

Flags any type alias whose body is an object literal type (`TSTypeLiteral`). The fix is to rewrite `type TFoo = { bar: string }` as `type TFoo = Record<string, string>` or extract the structure differently.

The pitfall is that this rule fires on *all* type literals, including those with call signatures, index signatures, and method signatures. A type like `type TFoo = { (x: number): string }` (call signature style) is a `TSTypeLiteral` and gets flagged. However, `no-single-field-type` explicitly exempts call signatures. The two rules have different views on the same AST shape. In practice, `prefer-call-signature` (currently disabled) would channel function types into call-signature form, which `enforce-record-type` then flags. The resolution is that `enforce-record-type` should be understood as targeting data-shaped types — the interaction with function types needs care when enabling `prefer-call-signature`.

### local/no-single-field-type

Flags type aliases with exactly one member in a type literal body, unless that member is a `TSCallSignatureDeclaration`. The rationale is that a single-field type is either a wrapper that should be the inner type directly, or should be combined with other fields.

The call-signature exemption is significant: `type TFoo = { (x: A): B }` has one member but is not a wrapper — it is the canonical call-signature form for function types. Without this exemption, every call-signature type in the codebase would be flagged.

The fix is usually to inline the single field's type directly (`type TFoo = string` instead of `type TFoo = { name: string }`) or to merge the field into a parent type that gives it structural context.

### local/prefer-call-signature (currently disabled)

Requires `{ (params): T }` call-signature syntax instead of `(params) => T` function-type syntax in type alias declarations. This is currently commented out in the config.

The rule itself is straightforward — it checks if a type alias body is `TSFunctionType` and flags it. The fix is to wrap the function type in a type literal with a call signature: `type TFoo = (x: A) => B` becomes `type TFoo = { (x: A): B }`.

The reason it is disabled is likely the tension with `enforce-record-type`: the call-signature form is a `TSTypeLiteral`, which `enforce-record-type` flags. Enabling both simultaneously requires `enforce-record-type` to exempt type literals whose only member is a call signature — effectively the same exemption `no-single-field-type` already has.

### local/require-extracted-types

Flags any type annotation that is not a keyword (`TSxxxKeyword`) or a named reference (`TSTypeReference`). Inline unions, intersections, function types, tuple types, object literals, and any other complex type expression in annotation position must be extracted to a named type alias.

The fix is always extraction: `const x: string | number = ...` becomes `type TStringOrNumber = string | number; const x: TStringOrNumber = ...`. This is the most frequently triggered rule during initial implementation, because the natural instinct is to write inline types. With `typedef` requiring annotations on every variable declaration, every complex expression needs a named alias.

The pitfall is volume. A function with three parameters, a return type, and two local variables could need six named type aliases. This is intentional — it forces the type vocabulary to be defined upfront and reused, which is the constraint system's core design goal. But it means the fix process is not mechanical substitution; it requires thinking about what the type *means* to name it well.

### local/require-parametric-record

Any type alias containing `Record<` must match the parametric pattern: `type TFoo<T extends X> = Record<T, TBar<T>>`. The type parameter must appear as both the Record key and backreferenced in the value type. If a Record cannot be given a meaningful generic key parameter, the rule says the key-value structure is not justified — use a tuple instead.

The fix is to either add a type parameter that backreferences correctly, or to replace the Record with a different structure (tuple, mapped type, or explicit union). `Record<string, number>` is always flagged because there is no parametric relationship between key and value.

The regex-based check (`/type\s+\w+<(\w+)\s+extends\s+[^>]+>\s*=\s*Record<\1,\s*\w+<\1>>/`) is a known limitation — it operates on source text, not the AST. Complex formatting, multi-line type parameters, or Record types nested inside other constructs may not match. The regex specifically requires the type parameter to appear as a direct argument to a named type in the value position (`\w+<\1>`), so `Record<T, Array<T>>` matches but `Record<T, T>` does not (the value must be wrapped in a named type).

### local/valid-generics

Flags two degenerate patterns. First, a "degenerate generic" where the type alias body is just the type parameter itself: `type TId<T> = T` — the generic adds no information. Second, a "homogeneous generic" where all type parameters are passed straight through to another generic in the same order: `type TFoo<A, B> = TBar<A, B>` — this is just an alias that could be `type TFoo = TBar`.

The fix for degenerate generics is to remove the type parameter and use the inner type directly. The fix for homogeneous generics is to either remove the generic parameters (making it a simple alias) or to add transformation logic that justifies the generic indirection (partial application of type parameters, additional constraints, etc.).

The detection uses string comparison of parameter names against argument names, joined with a null separator. This means renaming alone defeats the check: `type TFoo<A> = TBar<B>` is not flagged even if A and B are structurally identical. The rule is intentionally nominal — it catches copy-paste indirection, not deep structural equivalence.

### local/max-type-nesting

Limits the number of nested type constructs (type literals and tuples) within a single type alias declaration (default 1). Uses a stack-based counter that increments on each `TSTypeLiteral` or `TSTupleType` encountered within a `TSTypeAliasDeclaration` scope.

The fix is extraction: pull inner type literals and tuples out into their own named type aliases. `type TFoo = { bar: { baz: string } }` violates at nesting count 2 — extract to `type TInner = { baz: string }; type TFoo = { bar: TInner }`.

Note this rule counts *occurrences*, not depth. Two sibling type literals at the same level both increment the counter. With a max of 1, any type alias with more than one inline type literal or tuple anywhere in its body is flagged.

### local/no-duplicate-type-structure

The most complex custom rule. It canonicalizes every type alias's body into a structural string representation, then flags any two type aliases (across the entire project) that produce the same canonical string. Uses a module-level `Map<string, Array<TEntry>>` (the `seen` map) that persists across files within a lint run.

The canonical string is produced by a recursive dispatch over all TypeScript type AST nodes — type literals become `{member;member}`, unions become `type|type`, references become `Name<args>`, etc. The dispatch chain uses nullish coalescing across four groups (composite, reference, literal, advanced) for flat control flow that satisfies return-count constraints.

Post-mortem 1 documents the central lesson: the dispatch pattern needed to evolve from a single 311-line function through several intermediate forms. The key findings were:

First, use `AST_NODE_TYPES` enum values instead of string literals for all type comparisons. The initial version used raw strings like `"TSTypeLiteral"`, producing dozens of "no string comparison" errors. Switching to the enum was a mechanical find-and-replace that eliminated 65% of errors.

Second, `Record<string, string>` for the keyword map was wrong. Accessing a Record always returns `string` (never `undefined`), so the `??` fallback was flagged as unnecessary by `no-unnecessary-condition`. The fix was `Map<string, string>` with `.get()`, which properly returns `string | undefined`.

Third, typed handlers with specific node types (e.g., `TSESTree.TSTypeLiteral`) cannot be stored in a generic Map without type assertions, which are banned. The solution was the try-dispatch pattern: each handler is a function that checks the node type and returns `string | undefined`, and they chain via `??`. No type assertions, no generic container.

Fourth, the `clearFile` function re-processes entries when a file is re-linted (e.g., during watch mode). Without it, stale entries from previous runs accumulate and produce false positives.

The `typeParameter.key` versus `typeParameter.name.name` API discrepancy (post-mortem 1, item 4) is worth noting: the `@typescript-eslint` deprecation message about `.key` and `.constraint` refers to `TSMappedType` properties, not `TSTypeParameter`. For `TSInferType`, the correct access is `.typeParameter.name.name`.

---

## External Rules

### @typescript-eslint/consistent-type-assertions: never

All type assertions (`as X`, `<X>`, `satisfies` excluded) are banned. This is one of the most consequential external rules because it eliminates the primary escape hatch for type system friction.

The fix is always to restructure code so TypeScript infers the correct type without help. For Map-based dispatch where handlers have specific parameter types, this means you cannot cast to a common handler type — use the try-dispatch-with-nullish-coalescing pattern instead (as demonstrated in `no-duplicate-type-structure.ts`). For API boundaries where the inferred type is too wide, add explicit type annotations to variables or function return types.

Combined with `@typescript-eslint/no-unsafe-type-assertion`, there is truly no way to assert. This forces every value to be provably the type it claims to be through inference alone.

### @typescript-eslint/consistent-type-definitions: type

All type definitions must use `type`, never `interface`. This simplifies the mental model — there is one way to define a type. The fix is mechanical: `interface IFoo { ... }` becomes `type TFoo = { ... }`.

### @typescript-eslint/consistent-type-imports / consistent-type-exports

Imports used only as types must use `import type`. Exports of types must use `export type`. The fix is usually auto-fixable. The pitfall is forgetting to update imports when a value import becomes type-only after a refactor.

### @typescript-eslint/explicit-function-return-type

Every function must have an explicit return type annotation. Combined with `require-extracted-types`, this means the return type must be a keyword or named reference. The fix is to add `: TReturnType` to every function, which often means first creating the type alias.

### @typescript-eslint/typedef (variableDeclaration: true)

Every `const` and `let` declaration must have a type annotation. This is the counterpart to `explicit-function-return-type` for variables. Combined with `require-extracted-types`, complex right-hand-side expressions cannot rely on inference — they must declare their type.

### functional/no-let

All `let` declarations are banned. Use `const` exclusively. The fix for accumulator patterns is recursion or immutable data flow. For switch-with-result-variable (the pattern `restrict-return-count` pushes you toward), this creates a tension: you need a mutable variable to satisfy single-return, but `no-let` forbids it.

The resolution documented in the post-mortems is that `no-let` was added *after* the switch pattern was established. Rules with existing `let` usage need refactoring to Map-based dispatch, recursive reduction, or the try/nullish-coalescing chain pattern. The `no-duplicate-type-structure.ts` rule itself still uses mutable state (`seen` Map, `state` arrays) which would need addressing.

### indent (4 spaces, SwitchCase: 1)

Four-space indentation with switch cases indented one level. The auto-fixer is reliable for if/switch/assignment code but fights with `max-total-depth` when applied to nested ternaries. Post-mortem 1 recommends: run prettier first, then lint. Only use `eslint --fix` for indent on non-ternary code.

### max-len (80 characters)

Strict 80-character line limit with no exceptions for strings or template literals (only URLs). The fix is string concatenation across lines (`"part one " + "part two"`) or structural extraction. Every MSG and DESC constant in the custom rules demonstrates the concatenation pattern.

### max-lines-per-function (40 lines)

Including blank lines and comments. This is the hard ceiling that forces function decomposition. The fix is always extraction into smaller functions. Combined with `no-nested-function`, extracted functions must go to module scope with explicit parameter passing.

### complexity (5)

Maximum cyclomatic complexity of 5. Each `if`, `else if`, `case`, `&&`, `||`, `??`, and ternary `?` adds 1. The fix is to decompose branching logic into separate functions or use Map/dispatch patterns. The try-dispatch pattern in `no-duplicate-type-structure.ts` keeps each function at complexity 1-2 by splitting branches across functions.

### arrow-body-style: as-needed

Arrow functions must use concise body (`=> expr`) when possible, block body (`=> { return expr }`) only when necessary (multiple statements). This interacts with `restrict-return-count` — a concise arrow has no `ReturnStatement` node, so it is invisible to the return counter.

### func-style: expression

All functions must be function expressions (`const fn = ...`), never function declarations (`function fn() {}`). Combined with `prefer-arrow-callback`, all functions are arrow expressions.

### prefer-arrow-callback

Callbacks must be arrow functions, not `function` expressions. This is the complement to `func-style: expression`.

### eslint-comments/no-use (allow: [])

All eslint disable comments are banned with no exceptions. You cannot suppress any rule with `// eslint-disable`. Every error must be fixed structurally.

### no-warning-comments (terms: prettier-ignore)

The string `prettier-ignore` is banned in comments. You cannot use `// prettier-ignore` to escape prettier formatting. This was explicitly added because prettier-ignore comments are unmaintainable at scale — post-mortem 2 notes that prettier's ternary formatting cannot be selectively disabled, and the project chose to ban the escape hatch rather than allow per-expression overrides.

### no-restricted-syntax: TSTypePredicate

Type predicates (`is` in return types) are banned. `(x: unknown): x is Foo` must be replaced with a boolean return and explicit narrowing at the call site, or a discriminated union pattern.

### @typescript-eslint/no-unnecessary-condition

Flags conditions that are always truthy or always falsy based on type analysis. This is what caught the `Record<string, string>` issue — accessing a Record always returns `string` (not `string | undefined`), so a `?? fallback` is unnecessary. Use `Map.get()` when you need the `undefined` case.

### @typescript-eslint/no-confusing-void-expression (ignoreArrowShorthand: true)

Prevents void-returning expressions in value positions, but allows them in arrow shorthand (`=> voidFn()`). This permits the concise callback pattern `items.forEach(item => process(item))` even when `process` returns void.

### id-length (min: 3)

Identifiers must be at least 3 characters, with an exceptions list (`id`, `i`, `j`, `k`, `x`, `y`, `z`, `_`, `fs`, `db`, `ui`, `el`, `e`). Property names are excluded (`properties: "never"`). The fix is to use descriptive names — `idx` not `i` (unless in the exceptions), `ctx` not `c`, `val` not `v`.

### @typescript-eslint/array-type: generic

Arrays must use `Array<T>` syntax, not `T[]`. Note: this rule appears twice in the config (lines 71-76 and 155-160) — an oversight to clean up.

### @typescript-eslint/method-signature-style: property

In type literals, methods must use property signature style: `foo: (x: A) => B` not `foo(x: A): B`. This ensures consistency with the arrow-function-everywhere approach.

---

## Cross-Rule Interactions

The rules form a constraint system where certain combinations eliminate entire code patterns:

`restrict-return-count(1)` + `max-total-depth(3)` + `consistent-type-assertions(never)` collectively rule out if-chains (multiple returns), deep ternaries (depth violations), and cast-based Maps (no assertions). The surviving pattern is switch-with-result-variable or nullish-coalescing dispatch chains.

`no-nested-function` + `max-lines-per-function(40)` + `func-style(expression)` force all functions to module scope as const arrow expressions, each under 40 lines. The IIFE thunk pattern is the only way to create closures in ESLint handler objects.

`require-extracted-types` + `typedef(variableDeclaration)` + `explicit-function-return-type` force every value and function in the program to have a named type. Combined with `no-duplicate-type-structure`, these types must be structurally unique across the project.

`eslint-comments/no-use(allow: [])` + `no-warning-comments(prettier-ignore)` eliminate all escape hatches. Every error must be resolved structurally — no suppression, no formatting overrides.

`functional/no-let` + `restrict-return-count(1)` create the central tension for dispatch code: single-return wants a mutable accumulator, but no-let forbids mutation. The resolution is the try/nullish-coalescing chain (each branch returns `T | undefined`, chain with `??`), which satisfies both rules.

---

## Config Notes

The `@typescript-eslint/array-type` rule is declared twice in the config (line 71 and line 155), both with `default: "generic"`. The second overrides the first. This is harmless but should be deduplicated.

`prefer-call-signature` is commented out in both the plugin registration and the rules. The existing rules were written to comply with it (all function types use call-signature form), but enabling it would conflict with `enforce-record-type` without an exemption.

Several rules are commented out with notes: `consistent-indexed-object-style`, `naming-convention`, `max-params`, `no-shadow`. These represent considered-and-deferred additions to the constraint system.
