import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: projectId } = await params;
    const { name, color } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const last = await prisma.column.findFirst({
      where: { projectId },
      orderBy: { order: 'desc' },
    });

    const column = await prisma.column.create({
      data: {
        id: crypto.randomUUID(),
        projectId,
        name: name.trim(),
        color: color || null,
        order: (last?.order ?? -1) + 1,
      },
    });
    return NextResponse.json(column, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
