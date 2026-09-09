import { MAP_EDGES, MAP_NODES, type MapNode } from "@/lib/game/nodes";
import { nodeStatus, type NodeStatus, type ProgressState } from "@/lib/game/progress";

const STATUS_FILL: Record<NodeStatus, string> = {
  locked: "var(--node-locked)",
  available: "var(--node-available)",
  in_progress: "var(--node-progress)",
  completed: "var(--node-completed)",
};

interface Props {
  state: ProgressState;
  selectedId: string | null;
  onSelect: (node: MapNode) => void;
}

export function MapView({ state, selectedId, onSelect }: Props) {
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full"
      role="img"
      aria-label="Mapa de nodos de Japón"
    >
      <defs>
        <radialGradient id="sea" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="oklch(0.24 0.02 250)" />
          <stop offset="100%" stopColor="oklch(0.16 0.015 250)" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="100" height="100" fill="url(#sea)" />

      {/* Silueta estilizada del archipiélago */}
      <path
        d="M14 88 L22 78 L20 70 L28 64 L31 70 L37 62 L44 62 L48 55 L55 56 L60 49 L66 47 L72 45 L74 38 L80 33 L79 26 L84 22 L90 12 L94 14 L88 25 L86 34 L80 40 L76 48 L70 55 L62 58 L56 64 L48 68 L40 70 L34 76 L26 84 Z"
        fill="oklch(0.3 0.02 150 / 0.55)"
        stroke="oklch(0.55 0.05 150 / 0.5)"
        strokeWidth="0.4"
      />

      {MAP_EDGES.map((edge) => {
        const a = MAP_NODES.find((n) => n.id === edge.from)!;
        const b = MAP_NODES.find((n) => n.id === edge.to)!;
        const active = nodeStatus(state, b) !== "locked";
        return (
          <line
            key={`${edge.from}-${edge.to}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={active ? "var(--node-available)" : "var(--node-locked)"}
            strokeOpacity={active ? 0.8 : 0.35}
            strokeWidth="0.45"
            strokeDasharray={active ? undefined : "1.5 1.2"}
          />
        );
      })}

      {MAP_NODES.map((node) => {
        const status = nodeStatus(state, node);
        const selected = selectedId === node.id;
        return (
          <g
            key={node.id}
            className="cursor-pointer"
            onClick={() => onSelect(node)}
            role="button"
            tabIndex={0}
            aria-label={`${node.name} — ${status}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelect(node);
            }}
          >
            {selected && (
              <circle cx={node.x} cy={node.y} r="3.4" fill="var(--primary)" opacity="0.25" />
            )}
            <circle
              cx={node.x}
              cy={node.y}
              r={status === "locked" ? 1.5 : 2.1}
              fill={STATUS_FILL[status]}
              stroke="oklch(0.15 0.01 250)"
              strokeWidth="0.35"
            />
            <text
              x={node.x}
              y={node.y - 3.2}
              textAnchor="middle"
              fontSize="2.2"
              fill={status === "locked" ? "var(--muted-foreground)" : "var(--foreground)"}
            >
              {status === "locked" ? "???" : node.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
