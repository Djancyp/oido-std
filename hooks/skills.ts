import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Skill } from '@/app/api/skills/route';
import { apiFetch } from '@/lib/server-fetch';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function fetchSkills(): Promise<Skill[]> {
  const res = await apiFetch(`${baseUrl}/api/skills`);
  if (!res.ok) return [];
  return res.json();
}

export const skillKeys = {
  all: ['skills'] as const,
  list: () => [...skillKeys.all, 'list'] as const,
  detail: (name: string) => [...skillKeys.all, 'detail', name] as const,
};

export function useSkillsQuery(options?: { initialData?: Skill[] }) {
  return useQuery({
    queryKey: skillKeys.list(),
    queryFn: fetchSkills,
    initialData: options?.initialData,
  });
}

export function useSkillDetail(name: string) {
  return useQuery({
    queryKey: skillKeys.detail(name),
    queryFn: () => fetch(`/api/skills/${encodeURIComponent(name)}`).then(r => r.json()),
    enabled: !!name,
  });
}

type SkillPayload = {
  name: string;
  description: string;
  body: string;
  scope: 'user' | 'project';
  tools: string[];
};

export function useCreateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SkillPayload) =>
      fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: skillKeys.list() }),
  });
}

export function useUpdateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, ...rest }: SkillPayload) =>
      fetch(`/api/skills/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rest),
      }).then(r => r.json()),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: skillKeys.list() });
      qc.invalidateQueries({ queryKey: skillKeys.detail(vars.name) });
    },
  });
}

export function useDeleteSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      fetch(`/api/skills/${encodeURIComponent(name)}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: skillKeys.list() }),
  });
}
