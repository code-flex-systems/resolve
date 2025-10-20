# Azure Migration Plan

## Goals & Context
- Deploy the existing Next.js (apps/web) application and PostgreSQL database onto Azure using low-cost resources while the product is in test phase.
- Prioritize Azure Container Apps for future horizontal scale, while documenting Azure App Service as an alternate path for comparison.
- Keep costs at or near the free tier until traffic increases.

## Service Selection Notes
- **Azure Container Apps (preferred)**: Runs Docker containers on a serverless consumption plan with per-second billing. The free grant (per subscription, per billing month) covers 180,000 vCPU-seconds, 360,000 GiB-seconds, 2 million HTTP requests, and one environment with 500 total GiB of persistent storage. If usage stays inside the grant, you effectively remain on the “free” tier indefinitely.
- **Azure App Service**: Free F1 tier provides 60 CPU minutes/day on shared infrastructure, 1 GB storage, no custom domains, no TLS configuration changes, and limited scaling. You can stay on F1 as long as your usage stays within limits, but it is less flexible for containerized workloads and lacks background job support.
- **Implication**: Container Apps offers a smoother path to paid scale-up later and better fits containerized builds; stick with it unless you require App Service-specific features such as built-in deployment slots without containers.

## Migration Checklist
1. **Containerization**
   - Add a production-ready `Dockerfile` (root) that runs `npm ci && npm run build` then `npm run start:azure`.
   - Emit a `standalone` Next.js build via `apps/web/next.config.ts` and ensure environment variables map through the container.
2. **Configuration & Secrets**
   - Create `apps/web/.env.azure.example` documenting required keys (BASE_URL, AUTH_SECRET, DB_CONNECTION_STRING/DB_SSL, email provider keys, storage toggles).
   - Build an optional Key Vault loader (`src/lib/azure/keyVault.ts`) invoked during server start when `AZURE_KEY_VAULT_URI` is set.
3. **Database Connectivity**
   - Update `dbPool.ts`/`kysely.ts` to accept Azure PostgreSQL connection strings and optional SSL flags (`DB_SSL=true`).
   - Script schema migrations or seed data to run via Kysely/SQL files during deployment (e.g., `npm run db:migrate`).
4. **Email & External Services**
   - Extend `sendEmail.ts` with an Azure Communication Services branch (`EMAIL_PROVIDER=azure`) so switching providers is configuration-only.
   - Centralize third-party credentials in configuration helpers ready for Key Vault or Container App secrets.
5. **Static Assets & Templates**
   - Ensure HTML email templates are bundled inside the Docker image (move to `apps/web/public/email` or import them into the build).
6. **Telemetry & Logging**
   - Introduce Application Insights instrumentation wrapper (`src/lib/telemetry/appInsights.ts`) and hook it into TRPC handlers, auth, and critical flows.
   - Confirm logs surface through `az containerapp logs show` for troubleshooting.
7. **Deployment Workflow**
   - Author an Azure deployment script or GitHub Action that builds the container, pushes to Azure Container Registry, and updates the Container App revision.
   - Document manual fallback steps in `AGENTS.md` (new “Azure Deployment” section) for operators.
8. **Validation & Monitoring**
   - Create smoke-test scripts (Vitest or Playwright) targeting the Container App endpoint to verify DB, auth, and email flows.
   - Schedule regular reviews of Azure Monitor metrics to ensure free-tier limits are not exceeded.

## Free-Tier Duration Guidance
- Both Azure Container Apps and Azure App Service allow you to remain on their free allocations indefinitely, provided usage stays within the defined limits. There is no automatic expiry, but exceeding quotas triggers throttling or billing.
- For minimal developer and beta-user traffic, Container Apps’ monthly grant is typically sufficient, especially if you scale to zero when idle. Monitor consumption via the Azure portal; once you consistently exceed the grant, plan to transition to a paid plan or scale-up profile.
