'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import { Bot } from 'lucide-react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { PipelineNode } from '@/app/api/pipelines/route';
import { useTheme } from 'next-themes';
const NODE_COLORS: Record<string, string> = {
  trigger: '#f59e0b',
  ai: '#6366f1',
  builtin_tool: '#10b981',
  mcp_tool: '#3b82f6',
  condition: '#ef4444',
  flow: '#8b5cf6',
  transform: '#f97316',
};

const NODE_ICONS: Record<string, React.ReactNode> = {
  trigger: '⚡',
  ai: <Bot size={13} />,
  builtin_tool: '🔧',
  mcp_tool: '🔌',
  condition: '🔀',
  flow: '⚡',
  transform: '🔧',
  // by tool name
  read_file: '📄',
  write_file: '✏️',
  edit: '📝',
  shell: '💻',
  glob: '🔍',
  grep: '🔎',
  ls: '📁',
  web_fetch: '🌐',
  ripgrep: '⚡',
  ai_agent: <Bot size={13} />,
  webhook_trigger: '🪝',
  schedule_trigger: '⏰',
  parallel: '⚡',
  delay: '⏱️',
  for_each: '🔁',
  send_message: '💬',
  ask_user_question: '❓',
  cron_create: '⏰',
  cron_list: '📋',
  cron_delete: '🗑️',
};

function toReactFlowNodes(nodes: PipelineNode[]): Node[] {
  const cols: Record<string, number> = {};
  const rows: Record<string, number> = {};

  // Simple layout: topological sort by dependsOn depth
  const depth = (id: string): number => {
    const node = nodes.find(n => n.id === id);
    if (!node || !node.dependsOn?.length) return 0;
    return 1 + Math.max(...node.dependsOn.map(depth));
  };

  nodes.forEach(n => {
    const d = depth(n.id);
    const col = cols[d] ?? 0;
    rows[n.id] = col;
    cols[d] = col + 1;
  });

  return nodes.map(n => {
    const d = depth(n.id);
    const color = NODE_COLORS[n.type] ?? '#94a3b8';
    return {
      id: n.id,
      type: 'default',
      position: { x: d * 230 + 40, y: (rows[n.id] ?? 0) * 110 + 40 },
      data: {
        label: (
          <div className="flex flex-col gap-1 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-sm leading-none">
                {NODE_ICONS[n.config?.builtinTool?.toolName ?? n.label] ??
                  NODE_ICONS[n.type] ??
                  '○'}
              </span>
              <span className="font-semibold text-[11px] leading-tight truncate max-w-[110px]">{n.label}</span>
            </div>
            <span
              className="text-[9px] font-mono px-1 py-0.5 rounded w-fit"
              style={{ background: `${color}20`, color: color }}
            >{n.type}</span>
          </div>
        ),
      },
      style: {
        background: `color-mix(in srgb, ${color} 6%, var(--card, #ffffff))`,
        border: `1px solid ${color}40`,
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 150,
        fontSize: 12,
        boxShadow: `0 1px 4px ${color}15, inset 0 1px 0 ${color}15`,
      },
    };
  });
}

function toReactFlowEdges(nodes: PipelineNode[]): Edge[] {
  const edges: Edge[] = [];
  for (const node of nodes) {
    for (const dep of node.dependsOn ?? []) {
      edges.push({
        id: `${dep}->${node.id}`,
        source: dep,
        target: node.id,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#6366f140' },
        style: { stroke: '#6366f140', strokeWidth: 1.5 },
        animated: false,
      });
    }
  }
  return edges;
}

type Props = {
  nodes: PipelineNode[];
  onNodeClick: (node: PipelineNode) => void;
  selectedNodeId?: string;
  onConnectionsChange?: (edges: { source: string; target: string }[]) => void;
};

export function PipelineCanvas({ nodes, onNodeClick, selectedNodeId, onConnectionsChange }: Props) {
  const rfNodes = useMemo(() => toReactFlowNodes(nodes), [nodes]);
  const rfEdges = useMemo(() => toReactFlowEdges(nodes), [nodes]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(rfNodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(rfEdges);

  const { theme } = useTheme();
  const isDark = theme === 'dark';
  useEffect(() => {
    setFlowNodes(toReactFlowNodes(nodes));
  }, [nodes]);
  useEffect(() => {
    setFlowEdges(toReactFlowEdges(nodes));
  }, [nodes]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setFlowEdges(eds => {
        const next = addEdge({ ...connection, markerEnd: { type: MarkerType.ArrowClosed } }, eds);
        onConnectionsChange?.(next.map(e => ({ source: e.source, target: e.target })));
        return next;
      });
    },
    [onConnectionsChange]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, rfNode: Node) => {
      const orig = nodes.find(n => n.id === rfNode.id);
      if (orig) onNodeClick(orig);
    },
    [nodes, onNodeClick]
  );

  if (!nodes.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center bg-muted/5 rounded-xl border border-dashed border-border/40">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/8 border border-indigo-500/15 flex items-center justify-center">
          <Bot size={18} className="text-indigo-400/60" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Empty pipeline</p>
          <p className="text-[11px] text-muted-foreground/50 mt-0.5">Add nodes from the palette to build your workflow</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 rounded-xl overflow-hidden border border-border/50">
      <ReactFlow
        nodes={flowNodes.map(n => ({ ...n, selected: n.id === selectedNodeId }))}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.2}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color={isDark ? '#334155' : '#d1d5db'}
          gap={20}
          size={1}
        />
        <Controls
          className="!border-border/50 !bg-card !shadow-sm [&>button]:!border-border/30 [&>button]:!bg-card [&>button]:hover:!bg-muted"
        />
        <MiniMap
          nodeColor={n => `${NODE_COLORS[(n as any).data?.nodeType] ?? '#94a3b8'}80`}
          maskColor={isDark ? 'rgba(15,15,20,0.7)' : 'rgba(248,250,252,0.7)'}
          className="!border-border/40 !bg-card/90 !rounded-lg"
        />
      </ReactFlow>
    </div>
  );
}
