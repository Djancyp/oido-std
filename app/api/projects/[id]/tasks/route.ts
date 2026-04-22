import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const { columnId, title, description, priority, assignedAgentId, assignedAgentName, dueDate, labels, runAuto, dependsOn } = await req.json();
    if (!title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 });
    if (!columnId) return NextResponse.json({ error: 'columnId is required' }, { status: 400 });

    const last = await prisma.task.findFirst({
      where: { columnId },
      orderBy: { order: 'desc' },
    });

    const task = await prisma.task.create({
      data: {
        id: crypto.randomUUID(),
        projectId,
        columnId,
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || 'medium',
        order: (last?.order ?? -1) + 1,
        assignedAgentId: assignedAgentId || null,
        assignedAgentName: assignedAgentName || null,
        dueDate: dueDate || null,
        labels: labels ? JSON.stringify(labels) : null,
        runAuto: runAuto === true,
        dependsOn: dependsOn?.length ? JSON.stringify(dependsOn) : null,
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
