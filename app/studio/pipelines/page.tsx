export const dynamic = 'force-dynamic';

import { fetchPipelines } from '@/hooks/pipelines';
import { PipelinesClient } from '@/components/studio/pipelines/PipelinesClient';

export default async function PipelinesPage() {
  const pipelines = await fetchPipelines();
  return <PipelinesClient initialPipelines={pipelines} />;
}
