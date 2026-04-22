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

const CATEGORY_COLORS: Record<string, string> = {
  trigger: 'bg-amber-500',
  ai: 'bg-indigo-400',
  flow: 'bg-violet-400',
  condition: 'bg-red-400',
  transform: 'bg-orange-400',
  io: 'bg-emerald-400',
  action: 'bg-blue-400',
  search: 'bg-cyan-400',
  extension: 'bg-pink-400',
  schedule: 'bg-yellow-400',
  interaction: 'bg-teal-400',
  other: 'bg-slate-400',
};

type Props = {
  tools: PipelineTool[];
  onAddNode: (tool: PipelineTool) => void;
};

function ToolItem({ tool, onAdd }: { tool: PipelineTool; onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-muted/70 text-left group transition-colors"
      title={tool.description}
    >
      <span className="text-sm shrink-0 w-4 text-center leading-none">{tool.icon ?? '○'}</span>
      <span className="text-[11px] truncate flex-1 text-foreground/80 group-hover:text-foreground transition-colors">{tool.name}</span>
      <span className="text-[10px] text-indigo-400/70 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity">+ add</span>
    </button>
  );
}

function CategoryGroup({ category, tools, onAddNode }: { category: string; tools: PipelineTool[]; onAddNode: (t: PipelineTool) => void }) {
  const [open, setOpen] = useState(category === 'trigger' || category === 'ai' || category === 'flow');
  const dot = CATEGORY_COLORS[category] ?? 'bg-slate-400';

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot} opacity-70`} />
        <span className="flex-1 text-left">{CATEGORY_LABELS[category] ?? category}</span>
        <span className="font-normal normal-case tracking-normal text-muted-foreground/50">{tools.length}</span>
        {open ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
      </button>
      {open && (
        <div className="flex flex-col pl-1">
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

  const known = new Set(CATEGORY_ORDER);
  const rest = filtered.filter(t => !known.has(t.category));
  if (rest.length) grouped['other'] = [...(grouped['other'] ?? []), ...rest];

  return (
    <div className="flex flex-col h-full border-r bg-card/30">
      <div className="px-2.5 py-2.5 border-b bg-card/50">
        <div className="relative">
          <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search nodes…"
            className="h-7 pl-7 text-[11px] bg-muted/30 border-border/40 focus-visible:ring-indigo-500/30"
          />
        </div>
      </div>
      <div className="flex flex-col gap-0.5 overflow-y-auto flex-1 py-1.5 px-1">
        {Object.entries(grouped).map(([cat, items]) => (
          <CategoryGroup key={cat} category={cat} tools={items} onAddNode={onAddNode} />
        ))}
        {filtered.length === 0 && (
          <p className="text-[11px] text-muted-foreground/60 italic px-3 py-3">No nodes found.</p>
        )}
      </div>
    </div>
  );
}
