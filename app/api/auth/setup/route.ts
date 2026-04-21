import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const count = await db.user.count();
  return NextResponse.json({ hasUsers: count > 0 });
}
