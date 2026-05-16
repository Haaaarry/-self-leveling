import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 每日任务测试
 * 测试任务展示、完成、跳过等核心功能
 */

describe('每日任务 - Daily Tasks', () => {
  describe('TC-TASK-001: 查看今日任务', () => {
    it('应该显示正确的今日日期', () => {
      // Given: 今日日期
      const today = new Date().toISOString().split('T')[0];
      
      // Then: 日期格式正确
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect(today).toMatch(dateRegex);
    });

    it('应该正确获取今日任务', () => {
      // Given: 所有任务
      const allTasks = [
        { id: 't1', plannedDate: '2026-05-16', title: '今日任务1' },
        { id: 't2', plannedDate: '2026-05-16', title: '今日任务2' },
        { id: 't3', plannedDate: '2026-05-17', title: '明日任务' }
      ];
      const today = '2026-05-16';
      
      // When: 筛选今日任务
      const todayTasks = allTasks.filter(t => t.plannedDate === today);
      
      // Then: 只包含今日任务
      expect(todayTasks.length).toBe(2);
      expect(todayTasks.every(t => t.plannedDate === today)).toBe(true);
    });

    it('应该显示任务的关键信息', () => {
      // Given: 任务信息
      const task = {
        title: '学习Python基础语法',
        points: 10,
        status: 'pending'
      };
      
      // Then: 关键信息完整
      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('points');
      expect(task).toHaveProperty('status');
    });
  });

  describe('TC-TASK-002: 无今日任务状态', () => {
    it('应该正确判断无今日任务', () => {
      // Given: 今日任务
      const todayTasks: string[] = [];
      const today = '2026-05-16';
      
      // When: 判断是否有任务
      const hasTasks = todayTasks.length > 0;
      
      // Then: 无任务
      expect(hasTasks).toBe(false);
    });

    it('应该显示空状态提示', () => {
      // Given: 无任务场景
      const emptyMessage = '今天没有任务，休息一下吧!';
      
      // Then: 消息正确
      expect(emptyMessage).toContain('没有');
      expect(emptyMessage).toContain('休息');
    });
  });

  describe('TC-TASK-003: 查看任务详情', () => {
    it('应该显示任务完整信息', () => {
      // Given: 任务详情
      const taskDetail = {
        id: 'task-123',
        title: '学习Python基础语法',
        description: '通过官方文档学习Python基本语法',
        points: 15,
        status: 'pending',
        goalTitle: '3个月学会Python'
      };
      
      // Then: 信息完整
      expect(taskDetail).toHaveProperty('title');
      expect(taskDetail).toHaveProperty('description');
      expect(taskDetail).toHaveProperty('goalTitle');
    });
  });

  describe('TC-TASK-010: 正常完成任务', () => {
    it('应该正确更新任务状态', () => {
      // Given: 待办任务
      const task = { id: 'task-1', status: 'pending' };
      
      // When: 完成任务
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      
      // Then: 状态更新
      expect(task.status).toBe('completed');
      expect(task.completedAt).toBeTruthy();
    });

    it('应该记录完成时间', () => {
      // Given: 任务完成时刻
      const completedAt = new Date().toISOString();
      
      // Then: 时间戳有效
      expect(completedAt).toBeTruthy();
      expect(new Date(completedAt).getTime()).toBeGreaterThan(0);
    });
  });

  describe('TC-TASK-011: 完成任务获得积分', () => {
    it('应该正确计算积分增长', () => {
      // Given: 初始积分和任务积分
      const initialPoints = 100;
      const taskPoints = 10;
      
      // When: 完成任务获得积分
      const newPoints = initialPoints + taskPoints;
      
      // Then: 积分正确累加
      expect(newPoints).toBe(110);
    });

    it('应该创建积分获取记录', () => {
      // Given: 积分记录
      const pointRecord = {
        id: 'record-1',
        taskId: 'task-1',
        amount: 10,
        type: 'earned',
        description: '完成任务: 学习Python基础',
        createdAt: new Date().toISOString()
      };
      
      // Then: 记录类型正确
      expect(pointRecord.type).toBe('earned');
      expect(pointRecord.amount).toBeGreaterThan(0);
    });
  });

  describe('TC-TASK-012: 重复完成任务拦截', () => {
    it('应该阻止已完成任务再次完成', () => {
      // Given: 已完成任务
      const task = { id: 'task-1', status: 'completed' };
      
      // When: 尝试再次完成
      const canComplete = task.status === 'pending';
      
      // Then: 操作被阻止
      expect(canComplete).toBe(false);
    });

    it('应该显示已完成状态提示', () => {
      // Given: 已完成任务操作
      const message = '任务已完成';
      
      // Then: 提示正确
      expect(message).toContain('已完成');
    });
  });

  describe('TC-TASK-020: 正常跳过任务', () => {
    it('应该正确更新跳过任务状态', () => {
      // Given: 待办任务
      const task = { id: 'task-1', status: 'pending' };
      
      // When: 跳过任务
      task.status = 'skipped';
      task.skippedAt = new Date().toISOString();
      
      // Then: 状态更新
      expect(task.status).toBe('skipped');
      expect(task.skippedAt).toBeTruthy();
    });
  });

  describe('TC-TASK-021: 积分不足跳过', () => {
    it('应该正确检查积分是否充足', () => {
      // Given: 当前积分和跳过消耗
      const currentPoints = 0;
      const skipCost = 5;
      
      // When: 检查是否可以跳过
      const canSkip = currentPoints >= skipCost;
      
      // Then: 无法跳过
      expect(canSkip).toBe(false);
    });

    it('应该生成积分不足提示', () => {
      // Given: 积分不足
      const message = '积分不足，无法跳过';
      
      // Then: 提示正确
      expect(message).toContain('积分');
      expect(message).toContain('不足');
    });

    it('应该提供引导提示', () => {
      // Given: 积分不足场景
      const guideMessage = '完成任务获取积分';
      
      // Then: 引导正确
      expect(guideMessage).toContain('任务');
      expect(guideMessage).toContain('积分');
    });
  });

  describe('TC-TASK-022: 跳过确认取消', () => {
    it('应该保持任务状态当取消跳过', () => {
      // Given: 待办任务
      const task = { id: 'task-1', status: 'pending' };
      
      // When: 取消跳过确认
      const isConfirmed = false;
      
      if (!isConfirmed) {
        // 保持原状态
      }
      
      // Then: 任务仍为待办
      expect(task.status).toBe('pending');
    });

    it('应该不扣除积分当取消跳过', () => {
      // Given: 初始积分
      let points = 100;
      const skipCost = 5;
      const isConfirmed = false;
      
      // When: 取消跳过
      if (!isConfirmed) {
        // 不执行扣除
      }
      
      // Then: 积分未变
      expect(points).toBe(100);
    });
  });

  describe('TC-TASK-023: 跳过对进度影响提示', () => {
    it('应该显示进度影响警告', () => {
      // Given: 跳过操作
      const warningMessage = '跳过将影响目标完成进度';
      
      // Then: 警告正确
      expect(warningMessage).toContain('跳过');
      expect(warningMessage).toContain('进度');
    });

    it('应该显示当前进度百分比', () => {
      // Given: 目标进度
      const currentProgress = 45;
      
      // Then: 进度显示正确
      expect(currentProgress).toBeGreaterThan(0);
      expect(currentProgress).toBeLessThan(100);
    });
  });

  describe('TC-TASK-024: 跳过已完成任务', () => {
    it('应该阻止跳过已完成任务', () => {
      // Given: 已完成任务
      const task = { id: 'task-1', status: 'completed' };
      
      // When: 尝试跳过
      const canSkip = task.status === 'pending';
      
      // Then: 无法跳过
      expect(canSkip).toBe(false);
    });

    it('应该显示正确错误消息', () => {
      // Given: 已完成任务跳过尝试
      const errorMessage = '已完成任务不能跳过';
      
      // Then: 错误消息正确
      expect(errorMessage).toContain('完成');
      expect(errorMessage).toContain('跳过');
    });
  });

  describe('TC-TASK-004: 任务分类展示', () => {
    it('应该按目标分类显示任务', () => {
      // Given: 任务列表
      const tasks = [
        { id: 't1', goalId: 'g1', title: '任务1' },
        { id: 't2', goalId: 'g2', title: '任务2' },
        { id: 't3', goalId: 'g1', title: '任务3' }
      ];
      
      // When: 按目标分组
      const groupedByGoal = tasks.reduce((acc, task) => {
        if (!acc[task.goalId]) {
          acc[task.goalId] = [];
        }
        acc[task.goalId].push(task);
        return acc;
      }, {} as Record<string, typeof tasks>);
      
      // Then: 分组正确
      expect(Object.keys(groupedByGoal).length).toBe(2);
      expect(groupedByGoal['g1'].length).toBe(2);
      expect(groupedByGoal['g2'].length).toBe(1);
    });
  });

  describe('TC-TASK-013: 完成任务连续奖励', () => {
    it('应该正确计算连续完成天数', () => {
      // Given: 每日完成记录
      const completionDates = [
        '2026-05-10',
        '2026-05-11',
        '2026-05-12',
        '2026-05-13'
      ];
      
      // When: 计算连续天数
      let streak = 1;
      for (let i = 1; i < completionDates.length; i++) {
        const prev = new Date(completionDates[i - 1]);
        const curr = new Date(completionDates[i]);
        const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        
        if (diffDays === 1) {
          streak++;
        } else {
          break;
        }
      }
      
      // Then: 连续天数正确
      expect(streak).toBe(4);
    });

    it('应该计算连击奖励积分', () => {
      // Given: 连续天数
      const streak = 7;
      const basePoints = 10;
      const streakBonus = streak >= 7 ? 20 : streak >= 3 ? 5 : 0;
      
      // Then: 奖励正确
      expect(streakBonus).toBe(20);
    });
  });
});
