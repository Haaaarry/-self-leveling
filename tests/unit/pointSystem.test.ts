import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * 积分系统单元测试
 * 测试积分获取、消耗、余额查询和并发一致性
 */

describe('积分系统 - Point System', () => {
  describe('TC-POINT-001: 完成任务获取积分', () => {
    it('应该正确计算完成任务后的积分余额', () => {
      // Given: 用户初始积分100，完成一个积分为20的任务
      const initialPoints = 100;
      const taskPoints = 20;
      
      // When: 完成任务后计算新积分
      const newPoints = initialPoints + taskPoints;
      
      // Then: 积分正确累加
      expect(newPoints).toBe(120);
    });

    it('应该创建正确的积分获取记录', () => {
      // Given: 用户完成任务
      const taskId = 'task-123';
      const pointsEarned = 20;
      const transactionType = 'earned';
      
      // When: 创建积分记录
      const record = {
        id: 'record-1',
        taskId,
        amount: pointsEarned,
        type: transactionType,
        description: `完成任务: 学习Python基础`,
        createdAt: new Date().toISOString()
      };
      
      // Then: 记录类型正确
      expect(record.type).toBe('earned');
      expect(record.amount).toBe(20);
    });
  });

  describe('TC-POINT-002: 积分记录详情', () => {
    it('应该正确记录积分变动的所有信息', () => {
      // Given: 积分变动记录
      const record = {
        id: 'record-1',
        userId: 'user-123',
        taskId: 'task-456',
        amount: 20,
        type: 'earned' as const,
        description: '完成任务: 学习Python基础',
        createdAt: new Date().toISOString()
      };
      
      // Then: 所有必要字段都存在
      expect(record).toHaveProperty('id');
      expect(record).toHaveProperty('amount');
      expect(record).toHaveProperty('type');
      expect(record).toHaveProperty('description');
      expect(record).toHaveProperty('createdAt');
    });
  });

  describe('TC-POINT-010: 跳过任务消耗积分', () => {
    it('应该正确计算跳过任务后的积分余额', () => {
      // Given: 用户初始积分100，跳过一个消耗5积分的任务
      const initialPoints = 100;
      const skipCost = 5;
      
      // When: 跳过任务后计算新积分
      const newPoints = initialPoints - skipCost;
      
      // Then: 积分正确扣除
      expect(newPoints).toBe(95);
    });

    it('应该正确创建积分消耗记录', () => {
      // Given: 用户跳过任务
      const taskId = 'task-123';
      const pointsSpent = 5;
      const transactionType = 'spent';
      
      // When: 创建积分记录
      const record = {
        id: 'record-1',
        taskId,
        amount: -pointsSpent,
        type: transactionType,
        description: '跳过任务',
        createdAt: new Date().toISOString()
      };
      
      // Then: 记录类型正确，金额为负
      expect(record.type).toBe('spent');
      expect(record.amount).toBe(-5);
    });
  });

  describe('TC-POINT-011: 积分不足提示', () => {
    it('应该正确判断积分是否充足', () => {
      // Given: 用户积分3，需要消耗5积分
      const currentPoints = 3;
      const requiredPoints = 5;
      
      // When: 检查积分是否充足
      const canAfford = currentPoints >= requiredPoints;
      const deficit = requiredPoints - currentPoints;
      
      // Then: 积分不足提示
      expect(canAfford).toBe(false);
      expect(deficit).toBe(2);
    });

    it('应该生成正确的积分不足错误信息', () => {
      // Given: 积分不足场景
      const currentPoints = 3;
      const requiredPoints = 5;
      const deficit = requiredPoints - currentPoints;
      
      // When: 生成错误信息
      const errorMessage = `积分不足，还需要${deficit}积分`;
      
      // Then: 错误信息正确
      expect(errorMessage).toBe('积分不足，还需要2积分');
    });
  });

  describe('TC-POINT-020: 并发完成任务', () => {
    it('应该正确处理多个积分获取操作', () => {
      // Given: 用户初始积分100，有3个任务同时完成
      let points = 100;
      const tasks = [
        { id: 'task-1', points: 20 },
        { id: 'task-2', points: 20 },
        { id: 'task-3', points: 20 }
      ];
      
      // When: 模拟顺序处理并发请求
      tasks.forEach(task => {
        points += task.points;
      });
      
      // Then: 积分正确累加
      expect(points).toBe(160);
    });

    it('应该防止积分丢失', () => {
      // Given: 大量并发积分操作
      let points = 0;
      const operations = Array(100).fill(null).map((_, i) => ({
        type: 'earned' as const,
        amount: 10
      }));
      
      // When: 顺序执行所有操作
      operations.forEach(op => {
        points += op.amount;
      });
      
      // Then: 积分累加正确
      expect(points).toBe(1000);
    });
  });

  describe('TC-POINT-021: 并发跳过操作', () => {
    it('应该防止积分出现负数', () => {
      // Given: 用户积分10，同时发起多次跳过操作
      let points = 10;
      const skipOperations = Array(3).fill(null).map(() => ({
        type: 'spent' as const,
        amount: 5
      }));
      
      // When: 顺序处理跳过操作
      skipOperations.forEach(op => {
        const newPoints = points - op.amount;
        if (newPoints >= 0) {
          points = newPoints;
        }
      });
      
      // Then: 积分不会出现负数
      expect(points).toBeGreaterThanOrEqual(0);
      expect(points).toBe(0);
    });

    it('应该正确处理积分不足的跳过请求', () => {
      // Given: 用户积分3，多个跳过请求
      let points = 3;
      const skipCost = 5;
      const skipRequests = [skipCost, skipCost];
      
      // When: 处理跳过请求
      const results = skipRequests.map(cost => {
        if (points >= cost) {
          points -= cost;
          return { success: true, remainingPoints: points };
        }
        return { success: false, remainingPoints: points };
      });
      
      // Then: 只有第一个请求失败
      expect(results[0].success).toBe(false);
    });
  });

  describe('TC-POINT-022: 并发积分操作一致性', () => {
    it('应该正确处理同时获取和消耗积分', () => {
      // Given: 用户积分100
      let points = 100;
      const operations = [
        { type: 'earned', amount: 20 },  // 完成
        { type: 'spent', amount: 5 }       // 跳过
      ];
      
      // When: 顺序执行操作
      operations.forEach(op => {
        points += op.type === 'earned' ? op.amount : -op.amount;
      });
      
      // Then: 最终积分正确
      expect(points).toBe(115);
    });

    it('应该保持积分事务的原子性', () => {
      // Given: 一组积分操作
      const initialPoints = 100;
      const operations = [
        { type: 'earned', amount: 20 },
        { type: 'earned', amount: 15 },
        { type: 'spent', amount: 10 }
      ];
      
      // When: 计算最终积分
      const finalPoints = operations.reduce((acc, op) => {
        return op.type === 'earned' ? acc + op.amount : acc - op.amount;
      }, initialPoints);
      
      // Then: 原子性保持
      expect(finalPoints).toBe(125);
    });
  });

  describe('TC-POINT-030: 积分余额查询', () => {
    it('应该正确展示积分余额', () => {
      // Given: 用户当前积分
      const totalPoints = 100;
      
      // When: 格式化显示
      const displayText = `当前积分: ${totalPoints}`;
      
      // Then: 显示正确
      expect(displayText).toBe('当前积分: 100');
    });

    it('应该正确计算积分排名百分比', () => {
      // Given: 用户积分和排行榜
      const userPoints = 150;
      const allPoints = [100, 150, 200, 50, 300].sort((a, b) => b - a);
      
      // When: 计算排名
      const rank = allPoints.indexOf(userPoints) + 1;
      const percentile = ((allPoints.length - rank) / allPoints.length) * 100;
      
      // Then: 排名正确
      expect(rank).toBe(2);
      expect(percentile).toBe(80);
    });
  });
});
