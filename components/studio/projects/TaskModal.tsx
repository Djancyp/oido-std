'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Task, Column } from '@/hooks/projects';
import { useAgents } from '@/contexts/Agents';
import { X, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type SaveData = {
  title: string; description?: string; priority: string;
  columnId: string; assignedAgentId?: string; assignedAgentName?: string;
  dueDate?: string; labels?: string[]; runAuto?: boolean; dependsOn?: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  columns: Column[];
  allTasks: Task[];
  task?: Task;
  defaultColumnId?: string;
  onSave: (data: SaveData) => void;
  onDelete?: () => void;
  loading?: boolean;
};

const PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;

export function TaskModal({ open, onClose, columns, allTasks, task, defaultColumnId, onSave, onDelete, loading }: Props) {
  const { agents } = useAgents();
  const flatAgents = flattenAgents(agents ?? []);

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState(task?.priority ?? 'medium');
  const [columnId, setColumnId] = useState(task?.columnId ?? defaultColumnId ?? columns[0]?.id ?? '');
  const [agentId, setAgentId] = useState(task?.assignedAgentId ?? '');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [labelInput, setLabelInput] = useState('');
  const [labels, setLabels] = useState<string[]>(task?.labels ? JSON.parse(task.labels) : []);
  const [runAuto, setRunAuto] = useState(task?.runAuto ?? false);
  const [dependsOn, setDependsOn] = useState<string[]>(task?.dependsOn ? JSON.parse(task.dependsOn) : []);

  const otherTasks = allTasks.filter(t => t.id !== task?.id);

  const addLabel = () => {
    const v = labelInput.trim();
    if (v && !labels.includes(v)) setLabels(prev => [...prev, v]);
    setLabelInput('');
  };

  const removeLabel = (l: string) => setLabels(prev => prev.filter(x => x !== l));

  const toggleDep = (id: string) =>
    setDependsOn(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = () => {
    if (!title.trim()) return;
    const agent = flatAgents.find(a => a.agent_id === agentId);
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      columnId,
      assignedAgentId: agent?.agent_id || undefined,
      assignedAgentName: agent?.name || undefined,
      dueDate: dueDate || undefined,
      labels: labels.length ? labels : undefined,
      runAuto,
      dependsOn: dependsOn.length ? dependsOn : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg mx-4 p-4 md:p-6 max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" autoFocus />
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Column</Label>
              <Select value={columnId} onValueChange={setColumnId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {columns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Assigned Agent</Label>
            <Select value={agentId || '__none'} onValueChange={v => setAgentId(v === '__none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Unassigned</SelectItem>
                {flatAgents.map(a => <SelectItem key={a.agent_id} value={a.agent_id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Run Auto */}
          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Run automatically</Label>
              <p className="text-xs text-muted-foreground">
                When moved to &ldquo;In Progress&rdquo;, start the assigned agent with this task as context
              </p>
            </div>
            <Switch
              checked={runAuto}
              onCheckedChange={setRunAuto}
              disabled={!agentId}
            />
          </div>

          {/* Depends On */}
          {otherTasks.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Link2 size={13} />
                Depends on
              </Label>
              <div className="max-h-36 overflow-y-auto rounded-lg border divide-y">
                {otherTasks.map(t => {
                  const col = columns.find(c => c.id === t.columnId);
                  const selected = dependsOn.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleDep(t.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors',
                        selected && 'bg-primary/5',
                      )}
                    >
                      <span className={cn(
                        'w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0',
                        selected ? 'bg-primary border-primary' : 'border-muted-foreground/40',
                      )}>
                        {selected && <span className="text-primary-foreground text-[8px] font-bold">✓</span>}
                      </span>
                      <span className="flex-1 truncate">{t.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{col?.name}</span>
                    </button>
                  );
                })}
              </div>
              {dependsOn.length > 0 && (
                <p className="text-xs text-muted-foreground">{dependsOn.length} dependenc{dependsOn.length === 1 ? 'y' : 'ies'} selected</p>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label>Due Date</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Labels</Label>
            <div className="flex gap-2">
              <Input value={labelInput} onChange={e => setLabelInput(e.target.value)} placeholder="Add label" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLabel())} />
              <Button type="button" variant="outline" size="sm" onClick={addLabel}>Add</Button>
            </div>
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {labels.map(l => (
                  <Badge key={l} variant="secondary" className="flex items-center gap-1">
                    {l}
                    <button onClick={() => removeLabel(l)} className="ml-0.5 hover:text-destructive"><X size={10} /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
          {task && onDelete && (
            <Button variant="destructive" size="sm" onClick={onDelete} disabled={loading} className="sm:mr-auto">
              Delete
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={loading || !title.trim()}>
            {task ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function flattenAgents(agents: any[]): { agent_id: string; name: string }[] {
  const result: { agent_id: string; name: string }[] = [];
  function walk(list: any[]) {
    for (const a of list) {
      result.push({ agent_id: a.agent_id, name: a.agent_name ?? a.name });
      if (a.subagents?.length) walk(a.subagents);
    }
  }
  walk(agents);
  return result;
}
