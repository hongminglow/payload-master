This project pairs [Next.js](https://nextjs.org) with [Payload CMS](https://payloadcms.com) so you can experience how a modern UI, custom APIs, hooks, and admin components can live alongside a polished React dashboard.

## About Payload

Payload is a developer-friendly headless CMS that offers a first‑class Node/TypeScript API, an extensible admin UI, built‑in GraphQL, and a Local API that lets server components call your collections without going through HTTP. It ships with:

- **Rich content tools** (Lexical rich text, code editor, JSON fields, point fields, relationships, etc.)
- **Hook and endpoint systems** for integrating custom side effects, logging, automation, and REST endpoints
- **Type-safe configurations** (`CollectionSlug`, etc.) that keep your schemas precise when strict mode is on
- **Custom component overrides** via import maps so you can swap out or extend buttons, views, fields, etc.

Payload is purpose-built for teams that need a powerful backend with a modern React/Next frontend experience.

## What This Project Showcases

- **Payload config & fields (`payload.config.ts`)**: authors, categories, posts, and a `field-showcase` collection covering text, number, select, date, array, JSON, point, relationship, and rich text fields.
- **Hooks**: `beforeChange`/`afterChange` hooks log author/post lifecycle events to demonstrate customization points.
- **Custom REST endpoints**: `/api/posts/stats`, `/api/posts/publish-all`, and `/api/health` highlight how Payload extends its APIs with bespoke routes and logging.
- **Custom admin component**: The ready-to-use `CustomSaveButton` example shows how you could override admin controls via the generated import map.
- **Admin import map (`app/(payload)/admin/importMap.js`)**: keeps Payload aware of custom components like `CustomSaveButton` alongside rich text feature bundles.
- **Frontend dashboard (`app/(frontend)/page.tsx`)**: contrasts Payload's Local API (via `getPayload`), GraphQL endpoint (`/api/graphql`), and custom REST endpoints inside a dashboard layout with stats, feature callouts, and quick links.

## Frontend & Admin Structure

- `app/(frontend)` contains the public Next dashboard that fetches data from Payload's Local API, GraphQL, and custom routes.
- `app/(payload)` holds the hosted admin UI with custom styles (`custom.scss`), the generated `importMap.js`, and the `CustomSaveButton` component.
- Routes for Payload's REST, GraphQL, and playground endpoints live under `app/(payload)/api`.

## Getting Started

Install dependencies and start the dev server:

```bash
pnpm install
pnpm run dev
```

Visit [http://localhost:3001](http://localhost:3001) (Next prefers 3001 when 3000 is busy) for the dashboard, and [http://localhost:3001/admin](http://localhost:3001/admin) for Payload's admin panel.

All frontend sections, API links, and feature demonstrations refresh automatically in dev mode.
