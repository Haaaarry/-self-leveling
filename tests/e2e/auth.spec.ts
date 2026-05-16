import { test, expect, Page } from '@playwright/test';

/**
 * 用户认证 E2E 测试
 */

test.describe('用户认证流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('TC-AUTH-E2E-001: 完整注册登录登出流程', async ({ page }) => {
    // 1. 进入注册页面
    await page.click('text=注册');
    await expect(page).toHaveURL(/\/register/);
    
    // 2. 填写注册信息
    await page.fill('input[name="email"]', `qa-test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Test1234');
    await page.fill('input[name="confirmPassword"]', 'Test1234');
    
    // 3. 提交注册
    await page.click('button[type="submit"]');
    
    // 4. 等待跳转或成功提示
    await expect(page.locator('text=注册成功')).toBeVisible({ timeout: 5000 }).catch(() => {
      // 如果注册后直接跳转，验证是否在首页
      return expect(page).toHaveURL(/\/(home|dashboard|goals)/);
    });
    
    // 5. 登出
    await page.click('text=退出登录');
    await expect(page).toHaveURL(/\/login/);
  });

  test('TC-AUTH-E2E-002: 登录失败显示错误', async ({ page }) => {
    // 1. 进入登录页面
    await page.click('text=登录');
    await expect(page).toHaveURL(/\/login/);
    
    // 2. 输入错误密码
    await page.fill('input[name="email"]', 'qa-test@example.com');
    await page.fill('input[name="password"]', 'WrongPass123');
    
    // 3. 提交登录
    await page.click('button[type="submit"]');
    
    // 4. 显示错误
    await expect(page.locator('[role="alert"], .error').first()).toContainText('密码错误');
  });

  test('TC-AUTH-E2E-003: 必填字段验证', async ({ page }) => {
    // 1. 进入登录页面
    await page.click('text=登录');
    
    // 2. 直接提交空表单
    await page.click('button[type="submit"]');
    
    // 3. 显示验证错误
    await expect(page.locator('text=请输入邮箱')).toBeVisible();
    await expect(page.locator('text=请输入密码')).toBeVisible();
  });

  test('TC-AUTH-E2E-004: 密码格式验证', async ({ page }) => {
    // 1. 进入注册页面
    await page.click('text=注册');
    
    // 2. 输入短密码
    await page.fill('input[name="email"]', 'qa-test@example.com');
    await page.fill('input[name="password"]', 'short');
    await page.fill('input[name="confirmPassword"]', 'short');
    
    // 3. 提交
    await page.click('button[type="submit"]');
    
    // 4. 显示密码错误
    await expect(page.locator('text=密码至少')).toBeVisible();
  });
});
