export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  return { title: `Pipeline: ${name}` };
}

import { fetchPipelines, fetchPipelineTools } from '@/hooks/pipelines';
import { PipelineDetail } from '@/components/studio/pipelines/PipelinesClient';

export default async function PipelineBuilderPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const [pipelines, tools] = await Promise.all([fetchPipelines(), fetchPipelineTools()]);
  const item = pipelines.find(p => p.name === name) ?? { name, version: '2', description: '', createdAt: '', updatedAt: '' };
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PipelineDetail item={item} tools={tools} />
    </div>
  );
}
