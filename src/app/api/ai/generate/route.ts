import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { generateTasksWithAI } from '@/lib/ai';

const generateSchema = z.object({
  goalId: z.string().min(1, 'Goal ID is required'),
});

// DeepSeek API 费用估算（基于 token 数量）
// deepseek-chat: ¥1/百万输入tokens, ¥2/百万输出tokens
// 每次调用大约消耗 5000-15000 tokens
const AI_COST_PER_CALL = 500; // 每次调用消耗的 token 数量

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { goalId } = generateSchema.parse(body);

    // 检查用户 token 余额
    const user = await prisma.user.findUnique({
      where: { id: sessionId },
      select: { aiTokens: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.aiTokens < AI_COST_PER_CALL) {
      return NextResponse.json({ 
        error: 'AI 额度不足，请联系管理员充值',
        remainingTokens: user.aiTokens,
      }, { status: 402 });
    }

    // Get goal details
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: sessionId,
      },
    });

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Generate tasks using AI
    const aiResult = await generateTasksWithAI(
      goal.title,
      goal.description || undefined,
      goal.targetDate?.toISOString()
    );

    // 创建里程碑和任务，同时扣除 token
    // 增加事务超时时间，因为创建大量任务可能需要更长时间
    let totalPoints = 0;
    const createdMilestones = await prisma.$transaction(async (tx) => {
      // 扣除 AI token
      await tx.user.update({
        where: { id: sessionId },
        data: {
          aiTokens: {
            decrement: AI_COST_PER_CALL,
          },
        },
      });

      // 记录 token 交易
      await tx.aITokenTransaction.create({
        data: {
          userId: sessionId,
          amount: AI_COST_PER_CALL,
          type: 'USED',
          description: `AI生成任务: ${goal.title}`,
        },
      });

      // 创建里程碑和任务
      const milestones = await Promise.all(
        aiResult.milestones.map((milestone, milestoneIndex) =>
          tx.milestone.create({
            data: {
              goalId: goal.id,
              title: milestone.title,
              description: milestone.description,
              order: milestone.order || milestoneIndex + 1,
              targetDate: milestone.targetDate
                ? new Date(milestone.targetDate)
                : null,
              tasks: {
                create: milestone.tasks.map((task) => {
                  totalPoints += task.points;
                  return {
                    title: task.title,
                    description: task.description,
                    points: task.points,
                    estimatedTime: task.estimatedTime,
                    plannedDate: new Date(task.plannedDate),
                  };
                }),
              },
            },
            include: {
              tasks: true,
            },
          })
        )
      );

      return milestones;
    }, {
      timeout: 30000, // 30 秒超时
    });

    // Update goal: set total points and activate the goal
    await prisma.goal.update({
      where: { id: goal.id },
      data: {
        totalPoints: totalPoints,
        status: 'ACTIVE',
      },
    });

    // 获取更新后的 token 余额
    const updatedUser = await prisma.user.findUnique({
      where: { id: sessionId },
      select: { aiTokens: true },
    });

    return NextResponse.json({
      goal: {
        ...goal,
        milestones: createdMilestones,
      },
      totalPoints,
      remainingTokens: updatedUser?.aiTokens || 0,
      tokensUsed: AI_COST_PER_CALL,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('AI generate error:', error);
    return NextResponse.json(
      { error: 'Failed to generate tasks. Please try again.' },
      { status: 500 }
    );
  }
}
