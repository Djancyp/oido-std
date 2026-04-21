import { NextResponse } from 'next/server';
import { getOido } from '@/lib/utils';

export const runtime = 'nodejs';

export type PipelineToolInput = {
  name: string;
  type: string;
  description: string;
  required: boolean;
  default?: unknown;
};

export type PipelineTool = {
  name: string;
  category: string;
  nodeType: string;
  description: string;
  inputs: PipelineToolInput[];
  outputType: string;
  icon?: string;
  requiresLLM: boolean;
  capabilities: string[];
};

export async function GET() {
  try {
    const oido = getOido();
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const { stdout } = await promisify(exec)(`${oido} pipelines tools`);
    const tools: PipelineTool[] = JSON.parse(stdout);
    return NextResponse.json(tools);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
