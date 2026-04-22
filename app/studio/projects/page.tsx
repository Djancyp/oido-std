export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Projects' };

import { ProjectsList } from '@/components/studio/projects/ProjectsList';
import { apiFetch } from '@/lib/server-fetch';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function fetchProjects() {
  try {
    const res = await apiFetch(`${baseUrl}/api/projects`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function ProjectsPage() {
  const projects = await fetchProjects();
  return <ProjectsList initialProjects={projects} />;
}
