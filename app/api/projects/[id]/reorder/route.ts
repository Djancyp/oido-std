import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

// Body: { tasks: { id: string; columnId: string; order: number }[] }
export async function POST(req: NextRequest, { params }: Params) {
  try {
    await params; // ensure projectId is valid context (not strictly needed for update)
    const { tasks } = await req.json();
    if (!Array.isArray(tasks)) return NextResponse.json({ error: 'tasks array required' }, { status: 400 });

    await prisma.$transaction(
      tasks.map(({ id, columnId, order }: { id: string; columnId: string; order: number }) =>
        prisma.task.update({ where: { id }, data: { columnId, order } })
      )
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
