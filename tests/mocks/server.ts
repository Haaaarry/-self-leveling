import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { faker } from '@faker-js/faker';

// Mock user data
const mockUser = {
  id: faker.string.uuid(),
  email: 'qa-test@example.com',
  username: 'testuser',
  totalPoints: 100,
  level: 1,
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString()
};

// Mock goal data
const createMockGoal = () => ({
  id: faker.string.uuid(),
  userId: mockUser.id,
  title: faker.helpers.arrayElement([
    '3个月学会Python',
    '6个月减肥20斤',
    '1年读完50本书',
    '学会弹吉他'
  ]),
  description: faker.lorem.sentence(),
  targetDate: faker.date.future({ years: 1 }).toISOString(),
  status: 'active',
  totalPoints: faker.number.int({ min: 100, max: 500 }),
  currentProgress: faker.number.int({ min: 0, max: 50 }),
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString()
});

// Mock milestone data
const createMockMilestone = (goalId: string) => ({
  id: faker.string.uuid(),
  goalId,
  title: faker.helpers.arrayElement([
    '完成基础知识学习',
    '完成中级技能掌握',
    '完成高级应用实践'
  ]),
  description: faker.lorem.sentence(),
  order: faker.number.int({ min: 1, max: 5 }),
  targetDate: faker.date.future().toISOString(),
  isCompleted: faker.datatype.boolean(),
  completedAt: faker.date.recent().toISOString()
});

// Mock task data
const createMockTask = (milestoneId: string) => ({
  id: faker.string.uuid(),
  milestoneId,
  title: faker.helpers.arrayElement([
    '学习Python基础语法',
    '完成变量和数据类型练习',
    '阅读官方文档第一章',
    '编写第一个Python程序'
  ]),
  description: faker.lorem.sentence(),
  points: faker.helpers.arrayElement([5, 10, 15, 20]),
  plannedDate: faker.date.soon().toISOString().split('T')[0],
  status: faker.helpers.arrayElement(['pending', 'completed', 'skipped']),
  completedAt: faker.date.recent().toISOString(),
  skippedAt: faker.date.recent().toISOString()
});

// API Mock Handlers
export const handlers = [
  // Auth endpoints
  http.post('/api/auth/register', async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    if (body.email === 'existing@example.com') {
      return HttpResponse.json(
        { error: '该邮箱已被注册' },
        { status: 400 }
      );
    }
    return HttpResponse.json({
      user: { ...mockUser, email: body.email },
      token: 'mock-jwt-token'
    });
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    if (body.email === 'notexist@example.com') {
      return HttpResponse.json(
        { error: '该账号不存在' },
        { status: 404 }
      );
    }
    if (body.password === 'WrongPass123') {
      return HttpResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      );
    }
    return HttpResponse.json({
      user: mockUser,
      token: 'mock-jwt-token'
    });
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true });
  }),

  // Goals endpoints
  http.get('/api/goals', () => {
    const goals = [createMockGoal(), createMockGoal(), createMockGoal()];
    return HttpResponse.json(goals);
  }),

  http.get('/api/goals/:id', ({ params }) => {
    const goal = createMockGoal();
    goal.id = params.id as string;
    return HttpResponse.json(goal);
  }),

  http.post('/api/goals', async ({ request }) => {
    const body = await request.json() as { title: string };
    return HttpResponse.json({
      goal: { ...createMockGoal(), title: body.title },
      milestones: [createMockMilestone('')],
      tasks: [createMockTask('')]
    });
  }),

  http.put('/api/goals/:id', async ({ params, request }) => {
    const body = await request.json() as { title?: string; status?: string };
    return HttpResponse.json({
      ...createMockGoal(),
      id: params.id,
      ...body
    });
  }),

  http.delete('/api/goals/:id', () => {
    return HttpResponse.json({ success: true });
  }),

  // Tasks endpoints
  http.get('/api/tasks/today', () => {
    return HttpResponse.json({
      tasks: [createMockTask('milestone-1'), createMockTask('milestone-1')],
      date: new Date().toISOString().split('T')[0]
    });
  }),

  http.post('/api/tasks/:id/complete', async ({ params }) => {
    return HttpResponse.json({
      task: { ...createMockTask(''), id: params.id, status: 'completed' },
      pointsEarned: 10
    });
  }),

  http.post('/api/tasks/:id/skip', async ({ params, request }) => {
    const body = await request.json() as { pointsCost: number };
    if (body.pointsCost > 100) {
      return HttpResponse.json(
        { error: '积分不足' },
        { status: 400 }
      );
    }
    return HttpResponse.json({
      task: { ...createMockTask(''), id: params.id, status: 'skipped' },
      pointsSpent: body.pointsCost
    });
  }),

  // Points endpoints
  http.get('/api/points', () => {
    return HttpResponse.json({
      totalPoints: 100,
      history: [
        {
          id: faker.string.uuid(),
          type: 'earned',
          amount: 20,
          description: '完成任务: 学习Python基础',
          createdAt: faker.date.recent().toISOString()
        },
        {
          id: faker.string.uuid(),
          type: 'spent',
          amount: -5,
          description: '跳过任务',
          createdAt: faker.date.recent().toISOString()
        }
      ]
    });
  }),

  // Progress endpoints
  http.get('/api/progress/:goalId', ({ params }) => {
    return HttpResponse.json({
      goalId: params.goalId,
      completionPercentage: 45,
      completedTasks: 5,
      totalTasks: 11,
      milestones: [createMockMilestone(params.goalId as string)]
    });
  }),

  // AI endpoints
  http.post('/api/ai/generate', async ({ request }) => {
    const body = await request.json() as { goalTitle: string };
    return HttpResponse.json({
      milestones: [
        {
          id: faker.string.uuid(),
          title: '基础知识阶段',
          description: '学习Python基础知识',
          order: 1,
          targetDate: faker.date.future().toISOString()
        },
        {
          id: faker.string.uuid(),
          title: '进阶阶段',
          description: '掌握Python进阶技能',
          order: 2,
          targetDate: faker.date.future().toISOString()
        }
      ],
      tasks: [
        {
          id: faker.string.uuid(),
          title: '安装Python环境',
          description: '下载并安装Python 3.x',
          points: 5,
          plannedDate: faker.date.soon().toISOString().split('T')[0],
          milestoneId: ''
        }
      ]
    });
  }),

  // Error simulation endpoints
  http.post('/api/ai/generate-timeout', () => {
    return new HttpResponse(null, { status: 504 });
  }),

  http.post('/api/ai/generate-error', () => {
    return HttpResponse.json(
      { error: 'AI服务暂时不可用' },
      { status: 500 }
    );
  })
];

// Create MSW server
export const server = setupServer(...handlers);
