'use client';

import React, { useState } from 'react';
import { Workflow, Play, Trash2, Plus, CheckCircle, XCircle, RefreshCw, Save, ArrowLeft, GitBranch, ScrollText, Download, Upload, Sparkles, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PipelineListItem, PipelineNode } from '@/app/api/pipelines/route';
import { PipelineTool } from '@/app/api/pipelines/tools/route';
import {
  usePipelinesQuery,
  usePipelineDetailQuery,
  usePipelineToolsQuery,
  useDeletePipelineMutation,
  useCreatePipelineMutation,
  useUpdatePipelineMutation,
  useValidatePipelineMutation,
  usePipelineLogsQuery,
  usePipelineVisualizeQuery,
  useGeneratePipelineMutation,
  useExportPipeline,
  useImportPipelineMutation,
  useScheduleAddMutation,
  useScheduleRemoveMutation,
  usePipelineScheduleQuery,
} from '@/hooks/pipelines';
import { PipelineCanvas } from './PipelineCanvas';
import { NodeConfigPanel } from './NodeConfigPanel';

/* ── helpers ── */
function makeNodeId(toolName: string) {
  return `${toolName}-${Math.random().toString(36).slice(2, 10)}`;
}

// internal tools that don't belong in the pipeline builder palette
const EXCLUDED_TOOLS = new Set([
  'todo_write', 'save_memory', 'diff_options', 'exit_plan_mode',
  'flow', 'skill', 'modifiable_file',
]);

function defaultConfig(tool: PipelineTool): Record<string, any> {
  switch (tool.nodeType) {
    case 'ai':
      return { ai: { prompt: '', model: '' } };
    case 'trigger':
      if (tool.name === 'schedule_trigger') return { trigger: { type: 'schedule', cronExpr: '' } };
      if (tool.name === 'webhook_trigger') return { trigger: { type: 'webhook', webhookPath: '' } };
      return { trigger: { type: 'manual' } };
    case 'builtin_tool': {
      const params = Object.fromEntries((tool.inputs ?? []).map(i => [i.name, i.default ?? '']));
      return { builtinTool: { toolName: tool.name, parameters: params } };
    }
    case 'mcp_tool':
      return { mcpTool: { serverName: '', toolName: '', parameters: {} } };
    case 'condition':
      return { condition: { conditions: [], logic: 'and', trueNodes: [], falseNodes: [] } };
    case 'flow':
      if (tool.name === 'delay') return { flow: { delayMs: 1000 } };
      if (tool.name === 'for_each') return { flow: { forEachItem: '', maxConcurrency: 0 } };
      return { flow: { nodes: [] } };
    case 'transform':
      return { transform: { operation: 'template', input: '', template: '' } };
    default:
      return {};
  }
}

/* ── Run panel ── */
function RunPanel({ name, onClose }: { name: string; onClose: () => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const handleRun = async () => {
    setLines([]);
    setDone(false);
    setRunning(true);
    const res = await fetch(`/api/pipelines/${name}/run`, { method: 'POST' });
    if (!res.body) { setRunning(false); return; }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done: d, value } = await reader.read();
      if (d) break;
      const text = decoder.decode(value);
      for (const event of text.split('\n\n').filter(Boolean)) {
        const data = event.replace(/^data: /, '');
        try {
          const parsed = JSON.parse(data);
          if (parsed.done) { setDone(true); break; }
          if (parsed.error) setLines(l => [...l, `ERROR: ${parsed.error}`]);
          else setLines(l => [...l, data]);
        } catch { if (data.trim()) setLines(l => [...l, data]); }
      }
    }
    setRunning(false);
    setDone(true);
  };

  return (
    <div className="border-t flex flex-col gap-2 p-3 bg-slate-950 text-green-400 font-mono text-xs">
      <div className="flex items-center justify-between">
        <span className="text-slate-400">Run: {name}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-6 text-xs border-slate-700 text-green-400 hover:text-green-300" onClick={handleRun} disabled={running}>
            {running ? <RefreshCw size={11} className="animate-spin mr-1" /> : <Play size={11} className="mr-1" />}
            {running ? 'Running...' : 'Run'}
          </Button>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
        </div>
      </div>
      {lines.length > 0 && (
        <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5">
          {lines.map((l, i) => <div key={i}>{l}</div>)}
          {done && <div className="text-slate-400 mt-1">— done —</div>}
        </div>
      )}
    </div>
  );
}

/* ── Logs panel ── */
function LogsPanel({ name, onClose }: { name: string; onClose: () => void }) {
  const { data, isLoading, refetch } = usePipelineLogsQuery(name);
  return (
    <div className="border-t flex flex-col gap-2 p-3 bg-slate-950 text-slate-300 font-mono text-xs max-h-64 overflow-y-auto">
      <div className="flex items-center justify-between">
        <span className="text-slate-400">Logs: {name}</span>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="text-slate-500 hover:text-slate-300 text-xs">↺</button>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
        </div>
      </div>
      {isLoading && <span className="text-slate-500">Loading...</span>}
      {data?.output && <pre className="whitespace-pre-wrap text-[11px]">{data.output}</pre>}
    </div>
  );
}

/* ── Visualize panel ── */
function VisualizePanel({ name, onClose }: { name: string; onClose: () => void }) {
  const [ascii, setAscii] = useState(false);
  const { data, isLoading } = usePipelineVisualizeQuery(name, ascii);
  return (
    <div className="border-t flex flex-col gap-2 p-3 bg-slate-950 text-slate-300 font-mono text-xs max-h-64 overflow-y-auto">
      <div className="flex items-center justify-between">
        <span className="text-slate-400">Diagram: {name}</span>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-1 text-slate-500 cursor-pointer">
            <input type="checkbox" checked={ascii} onChange={e => setAscii(e.target.checked)} className="w-3 h-3" />
            ASCII
          </label>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
        </div>
      </div>
      {isLoading && <span className="text-slate-500">Loading...</span>}
      {data?.diagram && <pre className="whitespace-pre-wrap text-[11px]">{data.diagram}</pre>}
    </div>
  );
}

/* ── Schedule helpers ── */
const FREQ_OPTIONS = [
  { label: 'Every 15 minutes', cron: '0 */15 * * * *' },
  { label: 'Every 30 minutes', cron: '0 */30 * * * *' },
  { label: 'Every hour',       cron: '0 0 * * * *' },
  { label: 'Every 6 hours',    cron: '0 0 */6 * * *' },
  { label: 'Every 12 hours',   cron: '0 0 */12 * * *' },
  { label: 'Daily',            cron: null }, // needs time
  { label: 'Weekdays',         cron: null }, // needs time
  { label: 'Weekly',           cron: null }, // needs day+time
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  label: i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`,
  value: String(i),
}));

const DAY_OPTIONS = [
  { label: 'Sunday', value: '0' },
  { label: 'Monday', value: '1' },
  { label: 'Tuesday', value: '2' },
  { label: 'Wednesday', value: '3' },
  { label: 'Thursday', value: '4' },
  { label: 'Friday', value: '5' },
  { label: 'Saturday', value: '6' },
];

function describeCron(cron: string): string {
  const map: Record<string, string> = {
    '0 */15 * * * *': 'Every 15 min',
    '0 */30 * * * *': 'Every 30 min',
    '0 0 * * * *': 'Every hour',
    '0 0 */6 * * *': 'Every 6 hours',
    '0 0 */12 * * *': 'Every 12 hours',
  };
  if (map[cron]) return map[cron];
  const parts = cron.split(' ');
  if (parts.length === 6) {
    const [, , hour, , , dow] = parts;
    const h = parseInt(hour);
    const timeStr = isNaN(h) ? '' : (h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`);
    if (dow === '1-5') return `Weekdays at ${timeStr}`;
    if (dow !== '*') {
      const day = DAY_OPTIONS.find(d => d.value === dow)?.label ?? `day ${dow}`;
      return `Every ${day} at ${timeStr}`;
    }
    if (timeStr) return `Daily at ${timeStr}`;
  }
  return cron;
}

function buildCron(freq: string, hour: string, day: string): string {
  if (freq === 'Daily')    return `0 0 ${hour} * * *`;
  if (freq === 'Weekdays') return `0 0 ${hour} * * 1-5`;
  if (freq === 'Weekly')   return `0 0 ${hour} * * ${day}`;
  return FREQ_OPTIONS.find(f => f.label === freq)?.cron ?? '';
}

/* ── Schedule panel ── */
function SchedulePanel({ name, onClose }: { name: string; onClose: () => void }) {
  const { data: schedules = [], isLoading } = usePipelineScheduleQuery();
  const addMutation = useScheduleAddMutation();
  const removeMutation = useScheduleRemoveMutation();
  const [freq, setFreq] = useState('Every hour');
  const [hour, setHour] = useState('9');
  const [day, setDay] = useState('1');

  const pipelineSchedules = (schedules as any[]).filter(s => s.pipeline === name);
  const needsTime = freq === 'Daily' || freq === 'Weekdays' || freq === 'Weekly';
  const needsDay = freq === 'Weekly';
  const cron = buildCron(freq, hour, day);

  const handleAdd = async () => {
    if (!cron) return;
    await addMutation.mutateAsync({ pipeline: name, cron });
  };

  return (
    <div className="border-t flex flex-col gap-3 p-3 bg-slate-950 text-slate-300 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-slate-400 font-medium">Schedule: {name}</span>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300">✕</button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          {FREQ_OPTIONS.map(f => (
            <button
              key={f.label}
              onClick={() => setFreq(f.label)}
              className={`px-2.5 py-1 rounded-full border text-[11px] transition-colors ${
                freq === f.label
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {needsTime && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px] shrink-0">at</span>
            <select
              value={hour}
              onChange={e => setHour(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-[11px] rounded px-2 py-1 focus:outline-none"
            >
              {HOUR_OPTIONS.map(h => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
            {needsDay && (
              <>
                <span className="text-slate-500 text-[11px] shrink-0">on</span>
                <select
                  value={day}
                  onChange={e => setDay(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-[11px] rounded px-2 py-1 focus:outline-none"
                >
                  {DAY_OPTIONS.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-slate-600 text-[10px] font-mono">{cron}</span>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={handleAdd}
            disabled={addMutation.isPending || !cron}
          >
            {addMutation.isPending ? <RefreshCw size={11} className="animate-spin mr-1" /> : <Plus size={11} className="mr-1" />}
            Add Schedule
          </Button>
        </div>
      </div>

      {isLoading && <span className="text-slate-500">Loading...</span>}

      {pipelineSchedules.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-slate-800 pt-2">
          {pipelineSchedules.map((s: any) => (
            <div key={s.id} className="flex items-center gap-2">
              <span className="flex-1 text-[11px] text-slate-300">{describeCron(s.cron)}</span>
              <span className="text-[10px] text-slate-600 font-mono">{s.cron}</span>
              <button
                onClick={() => removeMutation.mutate(s.id)}
                disabled={removeMutation.isPending}
                className="text-slate-600 hover:text-red-400 transition-colors"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
      {pipelineSchedules.length === 0 && !isLoading && (
        <span className="text-slate-600 text-[11px]">No schedules yet.</span>
      )}
    </div>
  );
}

/* ── Create form ── */
function CreatePipelineForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const create = useCreatePipelineMutation();
  const generate = useGeneratePipelineMutation();
  const importMutation = useImportPipelineMutation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'manual' | 'generate' | 'import'>('manual');
  const [genDesc, setGenDesc] = useState('');
  const [yamlText, setYamlText] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    const triggerNode: PipelineNode = {
      id: makeNodeId('trigger'),
      type: 'trigger',
      label: 'Trigger',
      config: { trigger: { type: 'manual' } },
    };
    await create.mutateAsync({ name: name.trim(), description, nodes: [triggerNode] });
    onSuccess();
  };

  const handleGenerate = async () => {
    if (!name.trim() || !genDesc.trim()) return;
    await generate.mutateAsync({ name: name.trim(), description: genDesc.trim() });
    onSuccess();
  };

  const handleImport = async () => {
    if (!yamlText.trim()) return;
    await importMutation.mutateAsync(yamlText.trim());
    onSuccess();
  };

  const busy = create.isPending || generate.isPending || importMutation.isPending;

  return (
    <div className="flex flex-col gap-3 p-4 border rounded-lg bg-muted/10">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold flex-1">New Pipeline</p>
        <div className="flex gap-1">
          {(['manual', 'generate', 'import'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`text-[11px] px-2 py-0.5 rounded border ${mode === m ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground/30 text-muted-foreground hover:text-foreground'}`}
            >
              {m === 'manual' ? 'Manual' : m === 'generate' ? <span className="flex items-center gap-1"><Sparkles size={10} />AI</span> : 'Import'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'manual' && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Name <span className="text-destructive">*</span></label>
            <Input autoFocus value={name} onChange={e => setName(e.target.value)} className="h-8 text-xs font-mono" placeholder="my-pipeline" onKeyDown={e => e.key === 'Enter' && handleCreate()} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} className="h-8 text-xs" placeholder="What does this pipeline do?" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={busy || !name.trim()}>
              {create.isPending ? 'Creating...' : 'Create'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          </div>
        </>
      )}

      {mode === 'generate' && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Name <span className="text-destructive">*</span></label>
            <Input autoFocus value={name} onChange={e => setName(e.target.value)} className="h-8 text-xs font-mono" placeholder="ci-pipeline" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Describe the pipeline <span className="text-destructive">*</span></label>
            <textarea
              value={genDesc}
              onChange={e => setGenDesc(e.target.value)}
              placeholder="Run tests, if they pass build docker image, push to registry, notify team"
              className="min-h-[72px] w-full rounded-md border bg-muted/20 p-2 text-xs resize-y focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleGenerate} disabled={busy || !name.trim() || !genDesc.trim()}>
              {generate.isPending ? <><RefreshCw size={11} className="animate-spin mr-1" />Generating...</> : <><Sparkles size={11} className="mr-1" />Generate</>}
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          </div>
        </>
      )}

      {mode === 'import' && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Paste YAML <span className="text-destructive">*</span></label>
            <textarea
              value={yamlText}
              onChange={e => setYamlText(e.target.value)}
              placeholder="name: my-pipeline&#10;nodes: ..."
              className="min-h-[120px] w-full rounded-md border bg-muted/20 p-2 text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleImport} disabled={busy || !yamlText.trim()}>
              {importMutation.isPending ? 'Importing...' : 'Import'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Pipeline detail ── */
export function PipelineDetail({
  item,
  tools,
  onBack,
}: {
  item: PipelineListItem;
  tools: PipelineTool[];
  onBack?: () => void;
}) {
  const router = useRouter();
  const { data: pipeline, isLoading } = usePipelineDetailQuery(item.name);
  const deleteMutation = useDeletePipelineMutation();
  const validateMutation = useValidatePipelineMutation();
  const updateMutation = useUpdatePipelineMutation();
  const exportMutation = useExportPipeline();
  const [selectedNode, setSelectedNode] = useState<PipelineNode | null>(null);
  const [showRun, setShowRun] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showVisualize, setShowVisualize] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [validation, setValidation] = useState<{ valid: boolean; output: string } | null>(null);
  const [localNodes, setLocalNodes] = useState<PipelineNode[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (pipeline?.nodes) { setLocalNodes(pipeline.nodes); setDirty(false); }
  }, [pipeline]);

  const handleAddNode = (tool: PipelineTool) => {
    const node: PipelineNode = {
      id: makeNodeId(tool.name),
      type: tool.nodeType,
      label: tool.name,
      config: defaultConfig(tool),
      requiresLLM: tool.requiresLLM,
    };
    setLocalNodes(prev => [...prev, node]);
    setDirty(true);
  };

  const handleNodeChange = (updated: PipelineNode) => {
    setLocalNodes(prev => prev.map(n => n.id === updated.id ? updated : n));
    setSelectedNode(updated);
    setDirty(true);
  };

  const handleEdgesChange = (edges: { source: string; target: string }[]) => {
    setLocalNodes(prev => prev.map(node => ({
      ...node,
      dependsOn: edges.filter(e => e.target === node.id).map(e => e.source),
    })));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMutation.mutateAsync({
        name: item.name,
        description: pipeline?.description ?? '',
        nodes: localNodes,
      });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    const result = await validateMutation.mutateAsync(item.name);
    setValidation(result);
  };

  const handleExport = async () => {
    const yaml = await exportMutation.mutateAsync(item.name);
    const blob = new Blob([yaml], { type: 'application/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.name}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>;

  const nodes = localNodes;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <button onClick={onBack ?? (() => router.push('/studio/pipelines'))} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted">
          <ArrowLeft size={14} />
        </button>
        <span className="font-semibold text-sm font-mono">{item.name}</span>
        {item.description && <span className="text-xs text-muted-foreground truncate">— {item.description}</span>}
        <Badge variant="secondary" className="font-mono text-[10px]">v{pipeline?.version ?? '2'}</Badge>
        <Badge variant="outline" className="text-[10px]">{nodes.length} nodes</Badge>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              const aiTool = tools.find(t => t.nodeType === 'ai' || t.category === 'ai') ?? {
                name: 'ai_agent',
                category: 'ai',
                nodeType: 'ai' as const,
                description: 'AI agent node',
                inputs: [],
                outputType: 'any',
                requiresLLM: true,
                capabilities: [],
              };
              handleAddNode(aiTool);
            }}
          >
            <Plus size={11} className="mr-1" /> AI Node
          </Button>
          {dirty && (
            <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
              {saving ? <RefreshCw size={11} className="animate-spin mr-1" /> : <Save size={11} className="mr-1" />}
              Save
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleValidate} disabled={validateMutation.isPending}>
            <CheckCircle size={11} className="mr-1" /> Validate
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setShowVisualize(v => !v); setShowLogs(false); setShowSchedule(false); setShowRun(false); }}>
            <GitBranch size={11} className="mr-1" /> Diagram
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setShowLogs(v => !v); setShowVisualize(false); setShowSchedule(false); setShowRun(false); }}>
            <ScrollText size={11} className="mr-1" /> Logs
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setShowSchedule(v => !v); setShowLogs(false); setShowVisualize(false); setShowRun(false); }}>
            <Calendar size={11} className="mr-1" /> Schedule
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleExport} disabled={exportMutation.isPending}>
            <Download size={11} className="mr-1" /> Export
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setShowRun(v => !v); setShowLogs(false); setShowVisualize(false); setShowSchedule(false); }}>
            <Play size={11} className="mr-1" /> Run
          </Button>
          <Button
            variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={() => deleteMutation.mutate(item.name)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 size={11} className="mr-1" /> Delete
          </Button>
        </div>
      </div>

      {/* Validation */}
      {validation && (
        <div className={`flex items-start gap-2 px-3 py-2 text-xs border-b ${validation.valid ? 'bg-green-50 text-green-700' : 'bg-destructive/10 text-destructive'}`}>
          {validation.valid ? <CheckCircle size={12} className="shrink-0 mt-0.5" /> : <XCircle size={12} className="shrink-0 mt-0.5" />}
          <span className="font-mono whitespace-pre-wrap">{validation.output}</span>
        </div>
      )}

      {/* Main: canvas | config */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          <PipelineCanvas
            nodes={nodes}
            onNodeClick={n => setSelectedNode(sel => sel?.id === n.id ? null : n)}
            selectedNodeId={selectedNode?.id}
            onConnectionsChange={handleEdgesChange}
          />
          {showRun && <RunPanel name={item.name} onClose={() => setShowRun(false)} />}
          {showLogs && <LogsPanel name={item.name} onClose={() => setShowLogs(false)} />}
          {showVisualize && <VisualizePanel name={item.name} onClose={() => setShowVisualize(false)} />}
          {showSchedule && <SchedulePanel name={item.name} onClose={() => setShowSchedule(false)} />}
        </div>

        {selectedNode && (
          <div className="w-64 shrink-0 border-l flex flex-col">
            <NodeConfigPanel
              node={selectedNode}
              onChange={handleNodeChange}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Root ── */
export function PipelinesClient({
  initialPipelines = [],
}: {
  initialPipelines?: PipelineListItem[];
  initialTools?: PipelineTool[];
}) {
  const { data: pipelines = initialPipelines, isLoading, refetch } = usePipelinesQuery({
    initialData: initialPipelines.length > 0 ? initialPipelines : undefined,
  });
  const [showCreate, setShowCreate] = useState(false);
  const [runningPipeline, setRunningPipeline] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full min-h-0 p-6 gap-4 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Workflow size={18} />
          <h1 className="text-lg font-semibold">Pipelines</h1>
          <Badge variant="secondary">{pipelines.length}</Badge>
        </div>
        <Button size="sm" onClick={() => setShowCreate(v => !v)}>
          <Plus size={13} className="mr-1" /> New Pipeline
        </Button>
      </div>

      {showCreate && (
        <CreatePipelineForm
          onSuccess={() => { setShowCreate(false); refetch(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      <div className="flex flex-col gap-2">
        {pipelines.map(p => (
          <div key={p.name} className="flex flex-col rounded-lg border overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <Workflow size={16} className="text-muted-foreground shrink-0" />
              <Link href={`/studio/pipelines/${p.name}`} className="flex flex-col gap-0.5 flex-1 min-w-0 hover:underline">
                <span className="font-medium text-sm font-mono">{p.name}</span>
                {p.description && <span className="text-xs text-muted-foreground truncate">{p.description}</span>}
              </Link>
              <Badge variant="outline" className="text-[10px] shrink-0">v{p.version}</Badge>
              <Button
                size="sm"
                variant={runningPipeline === p.name ? 'secondary' : 'outline'}
                className="h-7 text-xs shrink-0"
                onClick={() => setRunningPipeline(r => r === p.name ? null : p.name)}
              >
                <Play size={11} className="mr-1" />
                Run
              </Button>
            </div>
            {runningPipeline === p.name && (
              <RunPanel name={p.name} onClose={() => setRunningPipeline(null)} />
            )}
          </div>
        ))}
        {pipelines.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground italic">No pipelines. Create one to get started.</p>
        )}
      </div>
    </div>
  );
}
