'use client';

import React, { useState } from 'react';
import { Calendar, Plus, Trash2, Pencil, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PipelineListItem } from '@/app/api/pipelines/route';
import { PipelineScheduleItem } from '@/app/api/pipelines/schedule/route';
import {
  usePipelineScheduleQuery,
  useScheduleAddMutation,
  useScheduleRemoveMutation,
} from '@/hooks/pipelines';

type Props = {
  initialSchedules: PipelineScheduleItem[];
  pipelines: PipelineListItem[];
};

function formatCron(expr: string) {
  return <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{expr}</code>;
}

function ScheduleModal({
  pipelines,
  initial,
  onClose,
}: {
  pipelines: PipelineListItem[];
  initial?: PipelineScheduleItem;
  onClose: () => void;
}) {
  const [pipeline, setPipeline] = useState(initial?.pipelineId ?? pipelines[0]?.name ?? '');
  const [cron, setCron] = useState(initial?.cronExpr ?? '0 */15 * * * *');
  const [busy, setBusy] = useState(false);
  const add = useScheduleAddMutation();
  const remove = useScheduleRemoveMutation();

  const isEdit = !!initial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isEdit) {
        await remove.mutateAsync(initial.cronJobId);
      }
      await add.mutateAsync({ pipeline, cron });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">{isEdit ? 'Edit Schedule' : 'Add Schedule'}</h2>
        {isEdit && (
          <p className="text-xs text-muted-foreground">
            Removes <span className="font-mono">{initial.cronJobId}</span> and creates a new one.
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Pipeline</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={pipeline}
              onChange={e => setPipeline(e.target.value)}
              required
            >
              {pipelines.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Cron Expression</label>
            <Input
              value={cron}
              onChange={e => setCron(e.target.value)}
              placeholder="0 */15 * * * *"
              required
            />
            <p className="text-xs text-muted-foreground">Seconds field supported (6-part cron)</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save' : 'Add'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SchedulesClient({ initialSchedules, pipelines }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<PipelineScheduleItem | null>(null);
  const { data: schedules = [], isFetching, refetch } = usePipelineScheduleQuery({ initialData: initialSchedules });
  const remove = useScheduleRemoveMutation();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={20} />
          <h1 className="text-xl font-semibold">Pipeline Schedules</h1>
          <Badge variant="secondary">{schedules.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)} disabled={pipelines.length === 0}>
            <Plus size={16} className="mr-1" />
            Add Schedule
          </Button>
        </div>
      </div>

      {schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <Calendar size={40} className="opacity-30" />
          <p className="text-sm">No schedules configured</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">ID</th>
                <th className="px-4 py-3 text-left font-medium">Pipeline</th>
                <th className="px-4 py-3 text-left font-medium">Cron</th>
                <th className="px-4 py-3 text-left font-medium">Runs</th>
                <th className="px-4 py-3 text-left font-medium">Last Status</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {schedules.map(s => (
                <tr key={s.cronJobId} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.cronJobId}</td>
                  <td className="px-4 py-3 font-medium">{s.pipelineId}</td>
                  <td className="px-4 py-3">{formatCron(s.cronExpr)}</td>
                  <td className="px-4 py-3">{s.runCount}</td>
                  <td className="px-4 py-3">
                    {s.lastStatus ? (
                      <Badge variant={s.lastStatus === 'success' ? 'default' : 'destructive'}>
                        {s.lastStatus}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(s.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditing(s)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(s.cronJobId)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <ScheduleModal pipelines={pipelines} onClose={() => setShowAdd(false)} />
      )}
      {editing && (
        <ScheduleModal pipelines={pipelines} initial={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
