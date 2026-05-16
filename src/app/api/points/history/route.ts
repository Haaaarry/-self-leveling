import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const transactions = await prisma.pointTransaction.findMany({
      where: { userId: sessionId },
      include: {
        task: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to recent 50 transactions
    });

    const user = await prisma.user.findUnique({
      where: { id: sessionId },
      select: {
        totalPoints: true,
        level: true,
      },
    });

    return NextResponse.json({
      transactions,
      points: user?.totalPoints || 0,
      level: user?.level || 1,
    });
  } catch (error) {
    console.error('Get points history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
