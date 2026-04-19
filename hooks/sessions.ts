import { Session } from '@/app/api/sessions/route';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function fetchSessions(): Promise<Session | null> {
  const response = await fetch(`${baseUrl}/api/sessions`);
  if (!response.ok) throw new Error('Failed to fetch models');
  return response.json();
}

export function useModelsQuery() {
  return useQuery({
    queryKey: ['models'],
    queryFn: fetchSessions,
  });
}
