# Resolve

A claims management application for property insurance adjusters. Resolve combines AI-assisted, schema-driven checklists with document handling, task and deadline tracking, recovery/subrogation tracking, and party and coverage management — all behind a multi-tenant, role-based API.

> **Status.** Portfolio / showcase project. The application was originally built for a client engagement targeting SOC 2; the cloud environment (Azure VNet + Front Door + Container Apps + Postgres Flexible Server) has since been torn down for cost reasons. The codebase is intact and runnable locally, and a migration to a free Supabase + Vercel stack is planned so a live demo can be re-hosted.

_Screenshots coming soon._

## What it does

- **Schema-driven checklists.** Adjusters work through claims using checklists composed of hierarchical pages, templated questions, and answer options. Selecting certain answers can unlock additional page instances, supporting branching workflows.
- **AI-assisted checklist generation.** OpenAI is used to scaffold checklists and provide guidance.
- **Document management.** Upload, download, and access-controlled retrieval of claim-related documents, with per-tenant blob organization.
- **Tasks & deadlines.** Work items and time-sensitive requirements with assignment, claim/unclaim flows, and completion tracking.
- **Recovery tracking.** Subrogation and recovery events linked to claims with amounts and statuses.
- **Parties & coverage.** Claimants, insureds, attorneys, contractors, and the coverages that apply to each claim.
- **Workflow routing (desk hierarchy).** Multi-tier desk locations and types route claims through workflow phases.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 13+ (App Router) |
| API | tRPC (end-to-end type safety) |
| Database | PostgreSQL via Kysely (typed query builder) |
| Auth | Clerk (orgs + role-based memberships) |
| State (client) | Zustand with Immer |
| UI | Material-UI (MUI), React Hook Form |
| AI | OpenAI |
| Email | Resend |
| Object storage | Azure Blob Storage (Azurite emulator for local dev) |
| Validation | Zod (shared client/server schemas) |
| Testing | Vitest |
| Type generation | kysely-codegen |
| Deployment (former) | Azure Container Apps, Azure Container Registry, GitHub Actions |

## Architecture highlights

- **Multi-tenant by construction.** Every domain row carries a `client_id`. Tenant scoping is enforced in the API layer via a shared `applyClientScope()` helper, never by frontend filters.
- **Role-based authorization at the router.** Admin, Super Admin, and Contributor roles are checked inside tRPC procedures; the UI never relies on client-side gating for security.
- **Shared validation.** Zod schemas live in `apps/web/src/schemas/` and are reused by both the tRPC routers and the React Hook Form components.
- **Performance-first query patterns.** Standardized patterns include `RETURNING` over re-fetching, `Promise.all()` for independent reads, batched `WHERE IN` over loops, and `jsonb_agg` + `GROUP BY` for one-to-many aggregation. See `CLAUDE.md` for the full pattern catalog.
- **Kysely migrations.** Schema changes go through versioned, type-safe migration files in `apps/web/src/api/database/migrations/` rather than raw SQL.
- **Hybrid auth/session.** Sessions merge Clerk identity (user ID, org ID, role) with a local `users` row so per-tenant `client_id` and app role can be served from the database, kept in sync via Clerk webhooks.

## Repository layout

```
resolve/
├── apps/web/                            # Next.js application (the only workspace currently)
│   ├── src/
│   │   ├── api/
│   │   │   ├── controllers/             # Business logic
│   │   │   ├── queries/                 # Kysely query functions
│   │   │   └── database/
│   │   │       ├── migrations/          # Kysely migration files
│   │   │       ├── kysely.ts            # DB instance
│   │   │       └── types.d.ts           # kysely-codegen output
│   │   ├── server/trpc/                 # tRPC routers, context, procedures
│   │   ├── app/                         # Next.js App Router pages and API routes
│   │   ├── components/                  # React components, organized by domain
│   │   ├── hooks/trpc/                  # Custom tRPC hooks (mutation + query wrappers)
│   │   ├── stores/                      # Zustand stores (one per feature)
│   │   ├── schemas/                     # Zod validation schemas
│   │   ├── lib/                         # Client-side and shared utilities
│   │   └── config/                      # Constants and TypeScript enums
│   └── scripts/                         # Dev seed and reset scripts
├── Dockerfile
└── .github/workflows/                   # CI/CD (Azure-targeted; will be replaced for Supabase host)
```

## Local development

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ running locally (or accessible at `DB_HOST`/`DB_PORT`)
- A Clerk account (free tier is sufficient for local development)
- Optional: Azurite for local Azure Blob emulation, or skip blob features

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create a local Postgres database
createdb resolve

# 3. Configure environment
cp apps/web/.env.example apps/web/.env
# Then fill in CLERK_*, DB_*, and any other required values

# 4. Run migrations
npm --workspace apps/web run db:migrate

# 5. Generate TypeScript types from the schema
npm --workspace apps/web run db:types

# 6. (Optional) Seed dev data
./apps/web/scripts/dev-data-reset/run-all.sh

# 7. Start the dev server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Common commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Next.js dev server with hot reload |
| `npm run build` | Production build |
| `npm run lint` | ESLint (Next.js config) |
| `npm run typecheck` | TypeScript check across the workspace |
| `npm --workspace apps/web test -- --run` | Run the test suite once |
| `npm --workspace apps/web run db:migrate` | Apply pending migrations |
| `npm --workspace apps/web run db:migration:create <name>` | Scaffold a new migration |
| `npm --workspace apps/web run db:types` | Regenerate Kysely types |
| `npm run format` / `npm run format:check` | Prettier write / check |

## Testing

Vitest powers both unit and integration tests, with integration tests running against a real PostgreSQL database (no mocking of the data layer). Tests live in `__tests__/` directories adjacent to the modules they cover.

```bash
npm --workspace apps/web test -- --run                # full suite
npm --workspace apps/web test -- <pattern> --run      # subset
```

The testing philosophy is documented in `CLAUDE.md` and emphasizes:

- Real database for query/authorization tests
- Coverage of tenant isolation and soft-delete exclusion
- Avoiding passthrough mock tests (which assert nothing about real behavior)

## License

[MIT](./LICENSE)
