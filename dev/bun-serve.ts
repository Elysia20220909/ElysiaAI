Bun.serve({
	port: 3000,
	fetch(_req) {
		return new Response("Hello");
	},
});
console.log("Bun.serve on 3000");
