import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Define the run function here since it's only used server-side
export async function runCmd(cmd: string) {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  const { stdout } = await execAsync(cmd);
  return stdout;
}

/* =========================
   Types
========================= */
export type Agent = {
  agent_id: string;
  agent_name: string;
  tab_ids: string[];
  exclude_tools: string[];
  skills: string[];
  subagents: Agent[];
  system_prompt: string;
};

type CreateAgentBody = {
  name: string;
  skills?: string[];
  exclude_tools?: string[];
  subagents?: string[];
};

type UpdateAgentBody = {
  name: string;
  skills?: string[];
  exclude_tools?: string[];
  clear_skills?: boolean;
  clear_exclude_tools?: boolean;
};

type DeleteAgentBody = {
  name: string;
};

/* =========================
   GET: List agents
========================= */
export async function GET() {
  try {
    const oido = process.env.OIDO_PATH;
    if (!oido) throw new Error('OIDO_PATH is not defined');

    const stdout = await runCmd(`${oido} agents list --json`);
		// check if its a text
		// if (stdout.startsWith('')) {
		// 	return NextResponse.json<Agent[]>([]);
		// }
    const agents: Agent[] = JSON.parse(stdout);

    return NextResponse.json<Agent[]>(agents);
  } catch (err: any) {
    console.error('Error in GET /api/agents:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch agents' }, { status: 500 });
  }
}

/* =========================
   POST: Create agent
========================= */
export async function POST(req: NextRequest) {
  try {
    const oido = process.env.OIDO_PATH;
    if (!oido) throw new Error('OIDO_PATH is not defined');

    const body: CreateAgentBody = await req.json();

    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const args = [
      `${oido} agents add ${body.name}`,
      ...buildFlags('skills', body.skills),
      ...buildFlags('exclude-tools', body.exclude_tools),
      ...buildFlags('subagent', body.subagents),
    ];

    const command = args.join(' ');
    const stdout = await runCmd(command);

    return NextResponse.json({
      success: true,
      output: stdout,
    });
  } catch (err: any) {
    console.error('Error in POST /api/agents:', err);
    return NextResponse.json({ error: err.message || 'Failed to create agent' }, { status: 500 });
  }
}

/* =========================
   PATCH: Update agent
========================= */
export async function PATCH(req: NextRequest) {
  try {
    const oido = process.env.OIDO_PATH;
    if (!oido) throw new Error('OIDO_PATH is not defined');

    const body: UpdateAgentBody = await req.json();

    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const flags: string[] = [];

    if (body.clear_skills) {
      flags.push('--clear-skills');
    } else {
      flags.push(...buildFlags('skills', body.skills));
    }

    if (body.clear_exclude_tools) {
      flags.push('--clear-exclude-tools');
    } else {
      flags.push(...buildFlags('exclude-tools', body.exclude_tools));
    }

    const command = [`${oido} agents update ${body.name}`, ...flags].join(' ');

    const stdout = await runCmd(command);

    return NextResponse.json({
      success: true,
      output: stdout,
    });
  } catch (err: any) {
    console.error('Error in PATCH /api/agents:', err);
    return NextResponse.json({ error: err.message || 'Failed to update agent' }, { status: 500 });
  }
}

/* =========================
   DELETE: Remove agent
========================= */
export async function DELETE(req: NextRequest) {
  try {
    const oido = process.env.OIDO_PATH;
    if (!oido) throw new Error('OIDO_PATH is not defined');

    const body: DeleteAgentBody = await req.json();

    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const command = `${oido} agents remove ${body.name}`;
    const stdout = await runCmd(command);

    return NextResponse.json({
      success: true,
      output: stdout,
    });
  } catch (err: any) {
    console.error('Error in DELETE /api/agents:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete agent' }, { status: 500 });
  }
}

// Helper function for building flags
function buildFlags(key: string, values?: string[]) {
  if (!values || values.length === 0) return [];
  return values.flatMap(v => [`--${key}`, v]);
}
