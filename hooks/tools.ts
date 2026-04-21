import { ToolsResponse } from '@/app/api/tools/route';
import { apiFetch } from '@/lib/server-fetch';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function fetchTools(): Promise<ToolsResponse> {
  const res = await apiFetch(`${baseUrl}/api/tools`);
  if (!res.ok) return { builtin: [], extension: [], mcp: [] };
  return res.json();
}
