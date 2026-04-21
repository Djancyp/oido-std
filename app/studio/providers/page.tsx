export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Providers' };

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { ProvidersClient } from '@/components/studio/providers/ProvidersClient';
import { getOido } from '@/lib/utils';
import { exec as execCb } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCb);

export default async function ProvidersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  let initialData = { activeProvider: '', providers: [] as any[] };
  try {
    const oido = getOido();
    const { stdout } = await exec(`${oido} auth status --json`);
    try { initialData = JSON.parse(stdout.trim()); } catch {}
  } catch {}

  return <ProvidersClient initialData={initialData} />;
}
