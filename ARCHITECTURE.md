# Architecture Blueprint

## Principles

This app uses React Router as the application boundary and avoids duplicating framework responsibilities. Route modules are the controller layer: loaders read, actions write, and components render loader/action state. There is no parallel controller, custom route dispatcher, or domain-level routing abstraction.

The code is organized vertically by domain. Domain files own their validation, persistence schema, and server-side operations close together. Shared horizontal infrastructure exists only where the framework or tooling needs it, such as the database connection and root route setup.

The architecture optimizes for a small monolith with few moving parts:

- use framework primitives before adding app-specific abstractions
- keep HTTP adaptation in route modules
- keep business operations behind domain actions
- keep persistence details inside the owning domain
- add layers only when they remove real duplication or complexity

## Request Flow

Route modules adapt web concerns into domain calls.

```txt
Browser form/fetcher
-> React Router route action/loader
-> domain params parser or route params
-> domain action
-> Drizzle
-> SQLite
```

For reads:

```txt
loader
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
-> domain write action
-> Drizzle typed mutation
-> redirect/data response
```

This is intentionally RPC-like inside the server boundary: route modules call server functions directly. The public boundary remains URL and form based, while React Router abstracts most REST mechanics.

## File Responsibilities

`app/routes.ts`

Defines the React Router route manifest using filesystem routing. This is framework configuration, not an application controller.

`app/routes/*.tsx`

Route modules. These own URL shape, loaders, actions, metadata, redirects, response status, cookies, and rendering. They should stay thin and should not contain Drizzle queries.

`app/domains/<domain>/params.ts`

Pure validation and input-normalization contracts for commands entering the domain. These files use Zod to turn untrusted request input into typed params. They should not query the database, mutate state, redirect, or know about React components.

`app/domains/<domain>/<domain>.server.ts`

Server-only domain actions. These functions express application operations and are the intended communication surface for other server code. They may validate state-dependent business rules and coordinate persistence.

`app/domains/<domain>/schema.server.ts`

Server-only Drizzle table declarations for the domain. These are the source of truth for generated migrations and typed query shapes. They are named `.server.ts` because persistence shape is not a client concern.

`app/db.server.ts`

Server-only Drizzle connection. It is shared infrastructure because there should be one database connection boundary, but table ownership stays inside domains.

## Server And Client Boundaries

Files with `.server.ts` are server-only by contract. They may import Node APIs, database clients, environment variables, and persistence schemas. Client components should never import them.

Neutral `.ts` files are allowed only when they are safe to execute on either side. `params.ts` is neutral because Zod schemas and pure parsing rules can be shared with client-side validation if needed. If a params file starts depending on server-only capabilities, split it or rename it to `.server.ts`.

```

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

Zod validates external command input. Domain actions validate state-dependent rules. Drizzle validates query and mutation shape at compile time. SQLite constraints protect invariants that must survive all write paths.

Drizzle does not prove semantic domain invariants such as trimmed strings, case-insensitive uniqueness, positive positions, or ID brands. Those belong in Zod, domain logic, database constraints, or tests depending on their importance.

## Persistence And Migrations

Drizzle schema files are handwritten. Drizzle Kit reads them and generates SQL migrations.

Workflow:

```txt
edit schema.server.ts
-> pnpm exec drizzle-kit generate
-> review/edit generated SQL when needed
-> pnpm exec drizzle-kit migrate
```

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
routes -> params
routes -> domain actions
domain actions -> params types
domain actions -> db/schema
db/schema -> framework-independent libraries
```

Avoid:

- route modules importing another route module
- client components importing `.server.ts`
- domains reaching through another domain's persistence schema
- generic service/repository layers that only rename framework calls
- custom route registries that duplicate React Router

Cross-domain communication, when needed, should happen through domain actions, not direct table imports. Direct table imports couple domains at the persistence layer and make ownership unclear.

## Repository Layer Posture

A repository layer is not mandatory. Drizzle is already a typed query abstraction, so wrapping every query can become ceremony.

For this codebase, prefer calling Drizzle directly from the domain action file unless persistence complexity justifies extraction.

Introduce a repo-like file only when:

- several domain actions reuse non-trivial queries
- the domain action file becomes hard to scan
- transactions span multiple persistence operations
- persistence concerns need a clear private API inside the domain

If introduced, the repository remains private to its domain. It is not a cross-domain API.

## Testing And Verification

Baseline verification:

```bash
pnpm typecheck
pnpm build
pnpm exec drizzle-kit generate
```

`drizzle-kit generate` should report no schema changes after migrations are current.

Behavior that deserves tests as the app grows:

- command validation rules
- domain state transitions
- cross-record invariants
- migration-sensitive persistence behavior
- external data parsing

Do not test framework guarantees. Test domain behavior and contracts that can regress.
