# Cloudflare Workers Builds

## Summary

ElysiaAI's full Bun/FastAPI/Ollama/Prisma stack is local-first and should not be
deployed directly to a standard Cloudflare Worker. The checked-in Wrangler
configuration publishes a safe edge surface only:

- public static files from `public/`
- `/health` and `/api/health` edge status responses
- explicit `503` responses for private local API routes

This keeps the public surface useful while preserving the local privacy boundary.

## Why the Root Build Failed

Cloudflare Workers Builds ran:

```powershell
npx wrangler deploy
```

from the repository root. Without a `wrangler.jsonc`, Wrangler tried automatic
application detection against the root workspace and failed before deployment.

The full server bundle is also not Worker-compatible:

- it imports Bun-only modules such as `bun:sqlite`
- it uses Node/Bun filesystem and process APIs
- it starts an Elysia listener instead of exporting a Worker `fetch` handler
- it depends on local services such as FastAPI, Ollama, Prisma, Redis, and files

## Cloudflare Settings

Use these settings for the edge/static deployment:

- Root directory: repository root
- Build command: `npm run build` or blank if only static assets are needed
- Deploy command: `npx wrangler deploy`
- Worker name: match `name` in `wrangler.jsonc` (`elysia-ai` by default)

If the Cloudflare dashboard Worker has a different name, update
`wrangler.jsonc` to match it before retrying the build.

## Full App Deployment

For the real ElysiaAI core, use the existing local or Docker deployment path:

```powershell
bun scripts/manage.ts setup
bun scripts/manage.ts setup-python
bun scripts/manage.ts dev
```

For production, prefer a VM, Docker host, or private server with Cloudflare as a
reverse proxy or Tunnel in front of it.
