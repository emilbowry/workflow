# PLAN_2: Emergent Structure & Remaining Lints

## What the current rules enforce together

`enforce-record-type` bans object literal types. `require-parametric-record` forces Records to be generic with a backreferenced key parameter — if the key-value relationship can't be witnessed by a type parameter, use a tuple. `valid-generics` eliminates degenerate generics (`type TFoo<T> = T`) and homogeneous generics (`type TFoo<T> = Bar<T>`). `no-duplicate-type-structure` catches exact structural duplicates. `no-single-field-type` prevents trivially wrapping a single field.

Together these mean:
- Every type alias with structure must be a `Record<K, V>` or tuple
- Every generic must be non-trivial (not identity, not pure passthrough)
- The key-value pairing in a Record must be structurally justified via parameterization
- No two types can have identical canonical structure

Tuples for ordered positional structure (function args), Records for keyed relational structure (parameterised maps). They compose freely: a Record can appear inside a tuple element, but never as the spread itself. They are disjoint by construction.

## What is now subsumed

PLAN.md item 1 (label-erased duplicate detection for object literals like `{a: string, b: string}` vs `{c: string, e: string}`) is subsumed. Object literals can't exist — `enforce-record-type` prevents them. Under `Record<K, V>`, the "label" is `K`, which is a type, not a semantic name. Two `Record<string, string>` types are already caught by `no-duplicate-type-structure`.

The tuple insight ("property names carry semantic information, not structural — use `[string, string]`") is now enforced constructively by `require-parametric-record`: if you can't parameterize the Record, you must use a tuple.

## What remains

### Deterministic (errors)

**1. Ban `Partial<...>`**
Add to `no-restricted-syntax`. Selector: `TSTypeReference[typeName.name="Partial"]`.

**2. Ban optional fields**
Add to `no-restricted-syntax`. Selector: `TSPropertySignature[optional=true]`.

**3. Require rest-params tuple form for all function signatures**
All function signatures must be of the form `(...args: TSomeType) => TReturn` where `TSomeType` is a named tuple type. This:
- Forces the parameter list to be a single canonical type (the tuple)
- Makes `no-duplicate-type-structure` comparison of function signatures fall out for free — no label erasure or parameter reordering needed
- Composes with Records: `(...args: [A, B, Record<K, V>])` nests freely, the tuple is positional structure, Records within are keyed structure
- Single-param functions are `(...args: [TSomeType])` which is equivalent to `(arg: TSomeType)`

**4. Finite domain return widening**
A function from a finite domain to `string` is always refinable. The image of `Fin(n) -> String` is finite and computable. `(arg: "a" | "b" | "c") => string` should be flagged — the return type must be a literal union or template literal, not bare `string`.

Formal basis:
```
forall (n : N) (f : Fin(n) -> String),
  exists (m : N), m <= n,
    exists (S : Fin(m) -> String),
      forall (a : Fin(n)), f(a) in Image(S)
```

Single-argument case. Multi-argument: the image of `Fin(n1) x Fin(n2) x ... -> String` is bounded by the product of domain cardinalities.

### Heuristic (warnings)

**5. Distance between types**
A measure of how much it takes to deform one type into another. Now that all structured types are `Record<K, V>` or tuples, distance operates on:
- Key type similarity (symmetric difference of key unions)
- Value type similarity
- Decomposability (can `A` be expressed as `B & C` for some existing `B`?)

Heuristic warning for spotting where types can be generalised, unified, or extracted into intersections.

**6. Cardinality-isomorphic type families (the natural isomorphism law)**
Two generic types `F<A>` and `G<A>` over the same finite domain `S` are naturally isomorphic when for all `a in S`, the fiber `F<a>` and `G<a>` are isomorphic (same cardinality, including `never` for unreachable cases).

This is the law that drove the `TToAPICase` / `TToUICase` unification: both are functors `S -> FinSet` with pointwise-isomorphic fibers, meaning they are the same functor up to a natural transformation — i.e., they are unifiable under an additional parameter (the natural transformation itself, which became `TImplementations`).

The lint detects: two non-degenerate, non-homogeneous generic types over the same constrained domain whose fibers are pointwise cardinality-equal. The existing rules (`valid-generics`, `no-duplicate-type-structure`) eliminate the trivial cases; this catches the non-trivial ones.

Formal statement (type-theoretic):
```
Let  S : FinType
Let  F, G : S -> U
Assume  forall (a : S), F(a) : FinType  and  G(a) : FinType
Assume  forall (a : S), |F(a)| = |G(a)|

Then:
  (i)   Prod (a : S),  F(a) ~ G(a)

  (ii)  Sigma (I : FinType)
        (H : S -> I -> U)
        (i0 i1 : I),
          (Prod (a : S), H(a, i0) ~ F(a))
        x (Prod (a : S), H(a, i1) ~ G(a))
```

Categorical equivalent:
```
Let  S  be a finite discrete category
Let  F, G : S -> FinSet  be functors
Assume  forall a in Ob(S),  |F(a)| = |G(a)|

Then:
  (i)   F ~ G   (natural isomorphism)

  (ii)  exists a category I with |Ob(I)| >= 2
        and a functor     H : S x I -> FinSet
        and objects        i0, i1 in Ob(I)
        such that          H(-, i0) ~ F   and   H(-, i1) ~ G
```

Part (i) follows because S is discrete (naturality is vacuous — every family of component isomorphisms is automatically natural). The content is that finite types of equal cardinality are equivalent. Part (ii) says the natural isomorphism witnesses a factorization: the two type families are fibers of a single family parameterized by an additional index — the "missing parameter" that type proliferation signals.

### Transport-layer lints (Level 2-3 from PLAN.md)

**7. Transport graph construction**
Nodes: discriminated types (literal unions, constrained generics over finite domains). Edges: function signatures whose domain and codomain connect discriminated types, Record types, parametric witnesses. Classify edges by cardinality (isomorphism / retraction / section).

**8. Fiber coherence**
Group types into fibers (connected components in transport graph + naming heuristics). When a fiber member changes cardinality, propagate obligations along edges: isomorphic edges require matching changes, retractions require decisions.

These operate on type definitions and function signatures only. No implementation analysis.

---

## Postscript: Philosophy & Intent

### What this is for

This rule set is a constraint system for agentic code generation. It is intended as a reusable package imported into any TypeScript project where an AI agent writes code.

The workflow is: types first, function stubs second, implementation last. The lints validate that the type skeleton — the specification — is structurally sound, canonical, and non-redundant before a single line of implementation exists. Once the types pass, the implementation is determined by them. The agent cannot drift, rename, restructure, or reinvent — the types pin it down.

### Why these constraints

Agents produce code churn. They write massive codeblocks, introduce redundant types, nest deeply, and accumulate structural debt across successive edits. Every rule here exists to make that impossible:

- **Small surface area per generation.** 40-line functions, depth 3, complexity 5, no nesting, single return. The agent cannot produce a 200-line monolith. Every unit of work is small enough to verify mechanically.
- **Canonical type algebra.** No duplicate structures, no degenerate generics, no trivial wrappers, no object literals outside `Record<K, V>`. Every type alias earns its existence by being structurally unique and non-trivial. Redundancy is a lint error, not a style choice.
- **Flat, total, first-class functions.** No closures (lambda lifting eliminates them all). No early returns. No mutation. No type assertions. The code is a composition of small, pure, typed arrows.
- **The transport graph is the specification.** Once types and signatures are locked, the coherence graph tells you exactly what needs updating when something changes. Cross-type obligations are explicit and mechanical — no ambiguity for the agent to hallucinate around.

### Issue-driven development

Each issue is scoped to a single type-level change: add a type, modify a signature, extend a union, add a new function or value that conforms to an existing type. The lints validate structural soundness at each step. The agent never accumulates debt because every commit is independently valid against the algebra. Rollback is trivial — if an issue introduces a type that violates canonicality or creates a duplicate structure, the lints catch it at that step, not three issues later when something downstream breaks. The blast radius of any single change is bounded by the type graph edges, which are already explicit.

### The thesis

A codebase's types should form a minimal, canonical algebra where every definition is structurally justified, every relationship is witnessed by a signature, and every change propagates as a decidable obligation. The goal is to make the space of valid programs so constrained that code generation becomes a decidable problem rather than a creative one.
