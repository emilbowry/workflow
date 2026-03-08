import type { TLintMeta } from
    "../../type-based/type-based.types";

type TExternalRegistry = Map<string, TLintMeta>;

const registry: TExternalRegistry = new Map([
    [
        "@typescript-eslint/ban-ts-comment",
        {
            flags:
                "Usage of @ts-ignore, " +
                "@ts-expect-error, or " +
                "@ts-nocheck comments",
            fix:
                "Remove the directive. " +
                "Fix the underlying type " +
                "error instead",
            pitfalls: "None",
            avoid:
                "All ts-comment " +
                "directives. No " +
                "exceptions",
            related:
                "eslint-comments/no-use," +
                " ban-tslint-comment",
            philosophy:
                "Types are provable " +
                "contracts. Overriding " +
                "the checker voids the " +
                "contract",
        },
    ],
    [
        "@typescript-eslint/ban-tslint-comment",
        {
            flags:
                "Legacy TSLint directive" +
                " comments (tslint:" +
                "disable etc)",
            fix:
                "Remove the stale " +
                "directive comment",
            pitfalls: "None",
            avoid:
                "All tslint directive " +
                "comments",
            related:
                "ban-ts-comment, " +
                "eslint-comments/no-use",
            philosophy:
                "Mechanical cleanup of " +
                "legacy suppression " +
                "directives",
        },
    ],
    [
        "@typescript-eslint/" +
            "consistent-generic-constructors",
        {
            flags:
                "Generic type args on " +
                "constructor call " +
                "instead of type " +
                "annotation",
            fix:
                "Move generics to the " +
                "variable declaration: " +
                "const x: Map<K,V> = " +
                "new Map()",
            pitfalls: "None",
            avoid:
                "const x = new Map" +
                "<K,V>() — put generics" +
                " on the left side",
            related:
                "typedef, require-" +
                "extracted-types",
            philosophy:
                "Type annotation is the" +
                " contract; right-hand " +
                "side is implementation",
        },
    ],
    [
        "@typescript-eslint/" +
            "prefer-function-type",
        {
            flags:
                "Type literal with only" +
                " a single call " +
                "signature",
            fix:
                "Simplify { (): T } to " +
                "() => T",
            pitfalls:
                "May conflict with " +
                "prefer-call-signature " +
                "if enabled",
            avoid:
                "Unnecessary structural" +
                " wrapping of pure " +
                "function types",
            related:
                "prefer-call-signature" +
                ", no-single-field-type",
            philosophy:
                "Reduce indirection " +
                "for pure function " +
                "types",
        },
    ],
    [
        "@typescript-eslint/array-type",
        {
            flags: "T[] array syntax",
            fix:
                "Use Array<T> syntax. " +
                "Tuples are still " +
                "allowed",
            pitfalls:
                "Rule appears twice in" +
                " config — deduplicate",
            avoid:
                "T[] syntax. Use " +
                "Array<T> consistently",
            related:
                "consistent-type-" +
                "definitions, " +
                "enforce-record-type",
            philosophy:
                "One canonical form for" +
                " containers. Array<T> " +
                "is consistent with " +
                "Record<K,V>, Map<K,V>",
        },
    ],
    [
        "@typescript-eslint/" +
            "consistent-type-assertions",
        {
            flags:
                "Any type assertion " +
                "(as X or <X> syntax)",
            fix:
                "Remove assertion. " +
                "Restructure code so " +
                "TypeScript infers the " +
                "correct type. Use " +
                "switch dispatch or " +
                "try-dispatch pattern",
            pitfalls:
                "Combined with no-" +
                "unsafe-type-assertion" +
                ", there is truly no " +
                "way to assert",
            avoid:
                "All type assertions. " +
                "Use type narrowing, " +
                "switch dispatch, or " +
                "try-dispatch instead",
            related:
                "no-unsafe-type-" +
                "assertion, no-" +
                "unnecessary-condition",
            philosophy:
                "Assertions are lies " +
                "to the type checker. " +
                "Every type must be " +
                "provably correct " +
                "through inference",
        },
    ],
    [
        "@typescript-eslint/" +
            "no-unsafe-type-assertion",
        {
            flags:
                "Type assertions that " +
                "narrow to a more " +
                "specific type",
            fix:
                "Use type narrowing " +
                "via discriminated " +
                "unions or switch",
            pitfalls:
                "Closes both " +
                "directions with " +
                "consistent-type-" +
                "assertions: never",
            avoid:
                "All narrowing " +
                "assertions",
            related:
                "consistent-type-" +
                "assertions, no-" +
                "unnecessary-condition",
            philosophy:
                "Every value must be " +
                "the type it claims " +
                "through inference " +
                "alone",
        },
    ],
    [
        "@typescript-eslint/" +
            "consistent-type-definitions",
        {
            flags:
                "Interface declarations" +
                " (interface keyword)",
            fix:
                "Convert to type " +
                "alias: interface IFoo" +
                " becomes type TFoo",
            pitfalls: "None",
            avoid:
                "Interface keyword. " +
                "Use type exclusively",
            related:
                "no-duplicate-type-" +
                "structure, " +
                "enforce-record-type",
            philosophy:
                "One canonical form. " +
                "Types are explicit, " +
                "composable via " +
                "intersection, fixed " +
                "at definition site",
        },
    ],
    [
        "@typescript-eslint/" +
            "consistent-type-imports",
        {
            flags:
                "Non-type imports of " +
                "type-only symbols",
            fix: "Use import type { }",
            pitfalls:
                "Update imports when " +
                "value import becomes " +
                "type-only after refactor",
            avoid:
                "Importing types " +
                "without the type " +
                "keyword",
            related:
                "consistent-type-" +
                "exports",
            philosophy:
                "Separates type-level " +
                "and value-level " +
                "dependency graphs",
        },
    ],
    [
        "@typescript-eslint/" +
            "consistent-type-exports",
        {
            flags:
                "Type exports without " +
                "export type keyword",
            fix: "Use export type { }",
            pitfalls: "None",
            avoid:
                "Exporting types " +
                "without the type " +
                "keyword",
            related:
                "consistent-type-" +
                "imports",
            philosophy:
                "Separates type-level " +
                "and value-level " +
                "export graphs",
        },
    ],
    [
        "@typescript-eslint/" +
            "explicit-function-return-type",
        {
            flags:
                "Function without " +
                "explicit return type " +
                "annotation",
            fix:
                "Add : TReturnType. " +
                "Create the type alias" +
                " first if needed",
            pitfalls:
                "Combined with " +
                "require-extracted-" +
                "types, return type " +
                "must be a keyword or " +
                "named reference",
            avoid:
                "Relying on type " +
                "inference for return " +
                "types",
            related:
                "require-extracted-" +
                "types, typedef",
            philosophy:
                "Every function " +
                "advertises its output" +
                " type. The stub is a " +
                "binding contract",
        },
    ],
    [
        "@typescript-eslint/typedef",
        {
            flags:
                "Variable declaration " +
                "without type " +
                "annotation",
            fix:
                "Add explicit type: " +
                "const x: T = ...",
            pitfalls:
                "Combined with " +
                "require-extracted-" +
                "types, complex types " +
                "need named aliases",
            avoid:
                "Implicit type " +
                "inference on variable" +
                " declarations",
            related:
                "require-extracted-" +
                "types, explicit-" +
                "function-return-type",
            philosophy:
                "No inference = no " +
                "ambiguity. The type " +
                "is the contract, " +
                "stated explicitly",
        },
    ],
    [
        "@typescript-eslint/no-deprecated",
        {
            flags:
                "Use of deprecated " +
                "APIs",
            fix:
                "Replace with the " +
                "current API equivalent",
            pitfalls: "None",
            avoid: "Deprecated interfaces",
            related: "None",
            philosophy:
                "Keeps codebase " +
                "current. Prevents " +
                "agents from " +
                "generating code " +
                "against outdated APIs",
        },
    ],
    [
        "@typescript-eslint/" +
            "no-duplicate-type-constituents",
        {
            flags:
                "Redundant members in " +
                "unions (A | A) or " +
                "intersections (A & A)",
            fix:
                "Remove the duplicate " +
                "constituent",
            pitfalls: "None",
            avoid:
                "Duplicate members in " +
                "union or intersection " +
                "types",
            related:
                "no-duplicate-type-" +
                "structure",
            philosophy:
                "A union with a " +
                "duplicate member is " +
                "not minimal. " +
                "Canonicality at the " +
                "constituent level",
        },
    ],
    [
        "@typescript-eslint/" +
            "no-explicit-any",
        {
            flags:
                "Usage of any type " +
                "(except rest args)",
            fix:
                "Replace with a " +
                "specific type or " +
                "unknown",
            pitfalls:
                "Rest args are exempt " +
                "(ignoreRestArgs: true)",
            avoid:
                "The any type in all " +
                "positions except rest " +
                "arguments",
            related:
                "no-unsafe-type-" +
                "assertion, typedef",
            philosophy:
                "any is a hole in the " +
                "type system. Every " +
                "binding must have a " +
                "real type contract",
        },
    ],
    [
        "@typescript-eslint/" +
            "method-signature-style",
        {
            flags:
                "Method signature " +
                "syntax foo(x: A): B " +
                "in type literals",
            fix:
                "Use property style: " +
                "foo: (x: A) => B",
            pitfalls: "None",
            avoid:
                "Method signature " +
                "syntax in type " +
                "literals",
            related:
                "func-style, " +
                "prefer-arrow-callback",
            philosophy:
                "Functions are values." +
                " Property form is " +
                "consistent with " +
                "const arrow pattern",
        },
    ],
    [
        "@typescript-eslint/" +
            "no-unnecessary-condition",
        {
            flags:
                "Conditions that are " +
                "always truthy or " +
                "always falsy",
            fix:
                "Remove condition. " +
                "Use Map instead of " +
                "Record for " +
                "T | undefined " +
                "lookups",
            pitfalls:
                "Record<K,V>[k] " +
                "returns V not " +
                "V | undefined. " +
                "Use Map.get() for " +
                "the undefined case",
            avoid:
                "Unnecessary ?? or ? " +
                "on types that cannot " +
                "be nullish",
            related:
                "consistent-type-" +
                "assertions",
            philosophy:
                "Precise types mean " +
                "fewer branches. " +
                "Tighten the type to " +
                "eliminate dead code",
        },
    ],
    [
        "@typescript-eslint/" +
            "no-confusing-void-expression",
        {
            flags:
                "Void expressions in " +
                "non-statement position",
            fix:
                "Use statement form. " +
                "Arrow shorthand is " +
                "exempt",
            pitfalls:
                "ignoreArrowShorthand " +
                "is enabled",
            avoid:
                "Void return values " +
                "in expression " +
                "position",
            related: "arrow-body-style",
            philosophy:
                "Void values should " +
                "not appear where a " +
                "value is expected",
        },
    ],
    [
        "eslint-comments/no-use",
        {
            flags:
                "Any eslint disable " +
                "comment (no " +
                "exceptions)",
            fix:
                "Fix the underlying " +
                "issue structurally. " +
                "No suppression " +
                "allowed",
            pitfalls:
                "allow: [] means zero" +
                " exceptions",
            avoid:
                "All eslint-disable " +
                "comments",
            related:
                "ban-ts-comment, " +
                "no-warning-comments",
            philosophy:
                "No escape hatches. " +
                "If lints pass, the " +
                "code conforms to the" +
                " algebra, period",
        },
    ],
    [
        "functional/no-let",
        {
            flags: "Any let declaration",
            fix:
                "Use const. For " +
                "dispatch: try/nullish" +
                "-coalescing chain " +
                "(tryA(x) ?? tryB(x) " +
                "?? fallback)",
            pitfalls:
                "Tension with " +
                "restrict-return-count" +
                ": switch+let is the " +
                "only pattern " +
                "satisfying return-" +
                "count + depth + " +
                "assertions. Accepted " +
                "trade-off",
            avoid:
                "Mutable bindings. " +
                "Use const exclusively",
            related:
                "restrict-return-" +
                "count, consistent-" +
                "type-assertions",
            philosophy:
                "Values do not change." +
                " Immutability makes " +
                "reasoning local. " +
                "Every binding is a " +
                "fact stated once",
        },
    ],
    [
        "arrow-body-style",
        {
            flags:
                "Block body when " +
                "expression body " +
                "suffices",
            fix:
                "Remove braces and " +
                "return keyword: " +
                "=> expr",
            pitfalls:
                "Concise arrows have " +
                "no ReturnStatement " +
                "node — invisible to " +
                "restrict-return-count",
            avoid:
                "Block body " +
                "({ return expr; }) " +
                "when => expr suffices",
            related:
                "restrict-return-" +
                "count, func-style",
            philosophy:
                "Expression-oriented " +
                "code. A concise arrow" +
                " is a pure mapping " +
                "from input to output",
        },
    ],
    [
        "func-style",
        {
            flags:
                "Function declarations" +
                " (function keyword)",
            fix:
                "Convert to const " +
                "arrow: const f: T = " +
                "(...) => ...",
            pitfalls: "None",
            avoid:
                "function declarations" +
                ". Use const arrow " +
                "expressions",
            related:
                "prefer-arrow-" +
                "callback, " +
                "arrow-body-style",
            philosophy:
                "Functions are values." +
                " const bindings with " +
                "types, not hoisted " +
                "declarations",
        },
    ],
    [
        "prefer-arrow-callback",
        {
            flags:
                "Function expression " +
                "as callback",
            fix:
                "Replace with arrow " +
                "function",
            pitfalls: "None",
            avoid:
                "function() {} in " +
                "callback position",
            related:
                "func-style, " +
                "arrow-body-style",
            philosophy:
                "Complement to " +
                "func-style: " +
                "expression. All " +
                "functions are arrows",
        },
    ],
    [
        "indent",
        {
            flags:
                "Non-4-space " +
                "indentation",
            fix:
                "Auto-fixable. WARNING" +
                ": --fix on ternaries " +
                "cascades into depth " +
                "violations",
            pitfalls:
                "Ternary + indent " +
                "--fix = cascading " +
                "max-total-depth " +
                "errors. Use prettier " +
                "first",
            avoid:
                "Running eslint --fix " +
                "indent on ternary-" +
                "heavy code",
            related:
                "max-total-depth, " +
                "max-len",
            philosophy:
                "Consistent formatting" +
                ". 4-space indent with" +
                " SwitchCase: 1",
        },
    ],
    [
        "max-len",
        {
            flags:
                "Lines exceeding 80 " +
                "characters",
            fix:
                "Break into multiple " +
                "lines. Use string " +
                "concatenation for " +
                "long strings. Extract" +
                " sub-expressions",
            pitfalls:
                "Only URLs are exempt." +
                " Strings and template" +
                " literals are NOT " +
                "exempt",
            avoid:
                "Long lines. Template " +
                "literals that cannot " +
                "be broken across lines",
            related:
                "max-lines-per-" +
                "function, " +
                "require-extracted-" +
                "types",
            philosophy:
                "Forces decomposition." +
                " A long line is a " +
                "complex expression " +
                "that has not been " +
                "named",
        },
    ],
    [
        "max-lines-per-function",
        {
            flags:
                "Functions exceeding " +
                "40 lines (including " +
                "blanks and comments)",
            fix:
                "Extract helper " +
                "functions at module " +
                "scope",
            pitfalls:
                "Counts blank lines " +
                "and comments. " +
                "Combined with " +
                "no-nested-function, " +
                "helpers go to module " +
                "scope",
            avoid:
                "Functions longer than" +
                " 40 lines",
            related:
                "no-nested-function, " +
                "complexity, " +
                "max-total-depth",
            philosophy:
                "Hard ceiling on " +
                "generation size. " +
                "Every function fits " +
                "on a screen and is " +
                "reviewable in seconds",
        },
    ],
    [
        "complexity",
        {
            flags:
                "Cyclomatic complexity" +
                " exceeding 5",
            fix:
                "Extract branches " +
                "into functions. Use " +
                "Map/dispatch or try-" +
                "dispatch pattern",
            pitfalls:
                "Each if, else if, " +
                "case, &&, ||, ??, " +
                "and ternary ? adds 1",
            avoid:
                "Deep branching " +
                "logic. If-chains with" +
                " many conditions",
            related:
                "restrict-return-" +
                "count, max-total-" +
                "depth, " +
                "max-lines-per-" +
                "function",
            philosophy:
                "Bounds decision " +
                "space per function. " +
                "Nearly linear logic " +
                "— cheap per-function " +
                "verification",
        },
    ],
    [
        "no-warning-comments",
        {
            flags:
                "Comments containing " +
                "prettier-ignore",
            fix:
                "Remove comment. " +
                "Restructure code to " +
                "work with prettier",
            pitfalls: "None",
            avoid:
                "prettier-ignore " +
                "comments anywhere",
            related:
                "eslint-comments/" +
                "no-use, " +
                "ban-ts-comment",
            philosophy:
                "No escape hatches " +
                "for formatting. Fix " +
                "code structure, not " +
                "suppress the " +
                "formatter",
        },
    ],
    [
        "no-restricted-syntax",
        {
            flags:
                "Type predicates " +
                "(is keyword in " +
                "return type)",
            fix:
                "Use discriminated " +
                "unions or explicit " +
                "type narrowing",
            pitfalls: "None",
            avoid:
                "Type predicate " +
                "functions (x is T)",
            related:
                "consistent-type-" +
                "assertions",
            philosophy:
                "Type predicates are " +
                "refinement assertions" +
                " — narrowing that " +
                "depends on " +
                "implementation " +
                "correctness. Use " +
                "discriminated unions " +
                "for structural, " +
                "decidable narrowing",
        },
    ],
    [
        "id-length",
        {
            flags:
                "Identifiers shorter " +
                "than 3 characters",
            fix:
                "Use descriptive " +
                "names. Exceptions: " +
                "id, i, j, k, x, y, " +
                "z, _, fs, db, ui, " +
                "el, e",
            pitfalls:
                "Property names are " +
                "excluded (properties:" +
                " never)",
            avoid:
                "Short identifiers " +
                "outside the " +
                "exceptions list",
            related: "None",
            philosophy:
                "Descriptive names " +
                "carry meaning across" +
                " issues. Self-" +
                "documenting functions" +
                " reduce context " +
                "needed downstream",
        },
    ],
]);

export default registry;
