'use client';

import { SidebarGroup, SidebarGroupAction, SidebarGroupLabel } from '@/components/ui/sidebar';
import { BotMessageSquare, ChevronDown, ChevronRight, Plus, Bot } from 'lucide-react';
import React, { useState, useCallback } from 'react';
import { AgentDropdown } from './agent_dropdown';
import { SearchSelect } from '../ModelSelector';

/* =========================
   Types
========================= */
export type Agent = {
  id: string;
  name: string;
  children?: Agent[];
};

/* =========================
   Pure Logic (Outside Component)
========================= */
// Moving this here ensures it doesn't accidentally closure-capture
// unstable variables during a render cycle.
const createNewAgent = (name: string): Agent => ({
  id: crypto.randomUUID(),
  name,
  children: [],
});

/* =========================
   Memoized Item
========================= */
const AgentItem = React.memo(
  ({
    agent,
    depth = 0,
    onAdd,
  }: {
    agent: Agent;
    depth?: number;
    onAdd: (parentId: string) => void;
  }) => {
    const [open, setOpen] = useState(true);

    // We strictly limit depth to 0 for adding sub-agents
    const canHaveSubAgents = depth === 0;
    const hasChildren = !!(agent.children && agent.children.length > 0);

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
              className={depth === 0 ? 'text-foreground' : 'text-muted-foreground'}
            />
          <span className="text-sm text-foreground">{agent.name}</span>

          <div className="ml-auto">
            <AgentDropdown agentType="agent" agentId={agent.id} />
          </div>
        </div>

        {open && hasChildren && (
          <div className="flex flex-col">
            {agent.children!.map(child => (
              <AgentItem key={child.id} agent={child} depth={depth + 1} onAdd={onAdd} />
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

export function Agents({ initialAgents = [] }: { initialAgents?: Agent[] }) {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);

  // Use functional updates to ensure we aren't creating a race condition
  const handleAddSubAgent = useCallback((parentId: string) => {
    setAgents(currentAgents =>
      currentAgents.map(agent =>
        agent.id === parentId
          ? { ...agent, children: [...(agent.children || []), createNewAgent('New Sub-Agent')] }
          : agent
      )
    );
  }, []);

  const handleAddRootAgent = useCallback(() => {
    setAgents(current => [...current, createNewAgent('New Root Agent')]);
  }, []);

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between px-2 mb-2">
        <span className="text-sm font-bold uppercase tracking-wider text-foreground">Agents</span>
        <button
          onClick={handleAddRootAgent}
          className="p-1.5 hover:bg-sidebar-accent rounded-full transition-colors border border-transparent active:border-border"
          title="Add Root Agent"
        >
          <Plus size={16} />
        </button>
      </SidebarGroupLabel>

      <div className="space-y-1">
        {agents.map(agent => (
          <AgentItem key={agent.id} agent={agent} onAdd={handleAddSubAgent} />
        ))}
      </div>
    </SidebarGroup>
  );
}
