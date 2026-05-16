import { test, expect, Page } from '@playwright/test';

/**
 * 积分系统 E2E 测试
 */

test.describe('积分系统流程', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.fill('input[name="email"]', 'qa-test@example.com');
    await page.fill('input[name="password"]', 'Test1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(home|dashboard|goals)/);
  });

  test('TC-POINTS-E2E-001: 查看积分余额', async ({ page }) => {
    // 1. 进入首页
    await page.goto('/home');
    
    // 2. 验证积分余额显示
    const pointsBalance = page.locator('[data-testid="points-balance"]');
    await expect(pointsBalance).toBeVisible();
    
    // 3. 验证格式正确
    const pointsText = await pointsBalance.textContent();
    expect(pointsText).toMatch(/\d+/);
  });

  test('TC-POINTS-E2E-002: 查看积分历史记录', async ({ page }) => {
    // 1. 进入积分详情页
    await page.click('text=积分明细');
    
    // 2. 验证历史列表
    const historyList = page.locator('[data-testid="points-history"]');
    await expect(historyList).toBeVisible();
    
    // 3. 验证记录格式
    const firstRecord = historyList.locator('[data-testid="history-item"]').first();
    await expect(firstRecord).toBeVisible();
  });

  test('TC-POINTS-E2E-003: 积分获取记录', async ({ page }) => {
    // 1. 完成任务获得积分
    await page.goto('/home');
    const task = page.locator('[data-testid="task-item"]:first-child');
    await task.locator('button:has-text("完成")').click();
    
    // 2. 进入积分历史
    await page.click('text=积分明细');
    
    // 3. 验证获取记录
    const earnedRecord = page.locator('text=完成任务').first();
    await expect(earnedRecord).toBeVisible({ timeout: 5000 });
  });

  test('TC-POINTS-E2E-004: 积分消耗记录', async ({ page }) => {
    // 1. 跳过任务消耗积分
    await page.goto('/home');
    const task = page.locator('[data-testid="task-item"]:first-child');
    await task.locator('button:has-text("跳过")').click();
    await page.click('text=确认跳过');
    
    // 2. 进入积分历史
    await page.click('text=积分明细');
    
    // 3. 验证消耗记录
    const spentRecord = page.locator('text=跳过任务').first();
    await expect(spentRecord).toBeVisible({ timeout: 5000 });
  });

  test('TC-POINTS-E2E-005: 积分筛选功能', async ({ page }) => {
    // 1. 进入积分历史
    await page.click('text=积分明细');
    
    // 2. 切换筛选条件
    await page.click('text=只看获取');
    await expect(page.locator('[data-testid="earned-filter-active"]')).toBeVisible();
    
    await page.click('text=只看消耗');
    await expect(page.locator('[data-testid="spent-filter-active"]')).toBeVisible();
    
    await page.click('text=全部');
    await expect(page.locator('[data-testid="all-filter-active"]')).toBeVisible();
  });

  test('TC-POINTS-E2E-006: 积分统计展示', async ({ page }) => {
    // 1. 进入积分页面
    await page.click('text=积分明细');
    
    // 2. 验证统计数据
    await expect(page.locator('text=本月获取')).toBeVisible();
    await expect(page.locator('text=本月消耗')).toBeVisible();
    await expect(page.locator('text=累计积分')).toBeVisible();
  });
});
