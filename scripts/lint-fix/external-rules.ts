import type {
    TLintMeta,
} from "../../type-based/type-based.types";

import {
    field,
} from "../../type-based/type-based.types";

type TExternalRegistry =
    ReadonlyArray<TLintMeta>;

const registry: TExternalRegistry = [
    {
        rule:
            "@typescript-eslint/" +
            "ban-ts-comment",
        flags: field(
            "flags",
            "Usage of @ts-ignore" +
                ", @ts-expect-error" +
                ", or @ts-nocheck " +
                "comments",
        ),
        fix: field(
            "fix",
            "Remove the " +
                "directive. Fix the" +
                " underlying type " +
                "error instead",
        ),
        pitfalls: field(
            "pitfalls",
            "None",
        ),
        avoid: field(
            "avoid",
            "All ts-comment " +
                "directives. No " +
                "exceptions",
        ),
        related: field(
            "related",
            "eslint-comments/" +
                "no-use, " +
                "ban-tslint-comment",
        ),
        philosophy: field(
            "philosophy",
            "Types are provable" +
                " contracts. " +
                "Overriding the " +
                "checker voids the" +
                " contract",
        ),
    },
    {
        rule:
            "@typescript-eslint/" +
            "ban-tslint-comment",
        flags: field(
            "flags",
            "Legacy TSLint " +
                "directive comments" +
                " (tslint:disable " +
                "etc)",
        ),
        fix: field(
            "fix",
            "Remove the stale " +
                "directive comment",
        ),
        pitfalls: field(
            "pitfalls",
            "None",
        ),
        avoid: field(
            "avoid",
            "All tslint " +
                "directive comments",
        ),
        related: field(
            "related",
            "ban-ts-comment, " +
                "eslint-comments/" +
                "no-use",
        ),
        philosophy: field(
            "philosophy",
            "Mechanical cleanup" +
                " of legacy " +
                "suppression " +
                "directives",
        ),
    },
    {
        rule:
            "@typescript-eslint/" +
            "consistent-generic" +
            "-constructors",
        flags: field(
            "flags",
            "Generic type args " +
                "on constructor " +
                "call instead of " +
                "type annotation",
        ),
        fix: field(
            "fix",
            "Move generics to " +
                "the variable " +
                "declaration: " +
                "const x: Array<T>" +
                " = new Array()",
        ),
        pitfalls: field(
            "pitfalls",
            "None",
        ),
        avoid: field(
            "avoid",
            "const x = new " +
                "Array<T>() — put " +
                "generics on the " +
                "left side",
        ),
        related: field(
            "related",
            "typedef, require-" +
                "extracted-types",
        ),
        philosophy: field(
            "philosophy",
            "Type annotation is" +
                " the contract; " +
                "right-hand side " +
                "is implementation",
        ),
    },
    {
        rule:
            "@typescript-eslint/" +
            "prefer-function-" +
            "type",
        flags: field(
            "flags",
            "Type literal with " +
                "only a single " +
                "call signature",
        ),
        fix: field(
            "fix",
            "Simplify " +
                "{ (): T } to " +
                "() => T",
        ),
        pitfalls: field(
            "pitfalls",
            "None",
        ),
        avoid: field(
            "avoid",
            "Unnecessary " +
                "structural " +
                "wrapping of pure " +
                "function types",
        ),
        related: field(
            "related",
            "no-single-field-" +
                "type, enforce-" +
                "record-type",
        ),
        philosophy: field(
            "philosophy",
            "Reduce " +
                "indirection for " +
                "pure function " +
                "types",
        ),
    },
    {
        rule:
            "@typescript-eslint/" +
            "array-type",
        flags: field(
            "flags",
            "T[] array syntax",
        ),
        fix: field(
            "fix",
            "Use Array<T> " +
                "syntax. Tuples " +
                "are still allowed",
        ),
        pitfalls: field(
            "pitfalls",
            "Rule appears " +
                "twice in config " +
                "— deduplicate",
        ),
        avoid: field(
            "avoid",
            "T[] syntax. Use " +
                "Array<T> " +
                "consistently",
        ),
        related: field(
            "related",
            "consistent-type-" +
                "definitions, " +
                "enforce-record-" +
                "type",
        ),
        philosophy: field(
            "philosophy",
            "One canonical form" +
                " for containers. " +
                "Array<T> is " +
                "consistent with " +
                "Record<K,V>",
        ),
    },
    {
        rule:
            "@typescript-eslint/" +
            "consistent-type-" +
            "assertions",
        flags: field(
            "flags",
            "Any type assertion" +
                " (as X or <X> " +
                "syntax)",
        ),
        fix: field(
            "fix",
            "Remove assertion. " +
                "Restructure code " +
                "so TypeScript " +
                "infers the correct" +
                " type. Use switch " +
                "dispatch or try-" +
                "dispatch pattern",
        ),
        pitfalls: field(
            "pitfalls",
            "Combined with no-" +
                "unsafe-type-" +
                "assertion, there " +
                "is truly no way " +
                "to assert",
        ),
        avoid: field(
            "avoid",
            "All type " +
                "assertions. Use " +
                "type narrowing, " +
                "switch dispatch, " +
                "or try-dispatch " +
                "instead",
        ),
        related: field(
            "related",
            "no-unsafe-type-" +
                "assertion, no-" +
                "unnecessary-" +
                "condition",
        ),
        philosophy: field(
            "philosophy",
            "Assertions are " +
                "lies to the type " +
                "checker. Every " +
                "type must be " +
                "provably correct " +
                "through inference",
        ),
    },
    {
        rule:
            "@typescript-eslint/" +
            "no-unsafe-type-" +
            "assertion",
        flags: field(
            "flags",
            "Type assertions " +
                "that narrow to a " +
                "more specific type",
        ),
        fix: field(
            "fix",
            "Use type narrowing" +
                " via discriminated" +
                " unions or switch",
        ),
        pitfalls: field(
            "pitfalls",
            "Closes both " +
                "directions with " +
                "consistent-type-" +
                "assertions: never",
        ),
        avoid: field(
            "avoid",
            "All narrowing " +
                "assertions",
        ),
        related: field(
            "related",
            "consistent-type-" +
                "assertions, no-" +
                "unnecessary-" +
                "condition",
        ),
        philosophy: field(
            "philosophy",
            "Every value must " +
                "be the type it " +
                "claims through " +
                "inference alone",
        ),
    },
    {
        rule:
            "@typescript-eslint/" +
            "consistent-type-" +
            "definitions",
        flags: field(
            "flags",
            "Interface " +
                "declarations " +
                "(interface keyword)",
        ),
        fix: field(
            "fix",
            "Convert to type " +
                "alias: interface " +
                "IFoo becomes type" +
                " TFoo",
        ),
        pitfalls: field(
            "pitfalls",
            "None",
        ),
        avoid: field(
            "avoid",
            "Interface keyword." +
                " Use type " +
                "exclusively",
        ),
        related: field(
            "related",
            "no-duplicate-type" +
                "-structure, " +
                "enforce-record-" +
                "type",
        ),
        philosophy: field(
            "philosophy",
            "One canonical " +
                "form. Types are " +
                "explicit, " +
                "composable via " +
                "intersection, " +
                "fixed at " +
                "definition site",
        ),
    },
    {
        rule:
            "@typescript-eslint/" +
            "consistent-type-" +
            "imports",
        flags: field(
            "flags",
            "Non-type imports " +
                "of type-only " +
                "symbols",
        ),
        fix: field(
            "fix",
            "Use import " +
                "type { }",
        ),
        pitfalls: field(
            "pitfalls",
            "Update imports " +
                "when value import" +
                " becomes type-" +
                "only after " +
                "refactor",
        ),
        avoid: field(
            "avoid",
            "Importing types " +
                "without the type " +
                "keyword",
        ),
        related: field(
            "related",
            "consistent-type-" +
                "exports",
        ),
        philosophy: field(
            "philosophy",
            "Separates type-" +
                "level and value-" +
                "level dependency " +
                "graphs",
        ),
    },
    {
        rule:
            "@typescript-eslint/" +
            "consistent-type-" +
            "exports",
        flags: field(
            "flags",
            "Type exports " +
                "without export " +
                "type keyword",
        ),
        fix: field(
            "fix",
            "Use export " +
                "type { }",
        ),
        pitfalls: field(
            "pitfalls",
            "None",
        ),
        avoid: field(
            "avoid",
            "Exporting types " +
                "without the type " +
                "keyword",
        ),
        related: field(
            "related",
            "consistent-type-" +
                "imports",
        ),
        philosophy: field(
            "philosophy",
            "Separates type-" +
                "level and value-" +
                "level export " +
                "graphs",
        ),
    },
    {
        rule:
            "@typescript-eslint/" +
            "explicit-function-" +
            "return-type",
        flags: field(
            "flags",
            "Function without " +
                "explicit return " +
                "type annotation",
        ),
        fix: field(
            "fix",
            "Add : TReturnType." +
                " Create the type " +
                "alias first if " +
                "needed",
        ),
        pitfalls: field(
            "pitfalls",
            "Combined with " +
                "require-extracted" +
                "-types, return " +
                "type must be a " +
                "keyword or named " +
                "reference",
        ),
        avoid: field(
            "avoid",
            "Relying on type " +
                "inference for " +
                "return types",
        ),
        related: field(
            "related",
            "require-extracted" +
                "-types, typedef",
        ),
        philosophy: field(
            "philosophy",
            "Every function " +
                "advertises its " +
                "output type. The " +
                "stub is a binding" +
                " contract",
        ),
    },
    {
        rule:
            "@typescript-eslint/" +
            "typedef",
        flags: field(
            "flags",
            "Variable " +
                "declaration " +
                "without type " +
                "annotation",
        ),
        fix: field(
            "fix",
            "Add explicit type:" +
                " const x: T = ...",
        ),
        pitfalls: field(
            "pitfalls",
            "Combined with " +
                "require-extracted" +
                "-types, complex " +
                "types need named " +
                "aliases",
        ),
        avoid: field(
            "avoid",
            "Implicit type " +
                "inference on " +
                "variable " +
                "declarations",
        ),
        related: field(
            "related",
            "require-extracted" +
                "-types, explicit-" +
                "function-return-" +
                "type",
        ),
        philosophy: field(
            "philosophy",
            "No inference = no" +
                " ambiguity. The " +
                "type is the " +
                "contract, stated " +
                "explicitly",
        ),
    },
    {
        rule:
            "@typescript-eslint/" +
            "no-deprecated",
        flags: field(
            "flags",
            "Use of deprecated " +
                "APIs",
        ),
        fix: field(
            "fix",
            "Replace with the " +
                "current API " +
                "equivalent",
        ),
        pitfalls: field(
            "pitfalls",
            "None",
        ),
        avoid: field(
            "avoid",
            "Deprecated " +
                "interfaces",
        ),
        related: field(
            "related",
            "None",
        ),
        philosophy: field(
            "philosophy",
            "Keeps codebase " +
                "current. Prevents" +
                " agents from " +
                "generating code " +
                "against outdated " +
                "APIs",
        ),
    },
    {
        rule:
            "@typescript-eslint/" +
            "no-duplicate-type-" +
            "constituents",
        flags: field(
            "flags",
            "Redundant members " +
                "in unions (A | A)" +
                " or intersections" +
                " (A & A)",
        ),
        fix: field(
            "fix",
            "Remove the " +
                "duplicate " +
                "constituent",
        ),
        pitfalls: field(
            "pitfalls",
            "None",
        ),
        avoid: field(
            "avoid",
            "Duplicate members " +
                "in union or " +
                "intersection types",
        ),
        related: field(
            "related",
            "no-duplicate-type" +
                "-structure",
        ),
        philosophy: field(
            "philosophy",
            "A union with a " +
                "duplicate member " +
                "is not minimal. " +
                "Canonicality at " +
                "the constituent " +
                "level",
        ),
    },
    {
        rule:
            "@typescript-eslint/" +
            "no-explicit-any",
        flags: field(
            "flags",
            "Usage of any type " +
                "(except rest args)",
        ),
        fix: field(
            "fix",
            "Replace with a " +
                "specific type or " +
                "unknown",
        ),
        pitfalls: field(
            "pitfalls",
            "Rest args are " +
                "exempt " +
                "(ignoreRestArgs:" +
                " true)",
        ),
        avoid: field(
            "avoid",
            "The any type in " +
                "all positions " +
                "except rest " +
                "arguments",
        ),
        related: field(
            "related",
            "no-unsafe-type-" +
                "assertion, " +
                "typedef",
        ),
        philosophy: field(
            "philosophy",
            "any is a hole in " +
                "the type system. " +
                "Every binding " +
                "must have a real " +
                "type contract",
        ),
    },
    {
        rule:
            "@typescript-eslint/" +
            "method-signature-" +
            "style",
        flags: field(
            "flags",
            "Method signature " +
                "syntax " +
                "foo(x: A): B in " +
                "type literals",
        ),
        fix: field(
            "fix",
            "Use property " +
                "style: foo: " +
                "(x: A) => B",
        ),
        pitfalls: field(
            "pitfalls",
            "None",
        ),
        avoid: field(
            "avoid",
            "Method signature " +
                "syntax in type " +
                "literals",
        ),
        related: field(
            "related",
            "func-style, " +
                "prefer-arrow-" +
                "callback",
        ),
        philosophy: field(
            "philosophy",
            "Functions are " +
                "values. Property " +
                "form is consistent" +
                " with const arrow" +
                " pattern",
        ),
    },
    {
        rule:
            "@typescript-eslint/" +
            "no-unnecessary-" +
            "condition",
        flags: field(
            "flags",
            "Conditions that " +
                "are always truthy" +
                " or always falsy",
        ),
        fix: field(
            "fix",
            "Remove condition. " +
                "Use try-dispatch " +
                "for T | undefined" +
                " lookups",
        ),
        pitfalls: field(
            "pitfalls",
            "Record<K,V>[k] " +
                "returns V not " +
                "V | undefined. " +
                "Use try-dispatch " +
                "for the undefined" +
                " case",
        ),
        avoid: field(
            "avoid",
            "Unnecessary ?? or" +
                " ? on types that" +
                " cannot be " +
                "nullish",
        ),
        related: field(
            "related",
            "consistent-type-" +
                "assertions",
        ),
        philosophy: field(
            "philosophy",
            "Precise types " +
                "mean fewer " +
                "branches. Tighten" +
                " the type to " +
                "eliminate dead " +
                "code",
        ),
    },
    {
        rule:
            "@typescript-eslint/" +
            "no-confusing-void" +
            "-expression",
        flags: field(
            "flags",
            "Void expressions " +
                "in non-statement " +
                "position",
        ),
        fix: field(
            "fix",
            "Use statement " +
                "form. Arrow " +
                "shorthand is " +
                "exempt",
        ),
        pitfalls: field(
            "pitfalls",
            "ignoreArrow" +
                "Shorthand is " +
                "enabled",
        ),
        avoid: field(
            "avoid",
            "Void return " +
                "values in " +
                "expression " +
                "position",
        ),
        related: field(
            "related",
            "arrow-body-style",
        ),
        philosophy: field(
            "philosophy",
            "Void values " +
                "should not appear" +
                " where a value " +
                "is expected",
        ),
    },
    {
        rule:
            "eslint-comments/" +
            "no-use",
        flags: field(
            "flags",
            "Any eslint disable" +
                " comment (no " +
                "exceptions)",
        ),
        fix: field(
            "fix",
            "Fix the underlying" +
                " issue " +
                "structurally. No " +
                "suppression " +
                "allowed",
        ),
        pitfalls: field(
            "pitfalls",
            "allow: [] means " +
                "zero exceptions",
        ),
        avoid: field(
            "avoid",
            "All eslint-disable" +
                " comments",
        ),
        related: field(
            "related",
            "ban-ts-comment, " +
                "no-warning-" +
                "comments",
        ),
        philosophy: field(
            "philosophy",
            "No escape hatches" +
                ". If lints pass, " +
                "the code conforms" +
                " to the algebra, " +
                "period",
        ),
    },
    {
        rule: "functional/no-let",
        flags: field(
            "flags",
            "Any let " +
                "declaration",
        ),
        fix: field(
            "fix",
            "Use const. For " +
                "dispatch: try/" +
                "nullish-coalescing" +
                " chain (tryA(x) " +
                "?? tryB(x) ?? " +
                "fallback)",
        ),
        pitfalls: field(
            "pitfalls",
            "No exceptions. " +
                "switch+let is " +
                "banned — use " +
                "nullish coalescing" +
                " chains or Record" +
                " dispatch instead",
        ),
        avoid: field(
            "avoid",
            "Mutable bindings. " +
                "Use const " +
                "exclusively",
        ),
        related: field(
            "related",
            "restrict-return-" +
                "count, " +
                "consistent-type-" +
                "assertions",
        ),
        philosophy: field(
            "philosophy",
            "Values do not " +
                "change. " +
                "Immutability " +
                "makes reasoning " +
                "local. Every " +
                "binding is a " +
                "fact stated once",
        ),
    },
    {
        rule: "arrow-body-style",
        flags: field(
            "flags",
            "Block body when " +
                "expression body " +
                "suffices",
        ),
        fix: field(
            "fix",
            "Remove braces and" +
                " return keyword: " +
                "=> expr",
        ),
        pitfalls: field(
            "pitfalls",
            "Concise arrows " +
                "have no Return" +
                "Statement node — " +
                "invisible to " +
                "restrict-return-" +
                "count",
        ),
        avoid: field(
            "avoid",
            "Block body " +
                "({ return expr;" +
                " }) when => expr" +
                " suffices",
        ),
        related: field(
            "related",
            "restrict-return-" +
                "count, func-style",
        ),
        philosophy: field(
            "philosophy",
            "Expression-" +
                "oriented code. A " +
                "concise arrow is " +
                "a pure mapping " +
                "from input to " +
                "output",
        ),
    },
    {
        rule: "func-style",
        flags: field(
            "flags",
            "Function " +
                "declarations " +
                "(function keyword)",
        ),
        fix: field(
            "fix",
            "Convert to const " +
                "arrow: const f: " +
                "T = (...) => ...",
        ),
        pitfalls: field(
            "pitfalls",
            "None",
        ),
        avoid: field(
            "avoid",
            "function " +
                "declarations. Use" +
                " const arrow " +
                "expressions",
        ),
        related: field(
            "related",
            "prefer-arrow-" +
                "callback, " +
                "arrow-body-style",
        ),
        philosophy: field(
            "philosophy",
            "Functions are " +
                "values. const " +
                "bindings with " +
                "types, not " +
                "hoisted " +
                "declarations",
        ),
    },
    {
        rule:
            "prefer-arrow-" +
            "callback",
        flags: field(
            "flags",
            "Function " +
                "expression as " +
                "callback",
        ),
        fix: field(
            "fix",
            "Replace with " +
                "arrow function",
        ),
        pitfalls: field(
            "pitfalls",
            "None",
        ),
        avoid: field(
            "avoid",
            "function() {} in " +
                "callback position",
        ),
        related: field(
            "related",
            "func-style, " +
                "arrow-body-style",
        ),
        philosophy: field(
            "philosophy",
            "Complement to " +
                "func-style: " +
                "expression. All " +
                "functions are " +
                "arrows",
        ),
    },
    {
        rule: "indent",
        flags: field(
            "flags",
            "Non-4-space " +
                "indentation",
        ),
        fix: field(
            "fix",
            "Restructure code " +
                "to reduce " +
                "indentation. " +
                "Extract into " +
                "smaller functions" +
                " at module scope",
        ),
        pitfalls: field(
            "pitfalls",
            "Indent auto-" +
                "formatting on " +
                "ternary chains " +
                "cascades into " +
                "max-total-depth " +
                "errors",
        ),
        avoid: field(
            "avoid",
            "Deep nesting. " +
                "Ternary chains " +
                "that push " +
                "indentation " +
                "beyond the depth" +
                " limit",
        ),
        related: field(
            "related",
            "max-total-depth, " +
                "max-len",
        ),
        philosophy: field(
            "philosophy",
            "Consistent " +
                "formatting. " +
                "4-space indent " +
                "with SwitchCase:" +
                " 1",
        ),
    },
    {
        rule: "max-len",
        flags: field(
            "flags",
            "Lines exceeding " +
                "80 characters",
        ),
        fix: field(
            "fix",
            "Break into " +
                "multiple lines. " +
                "Use string " +
                "concatenation for" +
                " long strings. " +
                "Extract sub-" +
                "expressions",
        ),
        pitfalls: field(
            "pitfalls",
            "Only URLs are " +
                "exempt. Strings " +
                "and template " +
                "literals are NOT" +
                " exempt",
        ),
        avoid: field(
            "avoid",
            "Long lines. " +
                "Template literals" +
                " that cannot be " +
                "broken across " +
                "lines",
        ),
        related: field(
            "related",
            "max-lines-per-" +
                "function, " +
                "require-extracted" +
                "-types",
        ),
        philosophy: field(
            "philosophy",
            "Forces " +
                "decomposition. A " +
                "long line is a " +
                "complex " +
                "expression that " +
                "has not been " +
                "named",
        ),
    },
    {
        rule:
            "max-lines-per-" +
            "function",
        flags: field(
            "flags",
            "Functions " +
                "exceeding 40 " +
                "lines (including " +
                "blanks and " +
                "comments)",
        ),
        fix: field(
            "fix",
            "Extract helper " +
                "functions at " +
                "module scope",
        ),
        pitfalls: field(
            "pitfalls",
            "Counts blank " +
                "lines and " +
                "comments. " +
                "Combined with " +
                "no-nested-" +
                "function, helpers" +
                " go to module " +
                "scope",
        ),
        avoid: field(
            "avoid",
            "Functions longer " +
                "than 40 lines",
        ),
        related: field(
            "related",
            "no-nested-" +
                "function, " +
                "complexity, " +
                "max-total-depth",
        ),
        philosophy: field(
            "philosophy",
            "Hard ceiling on " +
                "generation size. " +
                "Every function " +
                "fits on a screen" +
                " and is " +
                "reviewable in " +
                "seconds",
        ),
    },
    {
        rule: "complexity",
        flags: field(
            "flags",
            "Cyclomatic " +
                "complexity " +
                "exceeding 5",
        ),
        fix: field(
            "fix",
            "Extract branches " +
                "into functions. " +
                "Use try-dispatch " +
                "pattern",
        ),
        pitfalls: field(
            "pitfalls",
            "Each if, else if," +
                " case, &&, ||, " +
                "??, and ternary " +
                "? adds 1",
        ),
        avoid: field(
            "avoid",
            "Deep branching " +
                "logic. If-chains " +
                "with many " +
                "conditions",
        ),
        related: field(
            "related",
            "restrict-return-" +
                "count, " +
                "max-total-depth, " +
                "max-lines-per-" +
                "function",
        ),
        philosophy: field(
            "philosophy",
            "Bounds decision " +
                "space per " +
                "function. Nearly " +
                "linear logic — " +
                "cheap per-" +
                "function " +
                "verification",
        ),
    },
    {
        rule:
            "no-warning-" +
            "comments",
        flags: field(
            "flags",
            "Comments " +
                "containing " +
                "prettier-ignore",
        ),
        fix: field(
            "fix",
            "Remove comment. " +
                "Restructure code" +
                " to work with " +
                "prettier",
        ),
        pitfalls: field(
            "pitfalls",
            "None",
        ),
        avoid: field(
            "avoid",
            "prettier-ignore " +
                "comments anywhere",
        ),
        related: field(
            "related",
            "eslint-comments/" +
                "no-use, " +
                "ban-ts-comment",
        ),
        philosophy: field(
            "philosophy",
            "No escape hatches" +
                " for formatting. " +
                "Fix code " +
                "structure, not " +
                "suppress the " +
                "formatter",
        ),
    },
    {
        rule:
            "no-restricted-" +
            "syntax",
        flags: field(
            "flags",
            "Type predicates " +
                "(is keyword in " +
                "return type)",
        ),
        fix: field(
            "fix",
            "Use discriminated" +
                " unions or " +
                "explicit type " +
                "narrowing",
        ),
        pitfalls: field(
            "pitfalls",
            "None",
        ),
        avoid: field(
            "avoid",
            "Type predicate " +
                "functions " +
                "(x is T)",
        ),
        related: field(
            "related",
            "consistent-type-" +
                "assertions",
        ),
        philosophy: field(
            "philosophy",
            "Type predicates " +
                "are refinement " +
                "assertions — " +
                "narrowing that " +
                "depends on " +
                "implementation " +
                "correctness. Use" +
                " discriminated " +
                "unions for " +
                "structural, " +
                "decidable " +
                "narrowing",
        ),
    },
    {
        rule: "id-length",
        flags: field(
            "flags",
            "Identifiers " +
                "shorter than 3 " +
                "characters",
        ),
        fix: field(
            "fix",
            "Use descriptive " +
                "names. " +
                "Exceptions: id, " +
                "i, j, k, x, y, " +
                "z, _, fs, db, " +
                "ui, el, e",
        ),
        pitfalls: field(
            "pitfalls",
            "Property names " +
                "are excluded " +
                "(properties: " +
                "never)",
        ),
        avoid: field(
            "avoid",
            "Short identifiers" +
                " outside the " +
                "exceptions list",
        ),
        related: field(
            "related",
            "None",
        ),
        philosophy: field(
            "philosophy",
            "Descriptive names" +
                " carry meaning " +
                "across issues. " +
                "Self-documenting" +
                " functions reduce" +
                " context needed " +
                "downstream",
        ),
    },
];

export default registry;
