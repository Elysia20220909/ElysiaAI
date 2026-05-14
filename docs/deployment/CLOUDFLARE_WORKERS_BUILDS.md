# Cloudflare Workers Builds

## Summary

ElysiaAI's full Bun/FastAPI/Ollama/Prisma stack is local-first and should not be
deployed directly to a standard Cloudflare Worker. The checked-in Wrangler
configuration publishes a safe edge surface only:

- public static files from `public/`
- `/health` and `/api/health` edge status responses
- explicit `403` responses for private local API routes

This keeps the public surface useful while preserving the local privacy boundary.
The local-only route responses are deliberately non-5xx so expected edge
rejections do not look like Worker outages in Cloudflare observability.

## Why the Root Build Failed

Cloudflare Workers Builds ran:

```powershell
npx wrangler deploy
```

from the repository root. When Wrangler cannot find or is not pointed at the
checked-in `wrangler.jsonc`, it tries automatic application detection against
the root workspace and fails before deployment.

The full server bundle is also not Worker-compatible:

- it imports Bun-only modules such as `bun:sqlite`
- it uses Node/Bun filesystem and process APIs
- it starts an Elysia listener instead of exporting a Worker `fetch` handler
- it depends on local services such as FastAPI, Ollama, Prisma, Redis, and files

## Cloudflare Settings

Use these settings for the edge/static deployment:

- Root directory: repository root
- Build command: `npm run build:cloudflare` or blank if only static assets are needed
- Deploy command: `npm run deploy:cloudflare`
- Worker name: match `name` in `wrangler.jsonc` (`elysia-ai` by default)

If the Cloudflare dashboard Worker has a different name, update
`wrangler.jsonc` to match it before retrying the build.

The Cloudflare scripts pass `--config wrangler.jsonc` explicitly so Wrangler
does not fall back to root workspace auto-detection.

## Full App Deployment

For the real ElysiaAI core, use the existing local or Docker deployment path:

```powershell
bun scripts/manage.ts setup
bun scripts/manage.ts setup-python
bun scripts/manage.ts dev
```

For production, prefer a VM, Docker host, or private server with Cloudflare as a
reverse proxy or Tunnel in front of it.
