import OpenAI from 'openai';
import { AIPlanningResponse, AIGeneratedMilestone, AIGeneratedTask } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

// 计算两个日期之间的天数
function daysBetween(start: Date, end: Date): number {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// 添加天数到日期
function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
}

// 调用 AI 并解析 JSON（带重试机制）
async function callAI(model: string, messages: any[], maxTokens: number = 4000, retries: number = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`[AI] 调用模型: ${model}, 尝试 ${attempt + 1}/${retries + 1}`);
      
      const response = await openai.chat.completions.create({
        model,
        messages,
        temperature: 0.3,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      });

      console.log('[AI] 响应:', JSON.stringify(response, null, 2));

      // 检查响应结构
      if (!response) {
        throw new Error('API响应为空');
      }
      
      const rawContent = response.choices?.[0]?.message?.content;
      console.log('[AI] 原始内容:', rawContent);
      
      if (!rawContent) {
        // 检查是否有其他错误信息
        const finishReason = response.choices?.[0]?.finish_reason;
        if (finishReason === 'length') {
          throw new Error('响应被截断（超出max_tokens限制）');
        }
        throw new Error('AI返回内容为空');
      }
      
      const content = rawContent.trim();
      if (!content) {
        throw new Error('AI返回内容为空（仅空白字符）');
      }
      
      // 清理并验证 JSON
      const cleaned = cleanJSON(content);
      console.log('[AI] 清理后:', cleaned.substring(0, 500));
      return JSON.parse(cleaned);
      
    } catch (error: any) {
      console.error(`[AI] 调用失败 (尝试 ${attempt + 1}/${retries + 1}):`, error.message);
      
      if (attempt === retries) {
        throw error;
      }
      
      // 重试前添加更严格的提示
      messages = messages.map((m: any) => {
        if (m.role === 'system') {
          return {
            ...m,
            content: m.content + '\n\n【重要】确保输出的是有效的JSON格式，不要在字符串中包含未转义的特殊字符（如换行符、反斜杠、引号等）。'
          };
        }
        return m;
      });
    }
  }
  throw new Error('AI调用失败');
}

// 清理和修复 JSON 字符串
function cleanJSON(json: string): string {
  // 移除 markdown 代码块标记
  json = json.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  
  // 移除前后空白
  json = json.trim();
  
  // 尝试找到有效的 JSON 范围
  const firstBrace = json.indexOf('{');
  const lastBrace = json.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    json = json.substring(firstBrace, lastBrace + 1);
  }
  
  // 修复常见的 JSON 问题
  // 1. 修复 description 中的未转义换行符
  json = json.replace(/("description"\s*:\s*")([^"]*?)(?<!\\)(")/g, (match, prefix, content, suffix) => {
    // 转义内容中的特殊字符
    const escaped = content
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
    return prefix + escaped + suffix;
  });
  
  // 2. 修复 title 中的未转义换行符
  json = json.replace(/("title"\s*:\s*")([^"]*?)(?<!\\)(")/g, (match, prefix, content, suffix) => {
    const escaped = content
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');
    return prefix + escaped + suffix;
  });
  
  return json;
}

// 步骤1：生成月度计划
const MONTHLY_PROMPT = `你是一个专业的目标规划AI助手。根据用户目标生成分阶段计划。

**输出格式（严格JSON）**:
{
  "phases": [
    {
      "title": "阶段名称",
      "description": "阶段目标",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "weekCount": 2,
      "goals": ["本周核心目标1", "本周核心目标2"]
    }
  ]
}

**要求**:
1. 从今天开始安排
2. 每阶段1-4周
3. phases数组从今天往后排
4. 只输出JSON`;

// 步骤2：生成周计划
const WEEKLY_PROMPT = `你是一个专业的目标规划AI助手。根据月度目标和阶段信息生成本周详细计划。

**输入信息**:
- 阶段名称: {phaseTitle}
- 阶段目标: {phaseDescription}
- 本周编号: 第{weekNum}周（共{weekCount}周）
- 本周起止: {startDate} 到 {endDate}

**输出格式（严格JSON）**:
{
  "weekTitle": "第X周：周主题",
  "description": "本周核心目标",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "mainGoals": ["目标1", "目标2", "目标3"],
  "dailyTasks": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "tasks": [
        {
          "title": "任务标题（30-60分钟）",
          "description": "具体操作步骤",
          "estimatedTime": 45
        }
      ]
    }
  ]
}

**要求**:
1. 每天2-4个任务
2. 任务时长30-60分钟
3. 只输出JSON`;

// 步骤3：生成日任务详情
const DAILY_PROMPT = `你是一个专业的目标规划AI助手。根据周计划生成本日详细任务。

**输入信息**:
- 日期: {date}
- 周主题: {weekTitle}
- 今日目标: {dayGoals}

**输出格式（严格JSON）**:
{
  "date": "YYYY-MM-DD",
  "tasks": [
    {
      "title": "【上午/下午】具体任务",
      "description": "1. 操作步骤\\n2. 预期结果\\n3. 注意事项",
      "estimatedTime": 45,
      "points": 15
    }
  ]
}

**要求**:
1. 任务细分到具体操作
2. 时长30-60分钟
3. 只输出JSON`;

export async function generateTasksWithAI(
  goal: string,
  description?: string,
  targetDate?: string
): Promise<AIPlanningResponse> {
  const startDate = new Date();
  const endDate = targetDate ? new Date(targetDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const totalDays = daysBetween(startDate, endDate);

  console.log(`目标时长: ${totalDays} 天`);

  try {
    // 情况1: <= 1周，直接生成日计划
    if (totalDays <= 7) {
      console.log('使用模式: 直接日计划');
      return await generateDirectDailyPlan(goal, description, startDate, endDate);
    }
    
    // 情况2: <= 1个月，分步周计划→日计划
    if (totalDays <= 30) {
      console.log('使用模式: 周计划→日计划');
      return await generateWeeklyPlan(goal, description, startDate, endDate);
    }
    
    // 情况3: > 1个月，分步月度→周计划→日计划
    console.log('使用模式: 月度→周计划→日计划');
    return await generateMonthlyPlan(goal, description, startDate, endDate);
    
  } catch (error) {
    console.error('AI任务生成失败:', error);
    throw error;
  }
}

// 直接生成日计划（<= 1周）
async function generateDirectDailyPlan(
  goal: string,
  description: string | undefined,
  startDate: Date,
  endDate: Date
): Promise<AIPlanningResponse> {
  const userMessage = `
目标: ${goal}
${description ? `描述: ${description}` : ''}
时间范围: ${startDate.toISOString().split('T')[0]} 到 ${endDate.toISOString().split('T')[0]}
`.trim();

  const response = await callAI('deepseek-v4-flash', [
    { role: 'system', content: WEEKLY_PROMPT.replace('{phaseTitle}', '短期目标').replace('{phaseDescription}', description || '').replace('{weekNum}', '1').replace('{weekCount}', '1').replace('{startDate}', startDate.toISOString().split('T')[0]).replace('{endDate}', endDate.toISOString().split('T')[0]) },
    { role: 'user', content: userMessage }
  ]);

  const milestones: AIGeneratedMilestone[] = [];
  let order = 1;
  
  for (const day of response.dailyTasks || []) {
    const tasks: AIGeneratedTask[] = (day.tasks || []).map((t: any): AIGeneratedTask => ({
      title: t.title,
      description: t.description || '',
      points: t.points || (t.estimatedTime <= 30 ? 10 : t.estimatedTime <= 60 ? 15 : 20),
      estimatedTime: t.estimatedTime,
      plannedDate: day.date,
    }));

    milestones.push({
      title: `Day ${day.day}: ${response.weekTitle}`,
      description: response.description,
      order: order++,
      targetDate: day.date,
      tasks,
    });
  }

  return { milestones };
}

// 分步周计划（1周~1个月）
async function generateWeeklyPlan(
  goal: string,
  description: string | undefined,
  startDate: Date,
  endDate: Date
): Promise<AIPlanningResponse> {
  const totalDays = daysBetween(startDate, endDate);
  const weekCount = Math.ceil(totalDays / 7);
  
  const userMessage = `
目标: ${goal}
${description ? `描述: ${description}` : ''}
时间范围: ${startDate.toISOString().split('T')[0]} 到 ${endDate.toISOString().split('T')[0]}
总共 ${totalDays} 天，需要 ${weekCount} 周完成
`.trim();

  // 生成周计划概览
  const weeklyOverview = await callAI('deepseek-v4-flash', [
    { role: 'system', content: MONTHLY_PROMPT },
    { role: 'user', content: userMessage }
  ]);

  const milestones: AIGeneratedMilestone[] = [];
  let order = 1;

  // 逐周生成详细日计划
  for (let i = 0; i < weekCount; i++) {
    const weekStart = addDays(startDate, i * 7);
    const weekEnd = addDays(startDate, Math.min((i + 1) * 7 - 1, totalDays - 1));
    
    const phase = weeklyOverview.phases?.[i] || { title: `第${i + 1}周`, description: goal };

    const weeklyDetail = await callAI('deepseek-v4-flash', [
      { role: 'system', content: WEEKLY_PROMPT
        .replace('{phaseTitle}', phase.title)
        .replace('{phaseDescription}', phase.description)
        .replace('{weekNum}', String(i + 1))
        .replace('{weekCount}', String(weekCount))
        .replace('{startDate}', weekStart)
        .replace('{endDate}', weekEnd) },
      { role: 'user', content: `继续规划本周(${weekStart}到${weekEnd})的详细任务` }
    ], 5000);

    // 提取日任务
    for (const day of weeklyDetail.dailyTasks || []) {
      const tasks: AIGeneratedTask[] = (day.tasks || []).map((t: any): AIGeneratedTask => ({
        title: t.title,
        description: t.description || '',
        points: t.points || (t.estimatedTime <= 30 ? 10 : t.estimatedTime <= 60 ? 15 : 20),
        estimatedTime: t.estimatedTime,
        plannedDate: day.date,
      }));

      milestones.push({
        title: `${weeklyDetail.weekTitle} - Day ${day.day}`,
        description: weeklyDetail.description,
        order: order++,
        targetDate: day.date,
        tasks,
      });
    }
  }

  return { milestones };
}

// 分步月度计划（> 1个月）- 改为逐周生成
async function generateMonthlyPlan(
  goal: string,
  description: string | undefined,
  startDate: Date,
  endDate: Date
): Promise<AIPlanningResponse> {
  const totalDays = daysBetween(startDate, endDate);
  const weekCount = Math.ceil(totalDays / 7);
  
  console.log(`月度计划: ${totalDays}天, ${weekCount}周`);

  const userMessage = `
目标: ${goal}
${description ? `描述: ${description}` : ''}
时间范围: ${startDate.toISOString().split('T')[0]} 到 ${endDate.toISOString().split('T')[0]}
总共 ${totalDays} 天，分为 ${weekCount} 周。
请按周拆解目标，每周给出核心目标。
`.trim();

  // 步骤1：生成周计划概览
  const weeklyOverview = await callAI('deepseek-v4-flash', [
    { role: 'system', content: MONTHLY_PROMPT },
    { role: 'user', content: userMessage }
  ], 6000);

  console.log('周概览:', JSON.stringify(weeklyOverview).substring(0, 500));

  const milestones: AIGeneratedMilestone[] = [];
  let order = 1;

  // 步骤2：逐周生成详细日计划
  for (let i = 0; i < weekCount; i++) {
    const weekStartDate = addDays(startDate, i * 7);
    const weekEndDate = addDays(startDate, Math.min((i + 1) * 7 - 1, totalDays - 1));
    
    const phase = weeklyOverview.phases?.[i] || { 
      title: `第${i + 1}周`, 
      description: goal,
      goals: ['完成本周目标']
    };

    console.log(`生成第${i + 1}周 (${weekStartDate} 到 ${weekEndDate})...`);

    const weeklyDetail = await callAI('deepseek-v4-flash', [
      { role: 'system', content: WEEKLY_PROMPT
        .replace('{phaseTitle}', phase.title)
        .replace('{phaseDescription}', phase.description)
        .replace('{weekNum}', String(i + 1))
        .replace('{weekCount}', String(weekCount))
        .replace('{startDate}', weekStartDate)
        .replace('{endDate}', weekEndDate) },
      { role: 'user', content: `本周(${weekStartDate}到${weekEndDate})的详细任务安排。本周核心目标: ${(phase.goals || []).join(', ')}` }
    ], 6000);

    console.log(`第${i + 1}周日任务数:`, (weeklyDetail.dailyTasks || []).length);

    // 提取日任务
    for (const day of weeklyDetail.dailyTasks || []) {
      const tasks: AIGeneratedTask[] = (day.tasks || []).map((t: any): AIGeneratedTask => ({
        title: t.title,
        description: t.description || '',
        points: t.points || (t.estimatedTime <= 30 ? 10 : t.estimatedTime <= 60 ? 15 : 20),
        estimatedTime: t.estimatedTime,
        plannedDate: day.date,
      }));

      milestones.push({
        title: `${weeklyDetail.weekTitle || phase.title} - Day ${day.day || 1}`,
        description: weeklyDetail.description || phase.description,
        order: order++,
        targetDate: day.date,
        tasks,
      });
    }
  }

  console.log(`总计生成 ${milestones.length} 个里程碑, ${milestones.reduce((sum, m) => sum + m.tasks.length, 0)} 个任务`);

  return { milestones };
}

export function calculateSkipCost(taskPoints: number): number {
  return Math.ceil(taskPoints * 1.5);
}

export function calculateLevel(totalPoints: number): number {
  return Math.floor(totalPoints / 100) + 1;
}
