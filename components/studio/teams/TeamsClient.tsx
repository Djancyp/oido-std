'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, ShieldCheck, Plus, Trash2, Pencil, X, Check, Loader2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/* ── Types ── */
type Role = { id: string; name: string; description?: string };
type TeamUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  roles: Role[];
};

/* ── Hooks ── */
function useUsers(initial: TeamUser[]) {
  return useQuery<TeamUser[]>({
    queryKey: ['teams', 'users'],
    queryFn: () => fetch('/api/teams/users').then(r => r.json()),
    initialData: initial,
  });
}

function useRoles(initial: Role[]) {
  return useQuery<Role[]>({
    queryKey: ['teams', 'roles'],
    queryFn: () => fetch('/api/teams/roles').then(r => r.json()),
    initialData: initial,
  });
}

function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email: string; password: string }) =>
      fetch('/api/teams/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams', 'users'] }),
  });
}

function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; email?: string; password?: string }) =>
      fetch(`/api/teams/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams', 'users'] }),
  });
}

function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetch(`/api/teams/users/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams', 'users'] }),
  });
}

function useSetUserRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, roleIds }: { id: string; roleIds: string[] }) =>
      fetch(`/api/teams/users/${id}/roles`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roleIds }) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams', 'users'] }),
  });
}

function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      fetch('/api/teams/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams', 'roles'] }),
  });
}

function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch('/api/teams/roles', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams', 'roles'] });
      qc.invalidateQueries({ queryKey: ['teams', 'users'] });
    },
  });
}

/* ── Create User Form ── */
function CreateUserForm({ onDone }: { onDone: () => void }) {
  const mutation = useCreateUser();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) { setError('All fields required'); return; }
    const res = await mutation.mutateAsync(form);
    if (res.error) { setError(res.error); return; }
    onDone();
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl border border-border/50 bg-card shadow-sm">
      <p className="text-sm font-semibold">New User</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Name</label>
          <Input autoFocus value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-xs border-border/50 bg-muted/20 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50" placeholder="Jane Doe" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Email</label>
          <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="h-8 text-xs border-border/50 bg-muted/20 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50" type="email" placeholder="jane@example.com" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Password</label>
        <Input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="h-8 text-xs border-border/50 bg-muted/20 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50" type="password" placeholder="Temporary password" />
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm" onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          Create User
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}

/* ── Edit User Inline ── */
function EditUserRow({ user, onDone }: { user: TeamUser; onDone: () => void }) {
  const mutation = useUpdateUser();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState('');

  const handleSave = async () => {
    const data: any = { id: user.id, name, email };
    if (password) data.password = password;
    await mutation.mutateAsync(data);
    onDone();
  };

  return (
    <div className="flex items-center gap-2 py-2">
      <Input value={name} onChange={e => setName(e.target.value)} className="h-7 text-xs flex-1" />
      <Input value={email} onChange={e => setEmail(e.target.value)} className="h-7 text-xs flex-1" type="email" />
      <Input value={password} onChange={e => setPassword(e.target.value)} className="h-7 text-xs w-32" type="password" placeholder="New password" />
      <button onClick={handleSave} disabled={mutation.isPending} className="text-green-600 hover:text-green-700">
        {mutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
      </button>
      <button onClick={onDone} className="text-muted-foreground hover:text-foreground"><X size={13} /></button>
    </div>
  );
}

/* ── Role Picker ── */
function RolePicker({ user, allRoles, onClose }: { user: TeamUser; allRoles: Role[]; onClose: () => void }) {
  const mutation = useSetUserRoles();
  const [selected, setSelected] = useState<string[]>(user.roles.map(r => r.id));

  const toggle = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const handleSave = async () => {
    await mutation.mutateAsync({ id: user.id, roleIds: selected });
    onClose();
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-card shadow-lg p-3 w-56">
      <p className="text-xs font-semibold">Roles for {user.name}</p>
      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
        {allRoles.map(role => (
          <button
            key={role.id}
            onClick={() => toggle(role.id)}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-colors',
              selected.includes(role.id)
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15'
                : 'hover:bg-muted'
            )}
          >
            <Check size={11} className={selected.includes(role.id) ? 'opacity-100' : 'opacity-0'} />
            <span className="font-mono">{role.name}</span>
          </button>
        ))}
        {allRoles.length === 0 && <p className="text-xs text-muted-foreground italic px-2">No roles yet.</p>}
      </div>
      <div className="flex gap-1.5 pt-1 border-t">
        <Button size="sm" className="h-6 text-[11px] flex-1 bg-indigo-600 hover:bg-indigo-500 text-white" onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 size={11} className="animate-spin mr-1" /> : null} Save
        </Button>
        <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

/* ── Users Tab ── */
function UsersTab({ initialUsers, allRoles }: { initialUsers: TeamUser[]; allRoles: Role[] }) {
  const { data: users = initialUsers } = useUsers(initialUsers);
  const deleteMutation = useDeleteUser();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rolePickerId, setRolePickerId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        <Button size="sm" className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm" onClick={() => setShowCreate(v => !v)}>
          <Plus size={13} /> Add User
        </Button>
      </div>

      {showCreate && <CreateUserForm onDone={() => setShowCreate(false)} />}

      <div className="flex flex-col gap-2">
        {users.map(user => (
          <div key={user.id} className="relative group rounded-xl border border-border/40 overflow-hidden bg-card hover:border-border/60 transition-all duration-150">
            {editingId === user.id ? (
              <div className="px-4">
                <EditUserRow user={user} onDone={() => setEditingId(null)} />
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-indigo-400">{user.name[0].toUpperCase()}</span>
                </div>
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {user.roles.map(r => (
                    <span key={r.id} className="text-[10px] font-mono bg-indigo-500/8 text-indigo-400 border border-indigo-500/15 px-1.5 py-0.5 rounded-md">{r.name}</span>
                  ))}
                  {user.roles.length === 0 && <span className="text-[11px] text-muted-foreground/40 italic">no roles</span>}
                </div>
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => setRolePickerId(id => id === user.id ? null : user.id)}
                    title="Manage roles"
                  >
                    <ShieldCheck size={13} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(user.id)} title="Edit">
                    <Pencil size={13} />
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(user.id)}
                    disabled={deleteMutation.isPending}
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            )}
            {rolePickerId === user.id && (
              <div className="absolute right-4 top-12 z-10">
                <RolePicker user={user} allRoles={allRoles} onClose={() => setRolePickerId(null)} />
              </div>
            )}
          </div>
        ))}
        {users.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border/40 flex items-center justify-center">
              <Users size={20} className="text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">No users yet</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Create a user to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Roles Tab ── */
function RolesTab({ initialRoles }: { initialRoles: Role[] }) {
  const { data: roles = initialRoles } = useRoles(initialRoles);
  const createMutation = useCreateRole();
  const deleteMutation = useDeleteRole();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) { setError('Name required'); return; }
    const res = await createMutation.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
    if (res.error) { setError(res.error); return; }
    setName(''); setDescription(''); setShowForm(false); setError('');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{roles.length} role{roles.length !== 1 ? 's' : ''}</p>
        <Button size="sm" className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm" onClick={() => setShowForm(v => !v)}>
          <Plus size={13} /> Add Role
        </Button>
      </div>

      {showForm && (
        <div className="flex flex-col gap-4 p-4 rounded-xl border border-border/50 bg-card shadow-sm">
          <p className="text-sm font-semibold">New Role</p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Name</label>
            <Input autoFocus value={name} onChange={e => setName(e.target.value)} className="h-8 text-xs font-mono border-border/50 bg-muted/20 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50" placeholder="admin" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} className="h-8 text-xs border-border/50 bg-muted/20 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/50" placeholder="Full administrative access" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm" onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Create Role
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setShowForm(false); setError(''); }}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {roles.map(role => (
          <div key={role.id} className="group rounded-xl border border-border/40 overflow-hidden bg-card hover:border-border/60 transition-all duration-150">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/15 flex items-center justify-center shrink-0">
                <ShieldCheck size={14} className="text-violet-400" />
              </div>
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-sm font-mono font-medium">{role.name}</span>
                {role.description && <span className="text-xs text-muted-foreground">{role.description}</span>}
              </div>
              <Button
                size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                onClick={() => deleteMutation.mutate(role.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
        ))}
        {roles.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border/40 flex items-center justify-center">
              <ShieldCheck size={20} className="text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">No roles yet</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Create one to assign permissions</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Root ── */
export function TeamsClient({ initialUsers, initialRoles }: { initialUsers: TeamUser[]; initialRoles: Role[] }) {
  const [tab, setTab] = useState<'users' | 'roles'>('users');
  const { data: users = initialUsers } = useQuery<TeamUser[]>({
    queryKey: ['teams', 'users'],
    queryFn: () => fetch('/api/teams/users').then(r => r.json()),
    initialData: initialUsers,
  });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Users size={16} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">Team</h1>
            <p className="text-[11px] text-muted-foreground">{users.length} member{users.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="flex p-0.5 gap-0.5 bg-muted/50 rounded-lg border border-border/40 w-fit">
        {(['users', 'roles'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-[11px] px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
              tab === t ? 'bg-background text-foreground shadow-sm border border-border/50 font-medium' : 'text-muted-foreground hover:text-foreground'
            }`}>
            {t === 'users' ? <><Users size={11} />Users</> : <><ShieldCheck size={11} />Roles</>}
          </button>
        ))}
      </div>

      {tab === 'users'
        ? <UsersTab initialUsers={initialUsers} allRoles={initialRoles} />
        : <RolesTab initialRoles={initialRoles} />}
    </div>
  );
}
