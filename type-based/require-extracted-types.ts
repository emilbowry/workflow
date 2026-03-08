import type { TSESTree } from "@typescript-eslint/utils";
import type {
    TContext,
    TCreate,
    TLintMeta,
    TTypeNodePredicate,
} from "./type-based.types";

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";

import { field, lintMetaToMsg } from "./type-based.types";

export const LINT_META: TLintMeta = {
    rule: "local/require-extracted-function-type",
    flags: field(
        "flags",
        "Inline type annotations " +
            "that are not keywords or " +
            "named references " +
            "(TSTypeReference)",
    ),
    fix: field(
        "fix",
        "Extract to a named type " +
            "alias: type TFoo = string " +
            "| number; const x: TFoo " +
            "= ...",
    ),
    pitfalls: field(
        "pitfalls",
        "High volume — a function " +
            "with 3 params + return + " +
            "2 locals could need 6 " +
            "type aliases. Naming " +
            "requires semantic thought," +
            " not mechanical " +
            "substitution. Inline tuple " +
            "types (TSTupleType) in " +
            "annotation position are " +
            "flagged — extract to named " +
            "alias first. Lambda-lifting " +
            "cascades into require-rest-" +
            "params-tuple — new function " +
            "signature needs its own " +
            "tuple type. Do minimal fix " +
            "only unless also targeting " +
            "no-nested-function",
    ),
    avoid: field(
        "avoid",
        "Inline unions, " +
            "intersections, function " +
            "types, tuple types, object" +
            " literals in annotation " +
            "position",
    ),
    related: field(
        "related",
        "typedef, " +
            "explicit-function-return-" +
            "type, no-duplicate-type-" +
            "structure, max-type-" +
            "nesting, require-rest-" +
            "params-tuple",
    ),
    philosophy: field(
        "philosophy",
        "Every value has a named " +
            "type defined before the " +
            "value exists. The type " +
            "vocabulary IS the " +
            "specification — readable " +
            "without any implementation",
    ),
};

const MSG: string = lintMetaToMsg(LINT_META);

const DESC: string =
    "Require type annotations to be " + "keywords or named references.";

const isAllowed: TTypeNodePredicate = (node) =>
    node.type === AST_NODE_TYPES.TSTypeReference ||
    node.type.endsWith("Keyword");

type TRule = ESLintUtils.RuleModule<"extractType">;

type TReportArgs = [node: TSESTree.TSTypeAnnotation];
type TReport = (...args: TReportArgs) => void;

type TCheckNodeArgs = [
    context: TContext<TRule>,
    node: TSESTree.TSTypeAnnotation,
];
type TCheckNode = (...args: TCheckNodeArgs) => void;

const checkNode: TCheckNode = (context, node) => {
    const inner: TSESTree.TypeNode = node.typeAnnotation;
    if (!isAllowed(inner)) {
        context.report({
            messageId: "extractType",
            node,
        });
    }
};

const create: TCreate<TRule> = (context) => {
    const handler: TReport = (
        () => (node: TSESTree.TSTypeAnnotation) =>
            checkNode(context, node)
    )();
    return {
        TSTypeAnnotation: handler,
    };
};

const rule: TRule = ESLintUtils.RuleCreator.withoutDocs({
    create,
    meta: {
        docs: { description: DESC },
        messages: { extractType: MSG },
        schema: [],
        type: "suggestion",
    },
});

export default rule;
