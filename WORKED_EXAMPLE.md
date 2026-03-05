Let's say we need to write a hook to increment some count:

```ts
type useIncrement = {
    (): {
        count: number;
        increment: {
            (): void;
        };
    };
};
```

We can first spot several issues, the primary one is it violates the nesting levels, to solve the outer nesting level we have:

```ts
type TIncrementer = {
    count: number;
    increment: {
        (): void;
    };
};
type TUseIncrement = {
    (): TIncrementer;
};
```

This has a couple issues, nesting in `TIncrementer` since the increment function doesnt make much sense and `TIncrementer` seems like a bit of an arbitrary type. Neglecting the latter issue for now:

```ts
type TIncrement = {
    (): void;
};
type TIncrementer = {
    count: number;
    increment: TIncrement;
};
type TUseIncrement = {
    (): TIncrementer;
};
```

Now technically this is a completely sound from a lint perspective however the definition of `TIncrement` seems odd, that conveys nothing about incrementing, but we know that varying count, lets say weakening the type to number|null, means that increment function would necessarily change.

The core way of solving this is lambda lifting, the weakening property implies by the method we wrote would have some closures. We in general do not nest functions, anything nested can be re-written as a Partial Application:

```ts
type TFunctionType = { (...args: any[]): unknown };

type TPartialApplication<T extends TFunctionType> = {
    (): ReturnType<T>;
};

type TPartialApplicator<T extends TFunctionType> = {
    (func: T, ...params: any[]): TPartialApplication<T>;
};

type TSetStateApplication<
    in out T,
    U extends React.Dispatch<T> = React.Dispatch<React.SetStateAction<T>>,
> = TPartialApplicator<U>;

type TStateHook<T> = {
    state: T;
    modifier: ReturnType<TSetStateApplication<T>>;
};
type TUseStateHook<T> = {
    (): TStateHook<T>;
};

```
This is far clearer, and generalisable, and means we do not have nested functions that are not the trivial PA case:
```ts
const incrementBetter: TSetStateApplication<number> = (setCount) => () =>
    setCount((count) => count + 1);

const useBestHook: TUseStateHook<number> = () => {
    const [count, setCount] = useState(0);
    return { state: count, modifier: incrementBetter(setCount) };
};

// vs
const useBadHook: TBadHook_v1 = () => {
    const [count, setCount] = useState(0);
    const increment = () => setCount((count) => count + 1);
    return { count, increment };
};

```
The latter is bad because, we reasonably expect to sometimes see other functions like increment, as such it is far better to abstract

``
/_ BLOCK 1: Bad Hook _/
const useBadHook: TBadHook_v1 = () => {
const [count, setCount] = useState(0);
const increment = () => setCount((count) => count + 1);
return { count, increment };
};

type TBadHook_v1 = {
(): {
// 1. two layers of abstraction
count: number;
increment: { (): void }; // 2. inner function must be abstracted
};
};
type TReturnOfBadHook_v1 = {
// 1. two layers of abstraction
count: number;
increment: { (): void }; // 2. inner function must be abstracted
};
type TBadHook_v2 = {
(): TReturnOfBadHook_v1;
};

type TIncrement_v1 = {
//
(): void;
};

type TReturnOfBadHook_v2 = {
count: number;
increment: TIncrement_v1; // 1. function name does not in any way mean anything related to the function
// 2. Impossible to implement standa alone
};

/_ BLOCK 2: Good Hook _/

// redesign
type TFunctionType = (...args: any) => any; // reusable
type TPartialApplication<T extends TFunctionType> = {
// reusable
(): ReturnType<T>;
};
type TIncrement = {
// hints that we can weaken since shared types (will go into that later)
(
setCount: React.Dispatch<React.SetStateAction<number>>,
): TPartialApplication<React.Dispatch<React.SetStateAction<number>>>;
};

type TCounterState = {
count: number;
increment: ReturnType<TIncrement>;
};
type TUseIncrement = {
(): TCounterState;
};
const increment: TIncrement = (setCount) => () =>
setCount((count) => count + 1);
const useGoodHook: TUseIncrement = () => {
const [count, setCount] = useState(0);
return { count, increment: increment(setCount) };
};
/_ BLOCK 2: Best Hook _/

// noticing our weaking and easy generalisation we can finally refine and cut the stuff out to simpily

type TSetStateApplication<
in out T,
U extends React.Dispatch<T> = React.Dispatch<React.SetStateAction<T>>,

> = {

    (setter: U): TPartialApplication<U>;

};

type TStateHook<T> = {
state: T;
modifier: ReturnType<TSetStateApplication<T>>; // Take note of return type
};
type TUseStateHook<T> = {
(): TStateHook<T>;
};

// Noting the ReturnType<...> WE have derived directly from the type sigs that this function requires decomposition, and the creation of multiple functions
// and we can generalise it, and use it accross different cases
const incrementBetter: TSetStateApplication<number> = (setCount) => () =>
setCount((count) => count + 1);

const useBestHook: TUseStateHook<number> = () => {
const [count, setCount] = useState(0);
return { state: count, modifier: increment(setCount) };
};

```

```
