# Type-Driven Linting: Transport-Aware Coherence Checking

## The Problem

TypeScript catches local type errors: missing fields, wrong argument types, incomplete exhaustiveness. What it does not catch is **coherence across types that are implicitly related**. When `Status` and `Phase` are in bijective correspondence — mediated by a chain of functions across several files — changing `Status` produces no error at `Phase` or at the intermediate steps until something breaks at runtime.

The gap is not in local checking. It is in the absence of a **global coherence graph** over type relationships.

## Core Idea

Maintain a graph where:
- **Nodes** are discriminated types (unions, enums, literal unions)
- **Edges** are witnessed transports: paths through the program where the inhabitants of one type determine the inhabitants of another

When any node changes (variant added, removed, renamed), propagate alerts along all edges. The alert fires at the type declaration site, not at the usage site. You see "you changed `Status` — `Phase` is transported from `Status` via `statusToDTO → parseResponse → toPhase`" before you even open those files.

## Why This Is Not Exhaustiveness Checking

Exhaustiveness checking is local: "this switch on `Status` doesn't handle `archived`." That fires when you try to compile the switch. Transport checking is global: "you added `archived` to `Status`, and `Status` is in correspondence with `Phase` through a 3-file chain — `Phase` and the chain likely need updating." That fires when you change the type definition, before you touch any consuming code.

The difference matters because:
1. The switch might be in a file you don't know about
2. The correspondence might not go through a single switch — it might be implicit in a series of field mappings
3. There might be no single function `Status → Phase` at all

---

## Level 1: Local Rules (What TypeScript Already Does or Nearly Does)

These are standard and included for completeness. They form the base the transport rules build on.

### 1.1 Exhaustive Discrimination

Every `switch`/`if-else` chain on a discriminated union must handle all variants. TypeScript enforces this with `never` in the default branch. The linter should enforce that the `never` check is present (not just that the code compiles).

### 1.2 Record Completeness

`Record<Status, T>` must have an entry for every `Status` member. TypeScript enforces this structurally. The linter should flag `Partial<Record<Status, T>>` where the partiality is not justified (i.e., every branch is actually covered at runtime, the `Partial` is just avoiding the obligation).

### 1.3 Literal Preservation

`as const`, literal unions, and template literal types must not be widened. Covered extensively in the type-analyser rules (weakening §1.1–§1.6).

---

## Level 2: Transport Detection

A **transport** from type `A` to type `B` is a witnessed correspondence: the program contains a path where each inhabitant of `A` determines a specific inhabitant of `B`.

### 2.1 What Counts as a Transport

A transport is witnessed when:

1. **Explicit map**: A function or record maps every variant of `A` to a specific variant of `B`.
   ```ts
   const statusToPhase: Record<TStatus, TPhase> = { ... }
   ```

2. **Switch/conditional chain**: A switch on `A` produces values that construct `B`.
   ```ts
   switch (status) {
     case "pending": return { phase: "intake" };
     case "active": return { phase: "processing" };
     ...
   }
   ```

3. **Composite path**: No single function maps `A → B`, but the composition of several functions does. `A → DTO → APIResponse → parsed → B` where at each step the discriminant of `A` determines the discriminant at the next type.

4. **Implicit field correspondence**: Two types share no explicit mapping function, but their discriminant fields take the same values or values in systematic correspondence (e.g., `TStatus = "pending" | "active"` and `TPhase = "intake" | "processing"` where `pending ↔ intake` is established by data flow, not by a named function).

Case 3 and 4 are where the real value is. Cases 1 and 2 are already partially caught by exhaustiveness.

### 2.2 Transport Classification

Not all transports are bijections. The linter should classify:

- **Isomorphism** (bijection): `|A| = |B|`, every variant of `A` maps to a unique variant of `B` and vice versa. Changing either side requires changing the other.

- **Retraction** (surjection): `|A| > |B|`, multiple variants of `A` collapse to the same variant of `B`. Adding a variant to `A` requires deciding which `B` it maps to. Removing a variant from `B` requires handling all `A` variants that mapped to it.

- **Section** (injection): `|A| < |B|`, `A` maps into `B` but not all of `B` is covered. Adding a variant to `B` is safe (doesn't affect `A`). Adding a variant to `A` requires extending `B`.

The classification determines the propagation direction:
- Isomorphism: changes propagate both ways
- Retraction: changes to `A` propagate to `B`; changes to `B` propagate to `A`
- Section: changes to `A` propagate to `B`; changes to `B` may not affect `A`

### 2.3 Detecting Implicit Transports

The hard case. No explicit `A → B` function exists. The correspondence is spread across files.

**Method: discriminant flow analysis.**

1. Identify all discriminated types (literal unions, string enums, types with a discriminant field).
2. For each discriminant value (e.g., `"pending"`), trace its flow through the program: where is it pattern-matched, what does each branch produce, and what type does the output inhabit?
3. When the discriminant values of `A` flow through transformations and ultimately determine the construction of values in type `B`, record the transport `A → B` with the intermediate path.

This is abstract interpretation over the discriminant lattice. We track which variant of `A` leads to which variant of `B`, ignoring the payload — only the discriminant flow matters.

**Concrete signals the linter looks for:**

- A `switch(a.status)` where each branch sets a field that is typed as `TPhase` — even if `TPhase` is not mentioned in the switch, only its inhabitants appear as literals
- A chain of functions `f(g(h(x)))` where `x: A` and the return type eventually feeds into a position typed as `B`, and both `A` and `B` are discriminated
- A record/map keyed by `A`'s variants whose values are `B`'s variants (even if typed as `Record<string, string>` — the actual keys and values witness the transport)

### 2.4 What the Linter Reports

When a transport `A → B` (via path `p`) is detected and `A` changes:

```
warning: Type `TStatus` changed (added variant "archived").
  `TStatus` has a witnessed transport to `TPhase` via:
    src/api/mapStatus.ts:14  →  statusToDTO
    src/api/client.ts:87     →  parseResponse
    src/domain/phase.ts:23   →  toPhase
  `TPhase` and the transport chain likely need updating.
```

The key properties:
- Fires at the **declaration site** of `TStatus`, not at the usage sites
- Shows the **full chain**, not just "something uses TStatus"
- Names the **target type**, so you know what else needs to change
- Fires **before** any exhaustiveness error, because it operates on the type graph, not on function bodies

---

## Level 3: Fibered Transport (Layer-Aware Coherence)

### 3.1 Layers as Fibers

A typical application has layers: domain, API, DTO, UI state, view model. Each layer has its own types, and types at different layers are often in transport with types at other layers.

The fiber structure is:
- **Base space**: the set of domain concepts (Status, User, Permission, ...)
- **Fiber over a concept**: the set of types representing that concept at each layer (TStatus, TStatusDTO, TStatusResponse, TStatusViewModel, ...)
- **Transport maps**: the functions/chains connecting types in the same fiber

### 3.2 Coherence Obligation

For each fiber (each domain concept across layers), the transport maps must be coherent: if `A` changes, every type in the fiber and every transport map in the fiber must be updated consistently.

The linter tracks fibers and reports at the fiber level:

```
warning: Fiber "Status" has 4 types across 3 layers:
  domain:  TStatus          (5 variants)
  api:     TStatusDTO       (5 variants)  — isomorphic to TStatus
  ui:      TStatusViewModel (4 variants)  — retraction from TStatus

  TStatus gained variant "archived".
  TStatusDTO needs a corresponding variant (isomorphism).
  TStatusViewModel needs a decision: does "archived" map to an existing
  variant or require a new one? (retraction)
```

### 3.3 Detecting Fibers

Fibers are not declared. They are inferred from:

1. **Naming conventions**: `TStatus`, `TStatusDTO`, `TStatusResponse` are likely in the same fiber. This is a heuristic but a strong one.

2. **Transport evidence**: if a transport `A → B` exists, `A` and `B` are in the same fiber regardless of naming.

3. **Co-occurrence in mapping functions**: if a single function takes `A` and returns `B`, or destructures `A` to construct `B`, they are in the same fiber.

4. **Transitive closure**: if `A` transports to `B` and `B` transports to `C`, all three are in the same fiber. The fiber is the connected component in the transport graph.

### 3.4 Cross-Fiber Alerts

Some changes affect multiple fibers. Adding a new `TStatus` variant may require:
- New `TStatusDTO` variant (Status fiber)
- New `TPermission` variant if status-based permissions exist (Permission fiber)
- New `TStatusColor` entry (UI fiber)

The transport graph captures this: `TStatus → TPermission` is a cross-fiber edge. The linter reports cross-fiber impacts separately from intra-fiber ones, because they are less obvious and more likely to be missed.

---

## Implementation Strategy

### Phase 1: Static Transport Graph Construction

Build the transport graph from the AST without running the program.

1. **Index all discriminated types**: scan for `type T = "a" | "b" | ...` and types with literal discriminant fields.
2. **Index all mapping sites**: `Record<T, U>`, switches on discriminated types, conditional chains that branch on discriminants.
3. **Build edges**: for each mapping site, record `(source type, target type, location, classification)`.
4. **Transitive closure**: compute fibers as connected components.

This handles cases 1 and 2 from §2.1 (explicit maps and switches).

### Phase 2: Discriminant Flow Analysis

For case 3 (composite paths):

1. For each discriminant type `A`, identify all sites where `A` is pattern-matched or destructured.
2. At each site, track what the discriminant value flows into: a field assignment, a function argument, a return value.
3. Follow the flow until it reaches a position typed as another discriminated type `B`.
4. Record the composite transport `A → B` with intermediate steps.

This is dataflow analysis restricted to discriminant positions. It does not need full abstract interpretation — only tracking which literal values flow where.

### Phase 3: Change Detection and Alerting

1. On file save (or pre-commit), diff the transport graph against its previous state.
2. For each changed node, walk all edges and report affected types and paths.
3. Classify alerts by fiber (intra-fiber vs cross-fiber) and by transport type (iso/retraction/section).

---

## Relation to Existing Rules

The type-analyser agent (§5.2 Isomorphic Types) already detects when two types are structurally identical. Transport detection generalises this:

- §5.2 catches `A ≅ B` when they have the same fields. Transport detection catches `A ≅ B` when they have different fields but their discriminant spaces are in correspondence.
- §5.3 (Near-Isomorphisms) hints at transports where one type is a retraction of another. Transport detection makes this precise.
- §1.3 (Silent Semantic Breakage) catches when a union has members the implementation doesn't handle. Transport detection catches when a union change means a *different* union at a different layer needs updating too.
- §4.2 (Convention-Enforced Consistency) catches parallel structures kept in sync by naming. Fiber detection automates this — the "convention" is replaced by a witnessed transport.

## Relation to Type-First Workflow

In the type-first workflow (skeleton → analysis → implementation), transport detection adds a new checkpoint:

- **Phase 1 (Skeleton)**: define types. The transport graph is empty or has only edges within the new types.
- **Phase 2 (Analysis)**: the type-analyser runs. Transport detection adds: "these new types form a fiber with existing types X, Y, Z — are the transports intentional?"
- **Phase 3 (Implementation)**: as implementation proceeds, new transport edges are created by the mapping code. The linter continuously validates that fibers remain coherent.
- **Ongoing**: when any type in a fiber changes, the linter immediately surfaces all affected types and paths. No introspection needed, no subtle divergence.

The goal: **the moment a type changes, you see every type that needs to change with it, and the exact code path that connects them.**
