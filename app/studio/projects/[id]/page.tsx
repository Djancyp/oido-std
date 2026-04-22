export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { ProjectBoard } from '@/components/studio/projects/ProjectBoard';
import { apiFetch } from '@/lib/server-fetch';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function fetchProject(id: string) {
  try {
    const res = await apiFetch(`${baseUrl}/api/projects/${id}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const project = await fetchProject(id);
  return { title: project?.name ?? 'Project' };
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await fetchProject(id);
  return <ProjectBoard projectId={id} initialData={project ?? undefined} />;
}
