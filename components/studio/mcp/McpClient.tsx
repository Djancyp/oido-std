'use client';

import React, { useState } from 'react';
import { Unplug, Plus, RefreshCw, Trash2, ChevronDown, ChevronUp, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{server.name}</span>
          <Badge variant="secondary" className="text-[10px] font-mono shrink-0">{server.type}</Badge>
          <Badge variant="secondary" className="text-[10px] font-mono shrink-0">{server.scope}</Badge>
          {server.enabled
            ? <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50">enabled</Badge>
            : <Badge variant="outline" className="text-[10px] text-muted-foreground">disabled</Badge>
          }
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(v => !v)}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleToggle} disabled={isPending}>
            {server.enabled ? <ToggleRight size={15} className="text-green-600" /> : <ToggleLeft size={15} className="text-muted-foreground" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={handleRemove} disabled={remove.isPending}>
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-1.5 pt-1 border-t text-[11px]">
          {server.description && <p className="text-muted-foreground italic">{server.description}</p>}
          {server.command && (
            <div className="flex gap-2">
              <span className="text-muted-foreground w-16 shrink-0">command</span>
              <span className="font-mono">{server.command} {(server.args ?? []).join(' ')}</span>
            </div>
          )}
          {server.url && (
            <div className="flex gap-2">
              <span className="text-muted-foreground w-16 shrink-0">url</span>
              <span className="font-mono truncate">{server.url}</span>
            </div>
          )}
          {server.env && Object.keys(server.env).length > 0 && (
            <div className="flex flex-col gap-0.5">
              {Object.entries(server.env).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-muted-foreground w-16 shrink-0 font-mono">{k}</span>
                  <span className="font-mono truncate">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
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
    <Card className="p-4 flex flex-col gap-3 border-dashed">
      <p className="text-xs font-semibold">Add MCP Server</p>

      {/* Transport */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium">Transport</label>
        <div className="flex gap-2">
          {(['stdio', 'sse'] as Transport[]).map(t => (
            <button key={t} onClick={() => setTransport(t)}
              className={`text-xs px-2 py-1 rounded border font-mono transition-colors ${transport === t ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted border-input'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Scope */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium">Scope</label>
        <div className="flex gap-2">
          {(['user', 'project'] as const).map(s => (
            <button key={s} onClick={() => setScope(s)}
              className={`text-xs px-2 py-1 rounded border font-mono transition-colors ${scope === s ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted border-input'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium">Name <span className="text-destructive">*</span></label>
        <Input placeholder="e.g. my-server" value={name} onChange={e => setName(e.target.value)} className="h-8 text-xs font-mono" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
        <Input placeholder="What this server does" value={description} onChange={e => setDescription(e.target.value)} className="h-8 text-xs" />
      </div>

      {transport === 'stdio' ? (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Command <span className="text-destructive">*</span></label>
            <Input placeholder="e.g. npx" value={command} onChange={e => setCommand(e.target.value)} className="h-8 text-xs font-mono" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Args <span className="text-muted-foreground font-normal">(comma-separated)</span></label>
            <Input placeholder="-y,@my/mcp-server" value={args} onChange={e => setArgs(e.target.value)} className="h-8 text-xs font-mono" />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">URL <span className="text-destructive">*</span></label>
            <Input placeholder="https://mcp.example.com/sse" value={url} onChange={e => setUrl(e.target.value)} className="h-8 text-xs font-mono" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Auth URL <span className="text-muted-foreground font-normal">(OAuth, optional)</span></label>
            <Input placeholder="https://auth.example.com/authorize" value={authUrl} onChange={e => setAuthUrl(e.target.value)} className="h-8 text-xs font-mono" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Token URL <span className="text-muted-foreground font-normal">(OAuth, optional)</span></label>
            <Input placeholder="https://auth.example.com/token" value={tokenUrl} onChange={e => setTokenUrl(e.target.value)} className="h-8 text-xs font-mono" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">OAuth Scopes <span className="text-muted-foreground font-normal">(comma-separated)</span></label>
            <Input placeholder="openid,profile" value={scopes} onChange={e => setScopes(e.target.value)} className="h-8 text-xs font-mono" />
          </div>
        </>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium">Env Vars <span className="text-muted-foreground font-normal">(KEY=VALUE, comma-separated)</span></label>
        <Input placeholder="API_KEY=abc,DEBUG=true" value={env} onChange={e => setEnv(e.target.value)} className="h-8 text-xs font-mono" />
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={isPending || !name.trim()}>
          {isPending ? 'Adding...' : 'Add Server'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>

      {isError && <p className="text-xs text-destructive">Failed to add server. Check the values and try again.</p>}
    </Card>
  );
}

export function McpClient({ initialServers = [] }: { initialServers?: McpServer[] }) {
  const { data: servers = initialServers, isLoading, refetch } = useMcpQuery({
    initialData: initialServers.length > 0 ? initialServers : undefined,
  });
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Unplug size={20} />
          <h1 className="text-lg font-semibold">MCP Servers</h1>
          <Badge variant="secondary" className="text-xs">{servers.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </Button>
          <Button size="sm" onClick={() => setShowAdd(v => !v)}>
            <Plus size={13} className="mr-1" /> Add Server
          </Button>
        </div>
      </div>

      {showAdd && (
        <AddServerForm onSuccess={() => { setShowAdd(false); refetch(); }} onCancel={() => setShowAdd(false)} />
      )}

      {servers.length === 0 && !isLoading && !showAdd && (
        <p className="text-sm text-muted-foreground italic">No MCP servers configured. Click "Add Server" to get started.</p>
      )}

      <div className="flex flex-col gap-3">
        {servers.map(s => <ServerCard key={s.name} server={s} />)}
      </div>
    </div>
  );
}
