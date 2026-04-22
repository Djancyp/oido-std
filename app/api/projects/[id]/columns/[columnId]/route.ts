import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string; columnId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { columnId } = await params;
    const { name, color } = await req.json();
    const column = await prisma.column.update({
      where: { id: columnId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
      },
    });
    return NextResponse.json(column);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { columnId } = await params;
    await prisma.column.delete({ where: { id: columnId } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
