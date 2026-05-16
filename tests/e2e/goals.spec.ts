import { test, expect, Page } from '@playwright/test';

/**
 * 目标管理 E2E 测试
 */

test.describe('目标管理流程', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login');
    await page.fill('input[name="email"]', 'qa-test@example.com');
    await page.fill('input[name="password"]', 'Test1234');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(home|dashboard|goals)/);
  });

  test('TC-GOAL-E2E-001: 创建新目标并触发AI生成', async ({ page }) => {
    // 1. 点击新建目标
    await page.click('text=新建目标');
    await expect(page).toHaveURL(/\/goals\/new/);
    
    // 2. 填写目标信息
    await page.fill('input[name="title"]', '3个月学会Python');
    await page.fill('textarea[name="description"]', '每天学习2小时，掌握Python基础到进阶');
    
    // 3. 选择日期 (3个月后)
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 3);
    const dateStr = futureDate.toISOString().split('T')[0];
    await page.fill('input[name="targetDate"]', dateStr);
    
    // 4. 提交创建
    await page.click('button[type="submit"]');
    
    // 5. 等待AI生成
    await expect(page.locator('text=AI正在规划')).toBeVisible({ timeout: 15000 }).catch(() => {});
    
    // 6. 验证目标创建成功
    await expect(page.locator('text=3个月学会Python')).toBeVisible({ timeout: 15000 });
  });

  test('TC-GOAL-E2E-002: 查看目标列表', async ({ page }) => {
    // 1. 进入目标列表
    await page.click('text=我的目标');
    
    // 2. 验证目标卡片显示
    const goalCards = page.locator('[data-testid="goal-card"]');
    await expect(goalCards.first()).toBeVisible();
  });

  test('TC-GOAL-E2E-003: 编辑目标', async ({ page }) => {
    // 1. 进入目标详情
    await page.click('[data-testid="goal-card"]:first-child');
    await expect(page).toHaveURL(/\/goals\/.+/);
    
    // 2. 点击编辑
    await page.click('text=编辑');
    
    // 3. 修改名称
    await page.fill('input[name="title"]', '4个月学会Python');
    
    // 4. 保存
    await page.click('button[type="submit"]');
    
    // 5. 验证更新
    await expect(page.locator('text=4个月学会Python')).toBeVisible();
  });

  test('TC-GOAL-E2E-004: 删除目标', async ({ page }) => {
    // 1. 进入目标详情
    await page.click('[data-testid="goal-card"]:first-child');
    
    // 2. 点击删除
    await page.click('text=删除');
    
    // 3. 确认删除
    await page.click('text=确认删除');
    
    // 4. 验证跳转
    await expect(page).toHaveURL(/\/goals/);
  });

  test('TC-GOAL-E2E-005: 空目标状态', async ({ page }) => {
    // 1. 确保无目标
    // (通过API或UI清除所有目标)
    
    // 2. 进入目标列表
    await page.click('text=我的目标');
    
    // 3. 验证空状态
    await expect(page.locator('text=暂无目标')).toBeVisible();
    await expect(page.locator('text=创建你的第一个目标')).toBeVisible();
  });

  test('TC-GOAL-E2E-006: 暂停和恢复目标', async ({ page }) => {
    // 1. 进入目标详情
    await page.click('[data-testid="goal-card"]:first-child');
    
    // 2. 暂停目标
    await page.click('text=暂停');
    await expect(page.locator('text=已暂停')).toBeVisible();
    
    // 3. 恢复目标
    await page.click('text=恢复');
    await expect(page.locator('text=进行中')).toBeVisible();
  });
});
