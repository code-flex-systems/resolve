# Repository Guidelines

## Project Structure & Module Organization
This workspace routes everything to `apps/web`, the Next.js application containing runtime code. `apps/web/src` houses the domain folders (`api`, `app`, `components`, `lib`, `server`) with configuration in `src/config`. Middleware lives in `src/middleware.ts` and `middleware/`. Keep tests in the nearest `__tests__` folder and static assets in `apps/web/public`.

## Build, Test, and Development Commands
Run commands from the repository root unless noted. Use `npm run dev` for the hot-reloading server, `npm run build` for the production bundle, `npm run lint` for the Next.js ESLint suite, and `npm run typecheck` for type safety. Inside `apps/web`, the same scripts exist plus `npm run start` to serve a pre-built bundle.

## Coding Style & Naming Conventions
All application code is TypeScript. ESLint extends `next/core-web-vitals` and `next/typescript`; resolve lint issues before opening a PR. Match the prevailing style: tab indentation, single quotes, and linter-enforced trailing commas. Name components and stores with PascalCase, hooks with `useCamelCase`, and helpers with lowerCamelCase. Reuse shared tokens from `src/styles/theme.ts`, and prefer import aliases over long relative paths.

## Testing Guidelines
Vitest drives unit and integration tests. Add `.test.ts` files to the nearest `__tests__` directory (for example, `api/utils/__tests__/isEqual.test.ts`). Run `npm run test` for the headless suite, `npm run test:ui` for interactive debugging, and `npm run test:coverage` to review instrumentation. New work must cover success and failure paths, keeping coverage on par with the modules you touch.

## Commit & Pull Request Guidelines
Recent history uses concise summaries such as `fixes for home search`. Follow that approach: one-line, imperative-toned subjects under 72 characters with optional scope prefixes (`auth:`, `api:`). Use the body for context, migrations, or follow-up tasks. Pull requests should include a summary, validation steps, linked issues, and screenshots or recordings for UI changes, plus explicit callouts for schema or environment updates.

## Environment & Configuration Notes
Sensitive settings load via `.env*` files consumed by Next.js and server utilities—never commit secrets. Database access flows through Kysely helpers in `src/server`; refresh generated types when the schema changes. When adding third parties (AWS, Resend, etc.), centralize credentials in configuration and list new variables in the PR description.
