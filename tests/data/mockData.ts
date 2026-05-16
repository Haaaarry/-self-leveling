// Test data factories and helpers

import { faker } from '@faker-js/faker';

// Re-export faker for convenience
export { faker };

// User test data
export const createMockUser = (overrides = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  username: faker.internet.userName(),
  totalPoints: faker.number.int({ min: 0, max: 500 }),
  level: faker.number.int({ min: 1, max: 10 }),
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  ...overrides
});

// Goal test data
export const createMockGoal = (overrides = {}) => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  title: faker.helpers.arrayElement([
    '3个月学会Python',
    '6个月减肥20斤',
    '1年读完50本书',
    '学会弹吉他',
    '掌握摄影技巧'
  ]),
  description: faker.lorem.sentence(),
  targetDate: faker.date.future({ years: 1 }).toISOString(),
  status: faker.helpers.arrayElement(['active', 'paused', 'completed']),
  totalPoints: faker.number.int({ min: 100, max: 500 }),
  currentProgress: faker.number.int({ min: 0, max: 100 }),
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  ...overrides
});

// Milestone test data
export const createMockMilestone = (goalId: string, overrides = {}) => ({
  id: faker.string.uuid(),
  goalId,
  title: faker.helpers.arrayElement([
    '完成基础知识学习',
    '完成中级技能掌握',
    '完成高级应用实践',
    '完成项目实战'
  ]),
  description: faker.lorem.sentence(),
  order: faker.number.int({ min: 1, max: 5 }),
  targetDate: faker.date.future().toISOString(),
  isCompleted: faker.datatype.boolean(),
  completedAt: faker.date.recent().toISOString(),
  ...overrides
});

// Task test data
export const createMockTask = (milestoneId: string, overrides = {}) => ({
  id: faker.string.uuid(),
  milestoneId,
  title: faker.helpers.arrayElement([
    '学习Python基础语法',
    '完成变量和数据类型练习',
    '阅读官方文档第一章',
    '编写第一个Python程序',
    '完成课后习题'
  ]),
  description: faker.lorem.sentence(),
  points: faker.helpers.arrayElement([5, 10, 15, 20, 25]),
  plannedDate: faker.date.soon({ days: 30 }).toISOString().split('T')[0],
  status: faker.helpers.arrayElement(['pending', 'completed', 'skipped']),
  completedAt: faker.date.recent().toISOString(),
  skippedAt: faker.date.recent().toISOString(),
  ...overrides
});

// Point transaction test data
export const createMockPointTransaction = (overrides = {}) => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  taskId: faker.string.uuid(),
  amount: faker.helpers.arrayElement([5, 10, 15, 20, -5]),
  type: faker.helpers.arrayElement(['earned', 'spent']),
  description: faker.helpers.arrayElement([
    '完成任务: 学习Python基础',
    '跳过任务',
    '连续奖励'
  ]),
  createdAt: faker.date.recent().toISOString(),
  ...overrides
});

// Common test passwords
export const testPasswords = {
  valid: 'Test1234',
  short: 'short',
  weak: '12345678',
  strong: 'MyStr0ng!Pass'
};

// Common test emails
export const testEmails = {
  valid: 'qa-test@example.com',
  existing: 'existing@example.com',
  notExist: 'notexist@example.com',
  invalid: 'invalid-email'
};

// Test credentials
export const testCredentials = {
  validUser: {
    email: 'qa-test@example.com',
    password: 'Test1234'
  },
  invalidPassword: {
    email: 'qa-test@example.com',
    password: 'WrongPass123'
  },
  notExistUser: {
    email: 'notexist@example.com',
    password: 'Test1234'
  }
};
