---
description: Pre-commit prep — quality checks, adversarial audit, stage files, generate a conventional commit message, and optionally commit.
---

# Pre-commit Preparation

Automates pre-commit prep for this monorepo: quality checks → adversarial audit → stage files → generate commit message → optionally commit. Committing directly on `main` is allowed.

This repo has **no** Prettier/ESLint/commitlint/husky and **no** committed test suite, so the meaningful gate is the TypeScript build/typecheck. Do **not** use `npm test` as a gate — there are no test files and `jest` exits non-zero on "no tests found".

---

## Step 1 — Quality checks (run in parallel)

These are independent; run them in the same batch and wait for both:

```bash
npm run build --workspace apps/api
```

```bash
npm run lint --workspace apps/web
```

- `apps/api` → `nest build` typechecks and compiles the NestJS API.
- `apps/web` → `tsc --noEmit` typechecks the React app (this also resolves `@tennis/shared`, covering the shared package).

If **either fails**, surface the errors and **stop**. Do not proceed.

> Optional, only if the diff touches build output, PWA, or Vite config: also run `npm run build --workspace apps/web` for a full production build. Skip otherwise — it's slower than the typecheck and not needed for most changes.

---

## Step 1b — Dependency check (only if the dependency tree changed)

Check whether this commit touches dependencies:

```bash
git diff HEAD --name-only -- package.json package-lock.json apps/*/package.json packages/*/package.json
```

If **any** of those appear:

1. Make sure `package-lock.json` is in sync with the manifest changes. If you're unsure it was regenerated, run `npm install` and then check what moved:

   ```bash
   git diff --stat -- package-lock.json
   ```

2. (Informational, non-blocking) surface known vulnerabilities so the user can decide:

   ```bash
   npm audit --omit=dev
   ```

> ⚠️ **Do not let Step 3's `git add -u` sweep in a `package-lock.json` change the user didn't intend.** If the lockfile moved, show the user `git diff --stat -- package-lock.json` and confirm the change is intended before staging it — otherwise `git checkout -- package-lock.json` to discard it. Treat `npm audit` findings as advisory (CI/registry is the source of truth, see the private-registry note in memory), not an automatic stop.

If none of those files changed, skip this step entirely.

---

## Step 2 — Adversarial audit

Run `git diff HEAD` to capture the current diff. If the output is empty (all changes are new untracked files), skip this step.

Otherwise spawn a skeptical reviewer (this repo has no dedicated `devils-advocate` agent, so use `general-purpose` with an explicit contract). Substitute the captured diff into the prompt:

```typescript
Agent({
  subagent_type: 'general-purpose',
  description: 'Adversarial diff review',
  prompt: `You are a skeptical senior reviewer. Argue against this change and find real problems before it is committed. Focus on: correctness/logic bugs, security (authz, input validation, secrets), data/migration risk, broken types or contracts between apps/api and apps/web (and @tennis/shared), error handling, and anything that silently changes behavior. Be concrete and cite file:line.

End your report with a single line: "VERDICT: STOP" (must-fix issues), "VERDICT: NEEDS FIXES" (should fix, not blocking), or "VERDICT: OK" (no significant concerns).

Review this diff:
<output of git diff HEAD>`,
});
```

Surface the **full report** to the user.

- Verdict **STOP** → halt and surface all findings. Do not proceed.
- Verdict **NEEDS FIXES** → warn the user, but continue (the user decides whether to fix first).
- Verdict **OK** → continue.

---

## Step 3 — Stage files

Run `git status` and show the output to the user so they can see what will be staged.

Then stage only already-tracked modifications (no new untracked files):

```bash
git add -u
```

If Step 1b ran and `package-lock.json` shows an unintended change, do **not** stage it blindly — confirm with the user first, per the Step 1b warning.

If there are **new untracked files** in `git status`, list them explicitly and ask the user which ones to include before staging them. Watch for files that should never be committed (`.env`, build output under `dist/`, `apps/api/.env`).

---

## Step 4 — Generate commit message

Run:

```bash
git diff --cached
```

Analyze the staged diff and compose a Conventional Commit message:

- Format: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`, `style`, `perf`, `build`
- Scope: the affected area of this monorepo — e.g. `api`, `web`, `shared`, `coach`, `auth`, `sessions`, `stats`, `prisma`, `deploy`, `db`
- Description: imperative, lowercase, no trailing period
- Body (optional): bullet points explaining **why**, not what
- **Footer (required):** end the message with the trailer
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

Display the generated message, then use `AskUserQuestion`:

```typescript
AskUserQuestion({
  questions: [
    {
      question: 'Would you like to commit with this message?',
      header: 'Commit',
      multiSelect: false,
      options: [
        { label: 'Yes', description: 'Run git commit -m "..." with the generated message.' },
        { label: 'Edit message', description: 'Describe what to change or paste your own message — it will be updated and committed.' },
        { label: 'No', description: 'Do nothing — files remain staged.' },
      ],
    },
  ],
});
```

- **Yes** → run `git commit -m "<message>"` (include the `Co-Authored-By` trailer; pass the body via additional `-m` arguments). There are no git hooks in this repo, so `--no-verify` is unnecessary.
- **Edit message** → apply the user's requested changes or use their pasted message, then commit.
- **No** / dismissed → do nothing. Remind the user that files remain staged and can be unstaged with `git reset HEAD`.
