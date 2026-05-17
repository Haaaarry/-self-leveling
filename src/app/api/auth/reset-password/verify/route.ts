import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const verifySchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Code must be 6 digits'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = verifySchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.resetCode || !user.resetCodeExpiry) {
      return NextResponse.json(
        { error: 'Please request a new code' },
        { status: 400 }
      );
    }

    if (user.resetCode !== code) {
      return NextResponse.json(
        { error: 'Invalid code' },
        { status: 400 }
      );
    }

    if (new Date() > user.resetCodeExpiry) {
      return NextResponse.json(
        { error: 'Code has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'Code verified' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error('Verify code error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
