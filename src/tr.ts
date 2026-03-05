// import React, { useState } from "react"
// type TFunctionType = { (...args: never[]): unknown };

// type TPartialApplication<T extends TFunctionType> = {
//     (): ReturnType<T>;
// };

// type TPartialApplicator<T extends TFunctionType> = {
//     (func: T, ...params: never[]): TPartialApplication<T>;
// };

// type TSetStateApplication<
//     in out T,
//     U extends React.Dispatch<T> = React.Dispatch<React.SetStateAction<T>>,
// > = TPartialApplicator<U>;

// type TStateHook<T> = {
//     state: T;
//     modifier: ReturnType<TSetStateApplication<T>>;
// };
// type TUseStateHook<T> = {
//     (): TStateHook<T>;
// };
// // const incrementBetter: TSetStateApplication<number> = (setCount) => () =>
// //     setCount((count) => count + 1);

// // const useBestHook: TUseStateHook<number> = () => {
// //     const [count, setCount] = useState(0);
// //     return { state: count, modifier: incrementBetter(setCount) };
// // };

// // vs
// // const useBadHook: TBadHook_v1 = () => {
// //     const [count, setCount] = useState(0);
// //     const increment = () => setCount((count) => count + 1);
// //     return { count, increment };
// // };
