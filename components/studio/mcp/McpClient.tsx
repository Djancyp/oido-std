'use client';

import React, { useState } from 'react';
import { Unplug, Plus, RefreshCw, Trash2, ChevronDown, ChevronUp, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { McpServer } from '@/app/api/mcp/route';
import {
  useMcpQuery,
  useAddStdioMutation,
  useAddSseMutation,
  useEnableMcpMutation,
  useDisableMcpMutation,
  useRemoveMcpMutation,
} from '@/hooks/mcp';

function ServerCard({ server }: { server: McpServer }) {
  const [expanded, setExpanded] = useState(false);
  const enable = useEnableMcpMutation();
  const disable = useDisableMcpMutation();
  const remove = useRemoveMcpMutation();

  const handleToggle = () => {
    if (server.enabled) disable.mutate({ name: server.name, scope: server.scope });
    else enable.mutate({ name: server.name, scope: server.scope });
  };

  const handleRemove = () => {
    if (!confirm(`Remove MCP server "${server.name}"?`)) return;
    remove.mutate({ name: server.name, scope: server.scope });
  };

  const isPending = enable.isPending || disable.isPending;

  const accentClass = server.enabled
    ? 'bg-gradient-to-b from-indigo-500/70 to-indigo-600/40'
    : 'bg-gradient-to-b from-indigo-500/30 to-indigo-600/15';

  return (
    <div className="group rounded-xl border border-border/40 overflow-hidden bg-card hover:border-border/70 hover:shadow-sm transition-all duration-150">
      <div className="flex items-stretch">
        <div className={`w-[3px] shrink-0 ${accentClass}`} />
        <div className="flex-1 flex flex-col gap-0 px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-sm truncate">{server.name}</span>
              <span className="text-[10px] text-slate-400 border border-slate-500/20 bg-slate-500/8 px-1.5 py-0.5 rounded-md font-mono shrink-0">{server.type}</span>
              <span className="text-[10px] text-slate-400 border border-slate-500/20 bg-slate-500/8 px-1.5 py-0.5 rounded-md font-mono shrink-0">{server.scope}</span>
              {server.enabled ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 border border-emerald-500/20 bg-emerald-500/8 px-1.5 py-0.5 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />enabled
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground/60 border border-border/30 bg-muted/30 px-1.5 py-0.5 rounded-md">disabled</span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setExpanded(v => !v)}>
                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={handleToggle} disabled={isPending}>
                {server.enabled
                  ? <ToggleRight size={15} className="text-emerald-400" />
                  : <ToggleLeft size={15} className="text-muted-foreground/50" />
                }
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={handleRemove} disabled={remove.isPending}>
                <Trash2 size={13} />
              </Button>
            </div>
          </div>

          {expanded && (
            <div className="flex flex-col gap-1.5 pt-3 mt-2 border-t border-border/40 font-mono text-[11px]">
              {server.description && <p className="text-muted-foreground italic font-sans">{server.description}</p>}
              {server.command && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground/60 w-20 shrink-0">command</span>
                  <span className="text-foreground/80">{server.command} {(server.args ?? []).join(' ')}</span>
                </div>
              )}
              {server.url && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground/60 w-20 shrink-0">url</span>
                  <span className="text-foreground/80 truncate">{server.url}</span>
                </div>
              )}
              {server.env && Object.keys(server.env).length > 0 && (
                <div className="flex flex-col gap-0.5">
                  {Object.entries(server.env).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-muted-foreground/60 w-20 shrink-0">{k}</span>
                      <span className="text-foreground/80 truncate">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type Transport = 'stdio' | 'sse';

function AddServerForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const addStdio = useAddStdioMutation();
  const addSse = useAddSseMutation();
  const [transport, setTransport] = useState<Transport>('stdio');
  const [scope, setScope] = useState<'user' | 'project'>('user');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  // stdio
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [env, setEnv] = useState('');
  // sse
  const [url, setUrl] = useState('');
  const [authUrl, setAuthUrl] = useState('');
  const [tokenUrl, setTokenUrl] = useState('');
  const [scopes, setScopes] = useState('');

  const isPending = addStdio.isPending || addSse.isPending;
  const isError = addStdio.isError || addSse.isError;

  const parseList = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (transport === 'stdio') {
      if (!command.trim()) return;
      await addStdio.mutateAsync({
        name: name.trim(),
        command: command.trim(),
        args: args ? parseList(args) : [],
        env: env ? parseList(env) : [],
        description: description.trim() || undefined,
        scope,
      });
    } else {
      if (!url.trim()) return;
      await addSse.mutateAsync({
        name: name.trim(),
        url: url.trim(),
        authUrl: authUrl.trim() || undefined,
        tokenUrl: tokenUrl.trim() || undefined,
        scopes: scopes ? parseList(scopes) : [],
        env: env ? parseList(env) : [],
        description: description.trim() || undefined,
        scope,
      });
    }
    onSuccess();
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl border border-border/50 bg-card shadow-sm">
      <p className="text-xs font-semibold">Add MCP Server</p>

      {/* Transport */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Transport</label>
        <div className="flex p-0.5 gap-0.5 bg-muted/50 rounded-lg border border-border/40">
          {(['stdio', 'sse'] as Transport[]).map(t => (
            <button key={t} onClick={() => setTransport(t)}
              className={`text-[11px] px-2.5 py-1 rounded-md transition-all font-mono ${transport === t ? 'bg-background text-foreground shadow-sm border border-border/50 font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Scope */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Scope</label>
        <div className="flex p-0.5 gap-0.5 bg-muted/50 rounded-lg border border-border/40">
          {(['user', 'project'] as const).map(s => (
            <button key={s} onClick={() => setScope(s)}
              className={`text-[11px] px-2.5 py-1 rounded-md transition-all ${scope === s ? 'bg-background text-foreground shadow-sm border border-border/50 font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Name <span className="text-destructive normal-case tracking-normal font-normal">*</span></label>
        <Input placeholder="e.g. my-server" value={name} onChange={e => setName(e.target.value)} className="h-8 text-xs font-mono border-border/50 bg-muted/20 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Description <span className="text-muted-foreground/50 normal-case tracking-normal font-normal">(optional)</span></label>
        <Input placeholder="What this server does" value={description} onChange={e => setDescription(e.target.value)} className="h-8 text-xs border-border/50 bg-muted/20 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50" />
      </div>

      {transport === 'stdio' ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Command <span className="text-destructive normal-case tracking-normal font-normal">*</span></label>
            <Input placeholder="e.g. npx" value={command} onChange={e => setCommand(e.target.value)} className="h-8 text-xs font-mono border-border/50 bg-muted/20 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Args <span className="text-muted-foreground/50 normal-case tracking-normal font-normal">(comma-separated)</span></label>
            <Input placeholder="-y,@my/mcp-server" value={args} onChange={e => setArgs(e.target.value)} className="h-8 text-xs font-mono border-border/50 bg-muted/20 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50" />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">URL <span className="text-destructive normal-case tracking-normal font-normal">*</span></label>
            <Input placeholder="https://mcp.example.com/sse" value={url} onChange={e => setUrl(e.target.value)} className="h-8 text-xs font-mono border-border/50 bg-muted/20 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Auth URL <span className="text-muted-foreground/50 normal-case tracking-normal font-normal">(OAuth, optional)</span></label>
            <Input placeholder="https://auth.example.com/authorize" value={authUrl} onChange={e => setAuthUrl(e.target.value)} className="h-8 text-xs font-mono border-border/50 bg-muted/20 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Token URL <span className="text-muted-foreground/50 normal-case tracking-normal font-normal">(OAuth, optional)</span></label>
            <Input placeholder="https://auth.example.com/token" value={tokenUrl} onChange={e => setTokenUrl(e.target.value)} className="h-8 text-xs font-mono border-border/50 bg-muted/20 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">OAuth Scopes <span className="text-muted-foreground/50 normal-case tracking-normal font-normal">(comma-separated)</span></label>
            <Input placeholder="openid,profile" value={scopes} onChange={e => setScopes(e.target.value)} className="h-8 text-xs font-mono border-border/50 bg-muted/20 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50" />
          </div>
        </>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Env Vars <span className="text-muted-foreground/50 normal-case tracking-normal font-normal">(KEY=VALUE, comma-separated)</span></label>
        <Input placeholder="API_KEY=abc,DEBUG=true" value={env} onChange={e => setEnv(e.target.value)} className="h-8 text-xs font-mono border-border/50 bg-muted/20 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50" />
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={isPending || !name.trim()} className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white">
          {isPending ? 'Adding...' : 'Add Server'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>

      {isError && <p className="text-xs text-destructive">Failed to add server. Check the values and try again.</p>}
    </div>
  );
}

export function McpClient({ initialServers = [] }: { initialServers?: McpServer[] }) {
  const { data: servers = initialServers, isLoading, refetch } = useMcpQuery({
    initialData: initialServers.length > 0 ? initialServers : undefined,
  });
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <Unplug size={16} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">MCP Servers</h1>
            <p className="text-[11px] text-muted-foreground">{servers.length} {servers.length === 1 ? 'server' : 'servers'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </Button>
          <Button className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm" onClick={() => setShowAdd(v => !v)}>
            <Plus size={12} strokeWidth={2.5} /> Add Server
          </Button>
        </div>
      </div>

      {showAdd && (
        <AddServerForm onSuccess={() => { setShowAdd(false); refetch(); }} onCancel={() => setShowAdd(false)} />
      )}

      {servers.length === 0 && !isLoading && !showAdd && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border/40 flex items-center justify-center">
            <Unplug size={20} className="text-muted-foreground/40" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">No MCP servers yet</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Click "Add Server" to get started.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {servers.map(s => <ServerCard key={s.name} server={s} />)}
      </div>
    </div>
  );
}
