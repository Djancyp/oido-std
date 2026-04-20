'use client';

import React, { useState, useEffect } from 'react';
import { SidebarGroup, SidebarGroupLabel } from '@/components/ui/sidebar';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight, Plus, Bot, Loader2 } from 'lucide-react';
import { AgentDropdown } from './agent_dropdown';
import { useModal } from '@/contexts/Modal';
import { useAgents } from '@/contexts/Agents';
import { useSkills } from '@/contexts/Skills';
import { useTools } from '@/contexts/Tools';
import { useModels } from '@/contexts/Models';
import { useCreateAgentMutation, useDeleteAgentMutation, CreateAgentPayload } from '@/hooks/useAgents';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MultiSelect, SingleSelect } from '@/components/ui/multi-select';

/* =========================
   Memoized Item
========================= */
const AgentItem = React.memo(
  ({
    agent,
    depth = 0,
    onAdd,
    onEdit,
    onDelete,
    isSelected,
    onSelect,
  }: {
    agent: any;
    depth?: number;
    onAdd: (parentId: string) => void;
    onEdit: (agentId: string) => void;
    onDelete: (agentId: string) => void;
    isSelected: boolean;
    onSelect: (agentId: string) => void;
  }) => {
    const [open, setOpen] = useState(true);
    const hasChildren = !!(agent.subagents && agent.subagents.length > 0);

    return (
      <div className="select-none">
        <div
          className={`flex items-center gap-2 py-1.5 cursor-pointer group hover:bg-sidebar-accent rounded-md px-2 ${
            isSelected ? 'bg-sidebar-accent' : ''
          }`}
          style={{ paddingLeft: depth * 12 + 8 }}
          onClick={() => onSelect(agent.agent_id)}
        >
          <div className="flex items-center w-4">
            {hasChildren && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  setOpen(!open);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}
          </div>

          <Bot size={16} className={depth === 0 ? 'text-black' : 'text-slate-600'} />
          <span className="text-sm text-slate-900 truncate">{agent.agent_name}</span>

          <div className="ml-auto opacity-0 group-hover:opacity-100">
            <AgentDropdown
              agentType="agent"
              agentId={agent.agent_id}
              onAddSubAgent={onAdd}
              onEditAgent={onEdit}
              onDeleteAgent={onDelete}
            />
          </div>
        </div>

        {open && hasChildren && (
          <div className="flex flex-col">
            {agent.subagents.map((child: any) => (
              <AgentItem
                key={child.agent_id}
                agent={child}
                depth={depth + 1}
                onAdd={onAdd}
                onEdit={onEdit}
                onDelete={onDelete}
                isSelected={isSelected}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

AgentItem.displayName = 'AgentItem';

/* =========================
   Agent Create Form
========================= */
type SelectOption = { value: string; label: string; group?: string };

function AgentCreateForm({
  onSuccess,
  onCancel,
  modelOptions,
  skillOptions,
  toolOptions,
}: {
  onSuccess: () => void;
  onCancel: () => void;
  modelOptions: SelectOption[];
  skillOptions: SelectOption[];
  toolOptions: SelectOption[];
}) {
  const createMutation = useCreateAgentMutation();

  const [form, setForm] = React.useState<CreateAgentPayload>({
    name: '',
    system_prompt: '',
    model: '',
    skills: [],
    exclude_tools: [],
  });

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    await createMutation.mutateAsync({
      ...form,
      name: form.name.trim(),
      system_prompt: form.system_prompt?.trim() || undefined,
      model: form.model?.trim() || undefined,
    });
    onSuccess();
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold">Name <span className="text-destructive">*</span></label>
        <Input
          autoFocus
          placeholder="my-agent"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="h-9 font-mono text-sm"
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
      </div>

      {/* Model */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold">Model</label>
        <SingleSelect
          options={modelOptions}
          value={form.model ?? ''}
          onChange={v => setForm(f => ({ ...f, model: v }))}
          placeholder="e.g. openrouter/free"
        />
      </div>

      {/* System Prompt */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold">System Prompt</label>
        <textarea
          placeholder="You are a helpful assistant specialized in..."
          value={form.system_prompt}
          onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
          className="min-h-[90px] w-full rounded-md border bg-muted/20 p-2.5 text-xs leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Skills */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold">Skills</label>
        <MultiSelect
          options={skillOptions}
          selected={form.skills ?? []}
          onChange={v => setForm(f => ({ ...f, skills: v }))}
          placeholder="Select skills..."
        />
      </div>

      {/* Exclude Tools */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold">Exclude Tools</label>
        <MultiSelect
          options={toolOptions}
          selected={form.exclude_tools ?? []}
          onChange={v => setForm(f => ({ ...f, exclude_tools: v }))}
          placeholder="Select tools to exclude..."
        />
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!form.name.trim() || createMutation.isPending}
        >
          {createMutation.isPending ? <Loader2 size={13} className="animate-spin mr-1" /> : null}
          Create Agent
        </Button>
      </div>
    </div>
  );
}

/* =========================
   Main Component
========================= */

export function AgentsApi() {
  const { agents, isLoading, isError, selectedAgent, selectAgent } = useAgents();
  const { openModal, closeModal } = useModal();
  const { skills } = useSkills();
  const { all: allTools } = useTools();
  const { models } = useModels();
  const router = useRouter();
  const pathname = usePathname();

  const deleteMutation = useDeleteAgentMutation();

  const modelOptions = (models?.providers ?? []).flatMap(p =>
    p.models.map(m => ({ value: m.id, label: m.id, group: p.provider }))
  );
  const skillOptions = skills.map(s => ({ value: s.name, label: s.name }));
  const toolOptions = allTools.map(t => ({ value: t.name, label: t.name, group: t.source }));

  // Select first agent on load if available
  useEffect(() => {
    if (agents && agents.length > 0 && !selectedAgent) {
      selectAgent(agents[0].agent_id);
    }
  }, [agents, selectedAgent, selectAgent]);

  const handleAddRootAgent = () => {
    openModal({
      title: 'Create Agent',
      description: 'Configure your new agent',
      size: 'lg',
      content: (
        <AgentCreateForm
          onSuccess={closeModal}
          onCancel={closeModal}
          modelOptions={modelOptions}
          skillOptions={skillOptions}
          toolOptions={toolOptions}
        />
      ),
      footer: null,
    });
  };

  const handleAddSubAgent = (parentId: string) => {
    console.log(`Adding subagent to: ${parentId}`);
    // Future: implement subagent creation mutation here
  };

  const handleEditAgent = (agentId: string) => {
    alert(`Editing: ${agentId}`);
  };

  const handleDeleteAgent = (agentId: string) => {
    if (confirm('Are you sure you want to remove this agent?')) {
      deleteMutation.mutate(agentId);
    }
  };

  const handleSelectAgent = (agentId: string) => {
    selectAgent(agentId);
    if (pathname !== '/studio') router.push('/studio');
  };

  if (isLoading) {
    return (
      <SidebarGroup>
        <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" /> Loading...
        </div>
      </SidebarGroup>
    );
  }

  if (isError) {
    return (
      <SidebarGroup>
        <div className="px-4 py-2 text-sm text-destructive">Failed to load agents.</div>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between px-2 mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Agents</span>
        <button
          onClick={handleAddRootAgent}
          className="p-1 hover:bg-sidebar-accent rounded-md transition-colors"
        >
          <Plus size={14} />
        </button>
      </SidebarGroupLabel>

      <div className="space-y-0.5">
        {agents && agents.length > 0 ? (
          agents.map(agent => (
            <AgentItem
              key={agent.agent_id}
              agent={agent}
              onAdd={handleAddSubAgent}
              onEdit={handleEditAgent}
              onDelete={handleDeleteAgent}
              isSelected={selectedAgent?.agent_id === agent.agent_id}
              onSelect={handleSelectAgent}
            />
          ))
        ) : (
          <div className="px-4 py-2 text-xs text-muted-foreground italic">No agents found.</div>
        )}
      </div>
    </SidebarGroup>
  );
}

