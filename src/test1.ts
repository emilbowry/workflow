// Valid: Record types pass
type TNames = Record<string, string>;

// Valid: non-object types pass
type TId = string;

type TUnion = "a" | "b";

type TTuple = [string, number];

// Valid: function types pass
type TMapper = (x: string) => number;
