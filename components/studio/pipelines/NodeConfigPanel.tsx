'use client';

import React from 'react';
import { PipelineNode } from '@/app/api/pipelines/route';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { useModels } from '@/contexts/Models';
import { useSkills } from '@/contexts/Skills';
import { useTools } from '@/contexts/Tools';
import { MultiSelect, SingleSelect } from '@/components/ui/multi-select';

type Props = {
  node: PipelineNode;
  onChange: (node: PipelineNode) => void;
  onClose: () => void;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="min-h-[80px] w-full rounded-lg border border-border/50 bg-muted/20 p-2.5 text-xs resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-colors placeholder:text-muted-foreground/40"
    />
  );
}

/* ── Node type configs ── */

function AIConfig({ config, onChange }: { config: any; onChange: (c: any) => void }) {
  const ai = config.ai ?? {};
  const { models } = useModels();
  const { skills } = useSkills();
  const { builtin, mcp, extension } = useTools();

  const modelOptions = (models?.providers ?? []).flatMap(p =>
    (p.models ?? []).map(m => ({ label: m.id, value: m.id }))
  );

  const skillOptions = skills.map(s => ({ label: s.name, value: s.name }));

  const toolOptions = [
    ...builtin.map(t => ({ label: t.name, value: t.name })),
    ...mcp.map(t => ({ label: t.name, value: t.name })),
    ...extension.map(t => ({ label: t.name, value: t.name })),
  ];

  const set = (patch: Record<string, any>) => onChange({ ...config, ai: { ...ai, ...patch } });

  return (
    <>
      <Field label="System Prompt">
        <Textarea
          value={ai.systemPrompt ?? ''}
          onChange={v => set({ systemPrompt: v })}
          placeholder="You are a helpful assistant specialized in..."
        />
      </Field>
      <Field label="Prompt">
        <Textarea
          value={ai.prompt ?? ''}
          onChange={v => set({ prompt: v })}
          placeholder="Your task with {{variable}} interpolation"
        />
      </Field>
      <Field label="Model">
        <SingleSelect
          options={modelOptions}
          value={ai.model ?? ''}
          onChange={v => set({ model: v })}
          placeholder="Default model"
        />
      </Field>
      <Field label="Skills">
        <MultiSelect
          options={skillOptions}
          selected={ai.skills ?? []}
          onChange={v => set({ skills: v })}
          placeholder="Select skills..."
        />
      </Field>
      <Field label="Exclude Tools">
        <MultiSelect
          options={toolOptions}
          selected={ai.excludeTools ?? []}
          onChange={v => set({ excludeTools: v })}
          placeholder="Select tools to exclude..."
        />
      </Field>
    </>
  );
}

function TriggerConfig({ config, onChange }: { config: any; onChange: (c: any) => void }) {
  const trigger = config.trigger ?? {};
  const type = trigger.type ?? 'manual';
  return (
    <>
      <Field label="Trigger Type">
        <select
          value={type}
          onChange={e => onChange({ ...config, trigger: { type: e.target.value } })}
          className="h-8 rounded-md border bg-background px-2 text-xs"
        >
          <option value="manual">Manual</option>
          <option value="schedule">Schedule (cron)</option>
          <option value="webhook">Webhook</option>
        </select>
      </Field>
      {type === 'schedule' && (
        <Field label="Cron Expression">
          <Input value={trigger.cronExpr ?? ''} onChange={e => onChange({ ...config, trigger: { ...trigger, cronExpr: e.target.value } })} className="h-8 text-xs font-mono" placeholder="0 9 * * 1-5" />
        </Field>
      )}
      {type === 'webhook' && (
        <Field label="Webhook Path">
          <Input value={trigger.webhookPath ?? ''} onChange={e => onChange({ ...config, trigger: { ...trigger, webhookPath: e.target.value } })} className="h-8 text-xs font-mono" placeholder="/webhook/my-pipeline" />
        </Field>
      )}
    </>
  );
}

function BuiltinToolConfig({ config, onChange }: { config: any; onChange: (c: any) => void }) {
  const tool = config.builtinTool ?? {};
  const params = tool.parameters ?? {};

  const setParam = (key: string, val: string) =>
    onChange({ ...config, builtinTool: { ...tool, parameters: { ...params, [key]: val } } });

  return (
    <>
      <Field label="Tool">
        <Input value={tool.toolName ?? ''} className="h-8 text-xs font-mono bg-muted/30" readOnly />
      </Field>
      {Object.entries(params).map(([k, v]) => (
        <Field key={k} label={k}>
          <Input value={String(v ?? '')} onChange={e => setParam(k, e.target.value)} className="h-8 text-xs font-mono" />
        </Field>
      ))}
    </>
  );
}

function McpToolConfig({ config, onChange }: { config: any; onChange: (c: any) => void }) {
  const mcp = config.mcpTool ?? {};
  return (
    <>
      <Field label="Server Name">
        <Input value={mcp.serverName ?? ''} onChange={e => onChange({ ...config, mcpTool: { ...mcp, serverName: e.target.value } })} className="h-8 text-xs font-mono" placeholder="my-mcp-server" />
      </Field>
      <Field label="Tool Name">
        <Input value={mcp.toolName ?? ''} onChange={e => onChange({ ...config, mcpTool: { ...mcp, toolName: e.target.value } })} className="h-8 text-xs font-mono" placeholder="tool_name" />
      </Field>
    </>
  );
}

function ConditionConfig({ config, onChange }: { config: any; onChange: (c: any) => void }) {
  const cond = config.condition ?? { conditions: [], logic: 'and' };
  const conditions = cond.conditions ?? [];

  const addCondition = () => onChange({ ...config, condition: { ...cond, conditions: [...conditions, { variable: '', operator: 'eq', value: '' }] } });
  const removeCondition = (i: number) => onChange({ ...config, condition: { ...cond, conditions: conditions.filter((_: any, idx: number) => idx !== i) } });
  const updateCondition = (i: number, field: string, val: string) => {
    const next = conditions.map((c: any, idx: number) => idx === i ? { ...c, [field]: val } : c);
    onChange({ ...config, condition: { ...cond, conditions: next } });
  };

  return (
    <>
      <Field label="Logic">
        <select value={cond.logic ?? 'and'} onChange={e => onChange({ ...config, condition: { ...cond, logic: e.target.value } })} className="h-8 rounded-md border bg-background px-2 text-xs">
          <option value="and">AND</option>
          <option value="or">OR</option>
          <option value="not">NOT</option>
        </select>
      </Field>
      <Field label="Conditions">
        <div className="flex flex-col gap-1.5">
          {conditions.map((c: any, i: number) => (
            <div key={i} className="flex gap-1 items-center">
              <Input value={c.variable ?? ''} onChange={e => updateCondition(i, 'variable', e.target.value)} className="h-7 text-xs font-mono flex-1" placeholder="{{nodes.x.output}}" />
              <select value={c.operator ?? 'eq'} onChange={e => updateCondition(i, 'operator', e.target.value)} className="h-7 rounded-md border bg-background px-1 text-xs shrink-0">
                {['eq', 'neq', 'contains', 'regex', 'gt', 'lt', 'is_true', 'is_false', 'is_empty'].map(op => <option key={op} value={op}>{op}</option>)}
              </select>
              <Input value={c.value ?? ''} onChange={e => updateCondition(i, 'value', e.target.value)} className="h-7 text-xs flex-1" placeholder="value" />
              <button onClick={() => removeCondition(i)} className="text-muted-foreground hover:text-destructive shrink-0"><X size={11} /></button>
            </div>
          ))}
          <button onClick={addCondition} className="text-[11px] text-muted-foreground hover:text-foreground text-left px-1">+ Add condition</button>
        </div>
      </Field>
    </>
  );
}

function FlowConfig({ config, onChange, nodeLabel }: { config: any; onChange: (c: any) => void; nodeLabel: string }) {
  if (nodeLabel === 'delay') {
    const flow = config.flow ?? {};
    return (
      <Field label="Delay (ms)">
        <Input type="number" value={flow.delayMs ?? ''} onChange={e => onChange({ ...config, flow: { ...flow, delayMs: Number(e.target.value) } })} className="h-8 text-xs font-mono" placeholder="1000" />
      </Field>
    );
  }
  if (nodeLabel === 'for_each') {
    const flow = config.flow ?? {};
    return (
      <>
        <Field label="Items Variable">
          <Input value={flow.forEachItem ?? ''} onChange={e => onChange({ ...config, flow: { ...flow, forEachItem: e.target.value } })} className="h-8 text-xs font-mono" placeholder="{{nodes.x.output}}" />
        </Field>
        <Field label="Max Concurrency">
          <Input type="number" value={flow.maxConcurrency ?? ''} onChange={e => onChange({ ...config, flow: { ...flow, maxConcurrency: Number(e.target.value) } })} className="h-8 text-xs font-mono" placeholder="0 = unlimited" />
        </Field>
      </>
    );
  }
  return <p className="text-xs text-muted-foreground">Parallel — connects to child nodes via edges.</p>;
}

function TransformConfig({ config, onChange }: { config: any; onChange: (c: any) => void }) {
  const t = config.transform ?? {};
  return (
    <>
      <Field label="Operation">
        <select value={t.operation ?? 'template'} onChange={e => onChange({ ...config, transform: { ...t, operation: e.target.value } })} className="h-8 rounded-md border bg-background px-2 text-xs">
          {['template', 'map', 'json_path', 'filter'].map(op => <option key={op} value={op}>{op}</option>)}
        </select>
      </Field>
      <Field label="Input Variable">
        <Input value={t.input ?? ''} onChange={e => onChange({ ...config, transform: { ...t, input: e.target.value } })} className="h-8 text-xs font-mono" placeholder="{{nodes.x.output}}" />
      </Field>
      {t.operation === 'template' && (
        <Field label="Template">
          <Textarea value={t.template ?? ''} onChange={v => onChange({ ...config, transform: { ...t, template: v } })} placeholder="Hello {{input}}" />
        </Field>
      )}
    </>
  );
}

const NODE_TYPE_COLORS: Record<string, string> = {
  trigger: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  ai: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  builtin_tool: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  mcp_tool: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  condition: 'text-red-400 bg-red-500/10 border-red-500/20',
  flow: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  transform: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
};

/* ── Main panel ── */
export function NodeConfigPanel({ node, onChange, onClose }: Props) {
  const updateConfig = (newConfig: any) => onChange({ ...node, config: newConfig });
  const typeCls = NODE_TYPE_COLORS[node.type] ?? 'text-muted-foreground bg-muted border-border';

  const renderConfig = () => {
    switch (node.type) {
      case 'ai':           return <AIConfig config={node.config} onChange={updateConfig} />;
      case 'trigger':      return <TriggerConfig config={node.config} onChange={updateConfig} />;
      case 'builtin_tool': return <BuiltinToolConfig config={node.config} onChange={updateConfig} />;
      case 'mcp_tool':     return <McpToolConfig config={node.config} onChange={updateConfig} />;
      case 'condition':    return <ConditionConfig config={node.config} onChange={updateConfig} />;
      case 'flow':         return <FlowConfig config={node.config} onChange={updateConfig} nodeLabel={node.label} />;
      case 'transform':    return <TransformConfig config={node.config} onChange={updateConfig} />;
      default:             return <p className="text-xs text-muted-foreground">No config for type: {node.type}</p>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-card/50">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50 bg-card/80">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${typeCls}`}>
            {node.type}
          </span>
          <span className="text-xs font-semibold tracking-tight">{node.label}</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground/60 hover:text-foreground p-1 rounded hover:bg-muted transition-colors">
          <X size={13} />
        </button>
      </div>

      <div className="flex flex-col gap-3.5 p-3 overflow-y-auto flex-1">
        <Field label="Label">
          <Input
            value={node.label}
            onChange={e => onChange({ ...node, label: e.target.value })}
            className="h-8 text-xs border-border/50 bg-muted/20 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50"
          />
        </Field>
        {renderConfig()}
      </div>
    </div>
  );
}
