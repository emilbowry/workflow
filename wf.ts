// // // type TBuildArray<T, N extends number, Current extends T[]> =
// // //     Current["length"] extends N ? [...Current, ...T[]]
// // //     :   TBuildArray<T, N, [...Current, T]>;

// // // type TStage = {
// // //     first: 0;
// // //     second: 1;
// // //     third: 2;
// // // };
// // // type TMinEditors<N extends number> = TBuildArray<string, N, []>;

// // // type TCartesian = [number, number, number];
// // // type TPriority = "Low" | "Medium" | "High" | "Severe";

// // // type TWorkData<T extends keyof TStage> = {
// // //     notes: string;
// // //     images: string[];
// // //     priority: TPriority;
// // //     editor_ids: TMinEditors<TStage[T]>; // really it is a dependant type on the stage index mapping, we always have at least index + 1 editors since each stage shall append at least one editor id. It isnt generic over TStage, it is a dependant type but inconvenient to illustrate that
// // // };

// // // type TWorkItemIdentifiers = {
// // //     readonly id: string; // technically redundant since we cannot physically set two work items to the same exact location so location is a sufficient identifier by the physics, but makes look ups easier
// // //     readonly location: TCartesian;
// // // };

// // // type TWorkItem<T extends keyof TStage> = TWorkData<T> & TWorkItemIdentifiers;
// // // type TWorkProcess = {
// // //     [S in keyof TStage]: {
// // //         readonly stage: S;
// // //         readonly unit_id: string;
// // //         readonly process_id: string;
// // //         state: boolean;
// // //         work_items: TWorkItem<S>[];
// // //     };
// // // }[keyof TStage];

// // // type TNoneZeroNumber<T extends number> = T extends 0 ? never : T;
// // // type T_Stage = { [key: string]: number };
// // // type TStage = T_Stage & {
// // //     [key: string]: { [T in keyof T_Stage]: T extends 0 ? never : T };
// // // };

// // // const b:TStage = {
// // //     s:0
// // // }
// // type NonZero<N extends number> = N extends 0 ? never : N;
// // type TS = Record<string, number>;
// // // type NonZeroRecord = {
// // //     [T in keyof TS]: {
// // //         //   [key:TS[T]]: NonZero<TS[T]>;
// // //         [key: string]: TS[T] extends number ?
// // //             TS[T] extends infer U ?
// // //                 U extends 0 ?
// // //                     never
// // //                 :   U
// // //             :   TS[T]
// // //         :   never;
// // //     };
// // // }[keyof TS];

// // // type Excluding<T extends number> =
// // //     // T extends infer U ?
// // //     T extends 0 ?
// // //         // U extends 0 ?
// // //         never
// // //     :   T;
// // // // :   never;
// // // type B = Excluding<1>;

// // // type F = {
// // //     [key: string]: Excluding<1>;
// // // };

// // // interface a<T extends number> {
// // //     [key: string]: Excluding<13>;
// // // }
// // // interface I extends a<number> {}
// // // const F: I = { f: 13 };
// // // type TBuildArray<T, N extends number, Current extends T[]> =
// // //     Current["length"] extends N ? [...Current, ...T[]]
// // //     :   TBuildArray<T, N, [...Current, T]>;

// // type TStage = {
// //     first: any;
// //     second: any;
// //     third: any;
// // };
// // type TSet<T extends Array<string>> = {};

// // type TDepEditors<N extends number, Current extends string[]> =
// //     Current["length"] extends N ? [...Current, ...string[]]
// //     :   TDepEditors<N, [...Current, string]>;
// // type LengthOfArray<N extends number, Current extends string[]> =
// //     Current["length"] extends N ? Current["length"]
// //     :   LengthOfArray<N, [...Current, string]>;

// // type TMinEditors<N extends number> = TDepEditors<N, []>;
// // type TEditableObject<T extends keyof TStage> = {
// //     stage: T;
// //     editor_ids: TMinEditors<TStage[T]>;
// // };
// // const s: TEditableObject<"first"> = {
// //     stage: "first",
// //     editor_ids: ["s", "s"],
// //     // len: 1,
// // };

// // type DedupeArray<
// //     T extends readonly PropertyKey[],
// //     Seen extends Record<PropertyKey, true> = {},
// // > =
// //     T extends (
// //         readonly [
// //             infer H extends PropertyKey,
// //             ...infer Rest extends PropertyKey[],
// //         ]
// //     ) ?
// //         H extends keyof Seen ?
// //             DedupeArray<Rest, Seen>
// //         :   [H, ...DedupeArray<Rest, Seen & Record<H, true>>]
// //     :   [];

// // // ["a", "b", "c"]
// // type A = DedupeArray<["a", "b", "a", "c", "b"]>;

// // // [1, 2, 3]
// // type B = DedupeArray<[1, 2, 3, 1, 2]>;
// type TAddress = {
//     street: string;
//     city: string;
//     postcode: string;
//     country: string;
// };
// type TCompany = {
//     name: string;
//     address: TAddress;
// };

// type TOrder = {
//     company: TCompany;
//     orderID: number;
// };
// type TIncrement = (state: { x: number }) => number;
// const increment: TIncrement = (state) => state.x++;

// type TMakeCounter = (state: { x: number }) => () => number;
// const makeCounter: TMakeCounter = (state) => () => increment(state);

// type TCheck =
//     TMakeCounter extends TIncrement ?
//         TIncrement extends TMakeCounter ?
//             true
//         :   false
//     :   false;
// type A = TIncrement extends ReturnType<TMakeCounter> ? true : false;
// type P = Parameters<TMakeCounter>;
// type R = ReturnType<ReturnType<TMakeCounter>>;

// type check = (
//     ...params: Parameters<TMakeCounter>
// ) => R extends TIncrement ? true : false;
// type p = [string, string];
// type p = [string];
