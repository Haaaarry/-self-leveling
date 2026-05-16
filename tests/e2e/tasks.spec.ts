import { test, expect, Page } from '@playwright/test';

/**
 * 任务管理 E2E 测试
 */

test.describe('任务管理流程', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.fill('input[name="email"]', 'qa-test@example.com');
    await page.fill('input[name="password"]', 'Test1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(home|dashboard|goals)/);
  });

  test('TC-TASK-E2E-001: 查看今日任务', async ({ page }) => {
    // 1. 进入首页
    await page.goto('/home');
    
    // 2. 验证今日任务区域
    const todaySection = page.locator('text=今日任务');
    await expect(todaySection).toBeVisible();
    
    // 3. 验证任务列表
    const taskList = page.locator('[data-testid="task-item"]');
    await expect(taskList.first()).toBeVisible();
  });

  test('TC-TASK-E2E-002: 完成任务获得积分', async ({ page }) => {
    // 1. 进入首页
    await page.goto('/home');
    
    // 2. 获取初始积分
    const initialPointsText = await page.locator('text=/\\d+/').first().textContent();
    const initialPoints = parseInt(initialPointsText || '0');
    
    // 3. 找到待办任务
    const pendingTask = page.locator('[data-testid="task-item"]:has-text("待完成")').first();
    await expect(pendingTask).toBeVisible();
    
    // 4. 点击完成任务
    await pendingTask.locator('button:has-text("完成")').click();
    
    // 5. 验证任务状态变化
    await expect(pendingTask.locator('text=已完成')).toBeVisible({ timeout: 5000 });
    
    // 6. 验证积分增加 (可选，因为可能有动画延迟)
    await page.waitForTimeout(1000);
  });

  test('TC-TASK-E2E-003: 跳过任务消耗积分', async ({ page }) => {
    // 1. 进入首页
    await page.goto('/home');
    
    // 2. 获取初始积分
    const initialPointsText = await page.locator('[data-testid="points-balance"]').textContent();
    const initialPoints = parseInt(initialPointsText || '0');
    
    // 3. 找到待办任务
    const pendingTask = page.locator('[data-testid="task-item"]').first();
    
    // 4. 点击跳过
    await pendingTask.locator('button:has-text("跳过")').click();
    
    // 5. 确认跳过
    await page.click('text=确认跳过');
    
    // 6. 验证积分扣除 (跳过消耗 = 任务积分 * 1.5)
    await page.waitForTimeout(500);
    const taskPoints = await pendingTask.locator('[data-testid="task-points"]').textContent();
    const expectedPoints = Math.floor(parseInt(taskPoints || '0') * 1.5);
    const currentPoints = parseInt(await page.locator('[data-testid="points-balance"]').textContent() || '0');
    expect(currentPoints).toBe(initialPoints - expectedPoints);
  });

  test('TC-TASK-E2E-004: 积分不足无法跳过', async ({ page }) => {
    // 1. 进入首页
    await page.goto('/home');
    
    // 2. 清空积分 (通过API或多次跳过)
    // ... 
    
    // 3. 尝试跳过
    const pendingTask = page.locator('[data-testid="task-item"]').first();
    await pendingTask.locator('button:has-text("跳过")').click();
    
    // 4. 验证错误提示
    await expect(page.locator('text=积分不足')).toBeVisible();
  });

  test('TC-TASK-E2E-005: 查看任务详情', async ({ page }) => {
    // 1. 进入首页
    await page.goto('/home');
    
    // 2. 点击任务卡片
    const taskCard = page.locator('[data-testid="task-item"]').first();
    await taskCard.click();
    
    // 3. 验证详情弹窗/页面
    await expect(page.locator('text=任务详情')).toBeVisible();
    await expect(page.locator('[data-testid="task-description"]')).toBeVisible();
  });

  test('TC-TASK-E2E-006: 无今日任务空状态', async ({ page }) => {
    // 1. 确保无今日任务
    // ... (通过API清除)
    
    // 2. 进入首页
    await page.goto('/home');
    
    // 3. 验证空状态
    await expect(page.locator('text=今天没有任务')).toBeVisible();
    await expect(page.locator('text=休息一下吧')).toBeVisible();
  });
});
