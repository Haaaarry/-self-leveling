import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { generateTasksWithAI } from '@/lib/ai';

const generateSchema = z.object({
  goalId: z.string().min(1, 'Goal ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { goalId } = generateSchema.parse(body);

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

    // Create milestones and tasks in database
    let totalPoints = 0;
    const createdMilestones = await prisma.$transaction(
      aiResult.milestones.map((milestone, milestoneIndex) =>
        prisma.milestone.create({
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

    // Update goal: set total points and activate the goal
    await prisma.goal.update({
      where: { id: goal.id },
      data: {
        totalPoints: totalPoints,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({
      goal: {
        ...goal,
        milestones: createdMilestones,
      },
      totalPoints,
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
