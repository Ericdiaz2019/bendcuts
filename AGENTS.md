# Repository Guidelines

## Project Structure & Module Organization
The app runs on Next.js 15 with the App Router. Keep route logic under `app/`, grouping server actions and metadata close to the page they support. Shared UI lives in `components/`, sorted by feature. Reusable hooks sit in `hooks/`, domain helpers in `lib/`, and shared typings in `types/`. Static assets go in `public/` and global styles in `styles/`. Create new feature directories with co-located `page.tsx`, `loading.tsx`, and `components/` subfolders when the surface area grows.

## Build, Test, and Development Commands
Use `npm run dev` for the local dev server with hot reloading. `npm run build` compiles the production bundle; run it before large merges. `npm run start` boots the optimized build locally for smoke checks. `npm run lint` executes Next.js ESLint and TypeScript checks; fix reported issues before pushing.

## Coding Style & Naming Conventions
Follow TypeScript strictness and prefer server components unless client interactivity is required. Use 2-space indentation, camelCase for variables/functions, PascalCase for components, and kebab-case for new directories. Tailwind classes should follow mobile-first ordering (layout → spacing → typography). Run `npm run lint` before opening a PR; add Prettier formatting via your editor to avoid churn.

## Testing Guidelines
Automated tests are not yet in place. When adding coverage, use Playwright for E2E flows under `tests/e2e/` and React Testing Library for component specs under `__tests__/`. Name files `<component>.test.tsx`. Ensure new features include at least a smoke test plus any critical validation paths. Confirm `npm run lint` passes as part of the pre-merge checklist.

## Commit & Pull Request Guidelines
Write commits in imperative mood, prefixed with a scope where helpful (e.g., `feat: add bending calculator hero`). Keep changes focused; split refactors from feature work. PRs should outline intent, summarize testing, and link related issues or design docs. Add before/after screenshots for visual updates and include edge cases or follow-up tasks in the description.

## Security & Configuration Tips
Never check sensitive CAD files or API keys into the repo. Store environment variables in `.env.local` and document required keys in the PR. Review third-party uploads for license compatibility before inclusion in `public/`.
