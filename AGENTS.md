# Repository working agreements

- Use the repository owner's configured Git identity. Never add assistant authors, co-author trailers, generated-by text, sign-offs, or assistant signatures to commits, PRs, or project artifacts.
- Review existing changes before editing. Preserve user data and unrelated work.
- Check the source when using the Graphify map; it may predate the latest changes.
- Do not add another staged override. Improve the active implementation and move coherent logic toward tested modules.
- Never place privileged keys, provider tokens, personal exports, or production database audit output in Git or the static artifact.
- The static build is an allowlist. Keep tests and internal documentation out of `dist`.
- Run relevant behavior tests and the build after code changes. Database isolation is not established by mocked JavaScript tests.
- Database changes require the real schema, reviewed permissions, and cross-user checks. Do not guess a production migration.
- Commit and push only when the user has authorized it. Do not rewrite shared history merely to refresh a contributor widget.
