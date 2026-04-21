import { ModelResponse } from '@/app/api/models/route';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/server-fetch';
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function fetchModels(): Promise<ModelResponse | null> {
  const response = await apiFetch(`${baseUrl}/api/models`);
  if (!response.ok) throw new Error('Failed to fetch models');
  return response.json();
}

export function useModelsQuery() {
  return useQuery({
    queryKey: ['models'],
    queryFn: fetchModels,
  });
}
