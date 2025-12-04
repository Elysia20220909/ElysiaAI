Bun.serve({
	port: 3000,
	fetch(req) {
		return new Response("Hello");
	},
});
console.log("Bun.serve on 3000");
