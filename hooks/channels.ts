import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Channel } from '@/app/api/channels/route';
import { PairingRequest } from '@/app/api/channels/pairing/route';
import { apiFetch } from '@/lib/server-fetch';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

const channelKeys = {
  list: () => ['channels', 'list'] as const,
  pairing: () => ['channels', 'pairing'] as const,
  Status: () => ['channels', 'status'] as const,
};

export async function fetchChannels(): Promise<Channel[]> {
  const res = await apiFetch(`${baseUrl}/api/channels`);
  if (!res.ok) return [];
  return res.json();
}

export function useChannelsQuery(options?: { initialData?: Channel[] }) {
  return useQuery({
    queryKey: channelKeys.list(),
    queryFn: fetchChannels,
    initialData: options?.initialData,
    refetchInterval: 5000,
  });
}

export function usePairingQuery() {
  return useQuery({ queryKey: channelKeys.pairing(), queryFn: fetchPairing });
}

async function fetchPairing(): Promise<PairingRequest[]> {
  const res = await apiFetch(`${baseUrl}/api/channels/pairing`);
  if (!res.ok) return [];
  return res.json();
}

export function useStartChannelMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channel: string) =>
      apiFetch('/api/channels/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: channelKeys.Status() }),
  });
}

export function useStopChannelMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channel: string) =>
      fetch('/api/channels/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: channelKeys.Status() }),
  });
}

export function useConfigureChannelMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      channel: string;
      type: string;
      settings: Record<string, string>;
      model?: string;
      instructions?: string;
      policy?: string;
      scope?: string;
      dispatch?: string;
      allow?: string;
    }) =>
      fetch('/api/channels/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: channelKeys.list() }),
  });
}

export function useDeleteChannelMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channel: string) =>
      fetch('/api/channels/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: channelKeys.list() }),
  });
}

export function usePairingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      fetch('/api/channels/pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: channelKeys.pairing() }),
  });
}
