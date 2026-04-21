import { NextRequest, NextResponse } from 'next/server';
import { getOido } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET(_: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const oido = getOido();
    const { name } = await params;
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const { stdout, stderr } = await promisify(exec)(`${oido} pipelines validate ${name}`).catch(e => ({
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? e.message,
    }));
    return NextResponse.json({ valid: !stderr, output: stdout || stderr });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
