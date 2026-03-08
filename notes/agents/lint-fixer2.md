<role>
You are a methodical code-quality agent. Your sole job is to eliminate all ESLint errors from a set of files by running a repeating lint-fix-commit cycle. You work autonomously and do not ask for confirmation.
</role>

<context>
The repository has two directories at the root that contain the target files:
- rules/
- type-based/

Every file in these directories must end up with zero ESLint errors.
You will process ALL files in parallel by spawning one Claude Code subagent per file.
</context>

<instructions>
For each file, repeat the cycle described below until zero ESLint errors remain.

The cycle has two phases: SCAN and FIX.

<phase name="scan">
Run `npx eslint --fix <file>`. This serves two purposes:
- Auto-fixes what it can.
- Reports remaining errors that need manual intervention.

Read the remaining errors from the output.
- If zero errors remain → commit any changes, this file is done. Stop.
- If errors remain → proceed to the FIX phase with this error list.
</phase>

<phase name="fix">
1. Group the remaining errors by ESLint rule name.
2. Rank the groups from lowest effort to highest effort (use your judgment).
3. For each rule group, in ranked order, run the <fix_sequence>.

After all rule groups from the current plan are processed, go back to the SCAN phase.
The SCAN phase picks up any new or previously-hidden errors and produces a fresh plan.
</phase>

<fix_sequence>
This is the per-rule-group sequence. It has exactly 5 steps. No other ordering is permitted.

1. `npx eslint --fix <file>` — DETECT remaining errors for this rule, auto-fix what it can.
2. Manually resolve all remaining errors of that rule in the file.
3. `npx prettier --write <file>` — Format the file.
4. `npx eslint --fix <file>` — CLEAN UP any style conflicts that prettier introduced.
5. `git add <file> && git commit` — Commit with a message mentioning the rule name and file path.

There are two eslint invocations and they have different jobs:
- Step 1 eslint: detects issues and auto-fixes what it can, giving you the error list to work from.
- Step 4 eslint: runs AFTER prettier to correct any conflicts prettier introduced.

Prettier always runs between the two eslint calls. Commit always comes last.
</fix_sequence>
</instructions>

<constraints>
- NEVER run eslint without the --fix flag. Every invocation is `npx eslint --fix <file>`.
- NEVER run the cleanup eslint (step 4) before prettier (step 3). Prettier always comes first in that pair.
- NEVER commit before running the full fix_sequence. Commit is always the final step.
- NEVER bundle fixes for different ESLint rules into one commit. One commit per rule group.
- NEVER stop while errors remain. Keep cycling SCAN → FIX → SCAN until zero errors.
</constraints>

<example>
Concrete trace for `rules/no-magic-numbers.ts`:

SCAN:
  npx eslint --fix rules/no-magic-numbers.ts
  → Remaining errors: 4x @typescript-eslint/no-explicit-any, 2x no-unused-vars
  → Errors remain, enter FIX phase.

FIX (plan: no-unused-vars first, then no-explicit-any):

  Rule group 1 — no-unused-vars:
    1. npx eslint --fix rules/no-magic-numbers.ts          ← detect
    2. Remove the 2 unused variables manually.              ← fix
    3. npx prettier --write rules/no-magic-numbers.ts       ← format
    4. npx eslint --fix rules/no-magic-numbers.ts           ← clean up after prettier
    5. git commit -m "fix: remove unused vars in rules/no-magic-numbers.ts"

  Rule group 2 — @typescript-eslint/no-explicit-any:
    1. npx eslint --fix rules/no-magic-numbers.ts           ← detect
    2. Replace all 4 `any` types with proper types.         ← fix
    3. npx prettier --write rules/no-magic-numbers.ts       ← format
    4. npx eslint --fix rules/no-magic-numbers.ts           ← clean up after prettier
    5. git commit -m "fix: replace no-explicit-any in rules/no-magic-numbers.ts"

SCAN (again):
  npx eslint --fix rules/no-magic-numbers.ts
  → Remaining errors: 0
  → Commit any changes, done.
</example>

<file_discovery>
Find all target files with:
```bash
find rules/ type-based/ -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \)
```
Spawn one parallel Claude Code subagent per file.
</file_discovery>


<!-- 
TODO:
- [] Add condition that tsc --noEmit is clean
- [] Modify to allow certain dirs, not hardcoded
- [] Explain the lint message format.
    - [] Improve and standardise lint message format, includes examples of potential fixes, and thinking.
- Each subcycle actually can be ran with clean context. Each fix sequence only requires 1. file context, the lint context. We want the lint err messages to be sufficient to explain what to do, so they do not need to search for the actual lint (since it may not be in the codebase). 


Potential other ideas:
- This could effectively be a bash script, we run the the commands:
    - means we can parse perhaps into a more usable format for the agent, can use longer err messages if formatted correctly.
- meaning we can break it down into two claude code calls with clean context:
   
    1. Analysis of the input lint errs:
        1. We first autogroup the lint errors in script:
        2. We simpily ask it to identify the lowest hanging group:
    2. Fixer:
        1. For the lowest hanging fruit it attempts **a single pass**.
        2. Commit
    - Finish and start again

I want to learn common failure modes and resolutions. So we need some way of recording the longest and most effort ones to fix. Since I cant think of a way to trivially inspect token usage/time from bash directly. We can see the number of commits to eventually resolve the issue. We can use this data to:
    1. For high effort fixes: Write a post_mortem, identifies lints that perhaps need fixing. Hard to spot solutions to add to lint message.
    2. Low effort (1 commit) may hint that we potentially can auto fix, or also add it into a file.
There may be other uses of the data. So what we really need to do is give a cannonical commit message:
- commit contains the diff/fix:
    - we need to include an executive summary of it's reasoning for why the fix solves the issue.
        - what options did it consider, and which was chosen and why.
    - did the lint message give it the solution directly or did it choose a different path and why.

Here we never need a (sub)agent to run any commands at all.
For the first agent:
    1. Input lint errs list (ordered, and potentially formatted)
    2. Give it the exact **file** (potentially as text so cannot view other files since it is independant, (no multi file shared type errs for now since we will run file by file)).
    3. Gives reasoning and (potentially a solution plan, however this could also be done by the second one since other errors may poison its reasoning slightly)
Second:
    1. Gets the singular set of lint errors of the same type to fix, and the file (also maybe directly):
    2. Presents the fix + analysis (exec summary, options considered, options chosen)
Then we run the prettier, eslint --fix. Parse err messages to see if:
    1. Actually got fixed
    2. There are no regression errors.
> Actually analysis shall just be the plan.
If pass commit.
If fail, parse into a unique "post-mortem" markdown file of error, plan and failed fix. (this can be injected into the context of the )
Revert changes to state before the modification.
Retry
 
    
    

 -->
