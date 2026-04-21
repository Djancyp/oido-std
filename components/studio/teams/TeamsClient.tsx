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
    <div className="flex flex-col gap-3 p-4 border rounded-lg bg-muted/10">
      <p className="text-sm font-semibold">New User</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium">Name</label>
          <Input autoFocus value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-xs" placeholder="Jane Doe" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium">Email</label>
          <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="h-8 text-xs" type="email" placeholder="jane@example.com" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium">Password</label>
        <Input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="h-8 text-xs" type="password" placeholder="Temporary password" />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 size={13} className="animate-spin mr-1" /> : <Plus size={13} className="mr-1" />}
          Create User
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
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
    <div className="flex flex-col gap-2 p-3 border rounded-lg bg-background shadow-md w-56">
      <p className="text-xs font-semibold">Roles for {user.name}</p>
      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
        {allRoles.map(role => (
          <button
            key={role.id}
            onClick={() => toggle(role.id)}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors',
              selected.includes(role.id) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
          >
            <Check size={11} className={selected.includes(role.id) ? 'opacity-100' : 'opacity-0'} />
            <span className="font-mono">{role.name}</span>
          </button>
        ))}
        {allRoles.length === 0 && <p className="text-xs text-muted-foreground italic px-2">No roles yet.</p>}
      </div>
      <div className="flex gap-1.5 pt-1 border-t">
        <Button size="sm" className="h-6 text-[11px] flex-1" onClick={handleSave} disabled={mutation.isPending}>
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
        <Button size="sm" onClick={() => setShowCreate(v => !v)}>
          <Plus size={13} className="mr-1" /> Add User
        </Button>
      </div>

      {showCreate && <CreateUserForm onDone={() => setShowCreate(false)} />}

      <div className="flex flex-col divide-y rounded-lg border overflow-hidden">
        {users.map(user => (
          <div key={user.id} className="relative">
            {editingId === user.id ? (
              <div className="px-4">
                <EditUserRow user={user} onDone={() => setEditingId(null)} />
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-primary">{user.name[0].toUpperCase()}</span>
                </div>
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {user.roles.map(r => (
                    <Badge key={r.id} variant="secondary" className="text-[10px] font-mono">{r.name}</Badge>
                  ))}
                  {user.roles.length === 0 && <span className="text-[11px] text-muted-foreground italic">no roles</span>}
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
          <p className="text-sm text-muted-foreground italic px-4 py-6 text-center">No users yet.</p>
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
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          <Plus size={13} className="mr-1" /> Add Role
        </Button>
      </div>

      {showForm && (
        <div className="flex flex-col gap-3 p-4 border rounded-lg bg-muted/10">
          <p className="text-sm font-semibold">New Role</p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Name</label>
            <Input autoFocus value={name} onChange={e => setName(e.target.value)} className="h-8 text-xs font-mono" placeholder="admin" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} className="h-8 text-xs" placeholder="Full administrative access" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 size={13} className="animate-spin mr-1" /> : <Plus size={13} className="mr-1" />}
              Create Role
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(''); }}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex flex-col divide-y rounded-lg border overflow-hidden">
        {roles.map(role => (
          <div key={role.id} className="flex items-center gap-3 px-4 py-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <ShieldCheck size={14} className="text-muted-foreground" />
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
        ))}
        {roles.length === 0 && (
          <p className="text-sm text-muted-foreground italic px-4 py-6 text-center">No roles yet. Create one to assign permissions.</p>
        )}
      </div>
    </div>
  );
}

/* ── Root ── */
export function TeamsClient({ initialUsers, initialRoles }: { initialUsers: TeamUser[]; initialRoles: Role[] }) {
  const [tab, setTab] = useState<'users' | 'roles'>('users');

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <Users size={20} />
        <h1 className="text-xl font-semibold">Team</h1>
      </div>

      <div className="flex gap-1 border-b">
        {(['users', 'roles'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px',
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t === 'users' ? <span className="flex items-center gap-1.5"><Users size={14} /> Users</span>
                           : <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> Roles</span>}
          </button>
        ))}
      </div>

      {tab === 'users'
        ? <UsersTab initialUsers={initialUsers} allRoles={initialRoles} />
        : <RolesTab initialRoles={initialRoles} />}
    </div>
  );
}
