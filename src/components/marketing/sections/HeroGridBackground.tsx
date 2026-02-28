'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type IconName = 'factory' | 'truck' | 'train-front' | 'plane' | 'package' | 'ship';

type Point = { x: number; y: number };
type TrailPoint = { x: number; y: number; atMs: number };
type Agent = {
  id: string;
  icon: IconName;
  pos: Point; // current grid node (start of move)
  next: Point; // next grid node (end of move)
  moveStartMs: number;
  dir: 'up' | 'down' | 'left' | 'right';
  trail: TrailPoint[];
  lastTrailAddMs: number;
};

const iconColor: Record<IconName, string> = {
  ship: '#0071e3',
  plane: '#5856d6',
  'train-front': '#ff9500',
  truck: '#34c759',
  package: '#ff3b30',
  factory: '#86868b'
};

function iconNode(name: IconName) {
  switch (name) {
    case 'factory':
      return (
        <>
          <path d="M12 16h.01" />
          <path d="M16 16h.01" />
          <path d="M3 19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5a.5.5 0 0 0-.769-.422l-4.462 2.844A.5.5 0 0 1 15 10.5v-2a.5.5 0 0 0-.769-.422L9.77 10.922A.5.5 0 0 1 9 10.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z" />
          <path d="M8 16h.01" />
        </>
      );
    case 'truck':
      return (
        <>
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
          <path d="M15 18H9" />
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
          <circle cx="17" cy="18" r="2" />
          <circle cx="7" cy="18" r="2" />
        </>
      );
    case 'train-front':
      return (
        <>
          <path d="M8 3.1V7a4 4 0 0 0 8 0V3.1" />
          <path d="m9 15-1-1" />
          <path d="m15 15 1-1" />
          <path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z" />
          <path d="m8 19-2 3" />
          <path d="m16 19 2 3" />
        </>
      );
    case 'plane':
      return (
        <>
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
        </>
      );
    case 'package':
      return (
        <>
          <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
          <path d="M12 22V12" />
          <polyline points="3.29 7 12 12 20.71 7" />
          <path d="m7.5 4.27 9 5.15" />
        </>
      );
    case 'ship':
      return (
        <>
          <path d="M12 10.189V14" />
          <path d="M12 2v3" />
          <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6" />
          <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76" />
          <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
        </>
      );
  }
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

type Plan = { assignment: string[]; chosenDir: Agent['dir'][] };

export function HeroGridBackground() {
  // Use dimensions aligned to the grid step so paths always snap perfectly.
  const viewBox = useMemo(() => ({ w: 1200, h: 720, grid: 60 }), []);
  const insetX = 120;
  const insetY = 120;
  const tile = 38;
  const iconSize = 24;
  const moveDurationMs = 6000; // same speed for all
  const trailKeepMs = 2000;
  const trailSampleMs = 170;

  const bounds = useMemo(() => {
    // Keep agents away from the outer grid line.
    const minX = insetX + viewBox.grid;
    const maxX = viewBox.w - insetX - viewBox.grid;
    const minY = insetY + viewBox.grid;
    const maxY = viewBox.h - insetY - viewBox.grid;
    return { minX, maxX, minY, maxY };
  }, [insetX, insetY, viewBox.grid, viewBox.w, viewBox.h]);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  }, []);

  const [tick, setTick] = useState(0);
  const agentsRef = useRef<Agent[] | null>(null);
  const lastFrameMsRef = useRef<number>(0);
  const pendingPlanRef = useRef<Plan | null>(null);

  const startPositions = useMemo(() => {
    // Evenly spread starting points (5 columns x 3 rows) within bounds.
    const cols = 5;
    const rows = 3;
    const xStep = (bounds.maxX - bounds.minX) / (cols - 1);
    const yStep = (bounds.maxY - bounds.minY) / (rows - 1);
    const starts: Point[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = Math.round((bounds.minX + c * xStep) / viewBox.grid) * viewBox.grid;
        const y = Math.round((bounds.minY + r * yStep) / viewBox.grid) * viewBox.grid;
        starts.push({ x, y });
      }
    }
    return starts;
  }, [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, viewBox.grid]);

  const icons = useMemo<IconName[]>(
    () => [
      'factory',
      'factory',
      'truck',
      'truck',
      'train-front',
      'train-front',
      'plane',
      'plane',
      'package',
      'package',
      'ship',
      'ship',
      'ship'
    ],
    []
  );

  const keyOf = useCallback((p: Point) => `${p.x},${p.y}`, []);

  const neighbors = useCallback(
    (p: Point): Array<{ p: Point; dir: Agent['dir'] }> => {
      const list: Array<{ p: Point; dir: Agent['dir'] }> = [];
      const g = viewBox.grid;
      const cand: Array<{ p: Point; dir: Agent['dir'] }> = [
        { p: { x: p.x + g, y: p.y }, dir: 'right' },
        { p: { x: p.x - g, y: p.y }, dir: 'left' },
        { p: { x: p.x, y: p.y + g }, dir: 'down' },
        { p: { x: p.x, y: p.y - g }, dir: 'up' }
      ];
      for (const c of cand) {
        if (
          c.p.x >= bounds.minX &&
          c.p.x <= bounds.maxX &&
          c.p.y >= bounds.minY &&
          c.p.y <= bounds.maxY
        ) {
          list.push(c);
        }
      }
      return list;
    },
    [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, viewBox.grid]
  );

  const opposite = useCallback((d: Agent['dir']): Agent['dir'] => {
    switch (d) {
      case 'up':
        return 'down';
      case 'down':
        return 'up';
      case 'left':
        return 'right';
      case 'right':
        return 'left';
    }
  }, []);

  const computePlan = useCallback(
    (agents: Array<{ pos: Point; dir: Agent['dir'] }>): Plan | null => {
      // Plan a collision-free step where EVERY agent moves (no stopping).
      const attempts = 40;
      const idxByPos = new Map<string, number>();
      for (let i = 0; i < agents.length; i++) idxByPos.set(keyOf(agents[i]!.pos), i);

      const currentKey = agents.map((a) => keyOf(a.pos));

      function tryPlanOnce() {
        const candidates = agents.map((a) => {
          const opts = neighbors(a.pos).map((o) => ({
            ...o,
            key: keyOf(o.p)
          }));

          for (const o of opts) {
            let s = Math.random();
            if (o.dir === a.dir) s += 0.8;
            if (o.dir === opposite(a.dir)) s -= 0.6;
            (o as any).score = s;
          }
          opts.sort((x: any, y: any) => y.score - x.score);
          return opts as Array<{ p: Point; dir: Agent['dir']; key: string }>;
        });

        const order = agents
          .map((_, i) => i)
          .sort((a, b) => candidates[a]!.length - candidates[b]!.length);

        // also shuffle within same degree
        for (let i = 0; i < order.length - 1; i++) {
          if (candidates[order[i]!]!.length === candidates[order[i + 1]!]!.length) {
            if (Math.random() > 0.5) [order[i], order[i + 1]] = [order[i + 1], order[i]];
          }
        }

        const usedTargets = new Set<string>();
        const assignment = new Array<string>(agents.length).fill('');
        const chosenDir = new Array<Agent['dir']>(agents.length).fill('right');

        const backtrack = (k: number): boolean => {
          if (k >= order.length) return true;
          const i = order[k]!;
          const curK = currentKey[i]!;
          for (const opt of candidates[i]!) {
            const tgtK = opt.key;
            if (tgtK === curK) continue;
            if (usedTargets.has(tgtK)) continue;
            // prevent swaps
            const j = idxByPos.get(tgtK);
            if (j !== undefined && assignment[j] === curK) continue;

            usedTargets.add(tgtK);
            assignment[i] = tgtK;
            chosenDir[i] = opt.dir;
            if (backtrack(k + 1)) return true;
            usedTargets.delete(tgtK);
            assignment[i] = '';
          }
          return false;
        };

        if (!backtrack(0)) return null;
        if (assignment.some((v) => !v)) return null;
        return { assignment, chosenDir } satisfies Plan;
      }

      for (let a = 0; a < attempts; a++) {
        const plan = tryPlanOnce();
        if (plan) return plan;
      }
      return null;
    },
    [keyOf, neighbors, opposite]
  );

  const applyPlan = useCallback(
    (nowMs: number, agents: Agent[], plan: Plan) => {
      for (let i = 0; i < agents.length; i++) {
        const tgt = plan.assignment[i]!;
        const [xStr, yStr] = tgt.split(',');
        agents[i]!.next = { x: Number(xStr), y: Number(yStr) };
        agents[i]!.dir = plan.chosenDir[i]!;
        agents[i]!.moveStartMs = nowMs;
      }
    },
    []
  );

  const chooseMoves = useCallback((nowMs: number, agents: Agent[]) => {
    // Plan a collision-free step where EVERY agent moves (no stopping).
    const plan = computePlan(agents.map((a) => ({ pos: a.pos, dir: a.dir })));
    if (!plan) return;
    applyPlan(nowMs, agents, plan);
  }, [applyPlan, computePlan]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    if (!agentsRef.current) {
      const now = performance.now();
      agentsRef.current = icons.map((icon, idx) => {
        const start = startPositions[idx % startPositions.length];
        return {
          id: `a${idx}`,
          icon,
          pos: start,
          next: start,
          moveStartMs: now,
          dir: (['right', 'down', 'left', 'up'][idx % 4] as Agent['dir']),
          trail: [],
          lastTrailAddMs: now
        };
      });
      chooseMoves(now, agentsRef.current);
      lastFrameMsRef.current = now;
    }

    let raf = 0;
    const loop = () => {
      const now = performance.now();
      const agents = agentsRef.current!;
      const tGlobal = (now - agents[0]!.moveStartMs) / moveDurationMs;

      for (const a of agents) {
        const t = tGlobal;
        // Linear interpolation = constant speed (no easing stop at grid nodes)
        const e = clamp(t, 0, 1);
        const x = a.pos.x + (a.next.x - a.pos.x) * e;
        const y = a.pos.y + (a.next.y - a.pos.y) * e;

        // Add trail points continuously behind the icon
        if (now - a.lastTrailAddMs >= trailSampleMs) {
          a.trail.push({ x, y, atMs: now });
          a.lastTrailAddMs = now;
        }

        // prune trail
        a.trail = a.trail.filter((p) => now - p.atMs <= trailKeepMs);
      }

      // Pre-compute next step before the boundary to avoid any compute spike.
      if (!pendingPlanRef.current && tGlobal >= 0.65 && tGlobal < 1) {
        const endSnapshot = agents.map((a) => ({ pos: a.next, dir: a.dir }));
        pendingPlanRef.current = computePlan(endSnapshot);
      }

      // Step boundary: commit all moves together and immediately plan next step (no stops).
      if (tGlobal >= 1) {
        for (const a of agents) {
          a.trail.push({ x: a.next.x, y: a.next.y, atMs: now });
          a.lastTrailAddMs = now;
          a.pos = a.next;
        }
        const pending = pendingPlanRef.current;
        pendingPlanRef.current = null;
        if (pending) {
          applyPlan(now, agents, pending);
        } else {
          // fallback (should be rare): compute on the spot
          chooseMoves(now, agents);
        }
      }

      // Throttle re-render to ~30fps.
      if (now - lastFrameMsRef.current > 33) {
        lastFrameMsRef.current = now;
        setTick((v) => v + 1);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [
    bounds.maxX,
    bounds.maxY,
    bounds.minX,
    bounds.minY,
    icons,
    moveDurationMs,
    prefersReducedMotion,
    startPositions,
    trailKeepMs,
    viewBox.grid,
    chooseMoves,
    computePlan,
    applyPlan
  ]);

  const nowForRender = typeof performance !== 'undefined' ? performance.now() : 0;
  const agentsForRender = agentsRef.current ?? [];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-80 [mask-image:radial-gradient(70%_60%_at_50%_35%,black,transparent)]"
    >
      <svg
        className="h-full w-full text-black/12 dark:text-white/12"
        viewBox={`0 0 ${viewBox.w} ${viewBox.h}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern
            id="hero-grid"
            width={viewBox.grid}
            height={viewBox.grid}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${viewBox.grid} 0 L 0 0 0 ${viewBox.grid}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              opacity="0.8"
            />
          </pattern>
          <clipPath id="hero-grid-clip">
            <rect
              x={insetX}
              y={insetY}
              width={viewBox.w - insetX * 2}
              height={viewBox.h - insetY * 2}
              rx="28"
            />
          </clipPath>
        </defs>

        <g clipPath="url(#hero-grid-clip)">
          <rect width={viewBox.w} height={viewBox.h} fill="url(#hero-grid)" />

          {!prefersReducedMotion &&
            agentsForRender.flatMap((a) => {
              const t = clamp((nowForRender - a.moveStartMs) / moveDurationMs, 0, 1);
              const e = t;
              const x = a.pos.x + (a.next.x - a.pos.x) * e;
              const y = a.pos.y + (a.next.y - a.pos.y) * e;
              const stroke = iconColor[a.icon];

              const trails = a.trail.map((p, idx) => {
                const age = nowForRender - p.atMs;
                const op = clamp(1 - age / trailKeepMs, 0, 1);
                return (
                  <circle
                    key={`${a.id}-${p.atMs}-${idx}`}
                    cx={p.x}
                    cy={p.y}
                    r={1.4}
                    fill={stroke}
                    opacity={op * 0.7}
                  />
                );
              });

              const icon = (
                <g key={a.id}>
                  {trails}
                  <g
                    transform={`translate(${x} ${y})`}
                    stroke={stroke}
                    fill="none"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <g transform={`translate(${-(tile / 2)} ${-(tile / 2)})`}>
                      <rect
                        width={tile}
                        height={tile}
                        rx="12"
                        fill="rgb(var(--color-surface) / 0.92)"
                        stroke="rgb(var(--color-border) / 0.9)"
                        strokeWidth="1"
                      />
                      <g
                        transform={`translate(${(tile - iconSize) / 2} ${(tile - iconSize) / 2})`}
                      >
                        {iconNode(a.icon)}
                      </g>
                    </g>
                  </g>
                </g>
              );

              return [icon];
            })}
        </g>
      </svg>
    </div>
  );
}

