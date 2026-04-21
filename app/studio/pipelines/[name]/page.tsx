export const dynamic = 'force-dynamic';

import { fetchPipelines, fetchPipelineTools } from '@/hooks/pipelines';
import { PipelineDetail } from '@/components/studio/pipelines/PipelinesClient';

export default async function PipelineBuilderPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const [pipelines, tools] = await Promise.all([fetchPipelines(), fetchPipelineTools()]);
  const item = pipelines.find(p => p.name === name) ?? { name, version: '2', nodeCount: 0 };
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PipelineDetail item={item} tools={tools} />
    </div>
  );
}
