Per file (so excluding the global duplicate type structure)

1. prettier, eslint --fic
2. Group the lint errs
3. Pick lowest hanging fruit.
4. Fix fruit, commit goto step 1

We can run multiple parrelel subagents for each file with errors, if they behave well and dont need to refactor imports
