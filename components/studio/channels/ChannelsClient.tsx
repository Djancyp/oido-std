'use client';

import React, { useState } from 'react';
import { Cable, Play, Square, Settings, RefreshCw, Plus, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Channel } from '@/app/api/channels/route';
import {
  useChannelsQuery,
  useStartChannelMutation,
  useStopChannelMutation,
  useConfigureChannelMutation,
  usePairingQuery,
  usePairingMutation,
} from '@/hooks/channels';

const SUPPORTED_TYPES = ['telegram', 'discord', 'weixin', 'dingtalk'] as const;
type ChannelType = typeof SUPPORTED_TYPES[number];

const CONFIG_FIELDS: Record<ChannelType, { key: string; label: string; placeholder: string; secret?: boolean }[]> = {
  telegram: [
    { key: 'token', label: 'Bot Token', placeholder: '123456:ABC-DEF...', secret: true },
  ],
  discord: [
    { key: 'token', label: 'Bot Token', placeholder: 'Your Discord bot token', secret: true },
    { key: 'guild-id', label: 'Guild ID', placeholder: 'Server ID (optional)' },
  ],
  weixin: [
    { key: 'app-id', label: 'App ID', placeholder: 'WeChat App ID' },
    { key: 'app-secret', label: 'App Secret', placeholder: 'WeChat App Secret', secret: true },
    { key: 'token', label: 'Token', placeholder: 'Webhook token' },
  ],
  dingtalk: [
    { key: 'webhook', label: 'Webhook URL', placeholder: 'https://oapi.dingtalk.com/robot/send?access_token=...' },
    { key: 'secret', label: 'Secret', placeholder: 'Signing secret (optional)', secret: true },
  ],
};

function stateBadge(state: string) {
  if (state === 'running') return <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50">running</Badge>;
  if (state === 'error') return <Badge variant="outline" className="text-[10px] text-destructive border-destructive/20 bg-destructive/10">error</Badge>;
  return <Badge variant="outline" className="text-[10px] text-muted-foreground">stopped</Badge>;
}

function maskSecret(val: string) {
  if (val.length <= 8) return '••••••••';
  return `${val.slice(0, 4)}${'•'.repeat(Math.min(val.length - 8, 12))}${val.slice(-4)}`;
}

function ChannelCard({ channel }: { channel: Channel }) {
  const [expanded, setExpanded] = useState(false);
  const start = useStartChannelMutation();
  const stop = useStopChannelMutation();
  const running = channel.state === 'running';
  const fields = CONFIG_FIELDS[channel.type as ChannelType] ?? [];

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{channel.name}</span>
          <Badge variant="secondary" className="text-[10px] font-mono shrink-0">{channel.type}</Badge>
          {stateBadge(channel.state)}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(v => !v)}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </Button>
          {running ? (
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => stop.mutate(channel.name)} disabled={stop.isPending}
            >
              <Square size={13} />
            </Button>
          ) : (
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700"
              onClick={() => start.mutate(channel.name)} disabled={start.isPending}
            >
              <Play size={13} />
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 pt-1 border-t">
          {/* Config preview */}
          {Object.entries(channel.config).length > 0 && (
            <div className="flex flex-col gap-1">
              {Object.entries(channel.config).map(([k, v]) => {
                const isSecret = fields.find(f => f.key === k)?.secret;
                return (
                  <div key={k} className="flex items-center gap-2 text-[11px]">
                    <span className="text-muted-foreground font-mono w-24 shrink-0">{k}</span>
                    <span className="font-mono text-foreground truncate">{isSecret ? maskSecret(v) : v}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Extra fields */}
          {(channel.senderPolicy || channel.sessionScope || channel.dispatchMode) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {channel.senderPolicy && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">policy:{channel.senderPolicy}</span>}
              {channel.sessionScope && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">scope:{channel.sessionScope}</span>}
              {channel.dispatchMode && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">mode:{channel.dispatchMode}</span>}
            </div>
          )}

          {channel.lastStarted && (
            <p className="text-[10px] text-muted-foreground">
              Last started: {new Date(channel.lastStarted).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function NewChannelForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const configure = useConfigureChannelMutation();
  const [type, setType] = useState<ChannelType>('telegram');
  const [name, setName] = useState('');
  const fields = CONFIG_FIELDS[type] ?? [];
  const [values, setValues] = useState<Record<string, string>>({});

  React.useEffect(() => {
    setValues(Object.fromEntries(fields.map(f => [f.key, ''])));
  }, [type]);

  const handleSave = async () => {
    if (!name.trim()) return;
    await configure.mutateAsync({ channel: name.trim(), type, settings: values });
    onSuccess();
  };

  return (
    <Card className="p-4 flex flex-col gap-3 border-dashed">
      <p className="text-xs font-semibold">New Channel</p>

      <div className="flex gap-2">
        {SUPPORTED_TYPES.map(t => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`text-xs px-2 py-1 rounded border font-mono transition-colors ${type === t ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted border-input'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium">Instance Name</label>
        <Input
          placeholder="e.g. mybot"
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-8 text-xs font-mono"
        />
      </div>

      {fields.map(f => (
        <div key={f.key} className="flex flex-col gap-1">
          <label className="text-xs font-medium">{f.label}</label>
          <Input
            type={f.secret ? 'password' : 'text'}
            placeholder={f.placeholder}
            value={values[f.key] ?? ''}
            onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
            className="h-8 text-xs font-mono"
          />
        </div>
      ))}

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={configure.isPending || !name.trim()}>
          {configure.isPending ? 'Saving...' : 'Configure'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>

      {configure.isError && (
        <p className="text-xs text-destructive">Failed to configure. Check the values and try again.</p>
      )}
    </Card>
  );
}

function PairingPanel() {
  const { data: requests = [], isLoading } = usePairingQuery();
  const pairingMutation = usePairingMutation();

  if (isLoading || requests.length === 0) return (
    <p className="text-xs text-muted-foreground italic">No pending pairing requests.</p>
  );

  return (
    <div className="flex flex-col gap-2">
      {requests.map(r => (
        <div key={r.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{r.user}</span>
            <span className="text-muted-foreground">{r.channel} · {new Date(r.requested_at).toLocaleString()}</span>
          </div>
          <div className="flex gap-1">
            <Button size="sm" className="h-6 text-[11px]" onClick={() => pairingMutation.mutate({ id: r.id, action: 'approve' })}>Approve</Button>
            <Button variant="destructive" size="sm" className="h-6 text-[11px]" onClick={() => pairingMutation.mutate({ id: r.id, action: 'reject' })}>Reject</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChannelsClient({ initialChannels = [] }: { initialChannels?: Channel[] }) {
  const { data: channels = initialChannels, isLoading, refetch } = useChannelsQuery({ initialData: initialChannels.length > 0 ? initialChannels : undefined });
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cable size={20} />
          <h1 className="text-lg font-semibold">Channels</h1>
          <Badge variant="secondary" className="text-xs">{channels.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </Button>
          <Button size="sm" onClick={() => setShowNew(v => !v)}>
            <Plus size={13} className="mr-1" /> New Channel
          </Button>
        </div>
      </div>

      {showNew && (
        <NewChannelForm onSuccess={() => { setShowNew(false); refetch(); }} onCancel={() => setShowNew(false)} />
      )}

      {channels.length === 0 && !isLoading && !showNew && (
        <p className="text-sm text-muted-foreground italic">No channels configured. Click "New Channel" to get started.</p>
      )}

      <div className="flex flex-col gap-3">
        {channels.map(ch => <ChannelCard key={ch.name} channel={ch} />)}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Users size={16} />
          <h2 className="text-sm font-semibold">Pairing Requests</h2>
        </div>
        <PairingPanel />
      </div>
    </div>
  );
}
