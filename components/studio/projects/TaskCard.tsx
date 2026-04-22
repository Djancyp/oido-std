'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/hooks/projects';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, User2, Zap, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

type Props = { task: Task; isBlocked?: boolean; onClick: () => void };

export function TaskCard({ task, isBlocked, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const labels: string[] = task.labels ? JSON.parse(task.labels) : [];
  const depCount: number = task.dependsOn ? JSON.parse(task.dependsOn).length : 0;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'bg-card border rounded-lg p-3 cursor-pointer hover:border-primary/50 transition-colors select-none active:scale-[0.98]',
        isDragging && 'opacity-50 shadow-lg',
        isBlocked && 'border-orange-500/40 bg-orange-500/5',
      )}
    >
      <p className="text-sm font-medium leading-snug mb-2">{task.title}</p>

      <div className="flex flex-wrap gap-1 mb-2">
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium', PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.medium)}>
          {task.priority}
        </span>
        {labels.map(l => (
          <Badge key={l} variant="secondary" className="text-[10px] px-1.5 py-0">{l}</Badge>
        ))}
      </div>

      <div className="flex items-center gap-3 text-muted-foreground text-xs">
        {task.assignedAgentName && (
          <span className="flex items-center gap-1">
            <User2 size={11} />
            {task.assignedAgentName}
          </span>
        )}
        {task.dueDate && (
          <span className="flex items-center gap-1">
            <CalendarDays size={11} />
            {task.dueDate}
          </span>
        )}
        {task.runAuto && (
          <span className="flex items-center gap-1 text-emerald-500" title="Runs automatically when moved to In Progress">
            <Zap size={11} />
            auto
          </span>
        )}
        {depCount > 0 && (
          <span className={cn('flex items-center gap-1', isBlocked ? 'text-orange-400' : '')} title={`${depCount} dependenc${depCount === 1 ? 'y' : 'ies'}`}>
            <Link2 size={11} />
            {depCount}
          </span>
        )}
      </div>
    </div>
  );
}
