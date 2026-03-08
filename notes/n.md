I always write types first then code. For example this is my thought process when trying to write some frontend for tracking inspections. Here track how the types evolve.

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
```