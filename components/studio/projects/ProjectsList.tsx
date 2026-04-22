'use client';
import { useState } from 'react';
import { useProjectsQuery, useCreateProjectMutation, useDeleteProjectMutation, Project } from '@/hooks/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Kanban, Calendar } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const create = useCreateProjectMutation();

  const handleCreate = () => {
    if (!name.trim()) return;
    create.mutate({ name: name.trim(), description: description.trim() || undefined }, {
      onSuccess: () => { setName(''); setDescription(''); onClose(); },
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md mx-4">
        <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Project name" onKeyDown={e => e.key === 'Enter' && handleCreate()} />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleCreate} disabled={!name.trim() || create.isPending}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const deleteProject = useDeleteProjectMutation();

  return (
    <div className="group bg-card border rounded-xl p-4 flex flex-col gap-3 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/studio/projects/${project.id}`} className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm leading-snug hover:text-primary transition-colors truncate">{project.name}</h3>
          {project.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{project.description}</p>}
        </Link>
        <button
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all h-7 w-7 flex items-center justify-center rounded shrink-0"
          onClick={() => deleteProject.mutate(project.id)}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Kanban size={12} />
          {project._count?.tasks ?? 0} tasks
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
        </span>
      </div>

      <Link href={`/studio/projects/${project.id}`}>
        <Button variant="outline" size="sm" className="w-full text-xs h-7">Open board</Button>
      </Link>
    </div>
  );
}

export function ProjectsList({ initialProjects }: { initialProjects?: Project[] }) {
  const [showNew, setShowNew] = useState(false);
  const { data: projects = initialProjects ?? [], isLoading } = useProjectsQuery();

  return (
    <div className="flex flex-col h-dvh">
      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b shrink-0">
        <div>
          <h1 className="text-xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus size={14} className="mr-1.5" /> New Project
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
        {isLoading && projects.length === 0 && (
          <div className="text-sm text-muted-foreground">Loading...</div>
        )}
        {!isLoading && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Kanban size={40} className="text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No projects yet</p>
            <Button size="sm" onClick={() => setShowNew(true)}>Create your first project</Button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      </div>

      <NewProjectModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}
