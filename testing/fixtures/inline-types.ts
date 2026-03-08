/**
 * Fixture: require-extracted-types violation.
 * Inline union types in variable annotations
 * trigger the require-extracted-types rule.
 */

const status: "pending" | "active" | "done" =
    "pending";

const direction:
    "north" | "south" | "east" | "west" =
        "north";

const value: string | number | boolean = "hello";

const handler: (x: string) => string | null =
    (x) => x;

export { status, direction, value, handler };
