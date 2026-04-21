'use client';

import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Agent } from '@/app/api/agents/route';
import { useAgentsQuery, agentKeys, RawSession, RawTabConversation } from '@/hooks/useAgents';

type Tab = {
  id: string;
  name: string;
  agentId: string;
  createdAt: Date;
};

type AgentContextType = {
  agents: Agent[];
  isLoading: boolean;
  isError: boolean;
  refreshAgents: () => void;
  selectedAgent: Agent | null;
  selectedTab: Tab | null;
  selectAgent: (agentId: string) => void;
  createTab: (agentId: string, name?: string) => Tab;
  selectTab: (tabId: string) => void;
  deleteTab: (tabId: string) => void;
  getTabsForAgent: (agentId: string) => Tab[];
  loadTabsForAgent: (agentId: string) => Promise<Tab[]>;
  initialConversation: RawTabConversation | null;
};

const AgentContext = createContext<AgentContextType | undefined>(undefined);

function makeTab(agentId: string, name = 'New Tab', id?: string): Tab {
  return {
    id: id ?? `tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    name,
    agentId,
    createdAt: new Date(),
  };
}

function sessionsToTabs(sessions: RawSession[]): Tab[] {
  const seen = new Set<string>();
  return sessions
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .filter(s => {
      if (seen.has(s.tabId)) return false;
      seen.add(s.tabId);
      return true;
    })
    .map(s => ({
      id: s.tabId,
      name:
        s.firstPrompt && s.firstPrompt.length > 20
          ? `${s.firstPrompt.substring(0, 20)}...`
          : s.firstPrompt || `Session ${s.id.substring(0, 8)}`,
      agentId: s.agentId,
      createdAt: new Date(s.updatedAt),
    }));
}

export function AgentsProvider({
  children,
  initialAgents = [],
  initialSessions = [],
  initialConversation = null,
}: {
  children: ReactNode;
  initialAgents?: Agent[];
  initialSessions?: RawSession[];
  initialConversation?: RawTabConversation | null;
}) {
  const queryClient = useQueryClient();
  const initialTabs = sessionsToTabs(initialSessions);
  const defaultAgent = initialAgents[0] ?? null;
  const defaultTabId = defaultAgent?.tab_ids?.[0];
  const defaultTab = defaultTabId
    ? (initialTabs.find(t => t.id === defaultTabId) ??
        makeTab(defaultAgent!.agent_id, 'Tab 1', defaultTabId))
    : null;

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(defaultAgent);
  const [selectedTab, setSelectedTab] = useState<Tab | null>(defaultTab);
  const [tabs, setTabs] = useState<Tab[]>(initialTabs);
  const loadedAgentIds = useRef<Set<string>>(
    new Set(initialSessions.map(s => s.agentId))
  );

  const { data, isLoading, isError, refetch } = useAgentsQuery({
    initialData: initialAgents.length > 0 ? initialAgents : undefined,
  });

  // ── Stable callbacks ────────────────────────────────────────────────────────

  const createTab = useCallback((agentId: string, name = 'New Tab'): Tab => {
    const tab = makeTab(agentId, name);
    setTabs(prev => [...prev, tab]);
    return tab;
  }, []);

  const loadTabsForAgent = useCallback(async (agentId: string): Promise<Tab[]> => {
    try {
      // Use the sessions list API to get all sessions for the agent
      const res = await fetch('/api/sessions/list');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      // Filter sessions for the specific agent and transform to our Tab type
      const agentSessions: any[] = json.filter((session: any) => session.agentId === agentId);
      agentSessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      const seen = new Set<string>();
      const agentTabs: Tab[] = agentSessions
        .filter((session: any) => {
          if (seen.has(session.tabId)) return false;
          seen.add(session.tabId);
          return true;
        })
        .map((session: any) => ({
          id: session.tabId,
          name: session.firstPrompt?.length > 20
            ? `${session.firstPrompt.substring(0, 20)}...`
            : session.firstPrompt || `Session ${session.id.substring(0, 8)}`,
          agentId,
          createdAt: new Date(session.updatedAt),
        }));

      console.log(`[tabs] loadTabsForAgent(${agentId}) resolved ${agentTabs.length} tabs:`, agentTabs.map(t => ({ id: t.id, name: t.name })));
      setTabs(prev => [...prev.filter(t => t.agentId !== agentId), ...agentTabs]);
      return agentTabs;
    } catch (err) {
      console.error(`[tabs] load failed for agent ${agentId}:`, err);
      return [];
    }
  }, []);

  const selectAgent = useCallback(
    (agentId: string) => {
      setSelectedAgent(prev => {
        if (prev?.agent_id === agentId) return prev;
        return (
          (queryClient.getQueryData<Agent[]>(agentKeys.list()) ?? []).find(
            a => a.agent_id === agentId
          ) ?? prev
        );
      });
    },
    [queryClient]
  );

  const selectTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const tab = prev.find(t => t.id === tabId);
      if (tab) setSelectedTab(tab);
      return prev;
    });
  }, []);

  const deleteTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== tabId);
      setSelectedTab(sel => {
        if (sel?.id !== tabId) return sel;
        const agentId = prev.find(t => t.id === tabId)?.agentId;
        return next.find(t => t.agentId === agentId) ?? null;
      });
      return next;
    });
  }, []);

  const getTabsForAgent = useCallback(
    (agentId: string) => {
      const result = tabs.filter(t => t.agentId === agentId);
      console.log(`[tabs] getTabsForAgent(${agentId}):`, result.map(t => ({ id: t.id, name: t.name })));
      return result;
    },
    [tabs]
  );

  // ── Effects ─────────────────────────────────────────────────────────────────

  // Auto-select first agent + sync selectedAgent when data refreshes
  useEffect(() => {
    if (!data || data.length === 0) return;
    if (!selectedAgent) {
      setSelectedAgent(data[0]);
    } else {
      const updated = data.find(a => a.agent_id === selectedAgent.agent_id);
      if (updated) setSelectedAgent(updated);
    }
  }, [data]);

  // Seed tabs from agent.tab_ids and load full tab data
  useEffect(() => {
    if (!data) return;
    console.log('[tabs] data agents:', data.map(a => ({ id: a.agent_id, tab_ids: a.tab_ids })));
    console.log('[tabs] loadedAgentIds:', [...loadedAgentIds.current]);
    console.log('[tabs] current tabs state:', tabs.map(t => ({ id: t.id, agentId: t.agentId, name: t.name })));
    for (const agent of data) {
      if (loadedAgentIds.current.has(agent.agent_id)) {
        console.log(`[tabs] skip agent ${agent.agent_id} (already loaded)`);
        continue;
      }
      loadedAgentIds.current.add(agent.agent_id);

      if (agent.tab_ids?.length > 0) {
        const seedTabs = agent.tab_ids.map((tid: string, i: number) =>
          makeTab(agent.agent_id, `Tab ${i + 1}`, tid)
        );
        console.log(`[tabs] seeding ${seedTabs.length} tabs for agent ${agent.agent_id}:`, seedTabs.map(t => t.id));
        setTabs(prev => [...prev.filter(t => t.agentId !== agent.agent_id), ...seedTabs]);
      }

      loadTabsForAgent(agent.agent_id);
    }
  }, [data, loadTabsForAgent]);

  // When selected agent changes, select its first tab_ids[0]
  useEffect(() => {
    if (!selectedAgent) return;

    setSelectedTab(sel => {
      // Already on a tab for this agent — keep it
      if (sel?.agentId === selectedAgent.agent_id) return sel;

      // Use the first tab_id from the agent directly
      const firstTabId = selectedAgent.tab_ids?.[0];
      if (firstTabId) {
        // Try to find the enriched tab, fall back to a minimal one
        return (
          tabs.find(t => t.id === firstTabId) ??
          makeTab(selectedAgent.agent_id, 'Tab 1', firstTabId)
        );
      }

      // Agent has no tabs — pick any existing tab or create one
      const existing = tabs.find(t => t.agentId === selectedAgent.agent_id);
      if (existing) return existing;

      const fresh = makeTab(selectedAgent.agent_id, 'Default');
      setTabs(prev => [...prev, fresh]);
      return fresh;
    });
  }, [selectedAgent, tabs]);

  return (
    <AgentContext.Provider
      value={{
        agents: data ?? [],
        isLoading,
        isError,
        refreshAgents: refetch,
        selectedAgent,
        selectedTab,
        selectAgent,
        createTab,
        selectTab,
        deleteTab,
        getTabsForAgent,
        loadTabsForAgent,
        initialConversation,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export const useAgents = () => {
  const context = useContext(AgentContext);
  if (!context) throw new Error('useAgents must be used within AgentsProvider');
  return context;
};
