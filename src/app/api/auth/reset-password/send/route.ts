import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { generateOTP } from '@/lib/auth';
import { sendResetEmail } from '@/lib/email';

const sendCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = sendCodeSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // 为了安全，即使用户不存在也返回成功
      return NextResponse.json({ message: 'If the email exists, a code has been sent' });
    }

    const resetCode = generateOTP();
    const resetCodeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10分钟后过期

    await prisma.user.update({
      where: { email },
      data: { resetCode, resetCodeExpiry },
    });

    // 发送邮件（如果配置了邮件服务）
    await sendResetEmail(email, resetCode);

    return NextResponse.json({ message: 'Reset code sent' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error('Send reset code error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
