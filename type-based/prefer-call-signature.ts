import type { TSESTree } from "@typescript-eslint/utils";
import type {
    TContext,
    TCreate,
    THandler,
    TLintMeta,
    TMeta,
} from "./type-based.types";

import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";

export const LINT_META: TLintMeta = {
    flags:
        "Function type syntax " +
        "(...) => T in type alias " +
        "body (TSFunctionType)",
    fix:
        "Rewrite as call-signature:" +
        " type TFoo = { (x: A): B }",
    pitfalls:
        "Currently commented out in" +
        " eslint config. Enabling " +
        "would conflict with " +
        "enforce-record-type without" +
        " an exemption for call-" +
        "signature-only type " +
        "literals",
    avoid:
        "Arrow function type syntax" +
        " in type alias definitions",
    related:
        "enforce-record-type, " +
        "no-single-field-type, " +
        "prefer-function-type",
    philosophy:
        "Call-signature form makes " +
        "the function type a proper " +
        "type literal member, " +
        "consistent with other type" +
        " literal patterns",
};

const MSG: string =
    "Use call-signature syntax " +
    "{ (...): T } instead of " +
    "function type (...) => T.";

const DESC: string =
    "Require call-signature syntax " +
    "in type aliases instead of " +
    "function type syntax.";

type TRule = ESLintUtils.RuleModule<"useCallSignature">;

type TNode = TSESTree.TSTypeAliasDeclaration;

type TCheck = (context: TContext<TRule>, node: TNode) => void;

const check: TCheck = (context, node) => {
    const isFn: boolean =
        node.typeAnnotation.type === AST_NODE_TYPES.TSFunctionType;
    if (isFn) {
        context.report({
            messageId: "useCallSignature",
            node: node.typeAnnotation,
        });
    }
};

type TMakeHandler = (checkFn: TCheck, context: TContext<TRule>) => THandler;

const makeHandler: TMakeHandler = (checkFn, context) =>
    (
        () => (node: TNode) =>
            checkFn(context, node)
    )();

const create: TCreate<TRule> = (context) => {
    const handler: THandler = makeHandler(check, context);
    return {
        TSTypeAliasDeclaration: handler,
    };
};

const meta: TMeta<TRule> = {
    docs: { description: DESC },
    messages: {
        useCallSignature: MSG,
    },
    schema: [],
    type: "suggestion",
};

const rule: TRule = ESLintUtils.RuleCreator.withoutDocs({
    create,
    meta,
});

export default rule;
