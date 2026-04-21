'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyRound, LogIn, LogOut, RefreshCw } from 'lucide-react';

type Provider = {
  provider: string;
  authenticated: boolean;
  keyMasked?: string;
  baseUrl?: string;
};

type StatusResponse = {
  activeProvider: string;
  providers: Provider[];
};

async function fetchProviders(): Promise<StatusResponse> {
  const res = await fetch('/api/providers');
  if (!res.ok) throw new Error('Failed to fetch providers');
  return res.json();
}

async function loginProvider({ provider, apiKey }: { provider: string; apiKey: string }) {
  const res = await fetch('/api/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, apiKey }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Login failed');
  }
  return res.json();
}

async function logoutProvider(provider: string) {
  const res = await fetch('/api/providers', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Logout failed');
  }
  return res.json();
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  gemini: 'Gemini',
  'gemini-oauth': 'Gemini (OAuth)',
  'qwen-oauth': 'Qwen (OAuth)',
  openrouter: 'OpenRouter',
};

export function ProvidersClient({ initialData }: { initialData: StatusResponse }) {
  const queryClient = useQueryClient();
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data, isRefetching, refetch } = useQuery({
    queryKey: ['providers'],
    queryFn: fetchProviders,
    initialData,
    initialDataUpdatedAt: Date.now(),
    staleTime: 30_000,
  });

  const loginMutation = useMutation({
    mutationFn: loginProvider,
    onSuccess: (_, { provider }) => {
      setApiKeys(k => ({ ...k, [provider]: '' }));
      setErrors(e => ({ ...e, [provider]: '' }));
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
    onError: (err: Error, { provider }) => {
      setErrors(e => ({ ...e, [provider]: err.message }));
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutProvider,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers'] }),
    onError: (err: Error, provider) => {
      setErrors(e => ({ ...e, [provider]: err.message }));
    },
  });

  const providers = data?.providers ?? [];
  const active = data?.activeProvider;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound size={20} />
          <h1 className="text-xl font-semibold">AI Providers</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw size={14} className={isRefetching ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {providers.map(p => {
          const label = PROVIDER_LABELS[p.provider] ?? p.provider;
          const isActive = p.provider === active;
          const isPending =
            loginMutation.isPending && loginMutation.variables?.provider === p.provider;
          const isLoggingOut =
            logoutMutation.isPending && logoutMutation.variables === p.provider;

          return (
            <div
              key={p.provider}
              className="flex flex-col gap-3 rounded-lg border border-border p-4 bg-card"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{label}</span>
                  {isActive && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                      active
                    </Badge>
                  )}
                  <Badge
                    variant={p.authenticated ? 'default' : 'secondary'}
                    className={
                      p.authenticated
                        ? 'bg-green-100 text-green-700 hover:bg-green-100'
                        : 'text-muted-foreground'
                    }
                  >
                    {p.authenticated ? 'Authenticated' : 'Not authenticated'}
                  </Badge>
                </div>
                {p.authenticated && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    disabled={isLoggingOut}
                    onClick={() => logoutMutation.mutate(p.provider)}
                  >
                    <LogOut size={14} />
                    Logout
                  </Button>
                )}
              </div>

              {p.authenticated && p.keyMasked && (
                <div className="text-xs text-muted-foreground font-mono bg-muted rounded px-2 py-1">
                  {p.keyMasked}
                  {p.baseUrl && <span className="ml-3 text-muted-foreground/60">{p.baseUrl}</span>}
                </div>
              )}

              {!p.authenticated && (
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="API key"
                    value={apiKeys[p.provider] ?? ''}
                    onChange={e => setApiKeys(k => ({ ...k, [p.provider]: e.target.value }))}
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    disabled={isPending || !apiKeys[p.provider]}
                    onClick={() =>
                      loginMutation.mutate({ provider: p.provider, apiKey: apiKeys[p.provider] })
                    }
                  >
                    <LogIn size={14} />
                    {isPending ? 'Connecting...' : 'Connect'}
                  </Button>
                </div>
              )}

              {errors[p.provider] && (
                <p className="text-xs text-red-500">{errors[p.provider]}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
