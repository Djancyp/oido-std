import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/* PUT: replace all roles for a user */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { roleIds }: { roleIds: string[] } = await req.json();

    await prisma.userRole.deleteMany({ where: { userId: id } });

    if (roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: roleIds.map(roleId => ({ userId: id, roleId })),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
