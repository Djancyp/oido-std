import { NextRequest, NextResponse } from 'next/server';
import { getOido } from '@/lib/utils';

export const runtime = 'nodejs';

// Define the run function here since it's only used server-side
async function runCmd(cmd: string) {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  const { stdout } = await execAsync(cmd);
  return stdout;
}

/* =========================
   Types
========================= */
export type ExtensionConfig = {
  name: string;
  description: string;
  envVar: string;
};

export type Extension = {
  name: string;
  version: string;
  description: string;
  source: string;
  source_type: string;
  scope: string;
  status: 'enabled' | 'disabled';
  installed_at: string;
  path: string;
  origin: string;
  has_configuration: boolean;
  configurations: ExtensionConfig[];
};

/* =========================
   DELETE: uninstall extension
========================= */
export async function DELETE(req: NextRequest) {
  try {
    const oido = getOido();
    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
    const stdout = await runCmd(`${oido} extensions uninstall ${name}`);
    return NextResponse.json({ success: true, output: stdout });
  } catch (err: any) {
    console.error('Error in DELETE /api/extensions:', err);
    return NextResponse.json({ error: err.message || 'Failed to uninstall extension' }, { status: 500 });
  }
}

/* =========================
   GET: list extensions
========================= */
export async function GET() {
  try {
    const oido = getOido();

    const stdout = await runCmd(`${oido} extensions list --json`);
    const extensions: Extension[] = JSON.parse(stdout);

    return NextResponse.json<Extension[]>(extensions);
  } catch (err: any) {
    console.error('Error in GET /api/extensions:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch extensions' }, { status: 500 });
  }
}
