# Type-Driven Linting: Transport-Aware Coherence Checking

> All rules operate on **type definitions and function signatures only**. No implementation analysis. These lints run on skeleton files (types + stubs) before any implementation exists.

## The Problem

TypeScript catches local type errors: missing fields, wrong argument types. What it does not catch is **coherence across types that are implicitly related**. When `TStatus` and `TPhase` are in correspondence — connected by a chain of function signatures across several files — changing `TStatus` produces no error at `TPhase` until someone implements the mapping and it fails.

The gap is not in local checking. It is in the absence of a **global coherence graph** over type relationships, derivable purely from type definitions and signatures.

## Core Idea

Maintain a graph where:
- **Nodes** are discriminated types (unions, enums, literal unions)
- **Edges** are witnessed transports: function signatures whose domain and codomain connect discriminated types

When any node changes (variant added, removed, renamed), propagate alerts along all edges. The alert fires at the **type declaration site**, before any implementation exists.

---

## Level 1: Type-Level Local Rules

These operate on individual type definitions.

### 1.1 Cardinality Consistency in Records

`Record<TStatus, T>` must have an entry for every `TStatus` member. This is structural, checked by TypeScript. The linter should flag `Partial<Record<TStatus, T>>` where partiality is unjustified — if the function signature promises a total map, the type should reflect that.

### 1.2 Literal Preservation

Literal unions and template literal types must not be widened. Covered in the type-analyser rules (weakening §1.1–§1.6). A type `TStatus = "pending" | "active"` must not appear as `string` in any signature that consumes or produces it.

### 1.3 Discriminant Field Consistency

For discriminated unions using a tag field:
```ts
type TEvent =
  | { kind: "click"; x: number; y: number }
  | { kind: "keypress"; key: string }
```

The discriminant field (`kind`) must use literal types, never `string`. Every variant must have the discriminant field. These are structural checks on the type definition itself.

---

## Level 2: Transport Detection

A **transport** from type `A` to type `B` is a witnessed correspondence: a function signature (or chain of signatures) whose types connect `A` to `B`.

### 2.1 What Counts as a Transport

Transports are detected entirely from type signatures and type definitions:

1. **Direct signature**: A function type takes `A` and returns `B` (or a type containing `B`).
   ```ts
   type TMapStatus = (status: TStatus) => TPhase
   ```
   This signature alone witnesses a transport `TStatus → TPhase`. We do not inspect the body. The signature promises that every inhabitant of `TStatus` produces a `TPhase`.

2. **Record type**: A `Record<A, B>` type witnesses a transport from `A` to `B`.
   ```ts
   type TStatusPhaseMap = Record<TStatus, TPhase>
   ```

3. **Composite signature chain**: No single signature maps `A → B`, but a chain of signatures composes to do so.
   ```ts
   type TToDTO = (status: TStatus) => TStatusDTO
   type TSerialize = (dto: TStatusDTO) => TAPIResponse
   type TParse = (response: TAPIResponse) => TPhase
   ```
   The composition `TParse . TSerialize . TToDTO` witnesses `TStatus → TPhase`. This is detectable purely from the signature types — follow the codomain of one into the domain of the next.

4. **Parametric witness**: A generic type that structurally connects `A` and `B`.
   ```ts
   type TMapping<S extends TStatus> = {
     status: S;
     phase: TStatusToPhase[S];  // indexed access type
   }
   ```
   The indexed access type `TStatusToPhase[S]` witnesses that `TStatus` determines `TPhase` at the type level.

### 2.2 Transport Classification

Classify from cardinalities and type structure alone:

- **Isomorphism**: `|A| = |B|` and the connecting signature is bijective in type (domain and codomain are both the full union). Changes propagate both ways.

- **Retraction** (many-to-one): `|A| > |B|`. The signature maps `A → B` but `B` has fewer variants. Adding a variant to `A` requires deciding which `B` it maps to.

- **Section** (one-to-many): `|A| < |B|`. The signature maps `A` into `B` but not all of `B` is in the image. Adding a variant to `A` requires extending `B`.

The classification is determined by comparing the cardinalities of the union types — no implementation needed.

**Cardinality alone is necessary but not sufficient.** Two types with `|A| = |B| = 3` might not be isomorphic in intent. The linter flags the cardinality relationship; the developer confirms the correspondence. The point is surfacing the relationship, not proving it.

### 2.3 Detecting Transports from Signatures

The algorithm operates on the type dependency graph:

1. **Index all discriminated types**: scan for `type T = "a" | "b" | ...`, types with literal discriminant fields, and `keyof` types.

2. **Index all function signatures**: for each function type, record `(domain types, codomain types)`. A function `(a: A, b: B) => C` creates candidate edges `A → C` and `B → C`.

3. **Filter to discriminated pairs**: only keep edges where both the source and target are (or contain) discriminated types. `(status: TStatus) => number` is not a transport. `(status: TStatus) => TPhase` is.

4. **Compose chains**: if `A → B` and `B → C` are both witnessed, `A → C` is a composite transport. Compute the transitive closure.

5. **Classify each edge** by comparing cardinalities.

All of this is purely structural analysis of type definitions and function type signatures.

### 2.4 What the Linter Reports

When a transport `A → B` (via signature chain `p`) is detected and `A` changes:

```
warning: Type `TStatus` changed (added variant "archived").
  `TStatus` has a witnessed transport to `TPhase` via:
    src/types/api.types.ts:14    TToDTO:      TStatus → TStatusDTO
    src/types/api.types.ts:22    TSerialize:  TStatusDTO → TAPIResponse
    src/types/domain.types.ts:8  TParse:      TAPIResponse → TPhase
  `TPhase` and the connecting signatures likely need updating.
```

Key properties:
- Fires at the **declaration site** of `TStatus`, not at usage sites
- Shows the **full signature chain**, naming each type in the path
- Names the **target type**, so you know what else needs to change
- Operates entirely on types — fires before any implementation exists

---

## Level 3: Fibered Transport (Layer-Aware Coherence)

### 3.1 Layers as Fibers

A typical application has layers: domain, API, DTO, UI state, view model. Each layer has its own types. Types representing the same concept at different layers form a **fiber**.

The fiber structure is:
- **Base space**: the set of domain concepts (Status, User, Permission, ...)
- **Fiber over a concept**: the set of types representing that concept at each layer (TStatus, TStatusDTO, TStatusResponse, TStatusViewModel, ...)
- **Transport maps**: the function signatures connecting types in the same fiber

### 3.2 Coherence Obligation

For each fiber, the transport signatures impose coherence: if `A` changes, every type in the fiber must be checked for consistency.

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

Fibers are inferred from type-level information:

1. **Naming conventions**: `TStatus`, `TStatusDTO`, `TStatusResponse` share a root. Heuristic but strong.

2. **Signature evidence**: if a function signature connects `A` and `B` (and both are discriminated), they are in the same fiber regardless of naming.

3. **Type-level references**: if `B` is defined in terms of `A` (e.g., `type TStatusDTO = { status: TStatus; timestamp: number }`), they are in the same fiber.

4. **Transitive closure**: the fiber is the connected component in the transport graph. If `A → B` and `B → C` are witnessed by signatures, all three are in the same fiber.

### 3.4 Cross-Fiber Dependencies

Some signatures connect types in different fibers:
```ts
type TGetPermissions = (status: TStatus) => TPermission[]
```

This creates a cross-fiber edge: Status fiber → Permission fiber. The linter reports these separately because they represent less obvious dependencies.

---

## Implementation Strategy

### Phase 1: Type Graph Construction

Build the transport graph from type definitions and signatures only.

1. **Index all discriminated types** across all `.types.ts` / `.d.ts` files.
2. **Index all function type signatures**: named function types, type aliases for function types, method signatures in type definitions.
3. **Build edges**: for each signature, if both domain and codomain contain discriminated types, record the edge.
4. **Compute fibers**: connected components of the transport graph, augmented by naming heuristics and type-level references.

### Phase 2: Change Detection

1. On type definition change, diff the transport graph against its previous state.
2. For each changed node, walk all edges and report affected types and signature chains.
3. Classify alerts by fiber (intra-fiber vs cross-fiber) and by transport type (iso/retraction/section).

---

## Relation to Existing Rules

The type-analyser agent (§5.2 Isomorphic Types) already detects when two types are structurally identical. Transport detection generalises this:

- §5.2 catches `A ≅ B` when they have the same fields. Transport detection catches correspondence when `A` and `B` have different structures but their discriminant spaces are related.
- §5.3 (Near-Isomorphisms) hints at retractions. Transport detection classifies these precisely by cardinality.
- §4.2 (Convention-Enforced Consistency) catches parallel structures kept in sync by naming. Fiber detection automates this — the convention is replaced by a witnessed signature chain.

## Relation to Type-First Workflow

In the type-first workflow (skeleton → analysis → implementation), transport detection operates at the **skeleton phase**:

- **Skeleton**: define types and function signatures. The transport graph is built immediately.
- **Analysis**: the type-analyser runs. Transport detection adds: "these new types form a fiber with existing types X, Y, Z — the signatures promise a transport. Are the cardinalities consistent?"
- **Pre-implementation check**: before any code is written, the linter verifies that every fiber is coherent — no type has changed without its fiber partners being updated.
- **Ongoing**: when any type in a fiber changes, the linter immediately surfaces all affected types and signatures. The inconsistency is caught at the moment of the type change, not when someone eventually tries to implement the mapping.

The goal: **the moment a type changes, you see every type that needs to change with it — derived entirely from type definitions and function signatures, before any implementation exists.**
