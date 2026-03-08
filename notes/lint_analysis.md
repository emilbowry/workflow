# Lint Rule Analysis

Analysis of each lint rule active in eslint.config.ts, with findings on fixes, patterns, pitfalls, and how each rule serves the broader philosophy: types as a provable contract, bounded generation for agents, and issue-driven development where every commit is independently valid against a canonical type algebra — so divergences are caught per-issue, not three issues later in an expensive cross-codebase refactor.

---

## Custom Rules (rules/)

### local/no-nested-function

This rule forbids a parameterized function defined inside another parameterized function. The theoretical basis is lambda lifting (Johnsson 1985): every closure can be mechanically eliminated by lifting free variables into parameters. The only permitted nesting shape is the partial application thunk — `(fn, ...params) => () => fn(...params)` — where the inner function has zero parameters and therefore is not "parameterized inside parameterized."

The fix is always one of three forms. First, extract the inner function to module scope and pass its free variables as explicit arguments. Second, use the IIFE thunk `(() => (node) => work)()`, which exists in the AST as a zero-param wrapper and collapses at runtime by the `1 -> T` isomorphism. Third, use `.bind(null, arg1, arg2)` as JavaScript's native partial application primitive — this is not a function definition, so the rule does not see it.

A common pitfall is believing that object literal method shorthands are exempt. They are not. An object literal `{ foo(node) { ... } }` is syntactically a function expression assigned to a property — no prototype, no `this` contract, no class. The rule sees it as a nested function and flags it if the enclosing function is also parameterized. Every ESLint rule's `create` return object hits this: the handler methods close over `context`. The IIFE thunk or `.bind()` patterns resolve it.

Another pitfall is the `makeHandler(fn, ctx)()` anti-pattern — a thunk that is immediately invoked at the call site. The `()` just unwraps what the thunk wraps, making it a no-op (`1 -> T ≅ T`). The correct form is to have `makeHandler` *return* the thunk result directly: `const makeHandler = (fn, ctx) => (() => (node) => fn(ctx, node))()`. Here the IIFE is inside `makeHandler`, and the caller gets a plain handler back without extra invocation.

The rule implementation itself uses `findParentParamCount` as a recursive walk up `node.parent`, stopping at the first ancestor that is a function node (param count >= 0). An early bug had the while loop continuing past thunk ancestors instead of stopping at the nearest enclosing function. The fix was simple: stop at `fnParamCount(node) >= 0`.

**Philosophy.** Closures hide free variables — they create implicit coupling between the inner function and its enclosing scope. In an issue-driven workflow where agents modify individual functions, hidden dependencies mean a change to the outer function can silently break the inner one without any type-level signal. Lambda lifting makes every dependency a parameter, and every parameter appears in the type signature. Dependencies become edges in the type graph, visible and trackable. A flat module of small typed arrows has no hidden wiring — the signature IS the specification of what the function touches.

### local/max-total-depth

This rule counts indentation depth by measuring leading whitespace (spaces divided by indent size, or tab count) and flags any line exceeding the configured maximum (default 3). It operates on the raw source text at `Program:exit`, not on AST structure.

The fix for violations is always structural: extract the deeply indented block into a separate function. With `restrict-return-count` at 1 and `complexity` at 5, deeply nested if-chains and switch statements naturally push you toward small, single-purpose functions.

The critical pitfall is the interaction with `eslint --fix` and the `indent` rule. The indent auto-fixer reformats indentation to match the configured style (4 spaces, SwitchCase 1). When code contains nested ternary expressions, auto-fix pushes the ternary branches deeper, creating *new* max-total-depth violations that did not exist before. Post-mortem 1 documents going from 40 to 125 errors after a single `--fix` run. The safe approach: only run `eslint --fix` on non-ternary code (if/switch/assignment patterns), where the fixer is reliably mechanical. For ternary-heavy code, format manually or with prettier first.

Tabs and spaces are handled separately — if a line contains a tab, the rule counts tabs; otherwise it divides space count by `INDENT_SIZE` (4). Mixed tab/space indentation will produce nonsensical depth values.

**Philosophy.** Bounds the structural complexity any single generation can contain. Deeply nested code cannot be verified locally — you have to hold the full nesting context in mind. At depth 3, each function is shallow enough that its behavior is obvious from a single read. Per-issue verification becomes cheap: the agent produces something small and flat, the lints confirm it structurally, the issue closes. If a deeply nested monolith spans multiple concerns, a bug in one branch requires understanding all the others — exactly the kind of cross-concern reasoning that makes refactors expensive.

### local/restrict-return-count

This rule limits the number of return statements per function (default 1) and separately flags any return that is not the final statement in its function body. It uses a stack to track return counts across nested function scopes — push on function enter, increment on `ReturnStatement`, pop-and-check on function exit.

The fix for multiple returns depends on the code shape. For dispatch logic (many branches returning different values), the switch-with-result-variable pattern is canonical: declare a result variable, assign inside each case, return once at the end. Post-mortem 2 documents this as the only pattern that simultaneously satisfies `restrict-return-count` (1 return), `max-total-depth` (case bodies at depth 2-3), and `consistent-type-assertions` (no casts needed). For predicate chains, use the nullish coalescing chain (`tryA(x) ?? tryB(x) ?? fallback`) or a single ternary expression — each returns from one site.

The early-return check (`earlyReturn` message) specifically tests whether the return statement is the last statement in a `BlockStatement` whose parent is a function node. This means `if (bad) return;` at the top of a function is always flagged, even if there is only one return total. The intent is to forbid guard clauses entirely — the function should compute its result and return it once at the bottom.

A subtle pitfall: arrow functions with expression bodies (`=> expr`) have no explicit return statement. The rule only counts `ReturnStatement` AST nodes, so concise arrows are invisible to it. This is intentional — a concise arrow inherently has one "return."

**Philosophy.** A function with one return is a total arrow: one input path, one output path, both visible in the type signature. Multiple returns create invisible control flow branches the signature does not witness — it says `A -> B` but the implementation has three different paths to `B`, each with different preconditions. Guard clauses are forbidden because they introduce early exits the signature does not advertise. When the agent implements a stub whose type says `(x: A) => B`, single return guarantees there is exactly one path to `B`. The implementation is determined by the type, not by which branch happens to execute.

---

## Type-Based Rules (type-based/)

### local/enforce-record-type

Flags any type alias whose body is an object literal type (`TSTypeLiteral`). The fix is to rewrite `type TFoo = { bar: string }` as `type TFoo = Record<string, string>` or extract the structure differently.

The pitfall is that this rule fires on *all* type literals, including those with call signatures, index signatures, and method signatures. A type like `type TFoo = { (x: number): string }` (call signature style) is a `TSTypeLiteral` and gets flagged. However, `no-single-field-type` explicitly exempts call signatures. The two rules have different views on the same AST shape, and enabling `prefer-call-signature` would require `enforce-record-type` to exempt type literals whose only member is a call signature.

**Philosophy.** Object literals carry semantic information in their property names — `{ name: string, age: number }` looks structural but the labels `name` and `age` are conventions, not structure. Two object literals with different property names but identical value types are structurally the same thing; under object literal syntax this is hidden behind labels, under `Record<K, V>` it is obvious. This is critical for `no-duplicate-type-structure`: when types are Records, structural comparison catches redundancy that label-based comparison would miss. The deeper point from LINT_PLAN_2 is that types decompose into two canonical forms — tuples for ordered positional structure (function args), Records for keyed relational structure (parameterized maps) — and they compose freely because they are structurally disjoint.

### local/no-single-field-type

Flags type aliases with exactly one member in a type literal body, unless that member is a `TSCallSignatureDeclaration`. The rationale is that a single-field type is either a wrapper that should be the inner type directly, or should be combined with other fields.

The call-signature exemption is significant: `type TFoo = { (x: A): B }` has one member but is not a wrapper — it is the canonical call-signature form for function types. Without this exemption, every call-signature type in the codebase would be flagged.

The fix is usually to inline the single field's type directly (`type TFoo = string` instead of `type TFoo = { name: string }`) or to merge the field into a parent type that gives it structural context.

**Philosophy.** Every type must earn its existence structurally. A single-field wrapper adds a layer of indirection without adding information — it is an alias for the inner type wearing a name. In a workflow where agents create types per-issue, trivial wrappers proliferate: each issue introduces its own `type TFoo = { value: string }` instead of reusing the inner type. This rule catches that redundancy at the point of definition, before the wrapper leaks into function signatures across multiple files.

### local/require-extracted-types

Flags any type annotation that is not a keyword (`TSxxxKeyword`) or a named reference (`TSTypeReference`). Inline unions, intersections, function types, tuple types, object literals, and any other complex type expression in annotation position must be extracted to a named type alias.

The fix is always extraction: `const x: string | number = ...` becomes `type TStringOrNumber = string | number; const x: TStringOrNumber = ...`. This is the most frequently triggered rule during initial implementation, because the natural instinct is to write inline types. With `typedef` requiring annotations on every variable declaration, every complex expression needs a named alias.

The pitfall is volume. A function with three parameters, a return type, and two local variables could need six named type aliases. This is intentional — it forces the type vocabulary to be defined upfront and reused, which is the constraint system's core design goal. But it means the fix process is not mechanical substitution; it requires thinking about what the type *means* to name it well.

**Philosophy.** The most direct expression of the types-first workflow. Every value in the program has a named type, and that type exists before the value does. The type vocabulary IS the specification — you can read the types alone and understand the program's structure without any implementation. When an agent works from an issue that says "implement function with signature `TFoo`", the type already exists as a named alias, the agent fills in the body, and the lints confirm the body conforms. No drift, no invention, no ad-hoc inline types that duplicate existing structure. The volume of aliases is the point: it forces the specification to be complete before implementation begins, which is what makes the implementation step decidable rather than creative.

### local/require-parametric-record

Any type alias containing `Record<` must match the parametric pattern: `type TFoo<T extends X> = Record<T, TBar<T>>`. The type parameter must appear as both the Record key and backreferenced in the value type. If a Record cannot be given a meaningful generic key parameter, the rule says the key-value structure is not justified — use a tuple instead.

The fix is to either add a type parameter that backreferences correctly, or to replace the Record with a different structure (tuple, mapped type, or explicit union). `Record<string, number>` is always flagged because there is no parametric relationship between key and value.

The regex-based check (`/type\s+\w+<(\w+)\s+extends\s+[^>]+>\s*=\s*Record<\1,\s*\w+<\1>>/`) is a known limitation — it operates on source text, not the AST. Complex formatting, multi-line type parameters, or Record types nested inside other constructs may not match. The regex specifically requires the type parameter to appear as a direct argument to a named type in the value position (`\w+<\1>`), so `Record<T, Array<T>>` matches but `Record<T, T>` does not (the value must be wrapped in a named type).

**Philosophy.** A Record without a parametric key-value relationship is a bag of unrelated data — there is no structural reason the keys and values are paired. The parameterization `Record<T, TBar<T>>` witnesses that the value depends on the key: this is a typed map with structure, not a grab-bag. This matters directly for the transport graph: a parametric Record's key type is a discriminated domain and the value is a fiber over that domain. The transport machinery can track what happens when the key union gains a member, because the value type is defined in terms of it. A non-parametric `Record<string, number>` has no such trackable relationship.

### local/valid-generics

Flags two degenerate patterns. First, a "degenerate generic" where the type alias body is just the type parameter itself: `type TId<T> = T` — the generic adds no information. Second, a "homogeneous generic" where all type parameters are passed straight through to another generic in the same order: `type TFoo<A, B> = TBar<A, B>` — this is just an alias that could be `type TFoo = TBar`.

The fix for degenerate generics is to remove the type parameter and use the inner type directly. The fix for homogeneous generics is to either remove the generic parameters (making it a simple alias) or to add transformation logic that justifies the generic indirection (partial application of type parameters, additional constraints, etc.).

The detection uses string comparison of parameter names against argument names, joined with a null separator. This means renaming alone defeats the check: `type TFoo<A> = TBar<B>` is not flagged even if A and B are structurally identical. The rule is intentionally nominal — it catches copy-paste indirection, not deep structural equivalence.

**Philosophy.** A generic is a functor — it maps types to types with structure. An identity functor (`type TId<T> = T`) and a pure-passthrough functor (`type TFoo<A, B> = TBar<A, B>`) are trivial: they add a name without adding a transformation. In the algebra, every generic must earn its existence by doing something to its parameters — adding constraints, composing with other types, partially applying. Agents are prone to wrapping types in generics "for flexibility" without any constraint or transformation. This creates noise in the type graph: edges that look like they carry information but witness nothing. The transport graph relies on generics being meaningful — a generic over a finite domain is a type family whose fibers matter. Trivial generics pollute the graph with vacuous edges.

### local/max-type-nesting

Limits the number of nested type constructs (type literals and tuples) within a single type alias declaration (default 1). Uses a stack-based counter that increments on each `TSTypeLiteral` or `TSTupleType` encountered within a `TSTypeAliasDeclaration` scope.

The fix is extraction: pull inner type literals and tuples out into their own named type aliases. `type TFoo = { bar: { baz: string } }` violates at nesting count 2 — extract to `type TInner = { baz: string }; type TFoo = { bar: TInner }`.

Note this rule counts *occurrences*, not depth. Two sibling type literals at the same level both increment the counter. With a max of 1, any type alias with more than one inline type literal or tuple anywhere in its body is flagged.

**Philosophy.** Forces the type vocabulary to be decomposed into named, reusable, comparable pieces. A deeply nested type is a type that has not been designed — it has been inlined. Agents composing types inline across multiple issues create structures that `no-duplicate-type-structure` cannot easily compare, because the duplicate fragment is buried inside a larger definition. Flat named types are independently comparable, composable, and visible as nodes in the transport graph. Every named type is a potential fiber endpoint; an inline anonymous structure is invisible to the graph.

### local/no-duplicate-type-structure

The most complex custom rule. It canonicalizes every type alias's body into a structural string representation, then flags any two type aliases (across the entire project) that produce the same canonical string. Uses a module-level `Map<string, Array<TEntry>>` (the `seen` map) that persists across files within a lint run.

The canonical string is produced by a recursive dispatch over all TypeScript type AST nodes — type literals become `{member;member}`, unions become `type|type`, references become `Name<args>`, etc. The dispatch chain uses nullish coalescing across four groups (composite, reference, literal, advanced) for flat control flow that satisfies return-count constraints.

Post-mortem 1 documents the central lesson: the dispatch pattern needed to evolve from a single 311-line function through several intermediate forms. The key findings were:

First, use `AST_NODE_TYPES` enum values instead of string literals for all type comparisons. The initial version used raw strings like `"TSTypeLiteral"`, producing dozens of "no string comparison" errors. Switching to the enum was a mechanical find-and-replace that eliminated 65% of errors.

Second, `Record<string, string>` for the keyword map was wrong. Accessing a Record always returns `string` (never `undefined`), so the `??` fallback was flagged as unnecessary by `no-unnecessary-condition`. The fix was `Map<string, string>` with `.get()`, which properly returns `string | undefined`.

Third, typed handlers with specific node types (e.g., `TSESTree.TSTypeLiteral`) cannot be stored in a generic Map without type assertions, which are banned. The solution was the try-dispatch pattern: each handler is a function that checks the node type and returns `string | undefined`, and they chain via `??`. No type assertions, no generic container.

Fourth, the `clearFile` function re-processes entries when a file is re-linted (e.g., during watch mode). Without it, stale entries from previous runs accumulate and produce false positives.

The `typeParameter.key` versus `typeParameter.name.name` API discrepancy (post-mortem 1, item 4) is worth noting: the `@typescript-eslint` deprecation message about `.key` and `.constraint` refers to `TSMappedType` properties, not `TSTypeParameter`. For `TSInferType`, the correct access is `.typeParameter.name.name`.

**Philosophy.** The canonicality enforcer and the rule most central to the thesis. Two types with identical structure are the same type — different names are aliasing, not definition. Agents working on separate issues independently introduce structurally identical types because each issue's context is local. Without this rule, the codebase accumulates redundant types that diverge over time as each copy is modified separately in different issues. That divergence is exactly the expensive cross-codebase refactor this system exists to prevent. By catching duplicates at lint time per-issue, every commit is validated against the global algebra immediately. The blast radius of structural redundancy is zero: it never enters the codebase.

---

## External Rules

### @typescript-eslint/ban-ts-comment

Bans `@ts-ignore`, `@ts-expect-error`, and `@ts-nocheck` comments. These directives tell the TypeScript compiler to skip type checking for a line or file.

**Philosophy.** Same escape-hatch elimination as `eslint-comments/no-use`, but for the TypeScript compiler itself. If types are provable contracts, overriding the checker with a comment is voiding the contract. The agent cannot suppress a type error — it must fix the types until they work.

### @typescript-eslint/ban-tslint-comment

Bans legacy TSLint directive comments (`// tslint:disable`, etc.). Mechanical cleanup — prevents stale suppression directives from lingering after migration.

### @typescript-eslint/consistent-generic-constructors: type-annotation

Generic type arguments go on the variable declaration, not the constructor call: `const x: Map<K, V> = new Map()` not `const x = new Map<K, V>()`. Keeps the type information on the left side where `typedef` and `require-extracted-types` expect it.

**Philosophy.** The type annotation is the contract; the right-hand side is the implementation. Putting generics on the constructor mixes specification with instantiation. Putting them on the annotation keeps the type visible as a named, declared thing — consistent with the types-first principle.

### @typescript-eslint/prefer-function-type

If a type literal has only a single call signature and nothing else, simplify it to function type syntax: `type TFoo = { (): T }` becomes `type TFoo = () => T`. Reduces unnecessary structural wrapping for pure function types.

### @typescript-eslint/array-type: generic

Arrays must use `Array<T>` syntax, not `T[]`. Note: this rule appears twice in the config (lines 71-76 and 155-160) — an oversight to clean up.

**Philosophy.** One canonical form for containers. `Array<T>` is consistent with `Record<K, V>`, `Map<K, V>`, and all other generic types. `T[]` is special syntax for one container. In a canonical algebra, special cases for one type are noise — they break the visual consistency that makes structural comparison easy.

### @typescript-eslint/consistent-type-assertions: never

All type assertions (`as X`, `<X>`) are banned. `satisfies` is excluded. This is one of the most consequential external rules because it eliminates the primary escape hatch for type system friction.

The fix is always to restructure code so TypeScript infers the correct type without help. For Map-based dispatch where handlers have specific parameter types, this means you cannot cast to a common handler type — use the try-dispatch-with-nullish-coalescing pattern instead (as demonstrated in `no-duplicate-type-structure.ts`). For API boundaries where the inferred type is too wide, add explicit type annotations to variables or function return types.

Combined with `@typescript-eslint/no-unsafe-type-assertion`, there is truly no way to assert. This forces every value to be provably the type it claims to be through inference alone.

**Philosophy.** Assertions are lies to the type checker. They say "trust me, this is type X" without proof. In a system where types are provable contracts, assertions are holes in the contract — the agent says the code is sound but the type system cannot verify it. Banning assertions forces the agent to make the types actually work: restructure until inference succeeds. If the types cannot be made to work without an assertion, the types are wrong, and fixing the types is the issue, not suppressing the error. This is what makes the algebra airtight — if the lints pass, every type relationship is provably correct.

### @typescript-eslint/no-unsafe-type-assertion

Flags type assertions that narrow to a more specific type than the source. Combined with `consistent-type-assertions: never`, this closes both directions: you cannot widen via `as` and you cannot narrow unsafely. Every value must be the type it claims through inference.

### @typescript-eslint/consistent-type-definitions: type

All type definitions must use `type`, never `interface`. The fix is mechanical: `interface IFoo { ... }` becomes `type TFoo = { ... }`.

**Philosophy.** One canonical form for type definitions. Interfaces support declaration merging and `extends`, which create implicit structural relationships outside the type algebra — a second interface declaration with the same name silently extends the first. `type` is explicit, composable via intersection, and its structure is fixed at the definition site. The canonical comparisons in `no-duplicate-type-structure` rely on types being defined once, completely, at one site.

### @typescript-eslint/consistent-type-imports / consistent-type-exports

Imports used only as types must use `import type`. Exports of types must use `export type`. The fix is usually auto-fixable. The pitfall is forgetting to update imports when a value import becomes type-only after a refactor.

**Philosophy.** Separates the type-level and value-level dependency graphs. Type imports are edges in the specification graph; value imports are edges in the runtime graph. Keeping them distinct makes it possible to reason about the type structure of a file without considering its runtime dependencies — which is exactly what the transport graph does.

### @typescript-eslint/explicit-function-return-type

Every function must have an explicit return type annotation. Combined with `require-extracted-types`, this means the return type must be a keyword or named reference. The fix is to add `: TReturnType` to every function, which often means first creating the type alias.

**Philosophy.** Every function advertises its output type in the specification. An agent implementing a function cannot accidentally widen or narrow the return — the type is declared as part of the stub, and the implementation must conform. When the project plan is a tree of issues each specifying a function stub with its type, this rule is what makes the stub a binding contract rather than a suggestion.

### @typescript-eslint/typedef (variableDeclaration: true)

Every `const` and `let` declaration must have a type annotation. This is the counterpart to `explicit-function-return-type` for variables. Combined with `require-extracted-types`, complex right-hand-side expressions cannot rely on inference — they must declare their type.

**Philosophy.** No inference means no ambiguity about what a binding holds. The type is the contract, stated explicitly, before the value is assigned. In generated code, implicit inference is a vector for drift — the inferred type changes silently when the right-hand side changes. An explicit annotation makes the contract visible and breakable: if the implementation drifts, the type error appears at that binding, not downstream.

### @typescript-eslint/no-deprecated

Flags use of deprecated APIs. Keeps the codebase current and prevents agents from generating code against outdated interfaces.

### @typescript-eslint/no-duplicate-type-constituents

Flags `A | A` or `A & A` — redundant members in unions and intersections. Another canonicality rule: a union with a duplicate member is not minimal.

**Philosophy.** Same canonicality principle as `no-duplicate-type-structure` but at the constituent level. A union `A | A` is `A`. Agents generating unions by concatenation across issues can introduce redundant members that silently increase apparent complexity without adding information.

### @typescript-eslint/no-explicit-any (ignoreRestArgs: true)

Bans `any` except in rest argument positions. `any` opts out of type checking entirely — a value of type `any` can be assigned to anything and anything can be assigned to it.

**Philosophy.** `any` is a hole in the type system. It says "this value has no contract." In a system where types are provable contracts, a binding typed `any` is a binding that can silently break anything it touches. The rest-args exception is pragmatic — some variadic APIs genuinely need unconstrained argument types — but every other position must have a real type.

### @typescript-eslint/method-signature-style: property

In type literals, methods must use property signature style: `foo: (x: A) => B` not `foo(x: A): B`. The property form is an arrow — consistent with `func-style: expression` and the functions-are-values principle.

**Philosophy.** Functions are values with types. A method signature `foo(x: A): B` looks like a declaration; a property signature `foo: (x: A) => B` looks like a typed binding. The property form is consistent with every other function in the codebase being a `const` arrow with a type annotation. One form, one mental model.

### @typescript-eslint/no-unnecessary-condition

Flags conditions that are always truthy or always falsy based on type analysis. This is what caught the `Record<string, string>` issue — accessing a Record always returns `string` (not `string | undefined`), so a `?? fallback` is unnecessary. Use `Map.get()` when you need the `undefined` case.

**Philosophy.** Forces types to be precise. If a condition is always true, the type is too wide — it permits states that cannot occur. Tightening the type eliminates the dead branch, simplifies the code, and reduces the complexity the agent has to generate. Precise types mean fewer branches, which means less room for the agent to make decisions, which means the implementation is more determined by the specification.

### @typescript-eslint/no-confusing-void-expression (ignoreArrowShorthand: true)

Prevents void-returning expressions in value positions, but allows them in arrow shorthand (`=> voidFn()`). This permits the concise callback pattern `items.forEach(item => process(item))` even when `process` returns void.

### functional/no-let

All `let` declarations are banned. Use `const` exclusively. The fix for accumulator patterns is recursion or immutable data flow. For switch-with-result-variable (the pattern `restrict-return-count` pushes you toward), this creates a tension: you need a mutable variable to satisfy single-return, but `no-let` forbids it.

The resolution documented in the post-mortems is that `no-let` was added *after* the switch pattern was established. Rules with existing `let` usage need refactoring to Map-based dispatch, recursive reduction, or the try/nullish-coalescing chain pattern. The `no-duplicate-type-structure.ts` rule itself still uses mutable state (`seen` Map, `state` arrays) which would need addressing.

**Philosophy.** Values do not change. Immutability makes reasoning local — you never need to trace mutation history to understand what a binding holds at a given point. For agents working on individual issues, this means modifying a function in one issue cannot silently affect another function's assumptions about shared mutable state, because there is none. Every binding is a fact stated once. The tryA(x) ?? tryB(x) ?? fallback pattern is the canonical resolution: each branch is a pure expression returning `T | undefined`, composed via `??`, with no mutable accumulator. The control flow is an expression, not a sequence of mutations.

### eslint-comments/no-use (allow: [])

All eslint disable comments are banned with no exceptions. You cannot suppress any rule with `// eslint-disable`. Every error must be fixed structurally.

**Philosophy.** No escape hatches. If the agent can suppress a lint error with a comment, the constraint system has a hole — one that agents will find and exploit systematically. Every structural violation must be fixed structurally. This is what makes "the lints pass" a meaningful statement: it means the code conforms to the algebra, period. Not "the code conforms except where we told the linter to look away."

### no-warning-comments (terms: prettier-ignore)

The string `prettier-ignore` is banned in comments. You cannot use `// prettier-ignore` to escape prettier formatting. This was explicitly added because prettier-ignore comments are unmaintainable at scale — post-mortem 2 notes that prettier's ternary formatting cannot be selectively disabled, and the project chose to ban the escape hatch rather than allow per-expression overrides.

**Philosophy.** Extends the no-escape-hatches principle to formatting. If the formatting rules produce output that violates other rules (e.g., prettier pushing ternaries into depth violations), the fix is to change the code structure, not to suppress the formatter.

### no-restricted-syntax: TSTypePredicate

Type predicates (`is` in return types) are banned. `(x: unknown): x is Foo` must be replaced with a boolean return and explicit narrowing at the call site, or a discriminated union pattern.

**Philosophy.** Type predicates are refinement assertions — they narrow a type based on runtime behavior, outside the static algebra. `x is Foo` makes the type system depend on implementation correctness: if the predicate function has a bug, downstream code operates on a value that is not actually `Foo`, but the type system believes it is. Discriminated unions make narrowing structural and decidable — the tag field is a literal, the narrowing is mechanical, no implementation trust required. In a types-as-specification system, the specification must not depend on implementation being correct; it must be self-certifying.

### indent (4 spaces, SwitchCase: 1)

Four-space indentation with switch cases indented one level. The auto-fixer is reliable for if/switch/assignment code but fights with `max-total-depth` when applied to nested ternaries. Post-mortem 1 recommends: run prettier first, then lint. Only use `eslint --fix` for indent on non-ternary code.

### max-len (80 characters)

Strict 80-character line limit with no exceptions for strings or template literals (only URLs). The fix is string concatenation across lines (`"part one " + "part two"`) or structural extraction. Every MSG and DESC constant in the custom rules demonstrates the concatenation pattern.

**Philosophy.** Forces decomposition at the expression level. A long line is a complex expression that has not been named. Combined with `require-extracted-types`, this pushes toward small, named subexpressions with explicit types — each of which is independently comparable, reusable, and visible in the type vocabulary.

### max-lines-per-function (40 lines)

Including blank lines and comments. This is the hard ceiling that forces function decomposition. The fix is always extraction into smaller functions. Combined with `no-nested-function`, extracted functions must go to module scope with explicit parameter passing.

**Philosophy.** The hard ceiling on generation size. Every function an agent produces is at most 40 lines. Every unit of work fits on a screen, can be reviewed in seconds, and is small enough that a lint failure pinpoints the exact problem. The agent cannot produce a 200-line monolith that "works" but embeds structural debt. When issues are scoped to individual functions with type stubs, 40 lines is generous — most typed arrows are 5-15 lines. The ceiling catches the cases where an agent tries to solve too much in one function.

### complexity (5)

Maximum cyclomatic complexity of 5. Each `if`, `else if`, `case`, `&&`, `||`, `??`, and ternary `?` adds 1. The fix is to decompose branching logic into separate functions or use Map/dispatch patterns. The try-dispatch pattern in `no-duplicate-type-structure.ts` keeps each function at complexity 1-2 by splitting branches across functions.

**Philosophy.** Bounds the decision space per function. A function with complexity 5 has at most 5 branch points — it is a shallow decision tree, not a deep control flow graph. Combined with single return and depth 3, each function's logic is nearly linear: a small number of conditions selecting among a small number of outcomes. This is what makes per-function verification cheap. The agent does not need to reason about combinatorial path explosion because the rules ensure there is none.

### arrow-body-style: as-needed

Arrow functions must use concise body (`=> expr`) when possible, block body (`=> { return expr }`) only when necessary (multiple statements). This interacts with `restrict-return-count` — a concise arrow has no `ReturnStatement` node, so it is invisible to the return counter.

**Philosophy.** Favors expression-oriented code. A concise arrow `=> expr` is a pure mapping from input to output — no sequencing, no side effects, no intermediate state. This is the ideal unit of the algebra: a typed arrow that is its body.

### func-style: expression

All functions must be function expressions (`const fn = ...`), never function declarations (`function fn() {}`). Combined with `prefer-arrow-callback`, all functions are arrow expressions.

**Philosophy.** Functions are values. Not declarations hoisted into scope, but `const` bindings with types. This means functions participate in the same type-annotation system as every other value (`typedef`, `require-extracted-types`). A function IS its type signature — a named binding with a declared type, like everything else.

### prefer-arrow-callback

Callbacks must be arrow functions, not `function` expressions. This is the complement to `func-style: expression`.

### id-length (min: 3)

Identifiers must be at least 3 characters, with an exceptions list (`id`, `i`, `j`, `k`, `x`, `y`, `z`, `_`, `fs`, `db`, `ui`, `el`, `e`). Property names are excluded (`properties: "never"`). The fix is to use descriptive names — `idx` not `i` (unless in the exceptions), `ctx` not `c`, `val` not `v`.

**Philosophy.** Names carry meaning across issues. When agents generate code in separate issues, a binding named `x` in one file and `x` in another gives no signal about whether they are related. Descriptive names make each function self-documenting, reducing the context an agent needs when working on a downstream issue that consumes the function.

---

## Cross-Rule Interactions

The rules form a constraint system where certain combinations eliminate entire code patterns:

`restrict-return-count(1)` + `max-total-depth(3)` + `consistent-type-assertions(never)` collectively rule out if-chains (multiple returns), deep ternaries (depth violations), and cast-based Maps (no assertions). The surviving pattern is switch-with-result-variable or nullish-coalescing dispatch chains.

`no-nested-function` + `max-lines-per-function(40)` + `func-style(expression)` force all functions to module scope as const arrow expressions, each under 40 lines. The IIFE thunk pattern is the only way to create closures in ESLint handler objects.

`require-extracted-types` + `typedef(variableDeclaration)` + `explicit-function-return-type` force every value and function in the program to have a named type. Combined with `no-duplicate-type-structure`, these types must be structurally unique across the project.

`eslint-comments/no-use(allow: [])` + `no-warning-comments(prettier-ignore)` + `ban-ts-comment` eliminate all escape hatches. Every error must be resolved structurally — no suppression, no formatting overrides, no type-checker overrides.

`functional/no-let` + `restrict-return-count(1)` create the central tension for dispatch code: single-return wants a mutable accumulator, but no-let forbids mutation. The resolution is the try/nullish-coalescing chain (each branch returns `T | undefined`, chain with `??`), which satisfies both rules.

---

## Config Notes

The `@typescript-eslint/array-type` rule is declared twice in the config (line 71 and line 155), both with `default: "generic"`. The second overrides the first. This is harmless but should be deduplicated.

`prefer-call-signature` is commented out in both the plugin registration and the rules. The existing rules were written to comply with it (all function types use call-signature form), but enabling it would conflict with `enforce-record-type` without an exemption.

Several rules are commented out with notes: `consistent-indexed-object-style`, `naming-convention`, `max-params`, `no-shadow`. These represent considered-and-deferred additions to the constraint system.
