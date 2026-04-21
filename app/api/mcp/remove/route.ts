import { NextRequest, NextResponse } from 'next/server';
import { getOido } from '@/lib/utils';
import { exec as execCb } from 'child_process';
import { promisify } from 'util';

export const runtime = 'nodejs';
const execAsync = promisify(execCb);

export async function DELETE(req: NextRequest) {
  try {
    const oido = getOido();
    const { name, scope = 'user' } = await req.json();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    const { stdout } = await execAsync(`${oido} mcp remove ${name} --scope ${scope}`);
    return NextResponse.json({ success: true, output: stdout });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
