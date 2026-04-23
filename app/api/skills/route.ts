import { NextRequest, NextResponse } from 'next/server';
import { getOido } from '@/lib/utils';

export const runtime = 'nodejs';

async function runArgs(bin: string, args: string[]): Promise<string> {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const { stdout } = await promisify(execFile)(bin, args);
  return stdout;
}

export type Skill = {
  name: string;
  description: string;
  level: 'user' | 'project' | 'bundled' | 'extension';
  filePath: string;
  body: string;
  tools?: string[];
};

/* GET — list all skills */
export async function GET() {
  try {
    const oido = getOido();
    const stdout = await runArgs(oido, ['skills', 'list', '--json']);
    const trimmed = stdout.trim();
    if (!trimmed.startsWith('[')) return NextResponse.json<Skill[]>([]);
    let skills: Skill[] = [];
    try { skills = JSON.parse(trimmed); } catch {}
    return NextResponse.json<Skill[]>(skills);
  } catch (err: any) {
    console.error('GET /api/skills:', err);
    return NextResponse.json([], { status: 200 });
  }
}

/* POST — create skill
 * Accepts either:
 *   - JSON: { name, description, body?, scope?, tools? }
 *   - multipart/form-data: field "file" (.md with YAML frontmatter) + optional scope
 */
export async function POST(req: NextRequest) {
  try {
    const oido = getOido();
    const ct = req.headers.get('content-type') ?? '';

    let name: string;
    let description: string;
    let body = '';
    let scope = 'user';
    let tools: string[] = [];

    if (ct.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file') as File | null;
      scope = (form.get('scope') as string) ?? 'user';

      if (!file) {
        return NextResponse.json({ error: 'file is required' }, { status: 400 });
      }

      const text = await file.text();
      const parsed = parseSkillMd(text);

      if (!parsed.name || !parsed.description) {
        return NextResponse.json(
          { error: 'markdown file must have name and description in frontmatter' },
          { status: 400 }
        );
      }

      name = parsed.name;
      description = parsed.description;
      body = parsed.body;
      tools = parsed.tools ?? [];
    } else {
      const json = await req.json();
      name = json.name;
      description = json.description;
      body = json.body ?? '';
      scope = json.scope ?? 'user';
      tools = json.tools ?? [];
    }

    if (!name || !description) {
      return NextResponse.json({ error: 'name and description are required' }, { status: 400 });
    }

    const args = [
      'skills', 'add', name,
      '--description', description,
      '--scope', scope,
      ...tools.flatMap((t: string) => ['--tools', t]),
      ...(body ? ['--body', body] : []),
    ];

    await runArgs(oido, args);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('POST /api/skills:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* PATCH — update skill (uninstall + re-add)
 * Accepts either JSON or multipart/form-data with "file" (.md)
 */
export async function PATCH(req: NextRequest) {
  try {
    const oido = getOido();
    const ct = req.headers.get('content-type') ?? '';

    let name: string;
    let description: string | undefined;
    let body: string | undefined;
    let scope = 'user';
    let tools: string[] | undefined;

    if (ct.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file') as File | null;
      scope = (form.get('scope') as string) ?? 'user';

      if (!file) {
        return NextResponse.json({ error: 'file is required' }, { status: 400 });
      }

      const text = await file.text();
      const parsed = parseSkillMd(text);

      if (!parsed.name) {
        return NextResponse.json({ error: 'markdown file must have name in frontmatter' }, { status: 400 });
      }

      name = parsed.name;
      description = parsed.description;
      body = parsed.body;
      tools = parsed.tools;
    } else {
      const json = await req.json();
      name = json.name;
      description = json.description;
      body = json.body;
      scope = json.scope ?? 'user';
      tools = json.tools;
    }

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Get current skill to fill in unchanged fields
    const listOut = await runArgs(oido, ['skills', 'list', '--json']);
    let existing: Skill | undefined;
    try {
      const all: Skill[] = JSON.parse(listOut.trim());
      existing = all.find(s => s.name === name);
    } catch {}

    if (!existing) {
      return NextResponse.json({ error: `skill '${name}' not found` }, { status: 404 });
    }

    // Uninstall then re-add with merged values
    await runArgs(oido, ['skills', 'uninstall', name]);

    const finalDescription = description ?? existing.description;
    const finalBody = body ?? existing.body;
    const finalTools = tools ?? existing.tools ?? [];

    const args = [
      'skills', 'add', name,
      '--description', finalDescription,
      '--scope', scope,
      ...finalTools.flatMap((t: string) => ['--tools', t]),
      ...(finalBody ? ['--body', finalBody] : []),
    ];

    await runArgs(oido, args);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('PATCH /api/skills:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* DELETE — uninstall a skill */
export async function DELETE(req: NextRequest) {
  try {
    const oido = getOido();
    const { name } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    await runArgs(oido, ['skills', 'uninstall', name]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/skills:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* Parse a SKILL.md file with YAML frontmatter */
function parseSkillMd(text: string): {
  name?: string;
  description?: string;
  tools?: string[];
  body: string;
} {
  const frontmatterRe = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = text.match(frontmatterRe);

  if (!match) {
    return { body: text };
  }

  const yamlBlock = match[1];
  const body = match[2].trim();

  // Minimal YAML key: value parsing (no nested structures needed for skill frontmatter)
  const meta: Record<string, string> = {};
  for (const line of yamlBlock.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (key) meta[key] = val;
  }

  const tools = meta['tools']
    ? meta['tools'].split(',').map(t => t.trim()).filter(Boolean)
    : undefined;

  return {
    name: meta['name'],
    description: meta['description'],
    tools,
    body,
  };
}
