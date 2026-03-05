/**
 * Custom ESLint rule: restrict-return-count
 *
 * Enforces a maximum number of explicit return
 * statements per function. This encourages
 * Single Entry, Single Exit (SESE) logic.
 */

const MSG =
  "Function has {{count}} return statements. " +
  "Maximum allowed is {{max}}.";

const DESC = "Enforce a maximum number of return statements.";

function createTracker(context, max) {
  const stack = [];

  function increment() {
    if (stack.length === 0) return;
    stack[stack.length - 1].count++;
  }

  function push() {
    stack.push({ count: 0 });
  }

  function pop(node) {
    const frame = stack.pop();
    if (frame && frame.count > max) {
      context.report({
        node,
        messageId: "tooManyReturns",
        data: { count: frame.count, max },
      });
    }
  }

  return { increment, push, pop };
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

function buildReturnVisitors(increment) {
  return {
    ReturnStatement: increment,
  };
}

export default {
  meta: {
    type: "suggestion",
    docs: { description: DESC },
    schema: [{ type: "integer", minimum: 1 }],
    messages: { tooManyReturns: MSG },
  },

  create(context) {
    const max = context.options[0] ?? 1;
    const tracker = createTracker(context, max);

    return {
      ...buildScopeVisitors(tracker.push, tracker.pop),
      ...buildReturnVisitors(tracker.increment),
    };
  },
};