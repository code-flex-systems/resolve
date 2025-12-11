# Project Context for Claude

## Production Status

**IMPORTANT: This application is NOT live in production yet.**

Current state:
- Development and testing phase
- One test user building out a checklist template
- All data in deployed environment is test/development data
- No production users or production claims data
- Safe to perform breaking schema changes without complex migration strategies

This means:
- Direct cutover migrations are acceptable (no dual-write complexity needed)
- Data loss during migrations is low-risk (only test data)
- Can iterate on database schema more freely
- No need for extensive backwards compatibility or rollback plans

## Project Overview

Manifest is a claims management system designed to help claims adjusters work through property insurance claims efficiently. The system combines:

1. **Checklist-driven workflows**: AI-powered checklists guide adjusters through claim requirements
2. **Document management**: Upload, review, and track claim-related documents
3. **Task & deadline tracking**: Manage work items and time-sensitive requirements
4. **Recovery tracking**: Track subrogation and recovery events
5. **Party & coverage management**: Manage claimants, insureds, and coverage details

## Tech Stack

### Backend
- **Database**: PostgreSQL with Kysely ORM for type-safe queries
- **API**: TRPC for end-to-end type safety
- **Authentication**: NextAuth with Azure AD B2C
- **Server**: Next.js API routes
- **AI Integration**: OpenAI for checklist generation and guidance

### Frontend
- **Framework**: Next.js 13+ with App Router
- **UI Library**: Material-UI (MUI)
- **State Management**: React Query (via TRPC hooks)
- **Form Handling**: React Hook Form
- **Styling**: MUI theming + custom CSS

### DevOps
- **Deployment**: Azure Container Apps
- **Database**: Azure Database for PostgreSQL
- **Storage**: Azure Blob Storage for documents
- **CI/CD**: GitHub Actions

## Architecture Patterns

### Database Layer
- **Kysely ORM**: Type-safe query builder, generates TypeScript types from schema
- **Migration pattern**: SQL files in `src/api/sql/`, run via Kysely migration CLI
- **Multi-tenant**: All tables include `client_id` for tenant isolation
- **Soft deletes**: Some entities use `deleted_at` timestamps instead of hard deletes

### API Layer
- **TRPC routers**: Located in `src/server/trpc/routers/`
- **Controllers**: Business logic in `src/api/controllers/`
- **Queries**: Data access in `src/api/queries/`
- **Protected procedures**: All routes require authentication + authorization
- **Role-based access**: Admin vs. regular user permissions

### Frontend Patterns
- **Component structure**: Feature-based organization in `src/components/`
  - `admin/`: Admin-only configuration UIs
  - `common/`: Shared components (headers, navigation, etc.)
  - `pages/`: Page-level components
  - Other feature folders: `breakdown/`, `metrics/`, `summary/`, etc.
- **Data fetching**: TRPC hooks (`trpc.*.useQuery`, `trpc.*.useMutation`)
- **Form validation**: Zod schemas shared between frontend and backend
- **Error handling**: Toast notifications for user feedback

## Key Domain Concepts

### Claims
- Central entity in the system
- Has coverage details, parties, tasks, deadlines, documents
- Follows a workflow driven by checklists

### Checklists
- Templates created by admins
- Questions, pages, and answers that guide the claim process
- Instances created per-claim (`checklist_claim`)
- AI can generate checklists based on requirements

### Tasks
- Work items assigned to users
- Can be claimed/unclaimed by adjusters
- Have due dates and completion states
- Generate from checklist answers or manual creation

### Deadlines
- Time-sensitive requirements with specific due dates
- Can have actions that trigger task creation
- Track compliance with regulatory/contractual timelines

### Recovery Events
- Subrogation and recovery tracking
- Link to specific claims
- Track amounts and statuses

### Parties
- Claimants, insureds, attorneys, contractors, etc.
- Can be linked to multiple claims
- Office locations and representatives

## Common Development Workflows

### Adding a New Table
1. Write SQL migration in `src/api/sql/`
2. Run migration: `npm run db:migrate`
3. Generate types: `npx kysely-codegen`
4. Add queries in `src/api/queries/`
5. Add controller logic in `src/api/controllers/`
6. Create TRPC router in `src/server/trpc/routers/`
7. Build UI components

### Database Migrations
- Create with: `npm run db:migration:create <name>`
- Files go in `src/api/sql/migrations/`
- Run with: `npm run db:migrate`
- Always regenerate types after migration

**IMPORTANT: Never create migrations to revert uncommitted migrations.** If you need to change a migration you created in the current commit:
1. Modify the existing migration file directly
2. Run raw SQL to adjust the current database state to match
3. Regenerate types

Creating "fix" or "revert" migrations for uncommitted changes causes bloat in the migrations directory and deployment issues. Only create new migrations for changes after the previous ones have been committed and deployed.

### Type Generation
- Database types: `npx kysely-codegen` (outputs to `src/api/database/types.d.ts`)
- TRPC types: Auto-generated at build time
- Shared Zod schemas for validation

### Testing
- Backend: `npm run test` (integration tests with real database)
- Type checking: `npm run typecheck`
- Current test coverage focuses on query logic and authorization

## Authorization Patterns

### Roles
- `user`: Regular claims adjuster (can work on assigned claims)
- `admin`: Can configure checklists, parties, users
- `super_admin`: Full system access

### Row-Level Security
- All queries filter by `client_id` from session
- Users can only access data for their client/tenant
- Additional role checks for admin-only operations

### Common Checks
```typescript
requireRole(ctx, [ROLES.ADMIN, ROLES.SUPER_ADMIN]); // Admin-only
requireClaimAccess(ctx, claimId); // User must have access to claim
```

## Important Files & Directories

### Configuration
- `src/config.ts`: Application constants, roles, environment variables
- `src/api/database/db.ts`: Database connection setup
- `.env.local`: Local environment variables (not in git)

### Database
- `src/api/sql/`: SQL migration files
- `src/api/database/types.d.ts`: Generated TypeScript types
- `src/api/queries/`: Data access layer
- `src/api/controllers/`: Business logic layer

### API
- `src/server/trpc/`: TRPC configuration and routers
- `src/server/trpc/context.ts`: Request context creation
- `src/server/trpc/routers/`: All API endpoints

### Frontend
- `src/app/`: Next.js app directory (routing)
- `src/components/`: React components
- `src/utils/`: Frontend utilities and helpers

## Known Limitations & TODOs

### Current Gaps
- User workflow actions not fully logged (see logging restructure plan)
- Limited real-time collaboration features
- No comprehensive audit trail UI for regular users
- Performance optimization needed for claim queries

### Planned Improvements
- Logging system restructure (see `project_files/logging-system-restructure.md`)
- Enhanced task management with better filtering/sorting
- Improved document preview and annotation
- Better mobile responsiveness

## Development Commands

```bash
# Database
npm run db:migrate                    # Run migrations
npm run db:migration:create <name>    # Create new migration
npx kysely-codegen                    # Generate TypeScript types

# Testing
npm run test                          # Run all tests
npm run test -- <pattern>             # Run specific tests
npm run typecheck                     # Type checking

# Development
npm run dev                           # Start dev server
npm run build                         # Production build

# Database connection (local)
psql postgres://postgres:password@localhost/manifest
```

## Testing Philosophy

- Integration tests with real database (not mocking)
- Focus on query logic and authorization
- Test both success and failure paths
- Validate multi-tenant isolation
- Use test fixtures for common scenarios

### Writing Integration Tests - Systematic Approach

**Before writing any tests**, analyze the source file systematically:

1. **Map every function** - List all exported functions that need tests
2. **Analyze each WHERE clause** - Every `client_id` filter needs a tenant isolation test
3. **Analyze soft-delete filters** - Every `deleted_at is null` check needs an exclusion test
4. **Identify all parameters** - Each optional parameter needs coverage for when it's used vs omitted
5. **Identify conditional logic** - Each `if`/ternary/spread conditional needs both branches tested
6. **Map error paths** - Every `throw` or error condition needs a test
7. **Check joins** - Joined tables with their own soft-delete columns need separate exclusion tests

**Required test categories for query functions:**
- Basic functionality (happy path)
- Tenant isolation (different client_id returns nothing / throws error)
- Soft-delete exclusion (deleted records not returned) - for EACH table in joins
- Non-existent record handling (returns undefined or throws as appropriate)
- All optional parameters exercised
- Error conditions (invalid input, constraint violations)

**Do this analysis BEFORE writing tests, not as a review after.** This prevents gaps that require additional passes.

## Notes for AI Assistants

When working on this codebase:

1. **Always check the production status** - We're NOT live, so breaking changes are acceptable
2. **Use existing patterns** - Follow the established controller → query → TRPC → component flow
3. **Multi-tenant awareness** - Always filter by `client_id` from session
4. **Type safety** - Leverage Kysely's type system, regenerate types after schema changes
5. **Authorization** - Add proper role checks for admin operations
6. **Transactions** - Use database transactions for multi-step operations
7. **Test data only** - Feel free to suggest direct migrations without complex rollback logic
8. **Migration simplicity** - No need for dual-write or zero-downtime strategies yet
