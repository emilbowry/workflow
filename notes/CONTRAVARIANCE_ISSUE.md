# Contravariance in dispatch Maps — no-duplicate-type-structure.ts

## The Error

`npx tsc --noEmit` produces 6 errors. All stem from the same root cause: storing handler functions with *specific* parameter types in Maps typed with a *broad* parameter type.

```typescript
// The broad type (Map value type):
type TCanonicalMember = (member: TSESTree.TypeElement) => string;

// A specific handler:
type THandleProperty = (member: TSESTree.TSPropertySignature) => string;
const handlePropertySignature: THandleProperty = (member) => {
    const key: string = keyName(member.key);
    const opt: string = member.optional ? "?" : "";
    const ann: string = annotationToString(member.typeAnnotation, "");
    const sep: string = ann ? ":" : "";
    return key + opt + sep + ann;
};

// This fails:
const MEMBER_MAP: Map<string, TCanonicalMember> = new Map([
    [AST_NODE_TYPES.TSPropertySignature, handlePropertySignature],
    //                                   ^^^^^^^^^^^^^^^^^^^^^^^^
    // THandleProperty is not assignable to TCanonicalMember.
    // Types of parameters 'member' and 'member' are incompatible.
    // TypeElement is not assignable to TSPropertySignature.
]);
```

## Why it fails

Function parameters are **contravariant** under `strictFunctionTypes`. A function that only accepts `TSPropertySignature` (narrow) cannot fill a slot expecting a function that accepts any `TypeElement` (broad) — because the slot could pass a `TSIndexSignature` to a handler that only understands `TSPropertySignature`.

At runtime, this never happens — the Map dispatch guarantees correctness by keying on `member.type`. But in our current implementation, TypeScript can't prove this through the Map abstraction. `exactOptionalPropertyTypes: true` makes the Map constructor strict enough to surface the error.

## Affected locations (6 errors)

| Line | Structure | Entries | Broad type |
|------|-----------|---------|------------|
| 126 | `MEMBER_MAP` | 4 handlers | `TCanonicalMember = (TypeElement) => string` |
| 135 | `canonicalMember` fallback | 1 call | `handleConstructSignature` called with `TypeElement` |
| 301 | `COMPOSITE_MAP` | 3 handlers | `TCanonical = (TypeNode) => string` |
| 312 | `REFERENCE_MAP` | 4 handlers | `TCanonical` |
| 324 | `LITERAL_MAP` | 3 handlers | `TCanonical` |
| 335 | `ADVANCED_MAP` | 4 handlers | `TCanonical` |

## Why we haven't found a fix yet

Every obvious escape hatch is banned by the project's lint rules:

| Escape hatch | Rule that bans it |
|---|---|
| `as TCanonical` | `consistent-type-assertions: { assertionStyle: "never" }` |
| `@ts-expect-error` | `ban-ts-comment: "error"` |
| Type predicates (`is`) | `no-restricted-syntax: TSTypePredicate` |
| Method signature bivariance | `method-signature-style: "property"` |

And the structural constraints limit restructuring:

| Constraint | Rule |
|---|---|
| Max indentation depth 3 | `local/max-total-depth: 3` |
| Single return per function | `local/restrict-return-count: 1` |
| Max cyclomatic complexity 5 | `complexity: 5` |
| Max 40 lines per function | `max-lines-per-function: 40` |
| Max 80 char lines | `max-len: 80` |
| Expression-style functions only | `func-style: "expression"` |
| All variables need type annotations | `typedef: { variableDeclaration: true }` |

## Approaches considered

### 1. Replace Maps with ternary chains
Replace Map lookups with discriminant narrowing (`member.type === X ? handler(member) : ...`). TypeScript narrows discriminated unions through `.type` checks, so each handler keeps its specific type.

**Problem:** `max-total-depth: 3` limits ternary chains to 2 conditions per function. Groups of 3-4 handlers must be split into pairs of 2-entry sub-functions composed with `??`. This roughly doubles the function count in the dispatch layer.  There also is no formal reasoning for the splits, they are pretty arbitrary.

### 2. Widen handler types
Retype all handlers to accept the broad parent type (`TypeElement`/`TypeNode`), add `.type` narrowing inside each handler.

**Problem:** Creates dead branches (the `else` case that never executes at runtime). Undermines "total" functions. Changes the type signature of every handler.

### 3. Bivariance hack
Redefine `TCanonical` using method syntax to exploit TypeScript's bivariant method checking:
```typescript
type TCanonical = { bivariant(node: TSESTree.TypeNode): string }["bivariant"];
```

**Problem:** Deliberately circumvents type safety. Antithetical to the project's philosophy of canonical type algebra and structural soundness.

### 4. Use a Record instead of Map

**Problem:** Same contravariance issue. Any homogeneous collection (`Map<K, V>`, `Record<K, V>`, `Array<V>`) requires all values to match the broad function type. The contravariance is in the type system, not the data structure.

## Core tension

The Map dispatch is *runtime-correct* — the key guarantees the right handler receives the right type. But TypeScript's type system can't witness this correspondence through an opaque `Map.get()` call. The type-safe way to dispatch on a discriminated union is conditional branching (`if`/ternary/`switch`), where TypeScript can narrow through control flow. But the project's depth and complexity constraints limit how much branching fits in a single function.
