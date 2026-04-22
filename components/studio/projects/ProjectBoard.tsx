'use client';
import { useState } from 'react';
import { useProjectQuery, ProjectDetail } from '@/hooks/projects';
import { KanbanBoard } from './KanbanBoard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Edit2, Check, X } from 'lucide-react';
import Link from 'next/link';
import { useUpdateProjectMutation } from '@/hooks/projects';

type Props = { projectId: string; initialData?: ProjectDetail };

export function ProjectBoard({ projectId, initialData }: Props) {
  const { data: project = initialData } = useProjectQuery(projectId);
  const updateProject = useUpdateProjectMutation(projectId);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  if (!project) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;

  const startEdit = () => { setNameInput(project.name); setEditingName(true); };
  const saveEdit = () => {
    if (nameInput.trim()) updateProject.mutate({ name: nameInput.trim() });
    setEditingName(false);
  };

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <div className="flex items-center gap-2 px-3 md:px-6 py-3 border-b shrink-0 min-w-0">
        <Link href="/studio/projects">
          <Button variant="ghost" size="icon" className="h-7 w-7"><ArrowLeft size={16} /></Button>
        </Link>

        {editingName ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              className="h-7 text-sm font-semibold max-w-xs"
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingName(false); }}
            />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEdit}><Check size={14} /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingName(false)}><X size={14} /></Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h1 className="font-bold text-base truncate">{project.name}</h1>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={startEdit}><Edit2 size={13} /></Button>
          </div>
        )}

        <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">{project.tasks.length} tasks</span>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <KanbanBoard project={project} />
      </div>
    </div>
  );
}
