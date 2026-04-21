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
    return {
      id: n.id,
      type: 'default',
      position: { x: d * 220 + 40, y: (rows[n.id] ?? 0) * 120 + 40 },
      data: {
        label: (
          <div className="flex flex-col gap-0.5 text-left">
            <div className="flex items-center gap-1.5">
              <span>
                {NODE_ICONS[n.config?.builtinTool?.toolName ?? n.label] ??
                  NODE_ICONS[n.type] ??
                  '○'}
              </span>
              <span className="font-semibold text-[11px]">{n.label}</span>
            </div>
            <span className="text-[9px] text-muted-foreground font-mono opacity-70">{n.type}</span>
          </div>
        ),
      },
      style: {
        background: `${NODE_COLORS[n.type] ?? '#94a3b8'}18`,
        border: `1.5px solid ${NODE_COLORS[n.type] ?? '#94a3b8'}`,
        borderRadius: 8,
        padding: '8px 12px',
        minWidth: 140,
        fontSize: 12,
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
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#94a3b8' },
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
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
        No nodes. Add nodes to build your pipeline.
      </div>
    );
  }

  return (
    <div className="flex-1 rounded-lg overflow-hidden border">
      <ReactFlow
        nodes={flowNodes.map(n => ({ ...n, selected: n.id === selectedNodeId }))}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
      >
        <Background variant={BackgroundVariant.Lines} color="#e2e8f0" gap={20} lineWidth={0.5} />
        <Background variant={BackgroundVariant.Lines} color="#94a3b8" gap={100} lineWidth={1} />
        <Controls />
        <MiniMap nodeColor={n => NODE_COLORS[(n as any).data?.nodeType] ?? '#94a3b8'} />
      </ReactFlow>
    </div>
  );
}
