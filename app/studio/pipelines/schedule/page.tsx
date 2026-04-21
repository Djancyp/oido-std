export const dynamic = 'force-dynamic';

import { fetchPipelines, fetchSchedules } from '@/hooks/pipelines';
import { SchedulesClient } from '@/components/studio/pipelines/SchedulesClient';

export default async function PipelineSchedulePage() {
  const [schedules, pipelines] = await Promise.all([fetchSchedules(), fetchPipelines()]);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <SchedulesClient initialSchedules={schedules} pipelines={pipelines} />
    </div>
  );
}
