# Decide Together

Small React Router app for creating a shared voting room and letting a group pick from a short list of options.

## Stack

- React Router 7 with server-side rendering
- Cloudflare Workers runtime
- Cloudflare D1 bound as `DB`
- Drizzle schema and generated SQL migrations
- Tailwind CSS
- Vitest

## Development

Install dependencies:

```bash
pnpm install
```

Generate Worker and React Router types:

```bash
pnpm typegen
```

Start the development server:

```bash
pnpm dev
```

The app uses the Cloudflare Vite plugin in development so local behavior stays close to the deployed Worker.

## Database

The only supported database is Cloudflare D1. The Worker expects a D1 binding named `DB`, configured in `wrangler.json` with database name `decide-together`.

Drizzle schema files remain the source of truth:

```bash
pnpm db:generate
```

Apply existing migrations to the local D1 database:

```bash
pnpm db:migrate
```

Apply migrations to the remote D1 database:

```bash
pnpm db:migrate:remote
```

If the D1 database has not been created yet:

```bash
pnpm exec wrangler d1 create decide-together
```

Copy the returned database id into `wrangler.json`.

## Verification

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm exec wrangler deploy --dry-run
```

## Deployment

Deploy to Cloudflare Workers:

```bash
pnpm deploy
```
