# Architecture Blueprint

## Principles

This app uses React Router as the application boundary and Cloudflare Workers as the only runtime. Route modules are the controller layer: loaders read, actions write, and components render loader/action state. There is no parallel controller, custom route dispatcher, Node server, or non-D1 database fallback.

The code is organized vertically by domain. Domain files own their validation, persistence schema, and server-side operations close together. Shared horizontal infrastructure exists only where the framework or tooling needs it, such as the D1-backed Drizzle factory and root route setup.

The architecture optimizes for a small monolith with few moving parts:

- use framework primitives before adding app-specific abstractions
- keep HTTP adaptation in route modules
- keep business operations behind domain actions
- keep persistence details inside the owning domain
- pass runtime dependencies explicitly from route context
- add layers only when they remove real duplication or complexity

## Request Flow

Route modules adapt web concerns into domain calls.

```txt
Browser form/fetcher
-> React Router route action/loader
-> Cloudflare context DB binding
-> Drizzle D1 database
-> domain params parser or route params
-> domain action
-> domain persistence query
-> D1
```

For reads:

```txt
loader
-> dbFromContext(context)
-> domain read action
-> Drizzle typed query
-> typed loaderData
-> route component
```

For writes:

```txt
action
-> FormData
-> Zod parser
-> dbFromContext(context)
-> domain write action
-> Drizzle typed mutation
-> redirect/data response
```

This is intentionally RPC-like inside the server boundary: route modules call server functions directly. The public boundary remains URL and form based, while React Router abstracts most REST mechanics.

## Runtime

`workers/app.ts` is the Cloudflare Vite development Worker entrypoint. It uses React Router's virtual server build, creates the request handler, and passes the Worker runtime into route context:

```txt
{ cloudflare: { env, ctx } }
```

`app/context.server.ts` reads `context.cloudflare.env.DB` and creates the Drizzle D1 database for the current request. Server code should not import a global database singleton.

`workers/deploy.ts` is the Wrangler deployment entrypoint. It imports `build/server/index.js`, so deployment runs `pnpm build` before `wrangler deploy workers/deploy.ts`.

`wrangler.json` owns Cloudflare deployment configuration:

- Worker name: `decide-together`
- Worker entrypoint: `./workers/app.ts`
- D1 binding: `DB`
- D1 database name: `decide-together`
- D1 migrations directory: `drizzle`

## File Responsibilities

`app/routes.ts`

Defines the React Router route manifest using filesystem routing. This is framework configuration, not an application controller.

`app/routes/*.tsx`

Route modules. These own URL shape, loaders, actions, metadata, redirects, response status, cookies, and rendering. They should stay thin and should not contain Drizzle queries.

`app/context.server.ts`

Server-only request context helpers. This is where route code translates React Router context into runtime dependencies such as the Drizzle D1 database.

`app/db.server.ts`

Server-only Drizzle D1 factory and database type. It does not read environment variables and does not open local files.

`app/domains/<domain>/params.ts`

Pure validation and input-normalization contracts for commands entering the domain. These files use Zod to turn untrusted request input into typed params. They should not query the database, mutate state, redirect, or know about React components.

`app/domains/<domain>/<domain>.server.ts`

Server-only domain actions. These functions express application operations and are the intended communication surface for other server code. They accept the database dependency explicitly, may validate state-dependent business rules, and coordinate persistence.

`app/domains/<domain>/schema.server.ts`

Server-only Drizzle table declarations for the domain. These are the source of truth for generated migrations and typed query shapes. They are named `.server.ts` because persistence shape is not a client concern.

## Server And Client Boundaries

Files with `.server.ts` are server-only by contract. They may import database clients, Worker runtime types, and persistence schemas. Client components should never import them.

Neutral `.ts` files are allowed only when they are safe to execute on either side. `params.ts` is neutral because Zod schemas and pure parsing rules can be shared with client-side validation if needed. If a params file starts depending on server-only capabilities, split it or rename it to `.server.ts`.

## Type Safety Model

The app is type-safe inside the trusted server corridor, not across raw HTTP.

Trusted corridor:

```txt
successful Zod parse
-> typed params
-> typed domain action
-> typed Drizzle insert/query
-> typed loaderData
-> typed component props
```

Runtime boundaries still exist:

- form field names are strings
- `FormData` is untyped
- route params are strings
- cookies are strings
- live database state can drift if migrations are bypassed
- Worker bindings exist only at runtime

Zod validates external command input. Domain actions validate state-dependent rules. Drizzle validates query and mutation shape at compile time. D1 constraints protect invariants that must survive all write paths.

Drizzle does not prove semantic domain invariants such as trimmed strings, case-insensitive uniqueness, positive positions, or ID brands. Those belong in Zod, domain logic, database constraints, or tests depending on their importance.

## Persistence And Migrations

Drizzle schema files are handwritten. Drizzle Kit reads them and generates SQL migrations.

Workflow:

```txt
edit schema.server.ts
-> pnpm db:generate
-> review/edit generated SQL when needed
-> pnpm db:migrate
-> pnpm db:migrate:remote
```

Wrangler applies SQL migrations to D1. Do not use `drizzle-kit migrate` for this app.

Generated migration SQL is not sacred. Structural migrations can stay generated. Complex data migrations should be written or edited directly in the migration file.

The live database is not the source of truth. Schema changes should move through Drizzle schema files and migrations, not ad hoc database edits.

## Validation Strategy

Validation is layered by responsibility.

Zod params:

- validate untrusted command input
- normalize strings and form data
- produce typed params for domain actions

Domain actions:

- validate state-dependent business rules
- coordinate generated data and persistence
- ensure operations make sense against current stored state

Database constraints:

- enforce invariants that must hold regardless of caller
- protect foreign keys, uniqueness, and persistence-level integrity

External data entering the domain should receive the same treatment as form input: parse it through a dedicated Zod schema before domain code trusts it.

## Layering Rules

Allowed dependencies:

```txt
routes -> context.server
routes -> params
routes -> domain actions
domain actions -> params types
domain actions -> db type
domain actions -> domain persistence
domain persistence -> db type
domain persistence -> schema
schema -> framework-independent libraries
```

Avoid:

- route modules importing another route module
- client components importing `.server.ts`
- domains reaching through another domain's persistence schema
- generic service/repository layers that only rename framework calls
- custom route registries that duplicate React Router
- global database singletons

Cross-domain communication, when needed, should happen through domain actions, not direct table imports. Direct table imports couple domains at the persistence layer and make ownership unclear.

## Repository Layer Posture

A repository layer is not mandatory. Drizzle is already a typed query abstraction, so wrapping every query can become ceremony.

For this codebase, a small private repository exists because several room operations reuse persistence queries. It stays private to the rooms domain and receives the request database explicitly.

Introduce more repo-like code only when:

- several domain actions reuse non-trivial queries
- the domain action file becomes hard to scan
- transactions span multiple persistence operations
- persistence concerns need a clear private API inside the domain

If introduced, the repository remains private to its domain. It is not a cross-domain API.

## Testing And Verification

Baseline verification:

```bash
pnpm typegen
pnpm test
pnpm typecheck
pnpm build
pnpm exec wrangler deploy --dry-run
```

`pnpm db:generate` should report no schema changes after migrations are current.

Behavior that deserves tests as the app grows:

- command validation rules
- domain state transitions
- cross-record invariants
- migration-sensitive persistence behavior
- external data parsing

Do not test framework guarantees. Test domain behavior and contracts that can regress.
