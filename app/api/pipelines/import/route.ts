import { NextRequest, NextResponse } from 'next/server';
import { getOido } from '@/lib/utils';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const oido = getOido();
    const body = await req.text();
    if (!body.trim()) return NextResponse.json({ error: 'YAML content required' }, { status: 400 });

    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const { tmpdir } = await import('os');
    const { join } = await import('path');
    const { writeFile, unlink } = await import('fs/promises');

    const tmpPath = join(tmpdir(), `oido-import-${Date.now()}.yaml`);
    await writeFile(tmpPath, body, 'utf8');
    const { stdout } = await promisify(exec)(`${oido} pipelines import ${tmpPath}`);
    await unlink(tmpPath).catch(() => {});

    return NextResponse.json({ success: true, output: stdout });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
