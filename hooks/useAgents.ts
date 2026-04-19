'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Agent } from '@/components/studio/sidebar/agents-api';

// Query key factory for agents
export const agentKeys = {
  all: ['agents'] as const,
  list: () => [...agentKeys.all, 'list'] as const,
  detail: (id: string) => [...agentKeys.all, 'detail', id] as const,
};

// Fetch all agents
async function fetchAgents(): Promise<Agent[]> {
  const response = await fetch('/api/agents');
  if (!response.ok) {
    throw new Error(`Failed to fetch agents: ${response.status}`);
  }
  return response.json();
}

// Create a new agent
async function createAgent(name: string): Promise<{ success: boolean; output: string }> {
  const response = await fetch('/api/agents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create agent: ${response.status}`);
  }
  
  return response.json();
}

// Update an agent
async function updateAgent(name: string, data: any): Promise<{ success: boolean; output: string }> {
  const response = await fetch('/api/agents', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, ...data }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update agent: ${response.status}`);
  }
  
  return response.json();
}

// Delete an agent
async function deleteAgent(name: string): Promise<{ success: boolean; output: string }> {
  const response = await fetch('/api/agents', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete agent: ${response.status}`);
  }
  
  return response.json();
}

// Custom hook for fetching agents
export function useAgents() {
  return useQuery({
    queryKey: agentKeys.list(),
    queryFn: fetchAgents,
  });
}

// Custom hook for creating agents
export function useCreateAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createAgent,
    onSuccess: () => {
      // Invalidate the agents list to refetch
      queryClient.invalidateQueries({ queryKey: agentKeys.list() });
    },
  });
}

// Custom hook for updating agents
export function useUpdateAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateAgent,
    onSuccess: () => {
      // Invalidate the agents list to refetch
      queryClient.invalidateQueries({ queryKey: agentKeys.list() });
    },
  });
}

// Custom hook for deleting agents
export function useDeleteAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteAgent,
    onSuccess: () => {
      // Invalidate the agents list to refetch
      queryClient.invalidateQueries({ queryKey: agentKeys.list() });
    },
  });
}