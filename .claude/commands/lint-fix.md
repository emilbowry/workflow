Run the automated lint-fix workflow on the specified paths.

You MUST run this exact command and nothing else:

```bash
npx tsx scripts/lint-fix/index.ts $ARGUMENTS
```

The script handles everything internally: dependency installation, scanning,
fixing, and committing. Wait for it to complete and report the summary output.

Do NOT:
- Run eslint, prettier, or npm install yourself
- Diagnose or fix errors from the script manually
- Commit or push any changes
- Improvise any steps — the script is self-contained
