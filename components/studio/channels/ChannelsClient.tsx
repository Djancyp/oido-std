'use client';

import React, { useState } from 'react';
import { Cable, Play, Square, RefreshCw, Plus, ChevronDown, ChevronUp, Users, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  if (state === 'running') return (
    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 border border-emerald-500/20 bg-emerald-500/8 px-1.5 py-0.5 rounded-md">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />running
    </span>
  );
  if (state === 'error') return (
    <span className="inline-flex items-center gap-1 text-[10px] text-red-400 border border-red-500/20 bg-red-500/8 px-1.5 py-0.5 rounded-md">error</span>
  );
  return (
    <span className="text-[10px] text-muted-foreground/60 border border-border/30 bg-muted/30 px-1.5 py-0.5 rounded-md">stopped</span>
  );
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

  const accentClass = running
    ? 'bg-gradient-to-b from-emerald-500/60 to-emerald-600/30'
    : channel.state === 'error'
      ? 'bg-gradient-to-b from-red-500/60 to-red-600/30'
      : 'bg-gradient-to-b from-slate-500/60 to-slate-600/30';

  return (
    <div className="group rounded-xl border border-border/40 overflow-hidden bg-card hover:border-border/70 hover:shadow-sm transition-all duration-150">
      <div className="flex items-stretch">
        <div className={`w-[3px] shrink-0 ${accentClass}`} />
        <div className="flex-1 flex flex-col gap-0 px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-sm truncate">{channel.name}</span>
              <span className="text-[10px] bg-indigo-500/8 text-indigo-400 border border-indigo-500/15 px-1.5 py-0.5 rounded-md font-mono shrink-0">{channel.type}</span>
              {stateBadge(channel.state)}
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setExpanded(v => !v)}>
                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => onEdit(channel)}>
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
                  variant="ghost" size="icon" className="h-7 w-7 text-emerald-500 hover:text-emerald-400"
                  onClick={() => start.mutate(channel.name)} disabled={start.isPending}
                >
                  <Play size={13} />
                </Button>
              )}
            </div>
          </div>

          {expanded && (
            <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-border/40">
              {Object.entries(channel.config).length > 0 && (
                <div className="flex flex-col gap-1">
                  {Object.entries(channel.config).map(([k, v]) => {
                    const isSecret = fields.find(f => f.key === k)?.secret;
                    return (
                      <div key={k} className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-muted-foreground/60 w-24 shrink-0">{k}</span>
                        <span className="text-foreground/80 truncate">{isSecret ? maskSecret(v) : v}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {(channel.senderPolicy || channel.sessionScope || channel.dispatchMode || channel.model) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {channel.senderPolicy && <span className="text-[10px] bg-indigo-500/8 text-indigo-400 border border-indigo-500/15 px-1.5 py-0.5 rounded-md font-mono">policy:{channel.senderPolicy}</span>}
                  {channel.sessionScope && <span className="text-[10px] bg-indigo-500/8 text-indigo-400 border border-indigo-500/15 px-1.5 py-0.5 rounded-md font-mono">scope:{channel.sessionScope}</span>}
                  {channel.dispatchMode && <span className="text-[10px] bg-indigo-500/8 text-indigo-400 border border-indigo-500/15 px-1.5 py-0.5 rounded-md font-mono">mode:{channel.dispatchMode}</span>}
                  {channel.model && <span className="text-[10px] bg-indigo-500/8 text-indigo-400 border border-indigo-500/15 px-1.5 py-0.5 rounded-md font-mono">model:{channel.model}</span>}
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
        </div>
      </div>
    </div>
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
    <div className="flex flex-col gap-4 p-4 rounded-xl border border-border/50 bg-card shadow-sm">
      <p className="text-xs font-semibold">{isEdit ? `Edit: ${initial!.name}` : 'New Channel'}</p>

      {!isEdit && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Channel Type</label>
          <div className="flex p-0.5 gap-0.5 bg-muted/50 rounded-lg border border-border/40">
            {SUPPORTED_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`text-[11px] px-2.5 py-1 rounded-md transition-all font-mono ${type === t ? 'bg-background text-foreground shadow-sm border border-border/50 font-medium' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isEdit && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Instance Name</label>
          <Input
            placeholder="e.g. mybot"
            value={name}
            onChange={e => setName(e.target.value)}
            className="h-8 text-xs font-mono border-border/50 bg-muted/20 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50"
          />
        </div>
      )}

      {fields.map(f => (
        <div key={f.key} className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">{f.label}</label>
          <Input
            type={f.secret ? 'password' : 'text'}
            placeholder={f.placeholder}
            value={values[f.key] ?? ''}
            onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
            className="h-8 text-xs font-mono border-border/50 bg-muted/20 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50"
          />
        </div>
      ))}

      <div className="flex flex-col gap-3 pt-1">
        <div className="flex items-center gap-2">
          <div className="w-px h-3 bg-border/60" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Behaviour</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Policy</label>
          <div className="flex p-0.5 gap-0.5 bg-muted/50 rounded-lg border border-border/40">
            {POLICY_OPTIONS.map(o => (
              <button key={o} onClick={() => setPolicy(o)}
                className={`text-[11px] px-2.5 py-1 rounded-md transition-all ${policy === o ? 'bg-background text-foreground shadow-sm border border-border/50 font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
                {o}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Session Scope</label>
          <div className="flex p-0.5 gap-0.5 bg-muted/50 rounded-lg border border-border/40">
            {SCOPE_OPTIONS.map(o => (
              <button key={o} onClick={() => setScope(o)}
                className={`text-[11px] px-2.5 py-1 rounded-md transition-all ${scope === o ? 'bg-background text-foreground shadow-sm border border-border/50 font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
                {o}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Dispatch Mode</label>
          <div className="flex p-0.5 gap-0.5 bg-muted/50 rounded-lg border border-border/40">
            {DISPATCH_OPTIONS.map(o => (
              <button key={o} onClick={() => setDispatch(o)}
                className={`text-[11px] px-2.5 py-1 rounded-md transition-all ${dispatch === o ? 'bg-background text-foreground shadow-sm border border-border/50 font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
                {o}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Model <span className="text-muted-foreground/50 normal-case tracking-normal font-normal">(optional)</span></label>
          <ModelSelect value={model} onChange={setModel} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Instructions <span className="text-muted-foreground/50 normal-case tracking-normal font-normal">(optional)</span></label>
          <textarea
            placeholder="System prompt / instructions for the AI on this channel"
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            className="min-h-[64px] w-full rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-xs font-mono resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50"
          />
        </div>

        {policy === 'allowlist' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Allowed User IDs <span className="text-muted-foreground/50 normal-case tracking-normal font-normal">(comma-separated)</span></label>
            <Input
              placeholder="user1,user2"
              value={allow}
              onChange={e => setAllow(e.target.value)}
              className="h-8 text-xs font-mono border-border/50 bg-muted/20 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50"
            />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={configure.isPending || !name.trim()} className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white">
          {configure.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Configure'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>

      {configure.isError && (
        <p className="text-xs text-destructive">Failed to configure. Check the values and try again.</p>
      )}
    </div>
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
            <Button size="sm" className="h-6 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => pairingMutation.mutate({ id: r.id, action: 'approve' })}>Approve</Button>
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
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
            <Cable size={16} className="text-teal-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">Channels</h1>
            <p className="text-[11px] text-muted-foreground">{channels.length} {channels.length === 1 ? 'channel' : 'channels'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </Button>
          <Button className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm" onClick={() => { setShowNew(v => !v); setEditing(null); }}>
            <Plus size={12} strokeWidth={2.5} /> New Channel
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
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border/40 flex items-center justify-center">
            <Cable size={20} className="text-muted-foreground/40" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">No channels yet</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Click "New Channel" to get started.</p>
          </div>
        </div>
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
          <Users size={16} className="text-muted-foreground/60" />
          <h2 className="text-sm font-semibold">Pairing Requests</h2>
        </div>
        <PairingPanel />
      </div>
    </div>
  );
}
