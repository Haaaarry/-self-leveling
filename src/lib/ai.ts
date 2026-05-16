import OpenAI from 'openai';
import { AIPlanningResponse } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `你是一个专业的目标规划AI助手。请根据用户的目标生成详细的里程碑和每日任务计划。

**输出格式要求（严格遵循JSON）**:
{
  "milestones": [
    {
      "title": "里程碑标题",
      "description": "里程碑描述",
      "order": 1,
      "targetDate": "YYYY-MM-DD",
      "tasks": [
        {
          "title": "任务标题",
          "description": "任务详细描述",
          "points": 30,
          "estimatedTime": 60,
          "plannedDate": "YYYY-MM-DD"
        }
      ]
    }
  ]
}

**积分规则**:
- 简单任务：10-20积分
- 中等任务：30-50积分  
- 困难任务：80-100积分

**注意事项**:
1. 任务应按难度合理分配积分
2. 任务日期应在合理范围内
3. 每个里程碑包含3-7个任务
4. 里程碑应该有逻辑顺序
5. 只输出JSON，不要有其他文字`;

export async function generateTasksWithAI(
  goal: string,
  description?: string,
  targetDate?: string
): Promise<AIPlanningResponse> {
  const userMessage = `
目标: ${goal}
${description ? `描述: ${description}` : ''}
${targetDate ? `期望完成日期: ${targetDate}` : ''}

请规划里程碑和每日任务。
`.trim();

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('AI返回内容为空');
    }

    const result = JSON.parse(content) as AIPlanningResponse;
    
    if (!result.milestones || !Array.isArray(result.milestones)) {
      throw new Error('AI返回格式不正确');
    }

    return result;
  } catch (error) {
    console.error('AI任务生成失败:', error);
    throw error;
  }
}

export function calculateSkipCost(taskPoints: number): number {
  // 跳过任务消耗积分 = 任务原始积分 × 1.5
  return Math.ceil(taskPoints * 1.5);
}

export function calculateLevel(totalPoints: number): number {
  // 每100积分升一级
  return Math.floor(totalPoints / 100) + 1;
}
