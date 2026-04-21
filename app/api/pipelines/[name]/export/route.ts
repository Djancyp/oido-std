import { NextRequest, NextResponse } from 'next/server';
import { getOido } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const oido = getOido();
    const { name } = await params;
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const { tmpdir } = await import('os');
    const { join } = await import('path');
    const { readFile, unlink } = await import('fs/promises');

    const tmpPath = join(tmpdir(), `oido-export-${name}-${Date.now()}.yaml`);
    await promisify(exec)(`${oido} pipelines export ${name} ${tmpPath}`);
    const content = await readFile(tmpPath, 'utf8');
    await unlink(tmpPath).catch(() => {});

    return new Response(content, {
      headers: {
        'Content-Type': 'application/yaml',
        'Content-Disposition': `attachment; filename="${name}.yaml"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
