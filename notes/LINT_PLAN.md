**HISTORIC ARTEFACT, DO NOT USE AS CONCRETE RULES OR EVIDENCE**
<!-- 
High Level To Do
**Modifications and Improvements**
1. `no-duplicate-type-structure.ts` misses an important case, consider these two types:
```ts
type A = { a: string; b: string };
type B = { c: string; e: string };
```
These obey the same structure. For the uninitiated it may seem like these can be two distinct types, however, my intuition thinks they are not fundamentally distinct. This in effect is just some n-th order branding or aliasing. Which is banned. Really it probably implies the types are better represented as a tuple of strings:
```ts
type C = [string,string]
```
Since the property names only carry semantic information. Not structural.
Although maybe `integer` keys may disprove me

2. Consider what current rules can be moved to the standard eslint `no-restricted-syntax` or `no-restricted-properties`
    1. For other things I want to include are bans on Partial<...>
    2. Optional fields
    3. can we do the same with `let` since currently we import an extra dependancy. I posit not since that is the recommended lint

**Type based Deterministic**

**Type based Heuristic**
>
> Implemented as warns
> These are used to spot where we can potentially, generalise, unify or simplify types
1. `Distance`: A measure of how much it takes to "deform" some type into another. Consider these **non-exhaustive** examples:
```ts
type A = {
    some_prop: TSomeType,
    other_prop: TOtherType,
    different_prop: TDifferentType,
    new_prop:TNewType
}
```
This is very close to some type defined as such, I think if we had even more shared fields this metric would be even `closer`:
```ts
type B = {
    some_prop: TSomeType,
    other_prop: TOtherType,
    different_prop: TDifferentType,
}
```
In addition we can have other ways types can be similar i.e:
```ts
type C = {
    some_prop: TSomeType,
    other_prop: TOtherType
}

type D = {
    different_prop: TDifferentType,
    new_prop:TNewType
}
type E = C & E
```
This also can be represented as some deformation.
There are other deformations we can do, but it would be useful to be able to quantify these with some similarity score. There may be cases similar to variances, `subtypes`, and implementations that actually represent a more `dependant` type. Sensibly, and similarly to `no-duplicate-type-structure.ts` we would need to not consider the actual labels.
2. `Transport` layer lints:
Consider the common case of a redundancy. I have defined some subset of strings that are the visual text for some status. They map exactly 1:1 but are distinct types in their definitions. Here is an example I found in another codebase:
```ts
type TDefectStatus =
    | "Open"
    | "Completed"
    | "Rework Pending"
    | "Rework Done"
    | "Rework Rejected"
    | "Verified";


type TWorkStage =
    | "inspecting" //=> "Open"
    | "awaiting_rework" // =>  "Completed"
    | "in_rework" //=> "Rework Pending"
    | "awaiting_verification" //=> "Rework Done"
    | "passed_verification" //=>"Rework Rejected"
    | "failed_verification"; //=> "Verified"
```
This to me is insanity, especially given that there is a mapping function from one to the other. Really it hint at a **single** type, and then a function mapping it to a display case. With good choice of string literals (and UI representations) we would not even have to define distinct types. Consider:
```ts
type TWorkStage =
    | "inspection_open"
    | "inspection_closed" 
    | "rework_open"
    | "rework_closed" 
    | "verification_open" 
    | "verification_closed";
```
Which actually simplifies considering the case:
```ts
type TWorkStage =
    | "inspection"
    | "rework"
    | "verification";
```
```ts
type TStatus<T extends TWorkstage> = `${T}_open` | `${T}_closed`
```
**identification**
> need to define some lints to check this
I will now demonstrate my thought process 
**rectification**
My thought process roughly goes like this. It is an iterative process, but I think we can resolve this for an AI. Attempt => lint, new attempt (maybe lint err gives context about expectations and solutions)
```typescript
type TWorkStage = "inspection" | "rework" | "verification";

type TStatus<T extends TWorkStage, U extends boolean> = {
    stage: T;
    status: U;
};
type test_1 = TStatus<"inspection", false>;
type TStatusInput<T extends TStatus<any, any>> =
    T extends TStatus<infer U, infer V>
        ? V extends true
            ? `${U}_open`
            : `${U}_closed`
        : T;
// this is actually from the API
type TViewCase<T extends string> = {
    (
        status: T,
    ): T extends `${infer V}_${infer U}`
        ? `${Capitalize<V>} ${Capitalize<U>}`
        : never;
}; // can be nested to arbitrarily convert snake_case

type test_2 = TViewCase<TStatusInput<test_1>>;
type TConvertToStatusSuffix<T extends boolean> = T extends true
    ? "open"
    : "closed";
type TToAPICase<T extends TStatus<any, any>> =
    T extends TStatus<infer U, infer V>
        ? `${U}_${TConvertToStatusSuffix<V>}`
        : never;
type TToUICase<T extends TStatus<any, any>> =
    T extends TStatus<infer U, infer V>
        ? `${Capitalize<U>} ${Capitalize<TConvertToStatusSuffix<V>>}`
        : never;

type view_case_test = TToUICase<test_1>;
type api_case_test = TToAPICase<test_1>;

// My thought process. TToAPICase and TToViewCase are very similar
// Oh really we have some dependance on the type of the view format `API` vs `UI`
// (it is probably deterministically lintable)
/* 
We really have some state & boolean & representation
and a function of that to a string (finite set)
*/
type TImplementations = `UI` | `API`;

type TCapitalizeN<T extends string[]> = T extends [
    infer U extends string,
    ...infer V extends string[],
]
    ? [Capitalize<U>, ...TCapitalizeN<V>]
    : T;

type TConcatonateN<
    T extends string[],
    Connector extends string = "",
> = T extends [infer U extends string, ...infer V extends string[]]
    ? V extends [infer W extends string, ...infer X extends string[]]
        ? TConcatonateN<[`${U}${Connector}${W}`, ...X], Connector>
        : U
    : never;

type TImplementationToConnector<U extends TImplementations> = U extends "UI"
    ? " "
    : "_";

type TStatusArray<T extends boolean> = T extends true ? "open" : "closed";
type TConcatonateStatus<
    T extends TWorkStage,
    U extends boolean,
    V extends TImplementations,
> = V extends "UI"
    ? TConcatonateN<
          TCapitalizeN<[T, TStatusArray<U>]>,
          TImplementationToConnector<V>
      >
    : TConcatonateN<[T, TStatusArray<U>], TImplementationToConnector<V>>;

type TStatusImplemenation<
    T extends TStatus<any, any>,
    U extends TImplementations,
> = T extends TStatus<infer V, infer W> ? TConcatonateStatus<V, W, U> : never;

type TGetStringRepr<T extends TStatus<any, any>, U extends TImplementations> = {
    (status: T, repr: U): TStatusImplemenation<T, U>;
};
type test_3 = TGetStringRepr<test_1, "UI">;
// We get a function for free, and a concrete understanding of the behaviour
// know what other functions and behaviours we need
// what the fundamental objects are composed of, stage + bool, plus representation
// this isnt perfect, the next step would be to not hardcode the `"UI"`
//  since nothing strictly implies that this is the only case
// Finally the conversion from record like, to array to string **strongly** implies, we actually should represent a status by some tuple instead. Since keys are convention, not structure
// Further lint ideas:
/* 
∀ (n : ℕ) (f : Fin(n) → String),
  ∃ (m : ℕ), m ≤ n ×
    ∃ (S : Fin(m) ↪ String),
      ∀ (a : Fin(n)), f(a) ∈ Image(S)

Image of any total function on a finite domain is finite, implying that a function defined like:
type TSetOfString = "string1"|"string2"|...
type TInvalidFunc = {
(arg:TSetOfString):string
}
is impossible to construct

This is the single argument case, i need to hash out the behaviours of other cases

*/

```

The above code and comments may hint at potential other lints and 
# Type-Driven Linting: Transport-Aware Coherence Checking

> All rules operate on **type definitions and function signatures only**. No implementation analysis. These lints run on skeleton files (types + stubs) before any implementation exists.

## The Problem

TypeScript catches local type errors but not **coherence across implicitly related types**. When `TStatus` and `TPhase` are connected by a chain of function signatures across files, changing `TStatus` produces no error at `TPhase` until someone implements the mapping and it fails.

The gap: no **global coherence graph** over type relationships, derivable purely from types and signatures.

## Core Idea

A graph where:
- **Nodes** are discriminated types (unions, enums, literal unions)
- **Edges** are witnessed transports: function signatures whose domain and codomain connect discriminated types

When any node changes, propagate alerts along all edges at the **type declaration site**, before any implementation exists.

---

## Level 1: Type-Level Local Rules

### 1.1 Cardinality Consistency in Records

`Record<TStatus, T>` must cover every `TStatus` member. Flag `Partial<Record<TStatus, T>>` where partiality is unjustified.

### 1.2 Literal Preservation

Literal unions must not be widened. `TStatus = "pending" | "active"` must not appear as `string` in any signature.

### 1.3 Discriminant Field Consistency

Discriminated unions must use literal types on the tag field. Every variant must have the discriminant field.

---

## Level 2: Transport Detection

A **transport** from `A` to `B` is witnessed by a function signature (or chain of signatures) connecting them.

### 2.1 What Counts as a Transport

1. **Direct signature**: `type TMapStatus = (status: TStatus) => TPhase`
2. **Record type**: `type TStatusPhaseMap = Record<TStatus, TPhase>`
3. **Composite signature chain**: `TStatus → TStatusDTO → TAPIResponse → TPhase` via separate signatures, composed by matching codomain to domain
4. **Parametric witness**: indexed access types like `TStatusToPhase[S]` that witness the relationship at the type level

### 2.2 Transport Classification

From cardinalities alone:
- **Isomorphism**: `|A| = |B|`, changes propagate both ways
- **Retraction**: `|A| > |B|`, many-to-one. Adding to `A` requires deciding which `B`
- **Section**: `|A| < |B|`, one-to-many. Adding to `A` requires extending `B`

Cardinality is necessary but not sufficient — the linter surfaces the relationship, the developer confirms.

### 2.3 Detection Algorithm

1. Index all discriminated types
2. Index all function signatures as `(domain, codomain)` pairs
3. Filter to pairs where both sides are/contain discriminated types
4. Compose chains (transitive closure)
5. Classify each edge by cardinality

### 2.4 Reporting

```
warning: Type `TStatus` changed (added variant "archived").
  `TStatus` has a witnessed transport to `TPhase` via:
    src/types/api.types.ts:14    TToDTO:      TStatus → TStatusDTO
    src/types/api.types.ts:22    TSerialize:  TStatusDTO → TAPIResponse
    src/types/domain.types.ts:8  TParse:      TAPIResponse → TPhase
  `TPhase` and the connecting signatures likely need updating.
```

---

## Level 3: Fibered Transport (Layer-Aware Coherence)

### 3.1 Layers as Fibers

- **Base space**: domain concepts (Status, User, Permission)
- **Fiber**: all types representing that concept across layers (TStatus, TStatusDTO, TStatusResponse, TStatusViewModel)
- **Transport maps**: signatures connecting types in the same fiber

### 3.2 Coherence Obligation

```
warning: Fiber "Status" has 4 types across 3 layers:
  domain:  TStatus          (5 variants)
  api:     TStatusDTO       (5 variants)  — isomorphic
  ui:      TStatusViewModel (4 variants)  — retraction

  TStatus gained variant "archived".
  TStatusDTO needs a corresponding variant (isomorphism).
  TStatusViewModel needs a decision (retraction).
```

### 3.3 Detecting Fibers

1. **Naming conventions**: shared root (`TStatus`, `TStatusDTO`)
2. **Signature evidence**: function signatures connecting discriminated types
3. **Type-level references**: `B` defined in terms of `A`
4. **Transitive closure**: connected components in the transport graph

### 3.4 Cross-Fiber Dependencies

`type TGetPermissions = (status: TStatus) => TPermission[]` creates a cross-fiber edge. Reported separately as less obvious dependencies.

---

## Implementation

### Phase 1: Type Graph Construction

1. Index all discriminated types across `.types.ts` / `.d.ts` files
2. Index all function type signatures
3. Build edges where both domain and codomain contain discriminated types
4. Compute fibers as connected components + naming heuristics

### Phase 2: Change Detection

1. Diff transport graph on type definition change
2. Walk edges from changed nodes
3. Classify alerts by fiber and transport type


---
Exhaustive discrimination (§1.1) — checking that switches/if-else chains handle all variants. That's an implementation-level check.
Switch/conditional chain as a transport witness (§2.1 case 2) — detecting transports by inspecting what a switch body produces. Replaced by: if the function signature maps A → B, that alone witnesses the transport.
Implicit field correspondence (§2.1 case 4) — detecting that "pending" ↔ "intake" by tracing data flow through branches. This is pure implementation analysis.
Discriminant flow analysis (§2.3) — the entire method of tracing discriminant values through pattern matches, field assignments, return values. This was abstract interpretation over function bodies.
All "concrete signals" — switch(a.status) where branches set fields, f(g(h(x))) call chains, records where actual keys/values witness the transport. All require inspecting runtime behavior.
Co-occurrence in mapping functions as a fiber signal (§3.3) — "a single function destructures A to construct B." That's body-level.
Implementation phase 2 was entirely "discriminant flow analysis" — scanning pattern-match sites, tracking what values flow into, following through to target types. All gone. -->
