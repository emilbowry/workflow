/**
 * Custom ESLint rule: max-total-depth
 *
 * Enforces a single unified depth budget across
 * both control-flow block statements and JSX
 * elements.  Every indentation level costs one
 * unit regardless of whether it is an if/for/while
 * or a JSX tag.
 */

const BLOCK_NODES = [
  "IfStatement",
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
  "SwitchStatement",
  "TryStatement",
  "CatchClause",
  "WithStatement",
];

const MSG =
  "Combined nesting depth ({{depth}}) exceeds " +
  "maximum of {{max}}. Extract into a " +
  "separate component or function.";

const DESC =
  "Enforce a maximum combined depth across " +
  "block statements and JSX elements.";

function createTracker(context, max) {
  const stack = [];

  function inc(node) {
    if (stack.length === 0) return;
    const d = ++stack[stack.length - 1].depth;
    if (d > max) {
      context.report({
        node,
        messageId: "tooDeep",
        data: { depth: d, max },
      });
    }
  }

  function dec() {
    if (stack.length === 0) return;
    stack[stack.length - 1].depth--;
  }

  function push() {
    stack.push({ depth: 0 });
  }

  function pop() {
    stack.pop();
  }

  return { inc, dec, push, pop };
}

function buildBlockVisitors(inc, dec) {
  const visitors = {};
  for (const type of BLOCK_NODES) {
    visitors[type] = inc;
    visitors[`${type}:exit`] = dec;
  }
  return visitors;
}

function buildJsxVisitors(inc, dec) {
  function onText(node) {
    if (node.value.trim() !== "") inc(node);
  }
  function onTextExit(node) {
    if (node.value.trim() !== "") dec();
  }
  return {
    JSXElement: inc,
    "JSXElement:exit": dec,
    JSXFragment: inc,
    "JSXFragment:exit": dec,
    JSXExpressionContainer: inc,
    "JSXExpressionContainer:exit": dec,
    JSXText: onText,
    "JSXText:exit": onTextExit,
  };
}

function isMultilineReturn(node) {
  if (!node.argument) return false;
  const retLine = node.loc.start.line;
  const argLine = node.argument.loc.start.line;
  return argLine > retLine;
}

function buildReturnVisitors(inc, dec) {
  return {
    ReturnStatement(node) {
      if (isMultilineReturn(node)) inc(node);
    },
    "ReturnStatement:exit"(node) {
      if (isMultilineReturn(node)) dec();
    },
  };
}

function buildScopeVisitors(push, pop) {
  return {
    FunctionDeclaration: push,
    "FunctionDeclaration:exit": pop,
    FunctionExpression: push,
    "FunctionExpression:exit": pop,
    ArrowFunctionExpression: push,
    "ArrowFunctionExpression:exit": pop,
  };
}

export default {
  meta: {
    type: "suggestion",
    docs: { description: DESC },
    schema: [{ type: "integer", minimum: 1 }],
    messages: { tooDeep: MSG },
  },

  create(context) {
    const max = context.options[0] ?? 3;
    const t = createTracker(context, max);
    return {
      ...buildScopeVisitors(t.push, t.pop),
      ...buildJsxVisitors(t.inc, t.dec),
      ...buildReturnVisitors(t.inc, t.dec),
      ...buildBlockVisitors(t.inc, t.dec),
    };
  },
};