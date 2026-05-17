import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionId },
      select: { 
        aiTokens: true,
        aiTokenTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      balance: user.aiTokens,
      transactions: user.aiTokenTransactions,
    });
  } catch (error) {
    console.error('Token query error:', error);
    return NextResponse.json(
      { error: 'Failed to query token balance' },
      { status: 500 }
    );
  }
}
