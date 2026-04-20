import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Extension } from '@/app/api/extensions/route';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function fetchExtensions(): Promise<Extension[]> {
  const res = await fetch(`${baseUrl}/api/extensions`);
  if (!res.ok) return [];
  return res.json();
}

export const extensionKeys = {
  all: ['extensions'] as const,
  list: () => [...extensionKeys.all, 'list'] as const,
  settings: (name: string) => [...extensionKeys.all, 'settings', name] as const,
};

export function useExtensionsQuery(options?: { initialData?: Extension[] }) {
  return useQuery({
    queryKey: extensionKeys.list(),
    queryFn: fetchExtensions,
    initialData: options?.initialData,
  });
}

export function useInstallExtension() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (source: string) =>
      fetch('/api/extensions/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: extensionKeys.list() }),
  });
}

export function useEnableExtension() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      fetch('/api/extensions/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: extensionKeys.list() }),
  });
}

export function useDisableExtension() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      fetch('/api/extensions/diable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: extensionKeys.list() }),
  });
}

export function useUninstallExtension() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      fetch('/api/extensions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: extensionKeys.list() }),
  });
}

export function useExtensionSettings(name: string) {
  return useQuery({
    queryKey: extensionKeys.settings(name),
    queryFn: () =>
      fetch(`/api/extensions/settings?list=1&name=${encodeURIComponent(name)}`).then(r => r.json()),
    enabled: !!name,
  });
}

export function useSaveExtensionSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, key, value }: { name: string; key: string; value: string }) =>
      fetch('/api/extensions/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, key, value }),
      }).then(r => r.json()),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: extensionKeys.settings(vars.name) }),
  });
}
