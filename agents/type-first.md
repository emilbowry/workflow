---
name: type-first
description: >
    Type-first development workflow. Creates *.types.ts
    skeletons and stub function signatures before implementation.
    Use when implementing features from a plan, when the user
    says "implement", "build", "create", or provides a plan
    to execute.
---

# Type-First Development Workflow

Two phases with user checkpoints. Complete each phase
fully and STOP for user approval before proceeding.

## Phase 1: Skeleton

1. Read the plan
2. Identify all types needed:
    - Interfaces for component props (I-prefixed)
    - Type aliases for variants/unions (T-prefixed)
    - Literal types for domain constraints
3. Create `*.types.ts` files with all type definitions
    - Every type has a docstring comment
    - Types are shared contracts — get these right
4. Create `*.tsx` files with:
    - Correct imports from types files
    - Function signatures with full type annotations
    - Comment above each function describing its intent
    - `throw new Error("Not implemented")` as the body
    - Export block at bottom
5. Create `index.ts` re-exports
6. Run `npx tsc --noEmit` to verify the skeleton compiles
7. Present the skeleton to the user

## Phase 2: Type Analysis

After user approves the skeleton:

1. Delegate to the type-analysis agent
2. Present the findings table to the user
3. Reconcile findings with the plan:
    - Apply Error-severity findings immediately
    - Discuss Improvement-severity findings with user
    - Note Redundancy findings for cleanup
4. Update type signatures based on reconciliation
5. Run `npx tsc --noEmit` again to verify

### STOP. Wait for user approval.

## Phase 3: Implementation

1. Load the react-typescript skill for conventions reference
2. Read the skeleton files — the comments are the spec
3. Replace each `throw new Error("Not implemented")` with logic
4. Do NOT change any type signatures from Phase 1
    - If a type signature must change, discuss with user first
5. Create `*.consts.ts` files as needed during implementation
6. After each logical unit of work:
    - Commit granularly (one logical change per commit)
    - Precommit hooks handle prettier → eslint
    - If commit is rejected: fix errors or delegate to lint-fixer agent
7. Do NOT batch all commits at the end

# Skeleton Example: UserCard

## UserCard.types.ts

​```tsx
// src/components/UserCard/UserCard.types.ts

/\*_ Status variants for user availability display _/
type TUserStatus = "online" | "offline" | "away" | "busy";

/\*_ Props for the UserCard component _/
interface IUserCardProps {
user_name: string;
avatar_url: string;
status: TUserStatus;
onSelect: (user_name: string) => void;
}

/\*_ Props for the status indicator sub-component _/
interface IStatusBadgeProps {
status: TUserStatus;
}

export { TUserStatus, IUserCardProps, IStatusBadgeProps };
​```

## UserCard.tsx

​```tsx
// src/components/UserCard/UserCard.tsx

import { IUserCardProps, IStatusBadgeProps } from "./UserCard.types";

/\*_ Renders a small badge showing the user's availability status.
_/
const StatusBadge:React.FC<IStatusBadgeProps> = (
props
)=> {
throw new Error("Not implemented");
};

/\*\* Renders a clickable card: avatar, user_name heading, StatusBadge.

- Wire onSelect callback to card click. \*/
  const UserCard: React.FC<IUserCardProps> = (
  props
  ) => {
  throw new Error("Not implemented");
  };

export { StatusBadge, UserCard };
​```

## Notes

- `throw new Error("Not implemented")` makes the skeleton valid TypeScript
- Comments above each throw describe implementation intent
- No constants, no JSX, no hook calls in the skeleton
- Types live in a separate file because they are shared contracts

# Important

Any atomic change needs to be commited. This should at the largest scale a single file change.
