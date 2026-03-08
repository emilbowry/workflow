Run the automated lint-fix workflow on the specified paths.

Execute the orchestrator script with the provided arguments:

```bash
npx tsx scripts/lint-fix/index.ts $ARGUMENTS
```

The orchestrator will:
1. Run prettier + eslint on all specified paths
2. Group errors by file
3. Spawn parallel workers (one per file, each in its own git worktree)
4. Each worker triages, plans, implements, and verifies fixes
5. Successful fixes are committed automatically
6. A summary is printed at the end

Wait for the script to complete and report the summary.

IMPORTANT: Do NOT commit or push any changes yourself. The script handles all
commits internally. Your only job is to run the script and report the output.
