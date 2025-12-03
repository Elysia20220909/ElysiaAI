const server = Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response("Hello from Bun native server!");
  },
});

console.log(`Bun native server listening on ${server.port}`);
