import { NextResponse } from 'next/server';
import { getOido } from '@/lib/utils';

export const runtime = 'nodejs';

export type BuiltinTool = {
  name: string;
  source: 'builtin';
  description: string;
};

export type ExtensionTool = {
  name: string;
  source: 'extension';
  description: string;
  extension: string;
};

export type McpTool = {
  name: string;
  source: 'mcp';
  description: string;
  server?: string;
};

export type ToolsResponse = {
  builtin: BuiltinTool[];
  extension: ExtensionTool[];
  mcp: McpTool[];
};

export async function GET() {
  try {
    const oido = getOido();
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const { stdout } = await execAsync(`${oido} tools list --json`);
    let tools: ToolsResponse = { builtin: [], extension: [], mcp: [] };
    try { tools = JSON.parse(stdout.trim()); } catch {}

    return NextResponse.json<ToolsResponse>(tools);
  } catch (err: any) {
    console.error('Error in GET /api/tools:', err);
    return NextResponse.json(
      { builtin: [], extension: [], mcp: [] } satisfies ToolsResponse,
      { status: 200 }
    );
  }
}
