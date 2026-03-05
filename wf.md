# 1. Novel Development

> [Note:] We will assume we are working with React + Typescript

## 1.1. Core Philosphy

1. Code **shall** be explanable, provable and tractable from the type signatures alone.
2. Every piece of code **shall** be associated with an issue
3. Agents and LLMs are blackboxes, we do not trust them without proof.

## 1.2. Core Properties

Context

- LLMs do not need the codebase as context:
- It is sufficient to know what the dependancies are, and what the outcomes are:
- In an ideal world, with perfect planning every piece of code was preplanned atomic, and has an associated issue. Therefore, it is sufficient to provide the tree up to the point. Give what needs to be added, and it shall return an additional function, therefore it is sufficient to define two files:
  **workspace.dependancies.tsx**
- An immutable file containing all dependancy code, constructed from previous commits and external deps.
- Passes lints and no emits
  **workspace.dependancies.tsx**
- Skeletal file containing "stubs", and any **new** type definitions (these are known a priori).
- The agent shall be allowed to edit this, then we can verify then both lint and build.
- Assuming ideal first time pass we can parse into codebase since we already know where it goes.
- If fails, it either is;
- **internally fixable**: code errors/bugs, may require new functions
- **externally broken**: requires modification to something in dependancies

If it is externally broken, we can analyse:

- what needs to change.
- what part of our planning, lints or prompts process didnt prevent this (what can be improved outside the codebase)
- what modifications to the issues need to be made.

## 1.3. Processes

### 1.3.1 Planning

#### 1.3.1.1 System Planning

Take away any initial project into a single core idea. We can have a massively defined behavourial mechanics, UI flows for an inspection application for trains. This can be represented as a single statement, obey EARS logic `The <subject> shall <action>`. Isolate -> Decompose -> Rebuild
<thinking>

- Decompose action to construct subject
  `The app shall process train inspections`
- Decompose subject
- Process, Train Inspections
- Can the action be rewritten as a requirement
- Train Inspections need to be known to understand in order to be processed
- What is a train inspection:
    - Documents defects:
        - How do you document a defect:
            - Text, Photos, Severity, Location, Unit
                - We can meaningfully type these:
                    ```typescript
                    type TSeverity = "Low" | "Medium" | "High";
                    type TCartesian = [number, number, number | undefined];
                    type TDefectReport = {
                        text: string;
                        images: string[];
                        severity: TSeverity;
                        unit: string;
                    };
                    ```
        - What is the train inspection process
            - Inspection => Rework => Validate, Rework and Validate contain binary outcomes, pass/fail
                - Wait so does an inspection in reality, it is either submitted successfully or not.
                - An arbitrary number of people can be in an inspection, but fundamentally it reduces to a trivial case. At each stage n, at least n people have touched it. So stage nicely is a mapping from an index to a finite set of names.

```typescript
type TStages = Set<string>
TStage<T extends string> = Record<>
```

`The app shall improv
Decompose any ideas of flow into basic type properties, construct UIs based on what the types imply
Core behaviours, suppose I want an app that needs to fundamentally: Compute store, process and represent "inspections" for a train. A train inspection goes through three phases, inspect, rework, inspect
Done by types until complete (I want)

#### 1.3.1.x

1. **Issue Definition:**

- An issue **shall** be an atomic task.
- It shall include relevant **type** definitions
- It shall include relevant **stub** functions/codeblocks
- It shall include what it needs to do:
- It shall reference it's dependancies
- It shall reference what consumes it/what it is needed for
- It is immutable once it is defined, we can change the state to "not doing" but it shall still exist.
- It shall state what files need to be created or modified.
- It shall have comments comprised of post mortem analysis, if something went wrong or it spawned new issues/restructured the planning during implmentation.
- It may have additional properties
  <!-- - It may have alternative approaches to execution -->

2. **Creation Process**
   Unlike implementation, I would like issue creation to be strictly linear, to be rigourous this is more efficient.
   For example:

- After an issue is created we shall create the file, and stubs.
- We shall have a dedicated linting and analysis process.
- This shall check:
- No type aliasing
- There are no type definitions in function definitions
- Bad:

```ts
const fn: (stage: TFoo) => TBar = (stage) => ...
```

- Good:

```ts
type TFn = (stage: TFoo) => TBar
const fn: TFn = (stage) => ...
```

- There shall be no isomorphic types, for all types this shall pass:

```ts
type TExtensionallyEqual<T, U> =
    T extends U ?
        U extends T ?
            "Fail"
        :   "Pass"
    :   "Pass";
```

Patterns like this are not allowed:

```typescript
type TUserId = { id: string; name: string };
type TProductId = { id: string; name: string };
// Silently interchangeable — intensionally distinct, extensionally equal
```

- Branding of **used** types is forbidden:
    > Used refers to actually being utilised in code, it is allowed and sometimes expected in the prequisite definitions/utility types, for example:

```ts
type UserId = string & { __brand: "UserId" };
```

Is forbidden, since it does not imply anything is structurally different.
Often times people try to use branding for utility or to construct an approximation of dependant types however often this is unnecessary, and often ungeneral, consider the case:

```ts
type TArrayTwoOrMore<T> = {
    0: T;
    1: T;
} & Array<T>;
```

But then consider this closely related practical example
For example:

- an object does through 3 stages in its life cycle.
- a user escalates the object through each stage
- at each stage, the escalating user's id is appended to a list of ids.
- Therefore, at stage `n`, the list of users must at least be `n+1` long.
  We can express this as:

```ts
type TBuildArray<T, N extends number, Current extends T[]> =
    Current["length"] extends N ? [...Current, ...T[]]
    :   TBuildArray<T, N, [...Current, T]>;

type TStage = {
    first: 1;
    second: 2;
    third: 3;
};
type TMinEditors<N extends number> = TBuildArray<string, N, []>;

type TEditableObject<T extends keyof TStage> = {
    stage: T;
    editor_ids: TMinEditors<TStage[T]>;
};
```

These may not be necessary to realise in code for instance, to define a workflow that just shows that it obeys this process, a more reasonable implementation would be:

```typescript
type TStage = {
    inspection: 1;
    rework: 2;
    verification: 3;
};

type TCartesian = [number, number, number];
type TPriority = "Low" | "Medium" | "High" | "Severe";

type TWorkData<T extends keyof TStage> = {
    notes: string;
    images: string[];
    priority: TPriority;
    editor_ids: TMinEditors<TStage[T]>; // really it is a dependant type on the stage index mapping, we always have at least index + 1 editors since each stage shall append at least one editor id. It isnt generic over TStage, it is a dependant type but inconvenient to illustrate that
};

type TWorkItemIdentifiers = {
    readonly id: string;
    readonly location: TCartesian;
};

type TWorkItem<T extends keyof TStage> = TWorkData<T> & TWorkItemIdentifiers;
type TWorkProcess = {
    [S in keyof TStage]: {
        readonly stage: S;
        readonly unit_id: string;
        readonly process_id: string;
        state: boolean;
        work_items: TWorkItem<S>[];
    };
}[keyof TStage];
```

If we require branding, using string literal types like `type TSomeLabel = `<prefix?>${string}<suffix?>` become far more powerful in some cases.

- Sigma type complexity: Any nested type > 2 shall be decomposed. Since (A _ (B _ (C _ D))) is just (A _ E).

- The Unitality of Products (No Single-Field Sigma Types),
  **bad**

```
type UserId = { value: string }
```

**good**
type User = {
id:string,
/_ other properties to not violate aliasing rules _/
}

- Forbid Optional properties
  I like this but what about with a union of undefined? This seems sensible but I think this violates the law.
- no optional parameters, if something may be undefined, use a union with undefined:
  Bad: { id: string; email?: string } (The record has 2 or 1 fields—unstable shape).

Good: { id: string; email: string | undefined } (The record always has 2 fields—stable shape).

- More at the code level but good to know for context.
  That is, any closure must be composed into a **true** `Partial Application`. We insist on flat:
  `const fn = (...parmas) => () => otherFn(...params)`, then calls of this for closures, instead of messy functions with tonnes of closures

- There shall be no interfaces, the Identity of that type is unstable.

I want the opposite to the:

```
"@typescript-eslint/prefer-function-type": "error"
```
