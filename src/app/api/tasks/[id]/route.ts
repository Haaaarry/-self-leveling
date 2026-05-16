import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateSkipCost, calculateLevel } from '@/lib/ai';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = request.cookies.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body; // 'complete' or 'skip'

    const task = await prisma.task.findFirst({
      where: {
        id: params.id,
        milestone: {
          goal: {
            userId: sessionId,
          },
        },
      },
      include: {
        milestone: {
          include: {
            goal: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (action === 'complete') {
      // Complete task and award points
      const [updatedTask, , updatedUser] = await prisma.$transaction([
        prisma.task.update({
          where: { id: params.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        }),
        prisma.pointTransaction.create({
          data: {
            userId: sessionId,
            taskId: task.id,
            amount: task.points,
            type: 'EARNED',
            description: `完成任务: ${task.title}`,
          },
        }),
        prisma.user.update({
          where: { id: sessionId },
          data: {
            totalPoints: {
              increment: task.points,
            },
            level: {
              set: calculateLevel(
                (
                  await prisma.user.findUnique({ where: { id: sessionId } })
                )!.totalPoints + task.points
              ),
            },
          },
        }),
      ]);

      // Update goal progress
      await prisma.goal.update({
        where: { id: task.milestone.goalId },
        data: {
          currentProgress: {
            increment: task.points,
          },
        },
      });

      return NextResponse.json({
        task: updatedTask,
        user: {
          totalPoints: updatedUser.totalPoints,
          level: updatedUser.level,
        },
      });
    } else if (action === 'skip') {
      const skipCost = calculateSkipCost(task.points);

      // Check if user has enough points
      const user = await prisma.user.findUnique({ where: { id: sessionId } });
      if (!user || user.totalPoints < skipCost) {
        return NextResponse.json(
          { error: 'Not enough points to skip this task' },
          { status: 400 }
        );
      }

      // Skip task and deduct points
      const [updatedTask, , updatedUser] = await prisma.$transaction([
        prisma.task.update({
          where: { id: params.id },
          data: {
            status: 'SKIPPED',
            skippedAt: new Date(),
          },
        }),
        prisma.pointTransaction.create({
          data: {
            userId: sessionId,
            taskId: task.id,
            amount: skipCost,
            type: 'SPENT',
            description: `跳过任务: ${task.title}`,
          },
        }),
        prisma.user.update({
          where: { id: sessionId },
          data: {
            totalPoints: {
              decrement: skipCost,
            },
          },
        }),
      ]);

      return NextResponse.json({
        task: updatedTask,
        user: {
          totalPoints: updatedUser.totalPoints,
          level: updatedUser.level,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
