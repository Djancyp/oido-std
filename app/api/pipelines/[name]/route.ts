import { NextRequest, NextResponse } from 'next/server';
import { getOido } from '@/lib/utils';
import { Pipeline } from '../route';

export const runtime = 'nodejs';

async function runCmd(cmd: string) {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const { stdout } = await promisify(exec)(cmd);
  return stdout;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const oido = getOido();
    const { name } = await params;
    const stdout = await runCmd(`${oido} pipelines show ${name} --json`);
    const pipeline: Pipeline = JSON.parse(stdout);
    return NextResponse.json(pipeline);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* PATCH: update existing pipeline (delete + recreate) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const oido = getOido();
    const { name } = await params;
    const { description = '', nodes = [], variables = {} } = await req.json();

    await runCmd(`${oido} pipelines delete ${name}`).catch(() => {});

    const nodesJson = JSON.stringify(nodes).replace(/'/g, "'\\''");
    const varsJson = JSON.stringify(variables).replace(/'/g, "'\\''");
    const desc = description.replace(/"/g, '\\"');

    const cmd = `${oido} pipelines create-v2 ${name} --description "${desc}" --nodes '${nodesJson}' --variables '${varsJson}'`;
    const stdout = await runCmd(cmd);
    return NextResponse.json({ success: true, output: stdout });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
