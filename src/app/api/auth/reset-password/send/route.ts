import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendEmail, createResetEmailTemplate } from '@/lib/email';

const prisma = new PrismaClient();

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: '邮箱不能为空' }, { status: 400 });
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // 安全起见，不暴露用户是否存在
      return NextResponse.json({ success: true, message: '如果邮箱已注册，验证码已发送' });
    }

    // 生成验证码
    const code = generateCode();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10分钟

    // 保存验证码
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetCode: code,
        resetCodeExpiry: expiry,
      },
    });

    // 发送邮件
    await sendEmail(
      email,
      'Self-Leveling 密码重置验证码',
      createResetEmailTemplate(code)
    );

    return NextResponse.json({ success: true, message: '验证码已发送到您的邮箱' });
  } catch (error) {
    console.error('发送验证码错误:', error);
    return NextResponse.json({ error: '发送失败，请稍后重试' }, { status: 500 });
  }
}
