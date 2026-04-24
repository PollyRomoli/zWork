import { useEffect, useRef } from "react";

import "./Dither.css";

type RGB = [number, number, number];

interface DitherProps {
  waveSpeed?: number;
  waveFrequency?: number;
  waveAmplitude?: number;
  waveColor?: RGB;
  baseColor?: RGB;
  colorNum?: number;
  pixelSize?: number;
  disableAnimation?: boolean;
  enableMouseInteraction?: boolean;
  mouseRadius?: number;
}

const BAYER_4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
].map((v) => (v / 16) - 0.5);

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function mixColor(base: RGB, wave: RGB, t: number) {
  return [
    Math.round((base[0] + (wave[0] - base[0]) * t) * 255),
    Math.round((base[1] + (wave[1] - base[1]) * t) * 255),
    Math.round((base[2] + (wave[2] - base[2]) * t) * 255),
  ];
}

export default function Dither({
  waveSpeed = 0.05,
  waveFrequency = 3,
  waveAmplitude = 0.3,
  waveColor = [0.5, 0.5, 0.5],
  baseColor = [0, 0, 0],
  colorNum = 4,
  pixelSize = 2,
  disableAnimation = false,
}: DitherProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return;

    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let reduceMotion = !!media?.matches;
    let frame = 0;
    let lastPaint = 0;
    let width = 0;
    let height = 0;
    const startedAt = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = reduceMotion ? 0.08 : 0.14;
      width = Math.max(96, Math.floor(rect.width * scale));
      height = Math.max(64, Math.floor(rect.height * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const onMotionChange = () => {
      reduceMotion = !!media?.matches;
      resize();
    };
    media?.addEventListener?.("change", onMotionChange);

    const paint = (now: number) => {
      const fps = reduceMotion || disableAnimation ? 1 : 18;
      if (now - lastPaint < 1000 / fps) {
        frame = requestAnimationFrame(paint);
        return;
      }
      lastPaint = now;

      const image = ctx.createImageData(width, height);
      const data = image.data;
      const elapsed = disableAnimation || reduceMotion
        ? 0
        : ((now - startedAt) / 1000) * waveSpeed;
      const levels = Math.max(2, Math.round(colorNum));
      const step = 1 / (levels - 1);
      const px = Math.max(1, Math.round(pixelSize));

      for (let y = 0; y < height; y++) {
        const ny = (y / height) - 0.5;
        for (let x = 0; x < width; x++) {
          const nx = ((x / width) - 0.5) * (width / height);
          const waveA = Math.sin((nx * waveFrequency + elapsed) * Math.PI * 2);
          const waveB = Math.cos(((ny - nx * 0.42) * (waveFrequency * 0.72) - elapsed * 0.7) * Math.PI * 2);
          const waveC = Math.sin(((nx + ny) * (waveFrequency * 0.38) + elapsed * 1.3) * Math.PI * 2);
          const value = clamp01(0.5 + (waveA * 0.26 + waveB * 0.18 + waveC * 0.1) * (1 + waveAmplitude));
          const threshold = BAYER_4[((Math.floor(y / px) & 3) * 4) + (Math.floor(x / px) & 3)] * step;
          const tone = Math.round(clamp01(value + threshold - 0.08) / step) * step;
          const [r, g, b] = mixColor(baseColor, waveColor, tone);
          const i = (y * width + x) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = 255;
        }
      }

      ctx.putImageData(image, 0, 0);
      frame = requestAnimationFrame(paint);
    };

    frame = requestAnimationFrame(paint);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      media?.removeEventListener?.("change", onMotionChange);
    };
  }, [baseColor, colorNum, disableAnimation, pixelSize, waveAmplitude, waveColor, waveFrequency, waveSpeed]);

  return <canvas ref={canvasRef} className="dither-container" aria-hidden="true" />;
}
