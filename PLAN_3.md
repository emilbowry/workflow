# PLAN_3: Missing Lints

## Structural

### 1. No `class`

Classes introduce `this`, mutation, inheritance, method dispatch — everything antithetical to flat pure typed arrows. A class is a bundle of hidden state with methods that close over it. The algebra has no place for it.

Selector: `ClassDeclaration, ClassExpression`.

### 2. No `enum`

Enums are runtime constructs outside the type algebra. They compile to objects with reverse mappings, they aren't composable with unions/intersections, and `const enum` has its own set of problems. Literal unions are the canonical form — they participate in the algebra directly.

Selector: `TSEnumDeclaration`.

### 3. No `throw` / `try` / `catch`

A thrown error is a hidden second return path that the type system doesn't witness. If functions are total arrows with a single return, exceptions break totality. The function signature says `A -> B` but it can silently produce `Error` — an untyped, invisible edge in the transport graph.

Use `Result<T, E>` discriminated unions. The error case becomes part of the return type, visible in the algebra, propagated by the type graph.

Selectors: `ThrowStatement, TryStatement`.

### 4. No `switch`

Already identified as a problem in the existing rules (the `canonicalMember` let+switch pattern in `no-duplicate-type-structure`). `switch` requires `let` for accumulation and `break` for control flow — both antithetical.

Map dispatch is the canonical form. A `Record<K, (...args) => V>` lookup *is* the case analysis, and its exhaustiveness is witnessed by the key type. The dispatch table is a value, not control flow.

Selector: `SwitchStatement`.

### 5. No mutation

`no-let` prevents reassignment but not mutation. A `const arr` can still be `.push()`ed, `.splice()`d, `.sort()`ed. Property assignment (`obj.x = y`) mutates freely. This is a hole: the algebra says "no mutation" but only enforces half of it.

`eslint-plugin-functional` provides `functional/immutable-data` (bans property assignment and mutating methods) and `functional/no-expression-statements` (bans side-effectful expressions).

## Type-algebraic

### 6. Ban remaining utility types

`Partial` is planned (PLAN_2 item 1). But `Pick`, `Omit`, `Required`, `Exclude`, `Extract`, `ReturnType`, `Parameters`, `NonNullable` all create derived types via type-level computation. They hide structural relationships that should be stated directly in the algebra. If a type is worth having, it should be defined explicitly — not computed from another type at the use site.

Selector: `TSTypeReference` where `typeName.name` is in the banned set. Can reuse `no-restricted-syntax` or add to a custom rule.

### 7. No `null`

Two bottom values for the same concept is non-canonical. `null` and `undefined` occupy the same semantic role but are not equal (`null !== undefined`), creating a pointless branching obligation at every consumption site. Pick one. `undefined` is the natural choice — it's what JS produces for missing properties, uninitialized variables, and void returns. Ban `null`.

Selector: `TSNullKeyword` for type positions. `Literal[value=null]` for value positions.

## Control flow

### 8. No imperative loops

`for`, `while`, `do-while` are imperative control flow. With `no-let`, most are already impractical (loop variables need reassignment), but `for...of` with `const` still works for side-effectful iteration. In the algebra, iteration is `.map()`, `.reduce()`, `.filter()`, or recursion — all of which are expressions that return values, not statements that mutate state.

Selectors: `ForStatement, WhileStatement, DoWhileStatement, ForInStatement, ForOfStatement`.

### 9. No `if` statements

With single return, expression-oriented style, and no side effects, `if` has no role. Early returns are already banned. Side effects shouldn't exist in pure code. The ternary (`a ? b : c`) is the canonical form — it's an expression, it returns a value, it composes.

Selector: `IfStatement`.

---

## Implementation notes

Items 1-4 and 7-9 are single `no-restricted-syntax` entries each. Item 5 is an existing `eslint-plugin-functional` rule. Item 6 needs a selector or custom rule for a set of banned type names.

All items except 5 and 6 can be added to the existing `no-restricted-syntax` array in `eslint.config.ts` in a single commit.

### Priority

1, 3, 5 are the most critical — they are direct contradictions of stated principles that no other rule compensates for. 2, 4, 7 are canonical cleanup. 6, 8, 9 follow from the algebra but have the most friction with existing code.
