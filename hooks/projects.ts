'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type Project = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number };
};

export type Column = {
  id: string;
  projectId: string;
  name: string;
  order: number;
  color?: string | null;
  createdAt: string;
};

export type Task = {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  description?: string | null;
  priority: string;
  order: number;
  assignedAgentId?: string | null;
  assignedAgentName?: string | null;
  dueDate?: string | null;
  labels?: string | null;
  runAuto: boolean;
  dependsOn?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDetail = Project & { columns: Column[]; tasks: Task[] };

export function useProjectsQuery() {
  return useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => fetch('/api/projects').then(r => r.json()),
  });
}

export function useProjectQuery(id: string) {
  return useQuery<ProjectDetail>({
    queryKey: ['projects', id],
    queryFn: () => fetch(`/api/projects/${id}`).then(r => r.json()),
    enabled: !!id,
  });
}

export function useCreateProjectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; description?: string }) =>
      fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useUpdateProjectMutation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; description?: string }) =>
      fetch(`/api/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', id] }),
  });
}

export function useDeleteProjectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/projects/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useCreateColumnMutation(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; color?: string }) =>
      fetch(`/api/projects/${projectId}/columns`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId] }),
  });
}

export function useUpdateColumnMutation(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ columnId, ...body }: { columnId: string; name?: string; color?: string }) =>
      fetch(`/api/projects/${projectId}/columns/${columnId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId] }),
  });
}

export function useDeleteColumnMutation(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (columnId: string) =>
      fetch(`/api/projects/${projectId}/columns/${columnId}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId] }),
  });
}

export function useCreateTaskMutation(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      columnId: string; title: string; description?: string;
      priority?: string; assignedAgentId?: string; assignedAgentName?: string;
      dueDate?: string; labels?: string[]; runAuto?: boolean; dependsOn?: string[];
    }) =>
      fetch(`/api/projects/${projectId}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId] }),
  });
}

export function useUpdateTaskMutation(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, ...body }: {
      taskId: string; title?: string; description?: string; priority?: string;
      columnId?: string; assignedAgentId?: string; assignedAgentName?: string;
      dueDate?: string; labels?: string[]; runAuto?: boolean; dependsOn?: string[];
    }) =>
      fetch(`/api/projects/${projectId}/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId] }),
  });
}

export function useDeleteTaskMutation(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      fetch(`/api/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId] }),
  });
}

export function useReorderTasksMutation(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tasks: { id: string; columnId: string; order: number }[]) =>
      fetch(`/api/projects/${projectId}/reorder`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tasks }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', projectId] }),
  });
}
