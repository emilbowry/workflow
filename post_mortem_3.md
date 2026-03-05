# Post-Mortem 3: no-nested-function Rule

## Goal

Write a lint rule to disallow nested function definitions, with the only valid form being the partial application thunk pattern: `const fn = (otherFn, ...params) => () => otherFn(...params)`.

## What Went Wrong

### 1. Failed to understand the PA theory before coding

Claude wrote the initial rule banning ALL nested functions, then immediately asked "should we exclude rule files from this lint?" — suggesting exemptions instead of understanding the user's claim that nesting is always eliminable. This wasted multiple iterations.

### 2. Rejected the thunk pattern's generality

Claude argued that `() => f(...args)` can only produce `() => void`, not `(node) => void`, therefore the thunk pattern couldn't handle the ESLint handler case. The user had to prove that since T is unconstrained, `() → (B → C) ≅ B → C` — the thunk CAN return a function type. Claude should have seen this immediately.

### 3. Kept proposing `.bind()` when the user said no

The user explicitly said "not bind" and wanted the literal PA pattern. Claude reverted to `.bind()` three more times before understanding. When a user rejects an approach, do not keep circling back to it.

### 4. Invented a false "method exemption"

Claude suggested object literal method shorthands should be exempt from the rule because they "look like methods." The user correctly pointed out that object literal methods are not real methods — they're just function expressions assigned to properties. No prototype, no `this` contract, no class. The exemption was unprincipled.

### 5. Unnecessary `makeHandler` with immediate invocation

Claude created `makeHandler(checkNode, context)()` — a thunk immediately invoked, which is the `1 → T ≅ T` collapse — a no-op. The user had to point out this was useless before Claude understood the IIFE form `(() => (node) => work)()` as the correct inline pattern.

### 6. Repeated lint failures from not checking own rules

Every iteration produced new lint errors (duplicate types, complexity, early returns, type assertions, inline types). Claude should have mentally checked against the known rules before writing code, not relied on trial-and-error cycles.

### 7. `parentIsParameterized` bug — while loop didn't stop at first function

The initial implementation kept walking past thunk ancestors instead of stopping at the nearest enclosing function. This caused the rule to flag its own `makeHandler` despite the thunk boundary. A logic error that should have been caught before running.

## What Worked

### Map-based `fnParamCount` with switch

Using a switch that returns -1 (not a function), 0 (thunk), or >0 (parameterized) cleanly unified the "is it a function" and "does it have params" checks. The while loop stops at `result >= 0` — first function ancestor found.

### The IIFE thunk pattern

`(() => (node: TFunctionNode) => checkNode(context, node))()` — the thunk exists in the AST as a PA boundary (0 params, not flagged), but collapses at runtime. This is the `1 → T ≅ T` isomorphism made explicit. No `.bind()`, no fake method exemptions, no ceremony.

### User-driven theory-first design

The user's insistence on understanding the type theory before coding was correct. The rule's semantics (flag parameterized functions nested inside parameterized functions, thunks are transparent) follow directly from lambda lifting. Fighting this with ad-hoc exemptions was wrong.

## Lessons

1. **Understand the theory before proposing workarounds.** Lambda lifting guarantees any closure is eliminable. Don't suggest exemptions for things that are "hard" — they're not.
2. **When the user rejects an approach, it's rejected.** Don't cycle back to `.bind()` or method exemptions after being told no.
3. **Check your own lint rules mentally.** The project has ~15 strict rules. Writing code that violates 5 of them per iteration is wasteful.
4. **A thunk returning a function IS partial application.** `() → (B → C) ≅ B → C` is basic. Don't argue it's impossible.
5. **Immediate invocation of a thunk is a no-op.** `f(x)()` where the `()` just unwraps a thunk is the identity. Use IIFE inline instead.
