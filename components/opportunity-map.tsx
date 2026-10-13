"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, Minus, Plus } from "lucide-react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { ScoredRegion } from "@/lib/scoring";

type GeoFeature = {
  type: "Feature";
  id?: string | number;
  properties: Record<string, string | number>;
  geometry: { type: string; coordinates: unknown };
};

type GeoCollection = { type: "FeatureCollection"; features: GeoFeature[] };

type HoverCard = {
  kind: "state" | "region";
  x: number;
  y: number;
  title: string;
  score?: number;
  regionCount?: number;
  jobs?: number;
  trend?: number;
};

const GERMANY_BOUNDS: [[number, number], [number, number]] = [[5.5, 47.05], [15.45, 55.25]];

const stateLabels = [
  ["Schleswig-Holstein", 9.7, 54.25], ["Hamburg", 10.35, 53.62], ["Niedersachsen", 9.15, 52.75],
  ["Bremen", 8.45, 53.18], ["Nordrhein-Westfalen", 7.3, 51.45], ["Hessen", 9.05, 50.65],
  ["Rheinland-Pfalz", 7.3, 50.05], ["Baden-Württemberg", 8.8, 48.45], ["Bayern", 11.75, 48.85],
  ["Saarland", 6.65, 49.35], ["Berlin", 13.1, 52.72], ["Brandenburg", 13.65, 52.2],
  ["Mecklenburg-Vorpommern", 12.4, 53.75], ["Sachsen", 13.35, 50.85],
  ["Sachsen-Anhalt", 11.7, 51.9], ["Thüringen", 11.05, 50.85],
] as const;

const stateCodes: Record<string, string> = {
  "Schleswig-Holstein": "01", Hamburg: "02", Niedersachsen: "03", Bremen: "04",
  "Nordrhein-Westfalen": "05", Hessen: "06", "Rheinland-Pfalz": "07",
  "Baden-Württemberg": "08", Bayern: "09", Saarland: "10", Berlin: "11",
  Brandenburg: "12", "Mecklenburg-Vorpommern": "13", Sachsen: "14",
  "Sachsen-Anhalt": "15", Thüringen: "16",
};

function regionsGeoJson(regions: ScoredRegion[], selectedId: string): GeoCollection {
  return {
    type: "FeatureCollection",
    features: regions.map((region) => ({
      type: "Feature",
      id: region.id,
      properties: {
        id: region.id,
        name: region.name,
        state: region.state,
        score: region.score,
        scoreIcon: `region-score-${region.score}`,
        jobs: region.matchedJobs,
        trend: Math.round(region.trend / 5),
        selected: region.id === selectedId ? 1 : 0,
      },
      geometry: { type: "Point", coordinates: [region.longitude, region.latitude] },
    })),
  };
}

function stateLabelsGeoJson(): GeoCollection {
  return {
    type: "FeatureCollection",
    features: stateLabels.map(([name, longitude, latitude]) => ({
      type: "Feature",
      properties: { name, icon: `state-label-${stateCodes[name]}` },
      geometry: { type: "Point", coordinates: [longitude, latitude] },
    })),
  };
}

function addTextImage(map: MapLibreMap, id: string, text: string, options: {
  fontSize: number;
  fontWeight: number;
  color: string;
  stroke?: string;
  paddingX: number;
  height: number;
}) {
  if (map.hasImage(id)) return;
  const pixelRatio = 2;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return;
  context.font = `${options.fontWeight} ${options.fontSize * pixelRatio}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
  const width = Math.ceil(context.measureText(text).width + options.paddingX * 2 * pixelRatio);
  canvas.width = Math.max(width, 2);
  canvas.height = options.height * pixelRatio;
  const drawing = canvas.getContext("2d");
  if (!drawing) return;
  drawing.font = `${options.fontWeight} ${options.fontSize * pixelRatio}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
  drawing.textAlign = "center";
  drawing.textBaseline = "middle";
  if (options.stroke) {
    drawing.strokeStyle = options.stroke;
    drawing.lineWidth = 3 * pixelRatio;
    drawing.lineJoin = "round";
    drawing.strokeText(text, canvas.width / 2, canvas.height / 2);
  }
  drawing.fillStyle = options.color;
  drawing.fillText(text, canvas.width / 2, canvas.height / 2);
  map.addImage(id, drawing.getImageData(0, 0, canvas.width, canvas.height), { pixelRatio });
}

function ensureStateLabelImages(map: MapLibreMap) {
  stateLabels.forEach(([name]) => addTextImage(map, `state-label-${stateCodes[name]}`, name, {
    fontSize: name.length > 18 ? 8 : 9,
    fontWeight: 680,
    color: "rgba(28,57,46,.76)",
    stroke: "rgba(255,255,255,.92)",
    paddingX: 5,
    height: 18,
  }));
}

function ensureRegionScoreImages(map: MapLibreMap, regions: ScoredRegion[]) {
  regions.forEach((region) => addTextImage(map, `region-score-${region.score}`, String(region.score), {
    fontSize: 11,
    fontWeight: 780,
    color: "#ffffff",
    paddingX: 3,
    height: 18,
  }));
}

function withScores(base: GeoCollection, regions: ScoredRegion[]): GeoCollection {
  const nationalAverage = Math.round(regions.reduce((sum, region) => sum + region.score, 0) / regions.length);
  return {
    ...base,
    features: base.features.map((feature) => {
      const name = String(feature.properties.name);
      const stateRegions = regions.filter((region) => region.state === name);
      const average = stateRegions.length
        ? Math.round(stateRegions.reduce((sum, region) => sum + region.score, 0) / stateRegions.length)
        : nationalAverage - 9;
      return {
        ...feature,
        id: String(feature.properties.code),
        properties: { ...feature.properties, avgScore: average, regionCount: stateRegions.length },
      };
    }),
  };
}

function geometryBounds(coordinates: unknown): [[number, number], [number, number]] {
  const values: Array<[number, number]> = [];
  const collect = (value: unknown) => {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === "number" && typeof value[1] === "number") values.push([value[0], value[1]]);
    else value.forEach(collect);
  };
  collect(coordinates);
  const xs = values.map(([x]) => x);
  const ys = values.map(([, y]) => y);
  return [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]];
}

function mapPoint(longitude: number, latitude: number): [number, number] {
  const mercatorY = (value: number) => Math.log(Math.tan(Math.PI / 4 + (value * Math.PI / 180) / 2));
  const north = mercatorY(55.25);
  const south = mercatorY(47.05);
  return [
    ((longitude - 5.5) / (15.45 - 5.5)) * 720,
    ((north - mercatorY(latitude)) / (north - south)) * 680,
  ];
}

function geometryPath(geometry: GeoFeature["geometry"]): string {
  const rings = geometry.type === "Polygon"
    ? geometry.coordinates as number[][][]
    : (geometry.coordinates as number[][][][]).flat();
  return rings.map((ring) => ring.map(([longitude, latitude], index) => {
    const [x, y] = mapPoint(longitude, latitude);
    return `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ") + " Z").join(" ");
}

function stateColor(score: number): string {
  if (score >= 88) return "#185e4b";
  if (score >= 82) return "#4f9279";
  if (score >= 75) return "#a7c5b8";
  return "#e5ece9";
}
function FallbackMap({ data, regions, selectedId, onSelect, onHover }: {
  data: GeoCollection;
  regions: ScoredRegion[];
  selectedId: string;
  onSelect: (id: string) => void;
  onHover: (card: HoverCard | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const scored = useMemo(() => withScores(data, regions), [data, regions]);
  const selected = regions.find((region) => region.id === selectedId);

  const tooltipPosition = (event: React.MouseEvent<SVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    return rect
      ? { x: Math.max(0, Math.min(event.clientX - rect.left, rect.width - 206)), y: event.clientY - rect.top }
      : { x: 280, y: 240 };
  };

  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const focusState = (feature: GeoFeature) => {
    const bounds = geometryBounds(feature.geometry.coordinates);
    const [x, y] = mapPoint((bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2);
    const nextZoom = 1.55;
    setZoom(nextZoom);
    setPan({ x: 360 - x * nextZoom - (1 - nextZoom) * 360, y: 340 - y * nextZoom - (1 - nextZoom) * 340 });
  };

  return (
    <div className="fallback-map" aria-label="Interaktive geografische Ersatzdarstellung Deutschlands">
      <svg
        ref={svgRef}
        viewBox="0 0 720 680"
        role="img"
        aria-label="Deutschlandkarte mit 16 Bundesländern und Arbeitsmarktregionen"
        onWheel={(event) => {
          event.preventDefault();
          setZoom((value) => Math.min(2.6, Math.max(0.9, value + (event.deltaY < 0 ? 0.16 : -0.16))));
        }}
        onPointerDown={(event) => { draggingRef.current = true; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={(event) => {
          if (!draggingRef.current) return;
          const width = svgRef.current?.getBoundingClientRect().width || 720;
          const scale = 720 / width;
          setPan((value) => ({ x: value.x + event.movementX * scale, y: value.y + event.movementY * scale }));
        }}
        onPointerUp={(event) => { draggingRef.current = false; event.currentTarget.releasePointerCapture(event.pointerId); }}
      >
        <g transform={`translate(${pan.x} ${pan.y}) translate(360 340) scale(${zoom}) translate(-360 -340)`}>
          {scored.features.map((feature) => {
            const name = String(feature.properties.name);
            const isSelected = selected?.state === name;
            return (
              <path
                key={name}
                d={geometryPath(feature.geometry)}
                className={`fallback-state${isSelected ? " is-selected" : ""}`}
                fill={stateColor(Number(feature.properties.avgScore))}
                tabIndex={0}
                role="button"
                aria-label={`${name}: durchschnittlich ${feature.properties.avgScore} Punkte, ${feature.properties.regionCount} Demoregionen`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => focusState(feature)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") focusState(feature); }}
                onMouseMove={(event) => onHover({ kind: "state", ...tooltipPosition(event), title: name, score: Number(feature.properties.avgScore), regionCount: Number(feature.properties.regionCount) })}
                onMouseLeave={() => onHover(null)}
              />
            );
          })}
          {stateLabels.map(([name, longitude, latitude]) => {
            const [x, y] = mapPoint(longitude, latitude);
            return <text key={name} x={x} y={y} className="fallback-state-label">{name}</text>;
          })}
          {regions.map((region) => {
            const [x, y] = mapPoint(region.longitude, region.latitude);
            const radius = Math.min(25, 17 + region.matchedJobs / 70);
            return (
              <g
                key={region.id}
                className={`fallback-region${region.id === selectedId ? " is-selected" : ""}`}
                transform={`translate(${x} ${y})`}
                role="button"
                tabIndex={0}
                aria-label={`${region.name}: ${region.score} Punkte, ${region.matchedJobs} passende Stellen`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onSelect(region.id)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(region.id); }}
                onMouseMove={(event) => onHover({ kind: "region", ...tooltipPosition(event), title: region.name, score: region.score, jobs: region.matchedJobs, trend: Math.round(region.trend / 5) })}
                onMouseLeave={() => onHover(null)}
              >
                {region.id === selectedId && <circle className="fallback-region-halo" r={radius + 10} />}
                <circle r={radius} fill={region.score >= 88 ? "#075441" : region.score >= 82 ? "#24785f" : "#7cae9b"} />
                <text>{region.score}</text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="map-controls" aria-label="Kartensteuerung">
        <button type="button" aria-label="Hineinzoomen" onClick={() => setZoom((value) => Math.min(2.6, value + 0.25))}><Plus /></button>
        <button type="button" aria-label="Herauszoomen" onClick={() => setZoom((value) => Math.max(0.9, value - 0.25))}><Minus /></button>
        <button type="button" aria-label="Deutschland vollständig anzeigen" onClick={reset}><LocateFixed /></button>
      </div>
    </div>
  );
}

export function OpportunityMap({ regions, selectedId, onSelect, deferUntilVisible = false }: {
  regions: ScoredRegion[];
  selectedId: string;
  onSelect: (id: string) => void;
  deferUntilVisible?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const geoJsonRef = useRef<GeoCollection | null>(null);
  const hoveredStateRef = useRef<string | number | null>(null);
  const selectedStateRef = useRef<string | null>(null);
  const selectRef = useRef(onSelect);
  const [canInitialize, setCanInitialize] = useState(!deferUntilVisible);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [fallbackData, setFallbackData] = useState<GeoCollection | null>(null);
  const [hoverCard, setHoverCard] = useState<HoverCard | null>(null);

  useEffect(() => { selectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    if (!deferUntilVisible || canInitialize || !containerRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setCanInitialize(true);
      observer.disconnect();
    }, { rootMargin: "900px 0px" });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [canInitialize, deferUntilVisible]);

  const resetView = useCallback(() => {
    mapRef.current?.fitBounds(GERMANY_BOUNDS, { padding: 34, duration: 750, maxZoom: 5.65 });
  }, []);

  useEffect(() => {
    if (!canInitialize || !containerRef.current || mapRef.current) return;
    let disposed = false;
    let map: MapLibreMap | null = null;
    let haloAnimationFrame: number | null = null;

    void (async () => {
      try {
        const [maplibre, response] = await Promise.all([
          import("maplibre-gl"),
          fetch("/germany-states.geojson"),
        ]);
        if (!response.ok) throw new Error("Kartendaten konnten nicht geladen werden");
        const base = await response.json() as GeoCollection;
        if (disposed || !containerRef.current) return;
        geoJsonRef.current = base;
        setFallbackData(base);
        map = new maplibre.Map({
          container: containerRef.current,
          style: { version: 8, sources: {}, layers: [{ id: "canvas", type: "background", paint: { "background-color": "rgba(245,249,247,0.2)" } }] },
          center: [10.45, 51.15],
          zoom: 4.85,
          minZoom: 4.2,
          maxZoom: 9,
          pitchWithRotate: false,
          dragRotate: false,
          attributionControl: false,
          canvasContextAttributes: { antialias: true },
        });
        mapRef.current = map;
        map.touchZoomRotate.disableRotation();

        map.on("load", () => {
          if (!map || disposed) return;
          map.addSource("states", { type: "geojson", data: withScores(base, regions) as never, promoteId: "code" });
          map.addLayer({
            id: "states-fill", type: "fill", source: "states",
            paint: {
              "fill-color": ["interpolate", ["linear"], ["get", "avgScore"], 65, "#eef2f0", 75, "#d4e1dc", 82, "#79aa98", 88, "#185e4b", 94, "#073e31"],
              "fill-opacity": ["case", ["boolean", ["feature-state", "selected"], false], 0.98, ["boolean", ["feature-state", "hover"], false], 0.92, 0.78],
            },
          });
          map.addLayer({ id: "states-glow", type: "line", source: "states", paint: { "line-color": "rgba(65,139,111,.2)", "line-width": 5, "line-blur": 5 } });
          map.addLayer({ id: "states-outline", type: "line", source: "states", paint: { "line-color": "rgba(255,255,255,.9)", "line-width": ["interpolate", ["linear"], ["zoom"], 4, 1.1, 8, 2.2] } });

          ensureStateLabelImages(map);
          map.addSource("state-labels", { type: "geojson", data: stateLabelsGeoJson() as never });
          map.addLayer({
            id: "state-labels", type: "symbol", source: "state-labels",
            layout: {
              "icon-image": ["get", "icon"],
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
            },
          });

          ensureRegionScoreImages(map, regions);
          map.addSource("regions", { type: "geojson", data: regionsGeoJson(regions, selectedId) as never, promoteId: "id" });
          map.addLayer({
            id: "regions-halo", type: "circle", source: "regions",
            filter: ["==", ["get", "selected"], 1],
            paint: {
              "circle-radius": ["+", ["interpolate", ["linear"], ["get", "jobs"], 80, 17, 400, 26], 10],
              "circle-color": "rgba(67,177,136,.18)",
              "circle-stroke-color": "rgba(52,153,116,.3)",
              "circle-stroke-width": 2,
              "circle-blur": 0.18,
            },
          });
          map.addLayer({
            id: "regions-circles", type: "circle", source: "regions",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["get", "jobs"], 80, 17, 400, 26],
              "circle-color": ["interpolate", ["linear"], ["get", "score"], 70, "#7cae9b", 82, "#24785f", 88, "#075441"],
              "circle-stroke-color": "rgba(255,255,255,.96)",
              "circle-stroke-width": ["case", ["==", ["get", "selected"], 1], 4, 3],
              "circle-opacity": 0.98,
            },
          });
          map.addLayer({
            id: "regions-scores", type: "symbol", source: "regions",
            layout: {
              "icon-image": ["get", "scoreIcon"],
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
            },
          });
          map.addLayer({
            id: "regions-hit", type: "circle", source: "regions",
            paint: {
              "circle-radius": ["+", ["interpolate", ["linear"], ["get", "jobs"], 80, 17, 400, 26], 8],
              "circle-color": "#000000",
              "circle-opacity": 0.01,
            },
          });

          map.on("mousemove", "states-fill", (event) => {
            if (!map) return;
            map.getCanvas().style.cursor = "pointer";
            const feature = event.features?.[0];
            if (!feature) return;
            if (hoveredStateRef.current !== null) map.setFeatureState({ source: "states", id: hoveredStateRef.current }, { hover: false });
            hoveredStateRef.current = feature.id ?? null;
            if (feature.id !== undefined) map.setFeatureState({ source: "states", id: feature.id }, { hover: true });
            setHoverCard({
              kind: "state", x: Math.max(0, Math.min(event.point.x, map.getCanvas().clientWidth - 206)), y: event.point.y,
              title: String(feature.properties?.name ?? "Bundesland"),
              score: Number(feature.properties?.avgScore ?? 0),
              regionCount: Number(feature.properties?.regionCount ?? 0),
            });
          });
          map.on("mouseleave", "states-fill", () => {
            if (!map) return;
            map.getCanvas().style.cursor = "";
            if (hoveredStateRef.current !== null) map.setFeatureState({ source: "states", id: hoveredStateRef.current }, { hover: false });
            hoveredStateRef.current = null;
            setHoverCard(null);
          });
          map.on("click", "states-fill", (event) => {
            if (map?.queryRenderedFeatures(event.point, { layers: ["regions-hit"] }).length) return;
            const feature = event.features?.[0];
            if (feature?.geometry && map) map.fitBounds(geometryBounds(feature.geometry.coordinates), { padding: 70, duration: 700, maxZoom: 6.8 });
          });

          map.on("mousemove", "regions-hit", (event) => {
            if (!map) return;
            map.getCanvas().style.cursor = "pointer";
            const feature = event.features?.[0];
            if (!feature) return;
            setHoverCard({
              kind: "region",
              x: Math.max(0, Math.min(event.point.x, map.getCanvas().clientWidth - 206)),
              y: event.point.y,
              title: String(feature.properties?.name ?? "Arbeitsmarktregion"),
              score: Number(feature.properties?.score ?? 0),
              jobs: Number(feature.properties?.jobs ?? 0),
              trend: Number(feature.properties?.trend ?? 0),
            });
          });
          map.on("mouseleave", "regions-hit", () => {
            if (!map) return;
            map.getCanvas().style.cursor = "";
            setHoverCard(null);
          });
          map.on("click", "regions-hit", (event) => {
            const feature = event.features?.[0];
            if (!feature || feature.geometry.type !== "Point" || !map) return;
            selectRef.current(String(feature.properties?.id));
            const coordinates = feature.geometry.coordinates as [number, number];
            map.easeTo({ center: coordinates, zoom: Math.max(map.getZoom(), 6.15), duration: 650 });
          });

          const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          if (!reduceMotion) {
            let previousFrame = 0;
            const animateHalo = (time: number) => {
              if (!map || disposed) return;
              if (time - previousFrame > 45) {
                const pulse = 9 + Math.sin(time / 460) * 2.25;
                map.setPaintProperty("regions-halo", "circle-radius", ["+", ["interpolate", ["linear"], ["get", "jobs"], 80, 17, 400, 26], pulse]);
                map.setPaintProperty("regions-halo", "circle-opacity", 0.72 + Math.sin(time / 460) * 0.16);
                previousFrame = time;
              }
              haloAnimationFrame = window.requestAnimationFrame(animateHalo);
            };
            haloAnimationFrame = window.requestAnimationFrame(animateHalo);
          }
          resetView();
          setReady(true);
        });
      } catch {
        if (!disposed) setError(true);
      }
    })();

    return () => {
      disposed = true;
      if (haloAnimationFrame !== null) window.cancelAnimationFrame(haloAnimationFrame);
      map?.remove();
      mapRef.current = null;
    };
  // Map instance is intentionally created only once; score updates use the source effect below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canInitialize]);

  useEffect(() => {
    if (!ready || !mapRef.current || !geoJsonRef.current) return;
    const map = mapRef.current;
    const stateSource = map.getSource("states") as GeoJSONSource | undefined;
    const regionSource = map.getSource("regions") as GeoJSONSource | undefined;
    ensureRegionScoreImages(map, regions);
    stateSource?.setData(withScores(geoJsonRef.current, regions) as never);
    regionSource?.setData(regionsGeoJson(regions, selectedId) as never);
  }, [ready, regions, selectedId]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const selected = regions.find((region) => region.id === selectedId);
    if (!selected) return;
    if (selectedStateRef.current) mapRef.current.setFeatureState({ source: "states", id: selectedStateRef.current }, { selected: false });
    const nextCode = stateCodes[selected.state];
    selectedStateRef.current = nextCode;
    mapRef.current.setFeatureState({ source: "states", id: nextCode }, { selected: true });
  }, [ready, regions, selectedId]);

  const topRegion = useMemo(() => regions[0], [regions]);

  return (
    <section className="map-experience" aria-labelledby="map-title">
      <div className="map-copy">
        <p className="eyebrow">Opportunity Map · Deutschland</p>
        <h1 id="map-title">Wo hat dein Profil die besten Chancen?</h1>
        <p>Entdecke regionale Nachfrage statt nur Stellen an einem bereits festgelegten Ort.</p>
      </div>
      <div className="map-stat" aria-label="Stärkste Region">
        <span>Aktuell stärkste Region</span><strong>{topRegion.name}</strong><i>{topRegion.score}</i>
      </div>

      <div className="map-canvas-wrap">
        <div className="aurora aurora-a" aria-hidden="true" />
        <div className="aurora aurora-b" aria-hidden="true" />
        <div className="radar-sweep" aria-hidden="true" />
        <div ref={containerRef} className={`maplibre-canvas${error ? " is-unavailable" : ""}`} aria-label="Interaktive Karte der deutschen Bundesländer" />
        {!ready && !error && <div className="map-loading"><span />Kartendaten werden vorbereitet</div>}
        {error && fallbackData && <FallbackMap data={fallbackData} regions={regions} selectedId={selectedId} onSelect={onSelect} onHover={setHoverCard} />}
        {error && !fallbackData && <div className="map-loading map-error">Die Karte konnte nicht geladen werden.</div>}
        {!error && <div className="map-controls" aria-label="Kartensteuerung">
          <button type="button" aria-label="Hineinzoomen" onClick={() => mapRef.current?.zoomIn({ duration: 350 })}><Plus /></button>
          <button type="button" aria-label="Herauszoomen" onClick={() => mapRef.current?.zoomOut({ duration: 350 })}><Minus /></button>
          <button type="button" aria-label="Deutschland vollständig anzeigen" onClick={resetView}><LocateFixed /></button>
        </div>}
        {hoverCard && (
          <div className="geo-tooltip" role="status" style={{ left: hoverCard.x + 16, top: Math.max(16, hoverCard.y - 42) }}>
            <span>{hoverCard.kind === "state" ? "Bundesland" : "Arbeitsmarktregion"}</span>
            <strong>{hoverCard.title}</strong>
            {hoverCard.kind === "state" ? <small>{hoverCard.regionCount ? `Ø ${hoverCard.score} Punkte · ${hoverCard.regionCount} Region${hoverCard.regionCount === 1 ? "" : "en"}` : "Noch keine Demoregion"}</small> : <small>{hoverCard.score} Punkte · {hoverCard.jobs} Stellen · +{hoverCard.trend} %</small>}
          </div>
        )}
        <div className="map-legend"><span>Niedriger</span><i /><i /><i /><i /><span>Höher</span></div>
        <p className="map-attribution">
          Grenzen: <a href="https://www.bkg.bund.de" target="_blank" rel="noreferrer">© BKG 2026</a> · <a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noreferrer">dl-de/by-2-0</a> · verändert für Webdarstellung
        </p>
      </div>
    </section>
  );
}
