"use client";

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ArrowDown, ArrowRight, MapPin } from "lucide-react";

type GeoFeature = {
  geometry?: { type?: string; coordinates?: unknown };
};

type GeoCollection = { features?: GeoFeature[] };
type Particle = { x: number; y: number; z: number; size: number; drift: number };
type Quality = { dpr: number; particleCount: number; ambientMotion: boolean };
type CanvasScene = {
  context: CanvasRenderingContext2D;
  particles: Particle[];
  positions: Float32Array;
  width: number;
  height: number;
};

const INTRO_STORAGE_KEY = "arbeitsmarkt-radar-intro";
const LEGACY_SESSION_KEY = "arbeitsmarkt-radar-intro-seen";
const INTRO_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const terms = ["Nachfrage", "Wettbewerb", "Gehalt", "Standort", "Qualifikation", "Beschäftigung"];
const vectorNodes = [
  { name: "Hamburg", longitude: 9.9937, latitude: 53.5511 },
  { name: "Berlin", longitude: 13.405, latitude: 52.52 },
  { name: "Hannover", longitude: 9.732, latitude: 52.3759 },
  { name: "Frankfurt", longitude: 8.6821, latitude: 50.1109 },
  { name: "München", longitude: 11.5761, latitude: 48.1371 },
] as const;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(start: number, end: number, value: number) {
  const x = clamp((value - start) / (end - start));
  return x * x * (3 - 2 * x);
}

function hasRecentIntro() {
  try {
    const stored = window.localStorage.getItem(INTRO_STORAGE_KEY);
    const shownAt = stored ? Number(JSON.parse(stored)?.shownAt) : 0;
    if (Number.isFinite(shownAt) && shownAt > 0 && Date.now() - shownAt < INTRO_COOLDOWN_MS) {
      return true;
    }

    if (window.sessionStorage.getItem(LEGACY_SESSION_KEY) === "true") {
      window.localStorage.setItem(INTRO_STORAGE_KEY, JSON.stringify({ shownAt: Date.now() }));
      window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function markIntroSeen() {
  try {
    window.localStorage.setItem(INTRO_STORAGE_KEY, JSON.stringify({ shownAt: Date.now() }));
  } catch {
    // The intro still completes normally when browser storage is unavailable.
  }
  document.documentElement.dataset.introState = "skip";
}

function project(longitude: number, latitude: number, width = 720, height = 680) {
  const mercator = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2));
  const north = mercator(55.25);
  const south = mercator(47.05);
  return [
    ((longitude - 5.5) / (15.45 - 5.5)) * width,
    ((north - mercator(latitude)) / (north - south)) * height,
  ] as const;
}

function geometryToSvgPath(geometry: GeoFeature["geometry"]) {
  if (!geometry?.coordinates) return "";
  const polygons = geometry.type === "Polygon"
    ? [geometry.coordinates as number[][][]]
    : geometry.coordinates as number[][][][];
  return polygons.flatMap((polygon) => polygon.map((ring) => ring.map(([longitude, latitude], index) => {
    const [x, y] = project(longitude, latitude);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ") + " Z")).join(" ");
}

function createParticles(count: number, seedStart: number) {
  let seed = seedStart;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  return Array.from({ length: count }, (): Particle => ({
    x: random() * 2 - 1,
    y: random() * 2 - 1,
    z: random(),
    size: .45 + random() * 1.35,
    drift: random() * Math.PI * 2,
  }));
}

function getQuality(): Quality {
  const navigatorWithHints = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  const lowPower = navigatorWithHints.connection?.saveData
    || (navigatorWithHints.deviceMemory !== undefined && navigatorWithHints.deviceMemory <= 4)
    || navigator.hardwareConcurrency <= 4;

  if (mobile || lowPower) return { dpr: 1, particleCount: 48, ambientMotion: false };
  if (navigatorWithHints.deviceMemory !== undefined && navigatorWithHints.deviceMemory <= 8) {
    return { dpr: 1.25, particleCount: 78, ambientMotion: true };
  }
  return { dpr: Math.min(window.devicePixelRatio || 1, 1.5), particleCount: 110, ambientMotion: true };
}

const CanvasSurface = memo(forwardRef<HTMLCanvasElement>(function CanvasSurface(_, ref) {
  return <canvas ref={ref} className="cinematic-data-canvas" aria-hidden="true" />;
}));

function prepareCanvas(canvas: HTMLCanvasElement, particles: Particle[], ratio: number): CanvasScene | null {
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return null;
  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return {
    context,
    particles,
    positions: new Float32Array(particles.length * 4),
    width,
    height,
  };
}

function drawScene(scene: CanvasScene, progress: number, time: number, ambientMotion: boolean) {
  const { context, width, height, particles, positions } = scene;
  context.clearRect(0, 0, width, height);
  const travel = progress * .72;
  const swayTime = ambientMotion ? time * .00018 : 0;

  for (let index = 0; index < particles.length; index += 1) {
    const particle = particles[index];
    const z = ((particle.z - travel) % 1 + 1) % 1;
    const depth = 1 / (.3 + z * 1.42);
    const sway = ambientMotion ? Math.sin(swayTime + particle.drift) * 4 : 0;
    const offset = index * 4;
    positions[offset] = width / 2 + particle.x * width * .43 * depth + sway;
    positions[offset + 1] = height / 2 + particle.y * height * .42 * depth;
    positions[offset + 2] = z;
    positions[offset + 3] = depth;
  }

  context.save();
  for (let index = 0; index < particles.length; index += 1) {
    const offset = index * 4;
    const x = positions[offset];
    const y = positions[offset + 1];
    const z = positions[offset + 2];
    const depth = positions[offset + 3];
    const alpha = .07 + (1 - z) * .44;
    if (index % 8 === 0) {
      const nextOffset = ((index + 9) % particles.length) * 4;
      const nextX = positions[nextOffset];
      const nextY = positions[nextOffset + 1];
      if (Math.hypot(x - nextX, y - nextY) < Math.min(width, height) * .18) {
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(nextX, nextY);
        context.strokeStyle = `rgba(91,181,146,${alpha * .18})`;
        context.lineWidth = .6;
        context.stroke();
      }
    }
    context.beginPath();
    context.arc(x, y, Math.min(3, particles[index].size * depth), 0, Math.PI * 2);
    context.fillStyle = `rgba(173,239,213,${alpha})`;
    context.fill();
  }
  context.restore();
}

function VectorGermany({ paths }: { paths: string[] }) {
  const nodes = vectorNodes.map((node) => {
    const [x, y] = project(node.longitude, node.latitude);
    return { ...node, point: [x.toFixed(2), y.toFixed(2)] as const };
  });
  const connections = [[0, 2], [2, 3], [3, 4], [1, 2]] as const;
  return (
    <div className="cinematic-vector-stage" aria-hidden="true">
      <svg className="cinematic-vector-map" viewBox="0 0 720 680" role="presentation" shapeRendering="geometricPrecision">
        <g className="cinematic-vector-states">
          {paths.map((path, index) => <path key={index} d={path} vectorEffect="non-scaling-stroke" />)}
        </g>
        <g className="cinematic-vector-links">
          {connections.map(([from, to]) => (
            <line
              key={`${from}-${to}`}
              x1={nodes[from].point[0]}
              y1={nodes[from].point[1]}
              x2={nodes[to].point[0]}
              y2={nodes[to].point[1]}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
        <g className="cinematic-vector-nodes">
          {nodes.map((node) => <circle key={node.name} cx={node.point[0]} cy={node.point[1]} r="4.5" vectorEffect="non-scaling-stroke" />)}
        </g>
        <g className="cinematic-vector-radar">
          <circle cx="360" cy="340" r="76" vectorEffect="non-scaling-stroke" />
          <circle cx="360" cy="340" r="132" vectorEffect="non-scaling-stroke" />
          <circle cx="360" cy="340" r="194" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
    </div>
  );
}

export function CinematicIntro() {
  const sectionRef = useRef<HTMLElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(true);
  const [vectorPaths, setVectorPaths] = useState<string[]>([]);
  const particlePool = useMemo(() => createParticles(110, 23), []);
  const completedRef = useRef(false);

  const completeIntro = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    markIntroSeen();
    setVisible(false);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      markIntroSeen();
      const hideFrame = window.requestAnimationFrame(() => setVisible(false));
      return () => window.cancelAnimationFrame(hideFrame);
    }

    if (hasRecentIntro()) {
      document.documentElement.dataset.introState = "skip";
      const hideFrame = window.requestAnimationFrame(() => setVisible(false));
      return () => window.cancelAnimationFrame(hideFrame);
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === INTRO_STORAGE_KEY && hasRecentIntro()) completeIntro();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [completeIntro]);

  useEffect(() => {
    if (!visible || hasRecentIntro()) return;
    let active = true;
    void fetch("/germany-states.geojson")
      .then((response) => response.ok ? response.json() : null)
      .then((data: GeoCollection | null) => {
        if (!active) return;
        setVectorPaths(data?.features?.map((feature) => geometryToSvgPath(feature.geometry)).filter(Boolean) ?? []);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [visible]);

  useEffect(() => {
    if (!visible || hasRecentIntro()) return;

    const section = sectionRef.current;
    const mainCanvas = mainCanvasRef.current;
    if (!section || !mainCanvas) return;

    const quality = getQuality();
    const particles = particlePool.slice(0, quality.particleCount);
    let mainScene = prepareCanvas(mainCanvas, particles, quality.dpr);
    let frame = 0;
    let resizeTimer = 0;
    let targetProgress = 0;
    let currentProgress = 0;
    let sectionTop = 0;
    let scrollTravel = 1;
    let inViewport = true;
    let pageVisible = !document.hidden;
    let previousTime = performance.now();

    const measure = () => {
      sectionTop = section.getBoundingClientRect().top + window.scrollY;
      scrollTravel = Math.max(1, section.offsetHeight - window.innerHeight);
      if (mainScene) mainScene = prepareCanvas(mainCanvas, particles, quality.dpr);
    };

    const updateTarget = () => {
      targetProgress = clamp((window.scrollY - sectionTop) / scrollTravel);
      if (!frame && inViewport && pageVisible) {
        previousTime = performance.now();
        frame = window.requestAnimationFrame(render);
      }
    };

    const applyTimeline = (progress: number) => {
      const heroOut = smoothstep(.09, .27, progress);
      const termsIn = smoothstep(.18, .3, progress);
      const termsOut = smoothstep(.45, .58, progress);
      const vectorIn = smoothstep(.32, .56, progress);
      const vectorClarity = smoothstep(.42, .67, progress);
      const portalDrive = smoothstep(.59, .91, progress);
      const vectorOut = smoothstep(.96, 1, progress);
      const statementIn = smoothstep(.61, .71, progress);
      const statementOut = smoothstep(.84, .94, progress);
      const light = smoothstep(.86, 1, progress);

      section.style.setProperty("--hero-opacity", String(1 - heroOut));
      section.style.setProperty("--hero-shift", `${heroOut * -26}px`);
      section.style.setProperty("--field-scale", String(1 + smoothstep(.12, .72, progress) * .12));
      section.style.setProperty("--field-opacity", String(1 - smoothstep(.93, 1, progress)));
      section.style.setProperty("--terms-opacity", String(termsIn * (1 - termsOut)));
      section.style.setProperty("--travel", String(smoothstep(.15, .55, progress)));
      section.style.setProperty("--vector-opacity", String(vectorIn * (1 - vectorOut)));
      section.style.setProperty("--vector-scale", String(.78 + vectorClarity * .22 + portalDrive * .48));
      section.style.setProperty("--vector-y", `${(1 - vectorIn) * 52 - portalDrive * 5}px`);
      section.style.setProperty("--vector-line-opacity", String(.16 + vectorClarity * .72));
      section.style.setProperty("--radar-opacity", String(vectorIn * (1 - vectorOut) * .75));
      section.style.setProperty("--statement-opacity", String(statementIn * (1 - statementOut)));
      section.style.setProperty("--scene-light", String(light));
      section.style.setProperty("--scroll-opacity", String(1 - smoothstep(.04, .16, progress)));
      section.style.setProperty("--progress", String(progress));
      section.style.pointerEvents = progress > .96 ? "none" : "";

      if (progress > .995) completeIntro();
    };

    function render(time: number) {
      frame = 0;
      if (!inViewport || !pageVisible) return;
      const delta = Math.min(64, time - previousTime);
      previousTime = time;
      const damping = 1 - Math.exp(-delta / 110);
      currentProgress += (targetProgress - currentProgress) * damping;
      if (Math.abs(targetProgress - currentProgress) < .00015) currentProgress = targetProgress;

      applyTimeline(currentProgress);
      if (mainScene) drawScene(mainScene, currentProgress, time, quality.ambientMotion);

      const needsDamping = Math.abs(targetProgress - currentProgress) > .00015;
      const needsAmbient = quality.ambientMotion && currentProgress < .78;
      if (needsDamping || needsAmbient) frame = window.requestAnimationFrame(render);
    }

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        measure();
        updateTarget();
      }, 180);
    };

    const onVisibilityChange = () => {
      pageVisible = !document.hidden;
      if (!pageVisible && frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      } else updateTarget();
    };

    const observer = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting;
      if (!inViewport && frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      } else if (inViewport) updateTarget();
    }, { rootMargin: "160px" });
    observer.observe(section);

    window.addEventListener("scroll", updateTarget, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    measure();
    targetProgress = clamp((window.scrollY - sectionTop) / scrollTravel);
    currentProgress = targetProgress;
    applyTimeline(currentProgress);
    frame = window.requestAnimationFrame(render);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("scroll", updateTarget);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      observer.disconnect();
    };
  }, [completeIntro, particlePool, visible]);

  const skipIntro = () => {
    completeIntro();
  };

  if (!visible) return null;

  return (
    <section ref={sectionRef} className="cinematic-intro" aria-label="Cinematische Einführung in den Arbeitsmarkt Radar">
      <div className="cinematic-sticky">
        <div className="cinematic-scene" aria-hidden="true">
          <div className="cinematic-depth-light cinematic-depth-light--one" />
          <div className="cinematic-depth-light cinematic-depth-light--two" />
          <div className="cinematic-grid" />
          <CanvasSurface ref={mainCanvasRef} />
        </div>

        <button type="button" className="cinematic-skip" onClick={skipIntro}>Intro überspringen <ArrowRight /></button>

        <div className="cinematic-hero">
          <p><MapPin /> Arbeitsmarkt Radar</p>
          <h1>Wo liegen deine<br />besten Chancen?</h1>
        </div>

        <div className="cinematic-terms" aria-hidden="true">
          {terms.map((term, index) => (
            <span key={term} style={{ "--term-index": index, "--term-depth": .45 + (index % 3) * .24 } as CSSProperties}>{term}</span>
          ))}
        </div>

        <VectorGermany paths={vectorPaths} />

        <p className="cinematic-statement">Aus Arbeitsmarktdaten<br />werden Chancen.</p>

        <div className="cinematic-scroll-cue">
          <span>Scrollen, um den Arbeitsmarkt zu entdecken</span>
          <ArrowDown />
        </div>

        <div className="cinematic-progress" aria-hidden="true"><i /></div>
      </div>
    </section>
  );
}
