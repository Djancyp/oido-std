export const dynamic = 'force-dynamic';

import { execFile } from 'child_process';
import { promisify } from 'util';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { ProvidersClient } from '@/components/studio/providers/ProvidersClient';

const exec = promisify(execFile);
const OIDO = process.env.OIDO_BIN || '/home/djan/Documents/codding/agent-cli/oido-cli/oido';

export default async function ProvidersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  let initialData = { activeProvider: '', providers: [] as any[] };
  try {
    const { stdout } = await exec(OIDO, ['auth', 'status', '--json']);
    initialData = JSON.parse(stdout);
  } catch {}

  return <ProvidersClient initialData={initialData} />;
}
