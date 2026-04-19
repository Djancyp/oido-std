import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Agent } from '@/app/api/agents/route';

export const agentKeys = {
  all: ['agents'] as const,
  list: () => [...agentKeys.all, 'list'] as const,
};

/* --- API Callers --- */

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
export async function fetchAgents(): Promise<Agent[]> {
  const response = await fetch(`${baseUrl}/api/agents`);
  if (!response.ok) return [];
  return response.json();
}

async function createAgent(name: string) {
  const response = await fetch('/api/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return response.json();
}

// --- ADD THESE TWO API CALLERS ---
async function updateAgent({ name, data }: { name: string; data: any }) {
  const response = await fetch('/api/agents', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, ...data }),
  });
  return response.json();
}

async function deleteAgent(name: string) {
  const response = await fetch('/api/agents', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return response.json();
}

/* --- Exported Hooks --- */

export function useAgentsQuery() {
  return useQuery({
    queryKey: agentKeys.list(),
    queryFn: fetchAgents,
  });
}

export function useAgents() {
  return useQuery({
    queryKey: agentKeys.list(),
    queryFn: fetchAgents,
  });
}

export function useCreateAgentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAgent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: agentKeys.list() }),
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAgent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: agentKeys.list() }),
  });
}

// --- ADD THESE TWO HOOKS ---
export function useUpdateAgentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAgent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: agentKeys.list() }),
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAgent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: agentKeys.list() }),
  });
}

export function useDeleteAgentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAgent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: agentKeys.list() }),
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAgent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: agentKeys.list() }),
  });
}
