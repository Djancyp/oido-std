import { NextRequest, NextResponse } from 'next/server';
import { getOido } from '@/lib/utils';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const oido = getOido();
    const { name, description } = await req.json();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    if (!description) return NextResponse.json({ error: 'description is required' }, { status: 400 });

    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const desc = description.replace(/"/g, '\\"');
    const { stdout } = await promisify(exec)(
      `${oido} pipelines generate ${name} --description "${desc}" --json`,
      { timeout: 120_000 },
    );
    return NextResponse.json({ success: true, output: stdout });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
