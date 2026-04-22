'use client';
import { useState, useCallback } from 'react';
import {
  DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent,
  PointerSensor, TouchSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Column, Task, ProjectDetail } from '@/hooks/projects';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, MoreHorizontal, Trash2, Edit2, Zap } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  useCreateTaskMutation, useUpdateTaskMutation, useDeleteTaskMutation,
  useReorderTasksMutation, useCreateColumnMutation, useDeleteColumnMutation,
  useUpdateColumnMutation,
} from '@/hooks/projects';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Props = { project: ProjectDetail };

type SaveData = {
  title: string; description?: string; priority: string;
  columnId: string; assignedAgentId?: string; assignedAgentName?: string;
  dueDate?: string; labels?: string[]; runAuto?: boolean; dependsOn?: string[];
};

const IN_PROGRESS_RE = /in.?progress/i;

function isInProgressColumn(name: string) {
  return IN_PROGRESS_RE.test(name);
}

function isDoneColumn(name: string) {
  return /done|complete|finished|closed/i.test(name);
}

function DroppableColumn({
  column, tasks, blockedIds, onTaskClick, onAddTask, onEditColumn, onDeleteColumn,
}: {
  column: Column;
  tasks: Task[];
  blockedIds: Set<string>;
  onTaskClick: (t: Task) => void;
  onAddTask: (columnId: string) => void;
  onEditColumn: (column: Column) => void;
  onDeleteColumn: (columnId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex flex-col w-[280px] sm:w-72 shrink-0 h-full bg-muted/40 rounded-xl border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b bg-muted/60 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {column.color && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: column.color }} />}
          <span className="font-semibold text-sm truncate">{column.name}</span>
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 shrink-0">{tasks.length}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAddTask(column.id)}>
            <Plus size={14} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal size={14} /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditColumn(column)}><Edit2 size={13} className="mr-2" />Rename</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onDeleteColumn(column.id)}><Trash2 size={13} className="mr-2" />Delete column</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-2 p-2 overflow-y-auto transition-colors ${isOver ? 'bg-primary/5' : ''}`}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(t => (
            <TaskCard key={t.id} task={t} isBlocked={blockedIds.has(t.id)} onClick={() => onTaskClick(t)} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground py-6">Drop tasks here</div>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({ project }: Props) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(project.tasks);
  const [columns, setColumns] = useState<Column[]>(project.columns);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [showNewColumn, setShowNewColumn] = useState(false);

  const createTask = useCreateTaskMutation(project.id);
  const updateTask = useUpdateTaskMutation(project.id);
  const deleteTask = useDeleteTaskMutation(project.id);
  const reorder = useReorderTasksMutation(project.id);
  const createColumn = useCreateColumnMutation(project.id);
  const deleteColumn = useDeleteColumnMutation(project.id);
  const updateColumn = useUpdateColumnMutation(project.id);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  // Compute which tasks are blocked (have unresolved dependencies)
  const blockedIds = useCallback((): Set<string> => {
    const doneColIds = new Set(columns.filter(c => isDoneColumn(c.name)).map(c => c.id));
    const blocked = new Set<string>();
    for (const t of tasks) {
      if (!t.dependsOn) continue;
      const deps: string[] = JSON.parse(t.dependsOn);
      const hasUnmet = deps.some(depId => {
        const dep = tasks.find(x => x.id === depId);
        return dep && !doneColIds.has(dep.columnId);
      });
      if (hasUnmet) blocked.add(t.id);
    }
    return blocked;
  }, [tasks, columns])();

  const tasksForColumn = useCallback(
    (colId: string) => tasks.filter(t => t.columnId === colId).sort((a, b) => a.order - b.order),
    [tasks],
  );

  const triggerRunAuto = useCallback((task: Task, targetColName: string) => {
    if (!task.runAuto || !task.assignedAgentId) return;
    if (!isInProgressColumn(targetColName)) return;

    const message = [
      `Task: ${task.title}`,
      task.description ? `\n${task.description}` : '',
      task.dueDate ? `\nDue: ${task.dueDate}` : '',
    ].join('').trim();

    fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, agentId: task.assignedAgentId }),
    }).catch(() => {});

    toast(`Agent started`, {
      description: `"${task.assignedAgentName ?? task.assignedAgentId}" is running task: ${task.title}`,
      icon: <Zap size={14} className="text-emerald-500" />,
      action: {
        label: 'Open chat',
        onClick: () => router.push(`/studio`),
      },
    });
  }, [router]);

  const handleDragStart = ({ active }: DragStartEvent) => {
    const t = tasks.find(t => t.id === active.id);
    if (t) setActiveTask(t);
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;

    const dragged = tasks.find(t => t.id === activeId);
    if (!dragged) return;

    const overTask = tasks.find(t => t.id === overId);
    const overCol = columns.find(c => c.id === overId);
    const targetColumnId = overTask ? overTask.columnId : overCol?.id;

    if (!targetColumnId || targetColumnId === dragged.columnId) return;
    setTasks(prev => prev.map(t => t.id === activeId ? { ...t, columnId: targetColumnId } : t));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    setTasks(prev => {
      const dragged = prev.find(t => t.id === activeId);
      if (!dragged) return prev;

      const overTask = prev.find(t => t.id === overId);
      const targetColumnId = overTask ? overTask.columnId : (columns.find(c => c.id === overId)?.id ?? dragged.columnId);
      const targetColumn = columns.find(c => c.id === targetColumnId);

      const colTasks = prev.filter(t => t.columnId === targetColumnId).sort((a, b) => a.order - b.order);
      const activeIdx = colTasks.findIndex(t => t.id === activeId);
      const overIdx = overTask ? colTasks.findIndex(t => t.id === overId) : colTasks.length;

      let reordered: Task[];
      if (dragged.columnId === targetColumnId) {
        reordered = arrayMove(colTasks, activeIdx, overIdx < 0 ? colTasks.length - 1 : overIdx);
      } else {
        const without = colTasks.filter(t => t.id !== activeId);
        without.splice(overIdx < 0 ? without.length : overIdx, 0, { ...dragged, columnId: targetColumnId });
        reordered = without;

        // Trigger run auto if moved into an In Progress column
        if (targetColumn) triggerRunAuto(dragged, targetColumn.name);
      }

      const updated = reordered.map((t, i) => ({ ...t, order: i }));
      const rest = prev.filter(t => t.columnId !== targetColumnId && t.id !== activeId);

      reorder.mutate(updated.map(t => ({ id: t.id, columnId: t.columnId, order: t.order })));

      return [...rest, ...updated];
    });
  };

  const handleSaveTask = (data: SaveData) => {
    if (editingTask) {
      updateTask.mutate({ taskId: editingTask.id, ...data }, {
        onSuccess: (updated: Task) => {
          setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
          setEditingTask(null);
        },
      });
    } else {
      createTask.mutate(data, {
        onSuccess: (created: Task) => {
          setTasks(prev => [...prev, created]);
          setAddingToColumn(null);
        },
      });
    }
  };

  const handleDeleteTask = () => {
    if (!editingTask) return;
    deleteTask.mutate(editingTask.id, {
      onSuccess: () => {
        setTasks(prev => prev.filter(t => t.id !== editingTask.id));
        setEditingTask(null);
      },
    });
  };

  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;
    createColumn.mutate({ name: newColumnName.trim() }, {
      onSuccess: (col: Column) => {
        setColumns(prev => [...prev, col]);
        setNewColumnName('');
        setShowNewColumn(false);
      },
    });
  };

  const handleSaveColumn = (name: string) => {
    if (!editingColumn) return;
    updateColumn.mutate({ columnId: editingColumn.id, name }, {
      onSuccess: (col: Column) => {
        setColumns(prev => prev.map(c => c.id === col.id ? col : c));
        setEditingColumn(null);
      },
    });
  };

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        {/* Scroll root — fills the height given by ProjectBoard */}
        <div className="h-full overflow-x-auto overflow-y-hidden">
          <div className="flex h-full gap-3 px-4 md:px-6 py-4 w-max items-start">
            {columns.map(col => (
              <DroppableColumn
                key={col.id}
                column={col}
                tasks={tasksForColumn(col.id)}
                blockedIds={blockedIds}
                onTaskClick={setEditingTask}
                onAddTask={(colId) => setAddingToColumn(colId)}
                onEditColumn={setEditingColumn}
                onDeleteColumn={(id) => {
                  deleteColumn.mutate(id, {
                    onSuccess: () => {
                      setColumns(prev => prev.filter(c => c.id !== id));
                      setTasks(prev => prev.filter(t => t.columnId !== id));
                    },
                  });
                }}
              />
            ))}

            {/* Add column */}
            <div className="shrink-0 w-[280px] sm:w-72 self-start">
              {showNewColumn ? (
                <div className="bg-muted/40 rounded-xl border p-3 flex flex-col gap-2">
                  <Input
                    autoFocus
                    value={newColumnName}
                    onChange={e => setNewColumnName(e.target.value)}
                    placeholder="Column name"
                    onKeyDown={e => { if (e.key === 'Enter') handleAddColumn(); if (e.key === 'Escape') setShowNewColumn(false); }}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddColumn} disabled={!newColumnName.trim()}>Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowNewColumn(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="w-full border-dashed" onClick={() => setShowNewColumn(true)}>
                  <Plus size={14} className="mr-1.5" /> Add column
                </Button>
              )}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} onClick={() => {}} />}
        </DragOverlay>
      </DndContext>

      {(addingToColumn !== null || editingTask) && (
        <TaskModal
          open
          onClose={() => { setAddingToColumn(null); setEditingTask(null); }}
          columns={columns}
          allTasks={tasks}
          task={editingTask ?? undefined}
          defaultColumnId={addingToColumn ?? undefined}
          onSave={handleSaveTask}
          onDelete={editingTask ? handleDeleteTask : undefined}
          loading={createTask.isPending || updateTask.isPending || deleteTask.isPending}
        />
      )}

      {editingColumn && (
        <EditColumnModal
          column={editingColumn}
          onClose={() => setEditingColumn(null)}
          onSave={handleSaveColumn}
          loading={updateColumn.isPending}
        />
      )}
    </>
  );
}

function EditColumnModal({ column, onClose, onSave, loading }: { column: Column; onClose: () => void; onSave: (name: string) => void; loading: boolean }) {
  const [name, setName] = useState(column.name);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-background border rounded-xl p-4 w-80 shadow-xl" onClick={e => e.stopPropagation()}>
        <p className="text-sm font-semibold mb-3">Rename column</p>
        <Input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onSave(name); if (e.key === 'Escape') onClose(); }} />
        <div className="flex gap-2 mt-3 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onSave(name)} disabled={!name.trim() || loading}>Save</Button>
        </div>
      </div>
    </div>
  );
}
