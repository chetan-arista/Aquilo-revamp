"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/gsap";

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `
precision mediump float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform vec3 uColor; uniform float uAlpha;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes.y;
  vec2 m = uMouse * vec2(uRes.x / uRes.y, 1.0);
  float d = length(uv - m);
  // Height field: slow drifting water + a soft swell around the cursor.
  float h = fbm(uv * 1.6 + vec2(uTime * 0.025, -uTime * 0.018)) + 0.12 * exp(-d * 5.0) * sin(d * 30.0 - uTime * 2.0);
  float bands = h * 14.0;
  float line = abs(fract(bands) - 0.5) / fwidth(bands);
  float a = (1.0 - clamp(line, 0.0, 1.0)) * uAlpha;
  gl_FragColor = vec4(uColor, a);
}`;

/** Water "topography": contour lines of a drifting height field that swell around the cursor. */
export default function WaterContours({ color = "#c8a97e", alpha = 0.22, className }: { color?: string; alpha?: number; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvas.current!;
    const gl = c.getContext("webgl", { premultipliedAlpha: false, alpha: true, antialias: true });
    if (!gl || !gl.getExtension("OES_standard_derivatives")) return;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, type === gl.FRAGMENT_SHADER ? "#extension GL_OES_standard_derivatives : enable\n" + src : src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    // Single draw over a cleared buffer: no blending, so the canvas alpha is exactly the line alpha.
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255);
    gl.uniform3f(u("uColor"), rgb[0], rgb[1], rgb[2]);
    gl.uniform1f(u("uAlpha"), alpha);

    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      c.width = c.clientWidth * dpr;
      c.height = c.clientHeight * dpr;
      gl.viewport(0, 0, c.width, c.height);
      gl.uniform2f(u("uRes"), c.width, c.height);
    };
    const onMove = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      mouse.tx = (e.clientX - r.left) / r.width;
      mouse.ty = 1 - (e.clientY - r.top) / r.height;
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove);

    let raf = 0, visible = false, t = 0, last = performance.now();
    const still = prefersReducedMotion();
    const frame = (now: number) => {
      t += still ? 0 : (now - last) / 1000;
      last = now;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      gl.uniform1f(u("uTime"), t);
      gl.uniform2f(u("uMouse"), mouse.x, mouse.y);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (visible && !still) raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) { last = performance.now(); raf = requestAnimationFrame(frame); }
    });
    io.observe(c);
    return () => { io.disconnect(); cancelAnimationFrame(raf); window.removeEventListener("resize", resize); window.removeEventListener("pointermove", onMove); };
  }, [color, alpha]);

  return <canvas ref={canvas} aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`} />;
}
