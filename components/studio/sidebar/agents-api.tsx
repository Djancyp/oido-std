'use client';

import React, { useState, useEffect } from 'react';
import { SidebarGroup, SidebarGroupLabel } from '@/components/ui/sidebar';
import { ChevronDown, ChevronRight, Plus, Bot, Loader2 } from 'lucide-react';
import { AgentDropdown } from './agent_dropdown';
import { useModal } from '@/contexts/Modal';
import { useAgents } from '@/contexts/Agents';
import { useCreateAgentMutation, useDeleteAgentMutation } from '@/hooks/useAgents';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
   Main Component
========================= */

export function AgentsApi() {
  const { agents, isLoading, isError, selectedAgent, selectAgent } = useAgents();
  const { openModal, closeModal } = useModal();

  // Mutations
  const createMutation = useCreateAgentMutation();
  const deleteMutation = useDeleteAgentMutation();

  // Select first agent on load if available
  useEffect(() => {
    if (agents && agents.length > 0 && !selectedAgent) {
      selectAgent(agents[0].agent_id);
    }
  }, [agents, selectedAgent, selectAgent]);

  const handleAddRootAgent = () => {
    let agentName = ''; // Local variable to track input

    openModal({
      title: 'Create New Agent',
      description: 'Enter a name for your new agent',
      content: (
        <div className="py-4">
          <Input
            autoFocus
            placeholder="Agent name..."
            onChange={e => (agentName = e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                createMutation.mutate(agentName);
                closeModal();
              }
            }}
          />
        </div>
      ),
      footer: (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={closeModal}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (agentName.trim()) {
                createMutation.mutate(agentName.trim());
                closeModal();
              }
            }}
          >
            Create
          </Button>
        </div>
      ),
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
          disabled={createMutation.isPending}
          className="p-1 hover:bg-sidebar-accent rounded-md transition-colors"
        >
          {createMutation.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Plus size={14} />
          )}
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

