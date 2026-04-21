import { NextRequest, NextResponse } from 'next/server';
import { getOido } from '@/lib/utils';

export const runtime = 'nodejs';

async function runCmd(cmd: string) {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const { stdout } = await promisify(exec)(cmd);
  return stdout;
}

export type PipelineNode = {
  id: string;
  type: string;
  label: string;
  config: Record<string, any>;
  dependsOn?: string[];
  requiresLLM?: boolean;
};

export type Pipeline = {
  name: string;
  description: string;
  version: string;
  schemaVersion?: string;
  nodes: PipelineNode[] | null;
  steps: any[] | null;
  createdAt: string;
  updatedAt: string;
};

export type PipelineListItem = {
  name: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
};

/* GET: list */
export async function GET() {
  try {
    const oido = getOido();
    const stdout = await runCmd(`${oido} pipelines list --json`);
    const pipelines: PipelineListItem[] = JSON.parse(stdout);
    return NextResponse.json(pipelines);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* POST: create-v2 */
export async function POST(req: NextRequest) {
  try {
    const oido = getOido();
    const { name, description = '', nodes = [], variables = {} } = await req.json();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

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

/* DELETE: delete */
export async function DELETE(req: NextRequest) {
  try {
    const oido = getOido();
    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    const stdout = await runCmd(`${oido} pipelines delete ${name}`);
    return NextResponse.json({ success: true, output: stdout });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
