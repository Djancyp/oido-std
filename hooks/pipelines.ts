import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pipeline, PipelineListItem, PipelineNode } from '@/app/api/pipelines/route';
import { PipelineTool } from '@/app/api/pipelines/tools/route';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

const keys = {
  list: () => ['pipelines', 'list'] as const,
  detail: (name: string) => ['pipelines', 'detail', name] as const,
  tools: () => ['pipelines', 'tools'] as const,
  schedule: () => ['pipelines', 'schedule'] as const,
  logs: (name: string, runId?: string) => ['pipelines', 'logs', name, runId ?? ''] as const,
  visualize: (name: string, ascii?: boolean) => ['pipelines', 'visualize', name, ascii ? 'ascii' : 'mermaid'] as const,
};

export async function fetchPipelines(): Promise<PipelineListItem[]> {
  const res = await fetch(`${baseUrl}/api/pipelines`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchPipelineDetail(name: string): Promise<Pipeline> {
  const res = await fetch(`${baseUrl}/api/pipelines/${name}`);
  if (!res.ok) throw new Error('Failed to fetch pipeline');
  return res.json();
}

export async function fetchPipelineTools(): Promise<PipelineTool[]> {
  const res = await fetch(`${baseUrl}/api/pipelines/tools`);
  if (!res.ok) return [];
  return res.json();
}

export function usePipelinesQuery(options?: { initialData?: PipelineListItem[] }) {
  return useQuery({ queryKey: keys.list(), queryFn: fetchPipelines, initialData: options?.initialData });
}

export function usePipelineDetailQuery(name: string) {
  return useQuery({ queryKey: keys.detail(name), queryFn: () => fetchPipelineDetail(name), enabled: !!name });
}

export function usePipelineToolsQuery(options?: { initialData?: PipelineTool[] }) {
  return useQuery({ queryKey: keys.tools(), queryFn: fetchPipelineTools, initialData: options?.initialData });
}

export function usePipelineScheduleQuery() {
  return useQuery({ queryKey: keys.schedule(), queryFn: () => fetch('/api/pipelines/schedule').then(r => r.json()) });
}

export function useCreatePipelineMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description?: string; nodes: PipelineNode[]; variables?: Record<string, any> }) =>
      fetch('/api/pipelines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list() }),
  });
}

export function useUpdatePipelineMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description?: string; nodes: PipelineNode[]; variables?: Record<string, any> }) =>
      fetch(`/api/pipelines/${payload.name}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(r => r.json()),
    onSuccess: (_: any, vars: any) => {
      qc.invalidateQueries({ queryKey: keys.list() });
      qc.invalidateQueries({ queryKey: keys.detail(vars.name) });
    },
  });
}

export function useDeletePipelineMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      fetch('/api/pipelines', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list() }),
  });
}

export function useValidatePipelineMutation() {
  return useMutation({
    mutationFn: (name: string) => fetch(`/api/pipelines/${name}/validate`).then(r => r.json()),
  });
}

export function usePipelineLogsQuery(name: string, runId?: string) {
  return useQuery({
    queryKey: keys.logs(name, runId),
    queryFn: () => {
      const url = runId ? `/api/pipelines/${name}/logs?runId=${runId}` : `/api/pipelines/${name}/logs`;
      return fetch(url).then(r => r.json()) as Promise<{ output: string }>;
    },
    enabled: !!name,
  });
}

export function usePipelineVisualizeQuery(name: string, ascii = false) {
  return useQuery({
    queryKey: keys.visualize(name, ascii),
    queryFn: () =>
      fetch(`/api/pipelines/${name}/visualize?ascii=${ascii}`).then(r => r.json()) as Promise<{ diagram: string; ascii: boolean }>,
    enabled: !!name,
  });
}

export function useGeneratePipelineMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description: string }) =>
      fetch('/api/pipelines/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list() }),
  });
}

export function useExportPipeline() {
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/pipelines/${name}/export`);
      if (!res.ok) throw new Error('Export failed');
      return res.text();
    },
  });
}

export function useImportPipelineMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (yaml: string) =>
      fetch('/api/pipelines/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: yaml,
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.list() }),
  });
}

export function useScheduleAddMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { pipeline: string; cron: string }) =>
      fetch('/api/pipelines/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.schedule() }),
  });
}

export function useScheduleRemoveMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch('/api/pipelines/schedule', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.schedule() }),
  });
}
