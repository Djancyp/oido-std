'use client';

import { SidebarGroup, SidebarGroupAction, SidebarGroupLabel } from '@/components/ui/sidebar';
import { BotMessageSquare, ChevronDown, ChevronRight, Plus, Bot } from 'lucide-react';
import React, { useState } from 'react';
import { AgentDropdown } from './agent_dropdown';
import { useAgents, useCreateAgent, useDeleteAgent, useUpdateAgent } from '@/hooks/useAgents';
import { useModal } from '@/contexts/Modal';

/* =========================
   Types
========================= */
export type Agent = {
  agent_id: string;
  agent_name: string;
  tab_ids: string[];
  exclude_tools: string[];
  skills: string[];
  subagents: Agent[];
};

/* =========================
   Memoized Item
========================= */
const AgentItem = React.memo(
  ({
    agent,
    depth = 0,
    onAdd,
    onEdit,
    onDelete
  }: {
    agent: Agent;
    depth?: number;
    onAdd: (parentId: string) => void;
    onEdit: (agentId: string) => void;
    onDelete: (agentId: string) => void;
  }) => {
    const [open, setOpen] = useState(true);

    // We strictly limit depth to 0 for adding sub-agents
    const canHaveSubAgents = depth === 0;
    const hasChildren = !!(agent.subagents && agent.subagents.length > 0);

    return (
      <div className="select-none">
        <div
          className="flex items-center gap-2 py-1.5 cursor-pointer group hover:bg-sidebar-accent rounded-md px-2"
          style={{ paddingLeft: depth * 12 + 8 }}
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

            <Bot
              size={16}
              className={
                depth === 0
                  ? 'text-black'
                  : 'text-slate-800'
              }
            />
          <span className={`text-sm text-slate-900`}>{agent.agent_name}</span>

          <div className="ml-auto">
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
            {agent.subagents!.map(child => (
              <AgentItem 
                key={child.agent_id} 
                agent={child} 
                depth={depth + 1} 
                onAdd={onAdd}
                onEdit={onEdit}
                onDelete={onDelete}
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
  const { data: agents, isLoading, isError, error } = useAgents();
  const createAgent = useCreateAgent();
  const deleteAgent = useDeleteAgent();
  const updateAgent = useUpdateAgent();
  const { openModal } = useModal();

  // Handle adding a sub-agent (stub implementation)
  const handleAddSubAgent = (parentId: string) => {
    // For now, we'll just log to console - in a real implementation
    // this would make an API call to add a subagent
    console.log(`Adding subagent to parent agent: ${parentId}`);
  };

  // Handle creating a new root agent with modal
  const handleAddRootAgent = () => {
    openModal({
      title: 'Create New Agent',
      description: 'Enter a name for your new agent',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="agent-name" className="text-right text-sm font-medium">
              Name
            </label>
            <input
              id="agent-name"
              type="text"
              className="col-span-3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter agent name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const input = e.target as HTMLInputElement;
                  if (input.value.trim()) {
                    createAgent.mutate(input.value.trim());
                  }
                }
              }}
            />
          </div>
        </div>
      ),
      footer: (
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={() => {}}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={(e) => {
              const input = e.currentTarget.parentElement?.previousElementSibling?.querySelector('input') as HTMLInputElement;
              if (input?.value.trim()) {
                createAgent.mutate(input.value.trim());
              }
            }}
          >
            Create
          </button>
        </div>
      ),
    });
  };

  // Handle editing an agent (stub implementation)
  const handleEditAgent = (agentId: string) => {
    // For now, we'll just show an alert - in a real implementation, 
    // this would open a modal or redirect to an edit page
    alert(`Editing agent with ID: ${agentId}`);
  };

  // Handle deleting an agent
  const handleDeleteAgent = (agentId: string) => {
    deleteAgent.mutate(agentId);
  };

  if (isLoading) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="flex items-center justify-between px-2 mb-2">
          <span className="text-sm font-bold uppercase tracking-wider text-black">Agents</span>
        </SidebarGroupLabel>
        <div className="px-2 py-2 text-sm text-gray-500">Loading agents...</div>
      </SidebarGroup>
    );
  }

  if (isError) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="flex items-center justify-between px-2 mb-2">
          <span className="text-sm font-bold uppercase tracking-wider text-black">Agents</span>
        </SidebarGroupLabel>
        <div className="px-2 py-2 text-sm text-red-500">Error loading agents: {(error as Error).message}</div>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between px-2 mb-2">
        <span className="text-sm font-bold uppercase tracking-wider text-black">Agents</span>
        <button
          onClick={handleAddRootAgent}
          disabled={createAgent.isPending || isLoading}
          className="p-1.5 hover:bg-sidebar-accent rounded-full transition-colors border border-transparent active:border-slate-200 disabled:opacity-50"
          title="Add Root Agent"
        >
          <Plus size={16} />
        </button>
      </SidebarGroupLabel>

      <div className="space-y-1">
        {agents?.map(agent => (
          <AgentItem 
            key={agent.agent_id} 
            agent={agent} 
            onAdd={handleAddSubAgent}
            onEdit={handleEditAgent}
            onDelete={handleDeleteAgent}
          />
        ))}
      </div>
    </SidebarGroup>
  );
}