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
type InstallExtensionBody = {
  source: string;

  // optional flags (future-proof)
  force?: boolean;
  global?: boolean;
};



/* =========================
   POST: install extension
========================= */
export async function POST(req: NextRequest) {
  try {
    const oido = getOido();
    const body: InstallExtensionBody = await req.json();

    if (!body.source) {
      return NextResponse.json(
        { error: 'source is required' },
        { status: 400 }
      );
    }

    const flags: string[] = [];

    if (body.force) flags.push('--force');
    if (body.global) flags.push('--global');

    const command = [
      `${oido} extensions install ${body.source}`,
      ...flags,
    ].join(' ');

    const stdout = await runCmd(command);

    return NextResponse.json({
      success: true,
      source: body.source,
      output: stdout,
    });
  } catch (err: any) {
    console.error('Error in POST /api/extensions/install:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to install extension' },
      { status: 500 }
    );
  }
}
