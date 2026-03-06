// Invalid: object literal types should use Record
type TBad = { name: string; age: number };

type TAlsoBad = { x: number };

type TCallSig = { (n: number): string };
