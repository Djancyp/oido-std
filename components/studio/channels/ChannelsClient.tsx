'use client';

import React, { useState } from 'react';
import { Cable, Play, Square, RefreshCw, Plus, ChevronDown, ChevronUp, Users, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Channel } from '@/app/api/channels/route';
import { useModels } from '@/contexts/Models';
import { SingleSelect } from '@/components/ui/multi-select';
import {
  useChannelsQuery,
  useStartChannelMutation,
  useStopChannelMutation,
  useConfigureChannelMutation,
  useDeleteChannelMutation,
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

const POLICY_OPTIONS = ['pairing', 'open', 'allowlist'] as const;
const SCOPE_OPTIONS = ['user', 'thread', 'single'] as const;
const DISPATCH_OPTIONS = ['steer', 'collect', 'followup'] as const;

function stateBadge(state: string) {
  if (state === 'running') return <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50">running</Badge>;
  if (state === 'error') return <Badge variant="outline" className="text-[10px] text-destructive border-destructive/20 bg-destructive/10">error</Badge>;
  return <Badge variant="outline" className="text-[10px] text-muted-foreground">stopped</Badge>;
}

function maskSecret(val: string) {
  if (val.length <= 8) return '••••••••';
  return `${val.slice(0, 4)}${'•'.repeat(Math.min(val.length - 8, 12))}${val.slice(-4)}`;
}

function ModelSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { models } = useModels();
  const modelOptions = (models?.providers ?? []).flatMap(p =>
    p.models.map(m => ({ value: m.id, label: m.displayName || m.id, group: p.provider }))
  );
  return (
    <SingleSelect
      options={modelOptions}
      value={value}
      onChange={onChange}
      placeholder="— use global default —"
    />
  );
}

function ChannelCard({ channel, onEdit }: { channel: Channel; onEdit: (ch: Channel) => void }) {
  const [expanded, setExpanded] = useState(false);
  const start = useStartChannelMutation();
  const stop = useStopChannelMutation();
  const del = useDeleteChannelMutation();
  const running = channel.state === 'running';
  const fields = CONFIG_FIELDS[channel.type as ChannelType] ?? [];

  const handleDelete = () => {
    if (!confirm(`Delete channel "${channel.name}"?`)) return;
    del.mutate(channel.name);
  };

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{channel.name}</span>
          <Badge variant="secondary" className="text-[10px] font-mono shrink-0">{channel.type}</Badge>
          {stateBadge(channel.state)}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpanded(v => !v)}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(channel)}>
            <Pencil size={13} />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDelete} disabled={del.isPending}
          >
            <Trash2 size={13} />
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

          {(channel.senderPolicy || channel.sessionScope || channel.dispatchMode || channel.model) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {channel.senderPolicy && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">policy:{channel.senderPolicy}</span>}
              {channel.sessionScope && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">scope:{channel.sessionScope}</span>}
              {channel.dispatchMode && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">mode:{channel.dispatchMode}</span>}
              {channel.model && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">model:{channel.model}</span>}
            </div>
          )}

          {channel.instructions && (
            <p className="text-[10px] text-muted-foreground italic">"{channel.instructions}"</p>
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

type ChannelFormProps = {
  initial?: Channel;
  onSuccess: () => void;
  onCancel: () => void;
};

function ChannelForm({ initial, onSuccess, onCancel }: ChannelFormProps) {
  const configure = useConfigureChannelMutation();
  const isEdit = !!initial;

  const [type, setType] = useState<ChannelType>((initial?.type as ChannelType) ?? 'telegram');
  const [name, setName] = useState(initial?.name ?? '');
  const fields = CONFIG_FIELDS[type] ?? [];
  const [values, setValues] = useState<Record<string, string>>(
    initial?.config ?? Object.fromEntries((CONFIG_FIELDS[type] ?? []).map(f => [f.key, '']))
  );
  const [model, setModel] = useState(initial?.model ?? '');
  const [instructions, setInstructions] = useState(initial?.instructions ?? '');
  const [policy, setPolicy] = useState(initial?.senderPolicy ?? 'pairing');
  const [scope, setScope] = useState(initial?.sessionScope ?? 'user');
  const [dispatch, setDispatch] = useState(initial?.dispatchMode ?? 'steer');
  const [allow, setAllow] = useState('');

  React.useEffect(() => {
    if (!isEdit) {
      setValues(Object.fromEntries(fields.map(f => [f.key, ''])));
    }
  }, [type, isEdit]);

  const handleSave = async () => {
    if (!name.trim()) return;
    await configure.mutateAsync({
      channel: name.trim(),
      type,
      settings: values,
      model: model.trim() || undefined,
      instructions: instructions.trim() || undefined,
      policy,
      scope,
      dispatch,
      allow: allow.trim() || undefined,
    });
    onSuccess();
  };

  return (
    <Card className="p-4 flex flex-col gap-3 border-dashed">
      <p className="text-xs font-semibold">{isEdit ? `Edit: ${initial!.name}` : 'New Channel'}</p>

      {!isEdit && (
        <div className="flex gap-2 flex-wrap">
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
      )}

      {!isEdit && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium">Instance Name</label>
          <Input
            placeholder="e.g. mybot"
            value={name}
            onChange={e => setName(e.target.value)}
            className="h-8 text-xs font-mono"
          />
        </div>
      )}

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

      <div className="border-t pt-3 flex flex-col gap-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Behaviour</p>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium">Policy</label>
          <div className="flex gap-1 flex-wrap">
            {POLICY_OPTIONS.map(o => (
              <button key={o} onClick={() => setPolicy(o)}
                className={`text-xs px-2 py-1 rounded border font-mono transition-colors ${policy === o ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted border-input'}`}>
                {o}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium">Session Scope</label>
          <div className="flex gap-1 flex-wrap">
            {SCOPE_OPTIONS.map(o => (
              <button key={o} onClick={() => setScope(o)}
                className={`text-xs px-2 py-1 rounded border font-mono transition-colors ${scope === o ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted border-input'}`}>
                {o}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium">Dispatch Mode</label>
          <div className="flex gap-1 flex-wrap">
            {DISPATCH_OPTIONS.map(o => (
              <button key={o} onClick={() => setDispatch(o)}
                className={`text-xs px-2 py-1 rounded border font-mono transition-colors ${dispatch === o ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted border-input'}`}>
                {o}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium">Model <span className="text-muted-foreground font-normal">(optional)</span></label>
          <ModelSelect value={model} onChange={setModel} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium">Instructions <span className="text-muted-foreground font-normal">(optional)</span></label>
          <textarea
            placeholder="System prompt / instructions for the AI on this channel"
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            className="min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {policy === 'allowlist' && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Allowed User IDs <span className="text-muted-foreground font-normal">(comma-separated)</span></label>
            <Input
              placeholder="user1,user2"
              value={allow}
              onChange={e => setAllow(e.target.value)}
              className="h-8 text-xs font-mono"
            />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={configure.isPending || !name.trim()}>
          {configure.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Configure'}
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
  const [editing, setEditing] = useState<Channel | null>(null);

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
          <Button size="sm" onClick={() => { setShowNew(v => !v); setEditing(null); }}>
            <Plus size={13} className="mr-1" /> New Channel
          </Button>
        </div>
      </div>

      {editing && (
        <ChannelForm
          initial={editing}
          onSuccess={() => { setEditing(null); refetch(); }}
          onCancel={() => setEditing(null)}
        />
      )}

      {showNew && !editing && (
        <ChannelForm onSuccess={() => { setShowNew(false); refetch(); }} onCancel={() => setShowNew(false)} />
      )}

      {channels.length === 0 && !isLoading && !showNew && !editing && (
        <p className="text-sm text-muted-foreground italic">No channels configured. Click "New Channel" to get started.</p>
      )}

      <div className="flex flex-col gap-3">
        {channels.map(ch => (
          <ChannelCard
            key={ch.name}
            channel={ch}
            onEdit={ch => { setEditing(ch); setShowNew(false); }}
          />
        ))}
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
