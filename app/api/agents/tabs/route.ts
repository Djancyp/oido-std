import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

export const runtime = 'nodejs';

const AGENTS_DIR = join(process.env.HOME ?? '/root', '.config', 'oido', 'agents');

function agentFilePath(agentName: string) {
  return join(AGENTS_DIR, `${agentName}.yaml`);
}

type AgentYaml = {
  agent_id: string;
  agent_name: string;
  tab_ids: string[];
  [key: string]: unknown;
};

/* PUT: replace tab_ids for an agent */
export async function PUT(req: NextRequest) {
  try {
    const { name, tab_ids }: { name: string; tab_ids: string[] } = await req.json();

    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    if (!Array.isArray(tab_ids)) return NextResponse.json({ error: 'tab_ids must be an array' }, { status: 400 });

    const filePath = agentFilePath(name);
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = yaml.load(raw) as AgentYaml;

    parsed.tab_ids = tab_ids;

    writeFileSync(filePath, yaml.dump(parsed), 'utf-8');

    return NextResponse.json({ success: true, tab_ids });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
