import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string; taskId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { taskId } = await params;
    const body = await req.json();
    const { title, description, priority, columnId, assignedAgentId, assignedAgentName, dueDate, labels, runAuto, dependsOn } = body;

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(priority !== undefined && { priority }),
        ...(columnId !== undefined && { columnId }),
        ...(assignedAgentId !== undefined && { assignedAgentId: assignedAgentId || null }),
        ...(assignedAgentName !== undefined && { assignedAgentName: assignedAgentName || null }),
        ...(dueDate !== undefined && { dueDate: dueDate || null }),
        ...(labels !== undefined && { labels: labels ? JSON.stringify(labels) : null }),
        ...(runAuto !== undefined && { runAuto: runAuto === true }),
        ...(dependsOn !== undefined && { dependsOn: dependsOn?.length ? JSON.stringify(dependsOn) : null }),
      },
    });
    return NextResponse.json(task);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { taskId } = await params;
    await prisma.task.delete({ where: { id: taskId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
