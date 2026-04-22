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
  const activeLabel = active ? (PROVIDER_LABELS[active] ?? active) : undefined;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <KeyRound size={16} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">AI Providers</h1>
              <p className="text-[11px] text-muted-foreground">
                {activeLabel ? `Active: ${activeLabel}` : 'No active provider'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw size={14} className={isRefetching ? 'animate-spin' : ''} />
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
                className="group rounded-xl border border-border/40 overflow-hidden bg-card hover:border-border/70 hover:shadow-sm transition-all duration-150"
              >
                <div className="flex items-stretch">
                  <div
                    className={`w-[3px] shrink-0 bg-gradient-to-b ${
                      p.authenticated
                        ? 'from-emerald-500/60 to-emerald-600/30'
                        : 'from-slate-500/40 to-slate-600/20'
                    }`}
                  />
                  <div className="flex-1 flex flex-col gap-3 px-4 py-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{label}</span>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-indigo-400 border border-indigo-500/20 bg-indigo-500/8 px-1.5 py-0.5 rounded-md">
                            active
                          </span>
                        )}
                        {p.authenticated ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 border border-emerald-500/20 bg-emerald-500/8 px-1.5 py-0.5 rounded-md">
                            Authenticated
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/60 border border-border/30 bg-muted/30 px-1.5 py-0.5 rounded-md">
                            Not authenticated
                          </span>
                        )}
                      </div>
                      {p.authenticated && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/8 h-8 gap-1.5"
                          disabled={isLoggingOut}
                          onClick={() => logoutMutation.mutate(p.provider)}
                        >
                          <LogOut size={14} />
                          Logout
                        </Button>
                      )}
                    </div>

                    {p.authenticated && p.keyMasked && (
                      <div className="text-xs text-muted-foreground font-mono bg-muted/30 border border-border/30 rounded-lg px-3 py-1.5">
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
                          className="h-8 text-sm border-border/50 bg-muted/20 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50"
                        />
                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
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
                      <p className="text-xs text-destructive">{errors[p.provider]}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
