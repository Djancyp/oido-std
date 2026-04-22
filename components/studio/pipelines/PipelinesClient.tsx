'use client';

import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
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

/* ── run/log types ── */
type RunNodeResult = {
  nodeId: string;
  nodeType: string;
  label: string;
  output?: string;
  error?: string;
  durationMs: number; // nanoseconds (misnamed in CLI output)
  startedAt: string;
  endedAt: string;
};

type RunResult = {
  pipeline: string;
  success: boolean;
  duration: string;
  durationMs: number; // actual milliseconds (total run)
  nodesRun: number;
  nodesTotal: number;
  nodeResults: RunNodeResult[];
};

type LogLine =
  | { kind: 'executor'; time: string; msg: string }
  | { kind: 'info'; msg: string }
  | { kind: 'err'; msg: string };

type RunSummary = { id: string; startedAt: string; state: string; duration: string };

type RunDetailNode = { status: string; type: string; label: string; duration: string; output: string };

type RunDetailData = {
  pipeline: string; runId: string; state: string;
  trigger: string; started: string; duration: string;
  nodes: RunDetailNode[];
};

/* ── format helpers ── */
function fmtMs(ms: number): string {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function fmtNs(ns: number): string {
  if (ns < 1_000) return `${ns}ns`;
  if (ns < 1_000_000) return `${(ns / 1000).toFixed(0)}µs`;
  return fmtMs(ns / 1_000_000);
}

function fmtDurationStr(s: string): string {
  const m = s.match(/^(\d+)ms$/);
  return m ? fmtMs(parseInt(m[1])) : s;
}

function parseRunList(output: string): RunSummary[] {
  return output.trim().split('\n').slice(1)
    .map(line => {
      const parts = line.trim().split(/\s{2,}/);
      if (parts.length < 4) return null;
      return { id: parts[0], startedAt: parts[1], state: parts[2], duration: parts[3] } as RunSummary;
    })
    .filter((x): x is RunSummary => x !== null && !!x.id);
}

function parseRunDetail(output: string): RunDetailData {
  const lines = output.split('\n');
  const meta: Record<string, string> = {};
  const nodes: RunDetailNode[] = [];
  let inNodes = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^-{4,}/.test(line)) { inNodes = true; continue; }
    if (!inNodes) {
      const m = line.match(/^([\w\s]+):\s+(.+)$/);
      if (m) meta[m[1].trim()] = m[2].trim();
    } else {
      const nm = line.match(/^\s+([✓✗])\s+\[(\w+)\]\s+(.+?)\s+\((\d+ms)\)\s*$/);
      if (nm) {
        const [, status, type, label, dur] = nm;
        let out = '';
        if (lines[i + 1]?.match(/^\s+output:/)) {
          out = lines[i + 1].replace(/^\s+output:\s*/, '').trim();
          i++;
        }
        nodes.push({ status, type, label, duration: dur, output: out });
      }
    }
  }
  return {
    pipeline: meta['Pipeline'] ?? '',
    runId: meta['Run ID'] ?? '',
    state: meta['State'] ?? '',
    trigger: meta['Trigger'] ?? '',
    started: meta['Started'] ?? '',
    duration: meta['Duration'] ?? '',
    nodes,
  };
}

/* ── Run panel ── */
function RunPanel({ name, onClose }: { name: string; onClose: () => void }) {
  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const stdoutBuf = useRef('');
  const logEndRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logLines]);

  const handleRun = async () => {
    setLogLines([]);
    setResult(null);
    stdoutBuf.current = '';
    setRunning(true);
    const res = await fetch(`/api/pipelines/${name}/run`, { method: 'POST' });
    if (!res.body) { setRunning(false); return; }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let finished = false;
    while (!finished) {
      const { done: d, value } = await reader.read();
      if (d) break;
      for (const event of decoder.decode(value).split('\n\n').filter(Boolean)) {
        const data = event.replace(/^data: /, '');
        try {
          const parsed = JSON.parse(data);
          if (parsed.done) { finished = true; break; }
          if ('error' in parsed) {
            for (const line of (parsed.error as string).split('\n').filter((l: string) => l.trim())) {
              const m = line.match(/^(\d{4}\/\d{2}\/\d{2} )(\d{2}:\d{2}:\d{2}) \[executor\] (.+)$/);
              if (m) setLogLines(l => [...l, { kind: 'executor', time: m[2], msg: m[3] }]);
              else setLogLines(l => [...l, { kind: 'info', msg: line }]);
            }
          }
        } catch {
          stdoutBuf.current += data;
          const jsonStart = stdoutBuf.current.indexOf('\n{');
          if (jsonStart !== -1) {
            try {
              const r = JSON.parse(stdoutBuf.current.slice(jsonStart).trim()) as RunResult;
              if ('success' in r && Array.isArray(r.nodeResults)) setResult(r);
            } catch { /* incomplete chunk */ }
          }
        }
      }
    }
    setRunning(false);
  };

  return (
    <div className="border-t flex flex-col bg-slate-950 font-mono text-xs max-h-64">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Run:</span>
          <span className="text-slate-200 font-semibold">{name}</span>
          {result && (
            <span className={result.success ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
              {result.success ? '✓' : '✗'} {fmtMs(result.durationMs)}
            </span>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <Button size="sm" variant="outline" className="h-6 text-xs border-slate-700 text-green-400 hover:text-green-300" onClick={handleRun} disabled={running}>
            {running ? <RefreshCw size={11} className="animate-spin mr-1" /> : <Play size={11} className="mr-1" />}
            {running ? 'Running…' : result ? 'Re-run' : 'Run'}
          </Button>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">✕</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {logLines.length > 0 && (
          <div className="flex flex-col px-3 py-2 gap-0.5">
            {logLines.map((l, i) => (
              <div key={i} className="flex items-start gap-2">
                {l.kind === 'executor' && (
                  <>
                    <span className="text-slate-600 shrink-0">{l.time}</span>
                    <span className="text-slate-300">{l.msg}</span>
                  </>
                )}
                {l.kind === 'info' && <span className="text-slate-400">{l.msg}</span>}
                {l.kind === 'err' && <span className="text-red-400">{l.msg}</span>}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}

        {result && (
          <div className="px-3 pb-2">
            <table className="w-full text-[11px] border border-slate-800 rounded overflow-hidden">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="text-left px-2 py-1 font-normal">node</th>
                  <th className="text-left px-2 py-1 font-normal">type</th>
                  <th className="text-right px-2 py-1 font-normal">duration</th>
                  <th className="text-left px-2 py-1 font-normal">output</th>
                </tr>
              </thead>
              <tbody>
                {result.nodeResults.map(n => (
                  <tr key={n.nodeId} className="border-b border-slate-800 last:border-0">
                    <td className="px-2 py-1.5 text-slate-200 max-w-[100px] truncate">{n.label}</td>
                    <td className="px-2 py-1.5">
                      <span className="px-1 py-0.5 rounded bg-slate-800 text-slate-400">{n.nodeType}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-400 whitespace-nowrap">{fmtNs(n.durationMs)}</td>
                    <td className="px-2 py-1.5 text-slate-300 max-w-[200px] truncate" title={n.output ?? n.error}>
                      {n.output ?? n.error ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!running && !result && logLines.length === 0 && (
          <div className="px-3 py-4 text-slate-600 text-center">Press Run to execute the pipeline.</div>
        )}
      </div>
    </div>
  );
}

/* ── Logs panel ── */
function LogsPanel({ name, onClose }: { name: string; onClose: () => void }) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const { data: listData, isLoading: listLoading, refetch } = usePipelineLogsQuery(name);
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['pipelines', 'logs', name, selectedRunId],
    queryFn: () => fetch(`/api/pipelines/${name}/logs?runId=${selectedRunId}`).then(r => r.json()) as Promise<{ output: string }>,
    enabled: !!selectedRunId,
  });

  const runs = listData?.output ? parseRunList(listData.output) : [];
  const detail = detailData?.output ? parseRunDetail(detailData.output) : null;

  return (
    <div className="border-t flex flex-col bg-slate-950 font-mono text-xs max-h-64">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-1.5">
          {selectedRunId && (
            <button onClick={() => setSelectedRunId(null)} className="text-slate-500 hover:text-slate-200 mr-1">←</button>
          )}
          <span className="text-slate-400">Logs:</span>
          <span className="text-slate-200 font-semibold">{name}</span>
          {selectedRunId && <span className="text-slate-600 text-[10px]">{selectedRunId.slice(0, 8)}…</span>}
        </div>
        <div className="flex gap-2 items-center">
          {!selectedRunId && (
            <button onClick={() => refetch()} className="text-slate-500 hover:text-slate-300">↺</button>
          )}
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">✕</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!selectedRunId && (
          <>
            {listLoading && <div className="px-3 py-4 text-slate-600 text-center">Loading…</div>}
            {!listLoading && runs.length === 0 && (
              <div className="px-3 py-4 text-slate-600 text-center">No runs yet.</div>
            )}
            {runs.length > 0 && (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="text-left px-3 py-1 font-normal">started</th>
                    <th className="text-left px-3 py-1 font-normal">state</th>
                    <th className="text-right px-3 py-1 font-normal">duration</th>
                    <th className="text-right px-3 py-1 font-normal">run id</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map(r => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedRunId(r.id)}
                      className="border-b border-slate-800 last:border-0 cursor-pointer hover:bg-slate-900 transition-colors"
                    >
                      <td className="px-3 py-1.5 text-slate-300">{r.startedAt}</td>
                      <td className="px-3 py-1.5">
                        <span className={r.state === 'success' ? 'text-green-400' : 'text-red-400'}>
                          {r.state === 'success' ? '✓' : '✗'} {r.state}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right text-slate-400">{fmtDurationStr(r.duration)}</td>
                      <td className="px-3 py-1.5 text-right text-slate-600 text-[10px]">{r.id.slice(0, 8)}…</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {selectedRunId && (
          <>
            {detailLoading && <div className="px-3 py-4 text-slate-600 text-center">Loading…</div>}
            {detail && (
              <>
                <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-800 text-[11px] shrink-0">
                  <span className={detail.state === 'success' ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                    {detail.state === 'success' ? '✓' : '✗'} {detail.state}
                  </span>
                  <span className="text-slate-500">{detail.trigger}</span>
                  <span className="text-slate-400">{detail.started}</span>
                  <span className="text-slate-400 ml-auto">{fmtDurationStr(detail.duration)}</span>
                </div>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500">
                      <th className="text-left px-3 py-1 font-normal">node</th>
                      <th className="text-left px-3 py-1 font-normal">type</th>
                      <th className="text-right px-3 py-1 font-normal">duration</th>
                      <th className="text-left px-3 py-1 font-normal">output</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.nodes.map((n, i) => (
                      <tr key={i} className="border-b border-slate-800 last:border-0">
                        <td className="px-3 py-1.5 text-slate-200 max-w-[100px] truncate">{n.label}</td>
                        <td className="px-3 py-1.5">
                          <span className="px-1 py-0.5 rounded bg-slate-800 text-slate-400">{n.type}</span>
                        </td>
                        <td className="px-3 py-1.5 text-right text-slate-400 whitespace-nowrap">{fmtDurationStr(n.duration)}</td>
                        <td className="px-3 py-1.5 text-slate-300 max-w-[200px] truncate" title={n.output}>{n.output || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
      </div>
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

  const fieldCls = "flex flex-col gap-1.5";
  const labelCls = "text-[11px] font-medium text-muted-foreground uppercase tracking-wider";
  const inputCls = "h-8 text-xs bg-muted/20 border-border/60 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500/60";
  const textareaCls = "w-full rounded-md border border-border/60 bg-muted/20 p-2.5 text-xs resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-colors";

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl border border-border/50 bg-card shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Plus size={10} className="text-indigo-400" />
          </div>
          <p className="text-xs font-semibold tracking-tight">New Pipeline</p>
        </div>
        <div className="flex p-0.5 gap-0.5 bg-muted/50 rounded-lg border border-border/40">
          {(['manual', 'generate', 'import'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`text-[11px] px-2.5 py-1 rounded-md transition-all ${
                mode === m
                  ? 'bg-background text-foreground shadow-sm border border-border/50 font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m === 'manual' ? 'Manual' : m === 'generate' ? <span className="flex items-center gap-1"><Sparkles size={10} />AI</span> : 'Import'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'manual' && (
        <>
          <div className={fieldCls}>
            <label className={labelCls}>Name <span className="text-destructive normal-case tracking-normal">*</span></label>
            <Input autoFocus value={name} onChange={e => setName(e.target.value)} className={`${inputCls} font-mono`} placeholder="my-pipeline" onKeyDown={e => e.key === 'Enter' && handleCreate()} />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} className={inputCls} placeholder="What does this pipeline do?" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white" onClick={handleCreate} disabled={busy || !name.trim()}>
              {create.isPending ? <><RefreshCw size={11} className="animate-spin mr-1.5" />Creating…</> : 'Create Pipeline'}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onCancel}>Cancel</Button>
          </div>
        </>
      )}

      {mode === 'generate' && (
        <>
          <div className={fieldCls}>
            <label className={labelCls}>Name <span className="text-destructive normal-case tracking-normal">*</span></label>
            <Input autoFocus value={name} onChange={e => setName(e.target.value)} className={`${inputCls} font-mono`} placeholder="ci-pipeline" />
          </div>
          <div className={fieldCls}>
            <label className={labelCls}>Describe the pipeline <span className="text-destructive normal-case tracking-normal">*</span></label>
            <textarea
              value={genDesc}
              onChange={e => setGenDesc(e.target.value)}
              placeholder="Run tests, if they pass build docker image, push to registry, notify team"
              className={`min-h-[80px] ${textareaCls}`}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white" onClick={handleGenerate} disabled={busy || !name.trim() || !genDesc.trim()}>
              {generate.isPending ? <><RefreshCw size={11} className="animate-spin mr-1.5" />Generating…</> : <><Sparkles size={11} className="mr-1.5" />Generate</>}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onCancel}>Cancel</Button>
          </div>
        </>
      )}

      {mode === 'import' && (
        <>
          <div className={fieldCls}>
            <label className={labelCls}>Paste YAML <span className="text-destructive normal-case tracking-normal">*</span></label>
            <textarea
              value={yamlText}
              onChange={e => setYamlText(e.target.value)}
              placeholder="name: my-pipeline&#10;nodes: ..."
              className={`min-h-[120px] font-mono ${textareaCls}`}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white" onClick={handleImport} disabled={busy || !yamlText.trim()}>
              {importMutation.isPending ? <><RefreshCw size={11} className="animate-spin mr-1.5" />Importing…</> : <><Upload size={11} className="mr-1.5" />Import</>}
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onCancel}>Cancel</Button>
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

  const togglePanel = (panel: 'run' | 'logs' | 'visualize' | 'schedule') => {
    setShowRun(panel === 'run' ? v => !v : false);
    setShowLogs(panel === 'logs' ? v => !v : false);
    setShowVisualize(panel === 'visualize' ? v => !v : false);
    setShowSchedule(panel === 'schedule' ? v => !v : false);
  };

  const tbBtn = (active: boolean) =>
    `h-7 text-xs gap-1.5 transition-colors ${active ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/15' : ''}`;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-card/50 backdrop-blur-sm">
        <button
          onClick={onBack ?? (() => router.push('/studio/pipelines'))}
          className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors"
        >
          <ArrowLeft size={13} />
        </button>
        <div className="w-px h-4 bg-border/60 shrink-0" />
        <span className="font-semibold text-sm tracking-tight">{item.name}</span>
        {item.description && <span className="text-[11px] text-muted-foreground truncate max-w-48">— {item.description}</span>}
        <Badge variant="secondary" className="font-mono text-[10px] h-5 px-1.5">v{pipeline?.version ?? '2'}</Badge>
        <span className="text-[10px] text-muted-foreground/60">{nodes.length} nodes</span>

        <div className="ml-auto flex items-center gap-0">
          {/* Group 1: edit actions */}
          <div className="flex items-center gap-1 pr-2 mr-1 border-r border-border/50">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => {
                const aiTool = tools.find(t => t.nodeType === 'ai' || t.category === 'ai') ?? {
                  name: 'ai_agent', category: 'ai', nodeType: 'ai' as const,
                  description: 'AI agent node', inputs: [], outputType: 'any',
                  requiresLLM: true, capabilities: [],
                };
                handleAddNode(aiTool);
              }}
            >
              <Plus size={11} strokeWidth={2.5} /> AI Node
            </Button>
            {dirty ? (
              <Button size="sm" className="h-7 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white" onClick={handleSave} disabled={saving}>
                {saving ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
                Save
              </Button>
            ) : null}
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleValidate} disabled={validateMutation.isPending}>
              <CheckCircle size={11} /> Validate
            </Button>
          </div>

          {/* Group 2: view toggles */}
          <div className="flex items-center gap-0.5 pr-2 mr-1 border-r border-border/50">
            <Button variant="outline" size="sm" className={tbBtn(showVisualize)} onClick={() => togglePanel('visualize')}>
              <GitBranch size={11} /> Diagram
            </Button>
            <Button variant="outline" size="sm" className={tbBtn(showLogs)} onClick={() => togglePanel('logs')}>
              <ScrollText size={11} /> Logs
            </Button>
            <Button variant="outline" size="sm" className={tbBtn(showSchedule)} onClick={() => togglePanel('schedule')}>
              <Calendar size={11} /> Schedule
            </Button>
          </div>

          {/* Group 3: run + export + delete */}
          <div className="flex items-center gap-1 pl-0">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleExport} disabled={exportMutation.isPending}>
              <Download size={11} /> Export
            </Button>
            <Button
              size="sm"
              className={`h-7 text-xs gap-1.5 transition-colors ${showRun ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-600/90 hover:bg-emerald-500 text-white'}`}
              onClick={() => togglePanel('run')}
            >
              <Play size={11} strokeWidth={2.5} /> Run
            </Button>
            <Button
              variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/8"
              onClick={() => deleteMutation.mutate(item.name)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 size={11} />
            </Button>
          </div>
        </div>
      </div>

      {/* Validation banner */}
      {validation && (
        <div className={`flex items-start gap-2.5 px-3 py-2 text-xs border-b ${
          validation.valid
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            : 'bg-destructive/5 border-destructive/20 text-destructive'
        }`}>
          {validation.valid
            ? <CheckCircle size={12} className="shrink-0 mt-0.5" />
            : <XCircle size={12} className="shrink-0 mt-0.5" />
          }
          <span className="font-mono whitespace-pre-wrap text-[11px]">{validation.output}</span>
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
          <>
            {/* Desktop: side panel */}
            <div className="hidden md:flex w-64 shrink-0 border-l flex-col">
              <NodeConfigPanel
                node={selectedNode}
                onChange={handleNodeChange}
                onClose={() => setSelectedNode(null)}
              />
            </div>
            {/* Mobile: bottom sheet */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t max-h-[50vh] overflow-y-auto">
              <NodeConfigPanel
                node={selectedNode}
                onChange={handleNodeChange}
                onClose={() => setSelectedNode(null)}
              />
            </div>
          </>
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
    <div className="flex flex-col h-full min-h-0 p-6 gap-5 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Workflow size={16} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">Pipelines</h1>
            <p className="text-[11px] text-muted-foreground">
              {pipelines.length} workflow{pipelines.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
          onClick={() => setShowCreate(v => !v)}
        >
          <Plus size={12} strokeWidth={2.5} /> New Pipeline
        </Button>
      </div>

      {showCreate && (
        <CreatePipelineForm
          onSuccess={() => { setShowCreate(false); refetch(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw size={13} className="animate-spin" /> Loading…
        </div>
      )}

      <div className="flex flex-col gap-2">
        {pipelines.map(p => (
          <div key={p.name} className="group flex flex-col rounded-xl border border-border/40 overflow-hidden bg-card hover:border-border/70 hover:shadow-sm transition-all duration-150">
            <div className="flex items-stretch">
              <div className="w-[3px] shrink-0 bg-gradient-to-b from-indigo-500/60 to-indigo-600/30 group-hover:from-indigo-400/80 group-hover:to-indigo-500/50 transition-all" />
              <div className="flex-1 flex items-center gap-3 px-4 py-3.5">
                <Link href={`/studio/pipelines/${p.name}`} className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="font-semibold text-sm tracking-tight group-hover:text-indigo-400 transition-colors">{p.name}</span>
                  {p.description
                    ? <span className="text-[11px] text-muted-foreground truncate">{p.description}</span>
                    : <span className="text-[11px] text-muted-foreground/40 italic">No description</span>
                  }
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground/50 font-mono">v{p.version}</span>
                  <Button
                    size="sm"
                    variant={runningPipeline === p.name ? 'default' : 'ghost'}
                    className={`h-7 text-xs gap-1.5 shrink-0 transition-colors ${
                      runningPipeline === p.name
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/8'
                    }`}
                    onClick={() => setRunningPipeline(r => r === p.name ? null : p.name)}
                  >
                    <Play size={10} strokeWidth={2.5} />
                    {runningPipeline === p.name ? 'Running' : 'Run'}
                  </Button>
                </div>
              </div>
            </div>
            {runningPipeline === p.name && (
              <RunPanel name={p.name} onClose={() => setRunningPipeline(null)} />
            )}
          </div>
        ))}
        {pipelines.length === 0 && !isLoading && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border/40 flex items-center justify-center">
              <Workflow size={20} className="text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">No pipelines yet</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Create a workflow to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
