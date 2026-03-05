// /**
//  * Custom ESLint rule: require-extracted-function-type
//  *
//  * When a variable's inline type annotation is a TSFunctionType
//  * that references non-built-in (user-defined) types, the type
//  * must be extracted to a named type alias first.
//  *
//  * Bad:
//  *   const fn: (stage: TFoo) => TBar = (stage) => ...
//  *
//  * Good:
//  *   type TFn = (stage: TFoo) => TBar
//  *   const fn: TFn = (stage) => ...
//  */
const BUILTIN_TYPES = new Set([
    // TypeScript utility types
    "Partial",
    "Required",
    "Readonly",
    "Record",
    "Pick",
    "Omit",
    "Exclude",
    "Extract",
    "NonNullable",
    "ReturnType",
    "InstanceType",
    "Parameters",
    "ConstructorParameters",
    "ThisType",
    "Awaited",
    "ReadonlyArray",
    "TemplateStringsArray",
    // JavaScript built-in constructors / globals
    "Array",
    "Promise",
    "Set",
    "Map",
    "WeakMap",
    "WeakSet",
    "WeakRef",
    "Error",
    "Date",
    "RegExp",
    "Function",
    "Object",
    "String",
    "Number",
    "Boolean",
    "Symbol",
    "BigInt",
    "ArrayBuffer",
    "DataView",
    "Int8Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Int16Array",
    "Uint16Array",
    "Int32Array",
    "Uint32Array",
    "Float32Array",
    "Float64Array",
    "BigInt64Array",
    "BigUint64Array",
    "IArguments",
    "NodeJS",
    // React ambient types
    "React",
    "JSX",
]);
// Properties to skip during traversal to avoid circular refs / metadata
const SKIP_KEYS = new Set(["parent", "loc", "range", "start", "end"]);
const MSG =
    "Inline function type containing user-defined types must " +
    "be extracted to a named type alias before use.";
const DESC =
    "Require inline TSFunctionType annotations with user-defined " +
    "types to be extracted as named type aliases.";
function collectTypeRefs(node, refs) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
        for (const item of node) collectTypeRefs(item, refs);
        return;
    }
    if (node.type === "TSTypeReference") {
        refs.push(node);
    }
    for (const key of Object.keys(node)) {
        if (SKIP_KEYS.has(key)) continue;
        const val = node[key];
        if (val && typeof val === "object") {
            collectTypeRefs(val, refs);
        }
    }
}
function isUserDefinedRef(ref) {
    if (ref.typeName.type !== "Identifier") return false;
    return !BUILTIN_TYPES.has(ref.typeName.name);
}
function hasUserDefinedType(funcTypeNode) {
    const refs = [];
    collectTypeRefs(funcTypeNode, refs);
    return refs.some(isUserDefinedRef);
}
export default {
    meta: {
        type: "suggestion",
        docs: { description: DESC },
        schema: [],
        messages: { extractType: MSG },
    },
    create(context) {
        return {
            VariableDeclarator(node) {
                const ann = node.id?.typeAnnotation?.typeAnnotation;
                if (!ann || ann.type !== "TSFunctionType") return;
                if (!hasUserDefinedType(ann)) return;
                context.report({
                    node: node.id.typeAnnotation,
                    messageId: "extractType",
                });
            },
        };
    },
};
