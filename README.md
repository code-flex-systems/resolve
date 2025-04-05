# Postgres

Install Postgres.

App can work with any schema supplied via `DB_SCHEMA` env var. This will allow you to create and populate the schema, run some tests, and discard it.

```
install tsx
```

To generate Postgres schema and/or mock data, under `api/sql` run:

```
tsx generate
```

This will generate `seed_schema.sql` and/or `seed_data.sql` files, respectively, under `api/sql`. Copy/paste contents of these files into Postgres and execute.

# Kysely

Connection is configured via env vars:

```
DB_DATABASE=myapp
DB_HOST=localhost
DB_PASSWORD=password
DB_PORT=5432
DB_USER=myuser
```

If not using `public` schema, also add:

```
DB_SCHEMA=
```

To regenerate kysely types run:

```
npx kysely-codegen
```

The above requires `DATABASE_URL` env var:

```
DATABASE_URL=postgres://myuser:password@localhost/app
```

Copy contents from `node_modules/kysely-codegen/dist/db.d.ts` to `api/data_layer/schema.ts`

# Testing API

Run the server.

Under `api/tests` run:

```
tsx test
```