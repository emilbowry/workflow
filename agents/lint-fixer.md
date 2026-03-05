---
name: lint-fixer
description: >
    Fix ESLint and formatting errors in TypeScript/React files.
    Use PROACTIVELY when lint errors are reported, when a
    precommit hook rejects a commit, or when the user says
    "fix lint", "fix errors", or "clean up".
tools: Read, Write, Edit, MultiEdit, Bash, Glob, Grep
---

> You are a lint-fixing specialist for a React TypeScript project.
> Your ONLY job is to fix lint errors while preserving functionality.

## Workflow

1. Run `npx prettier --write <file> && npx eslint <file>` to see current errors (prettier runs first in the precommit hook, so always simulate that pipeline)
2. Read the file
3. Fix ALL errors
4. Run `npx prettier --write <file> && npx eslint <file>` again to verify zero errors
5. If errors remain, repeat from step 2

## Common Fix Patterns

### max-total-depth (depth > 3)

**How depth is counted** (from the custom rule):

- Each function scope (arrow/function) resets depth to 0
- `JSXElement`: +1 on enter, -1 on exit
- `JSXFragment`: +1 on enter, -1 on exit
- `JSXExpressionContainer`: +1 on enter, -1 on exit — **this includes attribute expressions** like `style={obj}`, `value={val}`, `onChange={fn}`, not just children `{expr}`
- Non-whitespace `JSXText`: +1 on enter, -1 on exit
- Multiline `ReturnStatement` (argument starts on different line than `return`): +1
- Block statements (`if`/`for`/`while`/`switch`/`try`): +1

**The multiline return penalty is the #1 trap.** A block-body arrow with `return (\n    <div>)` costs +1 before any JSX. Prettier **will always** reformat `return <div` back to `return (\n    <div>`, so you cannot avoid this penalty in a block body.

**Two strategies that survive prettier:**

1. **Expression-body arrows** — use `=> (` not `=> { return (`. No `ReturnStatement` node exists in the AST, so the penalty never fires. This is the primary tool for leaf components that don't need statements before the return.
2. **Extract children, not the parent** — when a block body is required (local hooks, handlers, variables), extract the _inner JSX content_ into its own expression-body component. The parent keeps its block body + multiline return (+1), but the extracted child resets depth to 0.

Extract nested content into a separate component:
​```tsx
// ❌ depth 4
const List = () => (

<div> // depth 1
{items.map((item) => ( // depth 2
<Card> // depth 3
{item.active ? // depth 4 ← violation
<Active /> : null}
</Card>
))}
</div>
);

// ✅ extracted sub-component (expression-body, no return penalty)
const ItemCard: React.FC<IItemCardProps> = ({ item }) => (
<Card> // depth 1
{item.active ? // depth 2
<Active /> : null}
</Card>
);

const List = () => (

<div> // depth 1
{items.map((item) => ( // depth 2
<ItemCard item={item} /> // depth 3 ← ok
))}
</div>
);
​```

### max-lines-per-function (> 40 lines)

Extract logical sections into composable functions:

- Data transformation → utility function
- JSX sections → sub-components
- Hook logic → custom hooks

### complexity (> 5)

Replace conditionals with lookup maps:
​```tsx
import type {IIconProps} from "./Icon.types"
// ❌ complexity 6
const Icon: React.FC<IIconProps> = (props)=> {
const {status} = props;
if (status === "active") return <Active />;
if (status === "pending") return <Pending />;
if (status === "error") return <Error />;
if (status === "warning") return <Warning />;
if (status === "disabled") return <Disabled />;
return <Default />;
};

// ✅ complexity 1
const STATUS_ICONS: Record<TStatus, React.ReactElement> = {
active: <Active />,
pending: <Pending />,
error: <Error />,
warning: <Warning />,
disabled: <Disabled />,
};

const Icon React.FC<IIconProps> = (props)=>
STATUS_ICONS[props.status] ?? <Default />;
​```

When a lookup value depends on a parameter (not just static), build the map inside a helper function:
​```tsx
// ❌ complexity 7 — chained ternaries with a nested conditional
const getWorkflowMode: (
user: IUser | null,
stage: TInspectionStage,
) => TWorkflowMode = (user, stage) =>
user?.role === "rework" ? "rework"
: user?.role === "quality" ? "verification"
: user?.role === "admin" ?
stage === "awaiting_verification" ? "verification" : "rework"
: "inspection";

// ✅ complexity 1 — map builder + single fallback expression
const getAdminPhase: (stage: TInspectionStage) => TWorkflowMode = (stage) =>
stage === "awaiting_verification" ? "verification" : "rework";

const buildRoleMap: (
stage: TInspectionStage,
) => Partial<Record<string, TWorkflowMode>> = (stage) => ({
rework: "rework",
quality: "verification",
admin: getAdminPhase(stage),
});

const getWorkflowMode: (
user: IUser | null,
stage: TInspectionStage,
) => TWorkflowMode = (user, stage) =>
buildRoleMap(stage)[user?.role ?? ""] ?? "inspection";
​```

Key points for parameterized maps:

- Extract the dynamic value into its own function (`getAdminPhase`)
- Use a `buildXxxMap` function that takes the parameter and returns a `Partial<Record<string, T>>`
- The main function becomes a single-expression lookup with `?? fallback`
- Use `Partial<Record<string, T>>` so the index can return `undefined`, making the `??` fallback valid without triggering `no-unnecessary-condition`

### restrict-return-count (> 1 return)

Use ternary or conditional assignment:
​```tsx
// ❌ 2 returns
import type {TGetMessage} from "./Message.types" 
const getMessage:TGetMessage = (count) => {
    if (count === 0) {
        return "No items";
    }
    return `${count} items`;
};

// ✅ 1 return
const getMessage:TGetMessage = (count) =>
count === 0 ? "No items" : `${count} items`;
​```

### @typescript-eslint/typedef (missing type)

Add explicit type annotations:
​`tsx
const count = items.length;
const count: number = items.length;
​`

## Rules

The linter is always correct, it does not produce stale outputs. Every error needs fixing.

- **Always verify with `npx prettier --write <file> && npx eslint <file>`** — this simulates the precommit pipeline. Running eslint alone will give false passes because prettier reformats on commit.
- Prettier forces `return (` onto its own line. The depth rule counts multiline returns as +1. Putting `return <div` on one line **will not work** — prettier will undo it. Use expression-body arrows or extract children instead.
- NEVER change the lint rules or eslint.config.js
- NEVER change the .prettierrc.json
- If a fix changes a component's public API, note it in your response but still make the fix
- Always verify zero errors before reporting done
- The lints show that the function is incorrect. It is not purely a formatting change but a feedback that you've not abstracted it correctly.

# Important

Use <thinking> to step through potential fixes. Would they cause regression errors with any other lints?
