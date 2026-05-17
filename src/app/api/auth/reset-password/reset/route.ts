import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

const resetSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Code must be 6 digits'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, newPassword } = resetSchema.parse(body);

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

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { email },
      data: { passwordHash, resetCode: null, resetCodeExpiry: null },
    });

    return NextResponse.json({ message: 'Password reset successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
