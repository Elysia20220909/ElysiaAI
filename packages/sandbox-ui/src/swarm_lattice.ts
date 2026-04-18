export class SwarmNode {
	x: number;
	y: number;
	vx: number;
	vy: number;
	size: number;
	color: string;
	pulse = 0;

	constructor(width: number, height: number) {
		this.x = Math.random() * width;
		this.y = Math.random() * height;
		this.vx = (Math.random() - 0.5) * 1.5;
		this.vy = (Math.random() - 0.5) * 1.5;
		this.size = Math.random() * 3 + 2;
		this.color = Math.random() > 0.5 ? "#00f2ff" : "#ff00ff"; // Cyan or Magenta
	}

	update(width: number, height: number) {
		this.x += this.vx;
		this.y += this.vy;
		this.pulse += 0.05;

		if (this.x < 0 || this.x > width) this.vx *= -1;
		if (this.y < 0 || this.y > height) this.vy *= -1;
	}

	draw(ctx: CanvasRenderingContext2D) {
		const glow = Math.sin(this.pulse) * 5 + 10;
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
		ctx.fillStyle = this.color;
		ctx.shadowBlur = glow;
		ctx.shadowColor = this.color;
		ctx.fill();
		ctx.closePath();
	}
}

export class SwarmLattice {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private nodes: SwarmNode[] = [];
	private animationId: number | null = null;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d")!;
		this.resize();
		window.addEventListener("resize", () => this.resize());
	}

	private resize() {
		const parent = this.canvas.parentElement;
		if (parent) {
			this.canvas.width = parent.clientWidth;
			this.canvas.height = parent.clientHeight;
		}
	}

	init(count: number) {
		this.nodes = [];
		for (let i = 0; i < count; i++) {
			this.nodes.push(new SwarmNode(this.canvas.width, this.canvas.height));
		}
	}

	start() {
		if (this.animationId) return;
		const animate = () => {
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

			// Draw Lattice (Lines)
			this.ctx.lineWidth = 0.5;
			for (let i = 0; i < this.nodes.length; i++) {
				for (let j = i + 1; j < this.nodes.length; j++) {
					const n1 = this.nodes[i];
					const n2 = this.nodes[j];
					const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);

					if (dist < 150) {
						const opacity = 1 - dist / 150;
						this.ctx.strokeStyle = `rgba(0, 242, 255, ${opacity * 0.4})`;
						this.ctx.beginPath();
						this.ctx.moveTo(n1.x, n1.y);
						this.ctx.lineTo(n2.x, n2.y);
						this.ctx.stroke();
						this.ctx.closePath();
					}
				}
			}

			// Update and Draw Nodes
			this.nodes.forEach((node) => {
				node.update(this.canvas.width, this.canvas.height);
				node.draw(this.ctx);
			});

			this.animationId = requestAnimationFrame(animate);
		};
		animate();
	}

	stop() {
		if (this.animationId) {
			cancelAnimationFrame(this.animationId);
			this.animationId = null;
		}
	}
}
