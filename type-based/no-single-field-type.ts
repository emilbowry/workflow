import type { TSESTree } from "@typescript-eslint/utils";
import type {
    TCheckNode,
    TContext,
    TCreate,
    THandler,
    TLintMeta,
    TTypeNodePredicate,
} from "./type-based.types";

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";

import { field, lintMetaToMsg } from "./type-based.types";

export const LINT_META: TLintMeta = {
    rule: "local/no-single-field-type",
    flags: field(
        "flags",
        "Type alias with exactly one" +
            " member in a type literal " +
            "body (except call " +
            "signatures)",
    ),
    fix: field(
        "fix",
        "Inline the single field " +
            "type directly or combine " +
            "with other fields",
    ),
    pitfalls: field(
        "pitfalls",
        "Call signature types " +
            "({ (x: A): B }) are " +
            "exempt — they are canonical" +
            " function type form, not " +
            "wrappers",
    ),
    avoid: field(
        "avoid",
        "Single-property wrapper " +
            "types. type TFoo = " +
            "{ value: string } — use " +
            "string directly",
    ),
    related: field(
        "related",
        "enforce-record-type, " +
            "require-extracted-types, " +
            "no-duplicate-type-structure",
    ),
    philosophy: field(
        "philosophy",
        "Every type must earn its " +
            "existence structurally. A " +
            "single-field wrapper adds " +
            "indirection without " +
            "information",
    ),
};

const MSG: string = lintMetaToMsg(LINT_META);

const DESC: string = "Disallow type aliases with " + "a single property field.";

type TRule = ESLintUtils.RuleModule<"singleField">;

const shouldReport: TTypeNodePredicate = (node) =>
    node.type === AST_NODE_TYPES.TSTypeLiteral &&
    node.members.length === 1 &&
    node.members[0].type !== AST_NODE_TYPES.TSCallSignatureDeclaration;

type TMakeHandlerArgs = [context: TContext<TRule>];
type TMakeHandler = (...args: TMakeHandlerArgs) => THandler;

const handleNode: TCheckNode<TRule> = (context, node) => {
    const ann: TSESTree.TypeNode = node.typeAnnotation;
    if (shouldReport(ann)) {
        context.report({
            messageId: "singleField",
            node: ann,
        });
    }
};

const makeHandler: TMakeHandler = (context) => handleNode.bind(null, context);

const create: TCreate<TRule> = (context) => {
    const handler: THandler = makeHandler(context);
    return {
        TSTypeAliasDeclaration: handler,
    };
};

const rule: TRule = ESLintUtils.RuleCreator.withoutDocs({
    create,
    meta: {
        docs: { description: DESC },
        messages: { singleField: MSG },
        schema: [],
        type: "suggestion",
    },
});

export default rule;
