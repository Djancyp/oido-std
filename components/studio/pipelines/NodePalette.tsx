'use client';

import React, { useState } from 'react';
import { PipelineTool } from '@/app/api/pipelines/tools/route';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const CATEGORY_ORDER = ['trigger', 'ai', 'flow', 'condition', 'transform', 'io', 'action', 'search', 'extension', 'schedule', 'interaction', 'other'];

const CATEGORY_LABELS: Record<string, string> = {
  trigger: 'Triggers',
  ai: 'AI',
  flow: 'Flow Control',
  condition: 'Conditions',
  transform: 'Transform',
  io: 'I/O',
  action: 'Actions',
  search: 'Search',
  extension: 'Extensions',
  schedule: 'Schedule',
  interaction: 'Interaction',
  other: 'Other',
};

type Props = {
  tools: PipelineTool[];
  onAddNode: (tool: PipelineTool) => void;
};

function ToolItem({ tool, onAdd }: { tool: PipelineTool; onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-left group transition-colors"
      title={tool.description}
    >
      <span className="text-sm shrink-0">{tool.icon ?? '○'}</span>
      <span className="text-xs truncate flex-1">{tool.name}</span>
      <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0">+ add</span>
    </button>
  );
}

function CategoryGroup({ category, tools, onAddNode }: { category: string; tools: PipelineTool[]; onAddNode: (t: PipelineTool) => void }) {
  const [open, setOpen] = useState(category === 'trigger' || category === 'ai' || category === 'flow');

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {CATEGORY_LABELS[category] ?? category}
        <span className="ml-auto font-normal normal-case tracking-normal">{tools.length}</span>
      </button>
      {open && (
        <div className="flex flex-col">
          {tools.map(t => (
            <ToolItem key={t.name} tool={t} onAdd={() => onAddNode(t)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function NodePalette({ tools, onAddNode }: Props) {
  const [query, setQuery] = useState('');

  const filtered = query ? tools.filter(t => t.name.includes(query) || t.description.toLowerCase().includes(query.toLowerCase())) : tools;

  const grouped = CATEGORY_ORDER.reduce<Record<string, PipelineTool[]>>((acc, cat) => {
    const items = filtered.filter(t => t.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  // uncategorized
  const known = new Set(CATEGORY_ORDER);
  const rest = filtered.filter(t => !known.has(t.category));
  if (rest.length) grouped['other'] = [...(grouped['other'] ?? []), ...rest];

  return (
    <div className="flex flex-col h-full border-r">
      <div className="px-2 py-2 border-b">
        <div className="relative">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search nodes..."
            className="h-7 pl-6 text-xs"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto flex-1 py-1">
        {Object.entries(grouped).map(([cat, items]) => (
          <CategoryGroup key={cat} category={cat} tools={items} onAddNode={onAddNode} />
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground italic px-3 py-2">No nodes found.</p>
        )}
      </div>
    </div>
  );
}
