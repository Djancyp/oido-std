import { NextRequest, NextResponse } from 'next/server';
import { getOido } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const oido = getOido();
    const { name } = await params;
    const ascii = req.nextUrl.searchParams.get('ascii') === 'true';
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const cmd = ascii
      ? `${oido} pipelines visualize ${name} --ascii`
      : `${oido} pipelines visualize ${name}`;
    const { stdout } = await promisify(exec)(cmd);
    return NextResponse.json({ diagram: stdout, ascii });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
