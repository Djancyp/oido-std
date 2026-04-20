'use client';

import * as React from 'react';
import {
  Plus, Search, Trash2, ChevronLeft, BookOpen,
  Loader2, Pencil, Tag, Save, X, Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { Skill } from '@/app/api/skills/route';
import {
  useSkillsQuery,
  useCreateSkill,
  useUpdateSkill,
  useDeleteSkill,
} from '@/hooks/skills';

/* ── Types ── */
type SkillForm = {
  name: string;
  description: string;
  body: string;
  scope: 'user' | 'project';
  tools: string[];
};

const EMPTY_FORM: SkillForm = {
  name: '',
  description: '',
  body: '',
  scope: 'user',
  tools: [],
};

const LEVEL_COLORS: Record<string, string> = {
  user: 'bg-blue-100 text-blue-700',
  project: 'bg-amber-100 text-amber-700',
  bundled: 'bg-zinc-100 text-zinc-600',
  extension: 'bg-purple-100 text-purple-700',
};

/* ── Main component ── */
export function SkillsClient({ initialSkills }: { initialSkills: Skill[] }) {
  const router = useRouter();
  const { data: skills = [] } = useSkillsQuery({ initialData: initialSkills });
  const create = useCreateSkill();
  const update = useUpdateSkill();
  const del = useDeleteSkill();

  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState<Skill | null>(null);
  const [mode, setMode] = React.useState<'view' | 'edit' | 'new'>('view');
  const [form, setForm] = React.useState<SkillForm>(EMPTY_FORM);
  const [toolInput, setToolInput] = React.useState('');

  const filtered = skills.filter(
    s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase())
  );

  /* ── Handlers ── */
  const openNew = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setMode('new');
  };

  const openEdit = (skill: Skill) => {
    setSelected(skill);
    setForm({
      name: skill.name,
      description: skill.description,
      body: skill.body ?? '',
      scope: (skill.level === 'project' ? 'project' : 'user') as 'user' | 'project',
      tools: skill.tools ?? [],
    });
    setMode('edit');
  };

  const openView = (skill: Skill) => {
    setSelected(skill);
    setMode('view');
  };

  const cancel = () => {
    setMode(selected ? 'view' : 'view');
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.description.trim()) return;
    if (mode === 'new') {
      await create.mutateAsync(form);
    } else {
      await update.mutateAsync(form);
    }
    setMode('view');
    setSelected(null);
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Remove skill "${name}"?`)) return;
    await del.mutateAsync(name);
    if (selected?.name === name) { setSelected(null); setMode('view'); }
  };

  const addTool = () => {
    const t = toolInput.trim();
    if (t && !form.tools.includes(t)) setForm(f => ({ ...f, tools: [...f.tools, t] }));
    setToolInput('');
  };

  const removeTool = (t: string) => setForm(f => ({ ...f, tools: f.tools.filter(x => x !== t) }));

  const isSaving = create.isPending || update.isPending;

  /* ── Render ── */
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-muted/10 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/studio')}>
            <ChevronLeft size={20} />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Skills</h1>
            <p className="text-xs text-muted-foreground">
              Domain knowledge packages for oido
            </p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2 active:scale-95 transition-transform">
          <Plus size={16} /> New Skill
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left panel: list ── */}
        <div className="w-72 shrink-0 border-r flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search skills..."
                className="pl-8 h-8 text-xs bg-muted/30"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-xs gap-2">
                <BookOpen size={28} className="opacity-20" />
                {search ? 'No matches.' : 'No skills yet.'}
              </div>
            ) : (
              <div className="p-2 flex flex-col gap-1">
                {filtered.map(skill => (
                  <button
                    key={skill.name}
                    onClick={() => openView(skill)}
                    className={cn(
                      'group w-full text-left rounded-md px-3 py-2.5 hover:bg-muted/60 transition-colors',
                      selected?.name === skill.name && mode !== 'new' && 'bg-muted/80'
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-medium truncate">{skill.name}</span>
                      <span className={cn('text-[9px] font-bold uppercase px-1.5 py-0.5 rounded', LEVEL_COLORS[skill.level] ?? LEVEL_COLORS.bundled)}>
                        {skill.level}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {skill.description}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="p-3 border-t text-[10px] text-muted-foreground">
            {skills.length} skill{skills.length !== 1 ? 's' : ''} installed
          </div>
        </div>

        {/* ── Right panel: detail / editor ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {mode === 'view' && !selected && (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <BookOpen size={40} className="opacity-20" />
              <p className="text-sm">Select a skill or create a new one.</p>
            </div>
          )}

          {mode === 'view' && selected && (
            <ScrollArea className="flex-1">
              <div className="p-6 max-w-3xl">
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold">{selected.name}</h2>
                    <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded', LEVEL_COLORS[selected.level] ?? LEVEL_COLORS.bundled)}>
                      {selected.level}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {(selected.level === 'user' || selected.level === 'project') && (
                      <>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => openEdit(selected)}>
                          <Pencil size={12} /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-destructive hover:bg-destructive/10 border-destructive/30"
                          onClick={() => handleDelete(selected.name)}
                          disabled={del.isPending}
                        >
                          {del.isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">{selected.description}</p>

                {selected.tools && selected.tools.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {selected.tools.map(t => (
                      <Badge key={t} variant="secondary" className="text-[11px] gap-1">
                        <Wrench size={10} /> {t}
                      </Badge>
                    ))}
                  </div>
                )}

                {selected.filePath && (
                  <p className="text-[10px] text-muted-foreground font-mono mb-4">{selected.filePath}</p>
                )}

                {selected.body && (
                  <Card className="p-4">
                    <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">
                      {selected.body}
                    </pre>
                  </Card>
                )}
              </div>
            </ScrollArea>
          )}

          {(mode === 'new' || mode === 'edit') && (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Editor header */}
              <div className="flex items-center justify-between px-6 py-3 border-b shrink-0">
                <h2 className="font-semibold text-sm">
                  {mode === 'new' ? 'New Skill' : `Edit: ${form.name}`}
                </h2>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={cancel}>
                    <X size={12} /> Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={handleSave}
                    disabled={isSaving || !form.name.trim() || !form.description.trim()}
                  >
                    {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Save
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6 max-w-3xl flex flex-col gap-5">
                  {/* Name + Scope */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold">Name</label>
                      <Input
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="my-skill"
                        disabled={mode === 'edit'}
                        className="h-9 text-sm font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold">Scope</label>
                      <div className="flex gap-2">
                        {(['user', 'project'] as const).map(s => (
                          <Button
                            key={s}
                            variant={form.scope === s ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1 h-9 text-xs capitalize"
                            onClick={() => setForm(f => ({ ...f, scope: s }))}
                          >
                            {s}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold">Description</label>
                    <Input
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="What does this skill do?"
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Tools */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold flex items-center gap-1.5">
                      <Wrench size={12} /> Allowed Tools
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={toolInput}
                        onChange={e => setToolInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTool())}
                        placeholder="tool_name (press Enter)"
                        className="h-8 text-xs font-mono"
                      />
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={addTool}>
                        <Tag size={12} />
                      </Button>
                    </div>
                    {form.tools.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {form.tools.map(t => (
                          <Badge key={t} variant="secondary" className="text-[11px] gap-1 pr-1">
                            {t}
                            <button onClick={() => removeTool(t)} className="hover:text-destructive ml-0.5">
                              <X size={10} />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className="text-xs font-semibold">Body (Markdown)</label>
                    <textarea
                      value={form.body}
                      onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                      placeholder="Write the skill instructions in markdown..."
                      className="min-h-[320px] w-full rounded-md border bg-muted/20 p-3 text-xs font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
