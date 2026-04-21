import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { McpServer } from '@/app/api/mcp/route';
import { apiFetch } from '@/lib/server-fetch';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const key = ['mcp', 'list'] as const;

export async function fetchMcpServers(): Promise<McpServer[]> {
  const res = await apiFetch(`${baseUrl}/api/mcp`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export function useMcpQuery(options?: { initialData?: McpServer[] }) {
  return useQuery({ queryKey: key, queryFn: fetchMcpServers, initialData: options?.initialData, refetchInterval: 10000 });
}

export function useAddStdioMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; command: string; args?: string[]; env?: string[]; description?: string; scope?: string }) =>
      fetch('/api/mcp/add-stdio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useAddSseMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; url: string; authUrl?: string; tokenUrl?: string; scopes?: string[]; env?: string[]; description?: string; scope?: string }) =>
      fetch('/api/mcp/add-sse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useEnableMcpMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, scope }: { name: string; scope?: string }) =>
      fetch('/api/mcp/enable', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, scope }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useDisableMcpMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, scope }: { name: string; scope?: string }) =>
      fetch('/api/mcp/disable', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, scope }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useRemoveMcpMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, scope }: { name: string; scope?: string }) =>
      fetch('/api/mcp/remove', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, scope }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}
