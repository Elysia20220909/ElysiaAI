(() => {
	"use strict";

	const MAX_SURFACES = 28;
	const canvas = document.getElementById("liquidGlassWebgl");
	if (!canvas) return;

	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	const gl = canvas.getContext("webgl", {
		alpha: false,
		antialias: false,
		depth: false,
		powerPreference: "high-performance",
		premultipliedAlpha: false,
		stencil: false,
	});

	if (!gl) {
		canvas.remove();
		return;
	}

	const vertexSource = `
attribute vec2 aPosition;

void main() {
	gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

	const fragmentSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

const int MAX_SURFACES = ${MAX_SURFACES};

uniform float uDpr;
uniform float uTime;
uniform int uSurfaceCount;
uniform vec2 uPointer;
uniform vec2 uViewport;
uniform vec4 uRects[MAX_SURFACES];
uniform float uRadii[MAX_SURFACES];
uniform float uDepths[MAX_SURFACES];

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(
		mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
		mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
		u.y
	);
}

float fbm(vec2 p) {
	float value = 0.0;
	float amplitude = 0.5;
	for (int i = 0; i < 5; i++) {
		value += amplitude * noise(p);
		p = mat2(1.62, 1.18, -1.18, 1.62) * p + vec2(13.1, 7.7);
		amplitude *= 0.52;
	}
	return value;
}

float roundedRect(vec2 p, vec2 halfSize, float radius) {
	vec2 q = abs(p) - halfSize + radius;
	return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

vec3 spectralMist(vec2 uv) {
	vec2 p = uv * 2.0 - 1.0;
	p.x *= max(uViewport.x / max(uViewport.y, 1.0), 0.2);

	float t = uTime * 0.055;
	float fieldA = fbm(p * 1.15 + vec2(t, -t * 0.7));
	float fieldB = fbm(p * 2.1 + vec2(-t * 1.4, t * 0.9));
	float ribbon = sin((p.x * 1.7 - p.y * 1.15 + fieldA * 1.8 + uTime * 0.08) * 3.14159);
	float caustic = pow(1.0 - abs(ribbon), 7.0);
	float hairline = pow(1.0 - abs(sin((p.x + p.y * 0.72 + fieldB) * 22.0)), 18.0);

	vec3 ink = vec3(0.018, 0.021, 0.045);
	vec3 deep = vec3(0.015, 0.052, 0.064);
	vec3 rose = vec3(0.54, 0.04, 0.25);
	vec3 cyan = vec3(0.02, 0.72, 0.86);
	vec3 gold = vec3(0.78, 0.56, 0.22);
	vec3 violet = vec3(0.28, 0.12, 0.58);

	vec3 color = mix(ink, deep, smoothstep(-0.35, 0.9, p.y + fieldA * 0.9));
	color += cyan * caustic * 0.38;
	color += rose * smoothstep(0.45, 0.92, fieldB) * 0.28;
	color += gold * hairline * 0.08;
	color += violet * smoothstep(0.2, 0.86, fieldA * fieldB) * 0.22;
	color *= 0.82 + 0.18 * smoothstep(1.4, 0.05, dot(p, p));
	return color;
}

vec3 sampleScene(vec2 uv) {
	uv = clamp(uv, vec2(0.0), vec2(1.0));
	vec3 color = spectralMist(uv);
	vec2 gridUv = uv * vec2(42.0, 26.0);
	vec2 gridLine = abs(fract(gridUv - 0.5) - 0.5);
	float grid = 1.0 - smoothstep(0.012, 0.018, min(gridLine.x, gridLine.y));
	color += vec3(0.04, 0.21, 0.24) * grid * 0.065;
	return color;
}

void main() {
	vec2 cssPx = gl_FragCoord.xy / max(uDpr, 0.001);
	vec2 uv = cssPx / max(uViewport, vec2(1.0));
	vec2 domPx = vec2(cssPx.x, uViewport.y - cssPx.y);

	vec2 refraction = vec2(0.0);
	vec2 pointerDelta = domPx - uPointer;
	float pointerWave = sin(length(pointerDelta) * 0.055 - uTime * 5.4);
	float pointerRipple = smoothstep(460.0, 0.0, length(pointerDelta)) * pointerWave;
	float glassMask = 0.0;
	float edgeMask = 0.0;
	float innerGlow = 0.0;
	vec3 spectralEdge = vec3(0.0);

	for (int i = 0; i < MAX_SURFACES; i++) {
		if (i >= uSurfaceCount) break;

		vec4 rect = uRects[i];
		float radius = uRadii[i];
		float depth = uDepths[i];
		vec2 p = domPx - rect.xy;
		float d = roundedRect(p, rect.zw, radius);
		float inside = 1.0 - smoothstep(0.0, 1.4, d);
		float edge = 1.0 - smoothstep(0.0, 22.0, abs(d));
		float shelf = 1.0 - smoothstep(-44.0, 0.0, d);

		float dx = roundedRect(p + vec2(1.25, 0.0), rect.zw, radius) -
			roundedRect(p - vec2(1.25, 0.0), rect.zw, radius);
		float dy = roundedRect(p + vec2(0.0, 1.25), rect.zw, radius) -
			roundedRect(p - vec2(0.0, 1.25), rect.zw, radius);
		vec2 normal = normalize(vec2(dx, dy) + vec2(0.0001));

		float membrane = 0.55 + 0.45 * sin((p.x * 0.011 - p.y * 0.008) + uTime * 0.65);
		float thickness = inside * (0.007 + edge * 0.027 + shelf * 0.008) * depth;
		refraction += vec2(normal.x, -normal.y) * thickness * (0.72 + membrane * 0.42);
		refraction += vec2(normal.y, normal.x) * pointerRipple * inside * 0.0035 * depth;

		float spec = pow(max(dot(normal, normalize(vec2(-0.45, -0.9))), 0.0), 2.3);
		vec3 edgeColor = mix(vec3(0.9, 0.2, 0.52), vec3(0.24, 0.95, 1.0), membrane);
		spectralEdge += edgeColor * edge * (0.34 + spec * 0.9) * depth;
		innerGlow += inside * shelf * depth;
		edgeMask = max(edgeMask, edge * depth);
		glassMask = max(glassMask, inside);
	}

	vec3 base = sampleScene(uv);
	vec3 refracted;
	refracted.r = sampleScene(uv + refraction * 1.18).r;
	refracted.g = sampleScene(uv + refraction * 0.96).g;
	refracted.b = sampleScene(uv + refraction * 0.78).b;

	vec3 color = mix(base, refracted, clamp(glassMask, 0.0, 1.0));
	color += spectralEdge * 0.72;
	color += vec3(0.92, 0.98, 1.0) * edgeMask * 0.12;
	color += vec3(0.16, 0.36, 0.42) * clamp(innerGlow, 0.0, 1.0) * 0.16;
	color += vec3(0.02, 0.16, 0.18) * pointerRipple * max(glassMask, 0.0) * 0.07;
	color = pow(color, vec3(0.92));

	gl_FragColor = vec4(color, 1.0);
}
`;

	function createShader(type, source) {
		const shader = gl.createShader(type);
		if (!shader) throw new Error("Unable to create shader.");
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			const log = gl.getShaderInfoLog(shader) || "Unknown shader error.";
			gl.deleteShader(shader);
			throw new Error(log);
		}
		return shader;
	}

	function createProgram() {
		const vertexShader = createShader(gl.VERTEX_SHADER, vertexSource);
		const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSource);
		const program = gl.createProgram();
		if (!program) throw new Error("Unable to create WebGL program.");
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);
		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmentShader);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			const log = gl.getProgramInfoLog(program) || "Unknown program link error.";
			gl.deleteProgram(program);
			throw new Error(log);
		}
		return program;
	}

	let program;
	try {
		program = createProgram();
	} catch (error) {
		console.warn("Liquid Glass WebGL disabled:", error);
		canvas.remove();
		return;
	}

	const positions = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positions);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 3, -1, -1, 3]),
		gl.STATIC_DRAW,
	);

	const locations = {
		aPosition: gl.getAttribLocation(program, "aPosition"),
		uDpr: gl.getUniformLocation(program, "uDpr"),
		uTime: gl.getUniformLocation(program, "uTime"),
		uSurfaceCount: gl.getUniformLocation(program, "uSurfaceCount"),
		uPointer: gl.getUniformLocation(program, "uPointer"),
		uViewport: gl.getUniformLocation(program, "uViewport"),
		uRects: gl.getUniformLocation(program, "uRects[0]"),
		uRadii: gl.getUniformLocation(program, "uRadii[0]"),
		uDepths: gl.getUniformLocation(program, "uDepths[0]"),
	};

	const rectData = new Float32Array(MAX_SURFACES * 4);
	const radiusData = new Float32Array(MAX_SURFACES);
	const depthData = new Float32Array(MAX_SURFACES);
	const targetPointer = { x: window.innerWidth * 0.64, y: window.innerHeight * 0.36 };
	const pointer = { x: targetPointer.x, y: targetPointer.y };
	let dpr = 1;
	let frameId = 0;
	let start = performance.now();

	function resize() {
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		const width = Math.max(1, Math.floor(window.innerWidth * dpr));
		const height = Math.max(1, Math.floor(window.innerHeight * dpr));
		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
			gl.viewport(0, 0, width, height);
		}
	}

	function readRadius(style) {
		const radius = Number.parseFloat(style.borderTopLeftRadius);
		return Number.isFinite(radius) ? radius : 20;
	}

	function collectSurfaces() {
		const elements = document.querySelectorAll("[data-liquid-glass]");
		let count = 0;
		for (const element of elements) {
			if (count >= MAX_SURFACES) break;

			const rect = element.getBoundingClientRect();
			if (
				rect.width < 10 ||
				rect.height < 10 ||
				rect.bottom < -80 ||
				rect.top > window.innerHeight + 80 ||
				rect.right < -80 ||
				rect.left > window.innerWidth + 80
			) {
				continue;
			}

			const style = window.getComputedStyle(element);
			const depth = Number.parseFloat(element.dataset.liquidDepth || "1");
			const i = count * 4;
			rectData[i] = rect.left + rect.width / 2;
			rectData[i + 1] = rect.top + rect.height / 2;
			rectData[i + 2] = rect.width / 2;
			rectData[i + 3] = rect.height / 2;
			radiusData[count] = readRadius(style);
			depthData[count] = Number.isFinite(depth) ? depth : 1;
			count += 1;
		}
		return count;
	}

	function updatePointer(event) {
		targetPointer.x = event.clientX;
		targetPointer.y = event.clientY;
	}

	function updateTouchPointer(event) {
		const touch = event.touches && event.touches[0];
		if (!touch) return;
		targetPointer.x = touch.clientX;
		targetPointer.y = touch.clientY;
	}

	function render(now) {
		resize();
		if (document.hidden) {
			frameId = requestAnimationFrame(render);
			return;
		}

		const motionScale = reducedMotion.matches ? 0.08 : 1;
		const time = ((now - start) / 1000) * motionScale;
		pointer.x += (targetPointer.x - pointer.x) * 0.1;
		pointer.y += (targetPointer.y - pointer.y) * 0.1;
		const surfaceCount = collectSurfaces();

		gl.useProgram(program);
		gl.bindBuffer(gl.ARRAY_BUFFER, positions);
		gl.enableVertexAttribArray(locations.aPosition);
		gl.vertexAttribPointer(locations.aPosition, 2, gl.FLOAT, false, 0, 0);
		gl.uniform1f(locations.uDpr, dpr);
		gl.uniform1f(locations.uTime, time);
		gl.uniform1i(locations.uSurfaceCount, surfaceCount);
		gl.uniform2f(locations.uPointer, pointer.x, pointer.y);
		gl.uniform2f(locations.uViewport, window.innerWidth, window.innerHeight);
		gl.uniform4fv(locations.uRects, rectData);
		gl.uniform1fv(locations.uRadii, radiusData);
		gl.uniform1fv(locations.uDepths, depthData);
		gl.drawArrays(gl.TRIANGLES, 0, 3);

		if (!document.body.classList.contains("webgl-liquid-ready")) {
			document.body.classList.add("webgl-liquid-ready");
		}

		frameId = requestAnimationFrame(render);
	}

	window.addEventListener("resize", resize, { passive: true });
	window.addEventListener("pointermove", updatePointer, { passive: true });
	window.addEventListener("touchmove", updateTouchPointer, { passive: true });
	window.addEventListener(
		"pointerleave",
		() => {
			targetPointer.x = window.innerWidth * 0.64;
			targetPointer.y = window.innerHeight * 0.36;
		},
		{ passive: true },
	);

	window.addEventListener("pageshow", () => {
		start = performance.now();
		if (!frameId) frameId = requestAnimationFrame(render);
	});

	window.addEventListener("pagehide", () => {
		cancelAnimationFrame(frameId);
		frameId = 0;
	});

	resize();
	frameId = requestAnimationFrame(render);
})();
