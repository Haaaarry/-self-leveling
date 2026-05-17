'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/store/auth';
import { useGoalsStore } from '@/store/goals';
import { usePointsStore } from '@/store/points';
import { Target, Trophy, CheckCircle, SkipForward, Plus, Zap } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, setUser, logout } = useAuthStore();
  const { goals, setGoals, loading: goalsLoading } = useGoalsStore();
  const { totalPoints, level, setPoints, transactions, addTransaction } = usePointsStore();
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', username: '', confirmPassword: '' });
  const [resetForm, setResetForm] = useState({ email: '', code: '', newPassword: '', confirmPassword: '' });
  const [authError, setAuthError] = useState('');
  const [resetStep, setResetStep] = useState<'email' | 'code' | 'password'>('email');
  const [resetMessage, setResetMessage] = useState('');
  const [goalForm, setGoalForm] = useState({ title: '', description: '' });
  const [generatingGoalId, setGeneratingGoalId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserData();
    }
  }, [isAuthenticated]);

  const fetchUserData = async () => {
    try {
      const [userRes, goalsRes, pointsRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/goals'),
        fetch('/api/points/history'),
      ]);

      if (userRes.ok) {
        const { user } = await userRes.json();
        setUser(user);
        setPoints(user.totalPoints, user.level);
      }

      if (goalsRes.ok) {
        const { goals } = await goalsRes.json();
        setGoals(goals);
      }

      if (pointsRes.ok) {
        const { transactions } = await pointsRes.json();
        transactions.forEach((t: typeof transactions[0]) => addTransaction(t));
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    // 注册时验证确认密码
    if (authMode === 'register') {
      if (authForm.password !== authForm.confirmPassword) {
        setAuthError('两次输入的密码不一致');
        return;
      }
      if (authForm.password.length < 6) {
        setAuthError('密码至少需要6个字符');
        return;
      }
    }
    
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });

      if (res.ok) {
        const { user } = await res.json();
        setUser(user);
        setPoints(user.totalPoints, user.level);
        setAuthForm({ email: '', password: '', username: '', confirmPassword: '' });
      } else {
        const { error } = await res.json();
        setAuthError(error);
      }
    } catch (error) {
      console.error('Auth error:', error);
      setAuthError('网络错误，请重试');
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalForm),
      });

      if (res.ok) {
        const { goal } = await res.json();
        setGoals([goal, ...goals]);
        setGoalForm({ title: '', description: '' });
      }
    } catch (error) {
      console.error('Create goal error:', error);
    }
  };

  const handleGenerateTasks = async (goalId: string) => {
    setGeneratingGoalId(goalId);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId }),
      });

      if (res.ok) {
        fetchUserData();
      } else {
        const { error } = await res.json();
        alert(error);
      }
    } catch (error) {
      console.error('Generate tasks error:', error);
    } finally {
      setGeneratingGoalId(null);
    }
  };

  const handleTaskAction = async (taskId: string, action: 'complete' | 'skip') => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        fetchUserData();
      } else {
        const { error } = await res.json();
        alert(error);
      }
    } catch (error) {
      console.error('Task action error:', error);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    logout();
  };

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage('');
    try {
      const res = await fetch('/api/auth/reset-password/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetForm.email }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetStep('code');
        setResetMessage('验证码已发送到您的邮箱');
      } else {
        setResetMessage(data.error || '发送失败');
      }
    } catch (error) {
      setResetMessage('网络错误，请重试');
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage('');
    try {
      const res = await fetch('/api/auth/reset-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetForm.email, code: resetForm.code }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetStep('password');
        setResetMessage('验证码正确，请设置新密码');
      } else {
        setResetMessage(data.error || '验证码错误');
      }
    } catch (error) {
      setResetMessage('网络错误，请重试');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage('');
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setResetMessage('两次输入的密码不一致');
      return;
    }
    if (resetForm.newPassword.length < 6) {
      setResetMessage('密码至少需要6个字符');
      return;
    }
    try {
      const res = await fetch('/api/auth/reset-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetForm.email, code: resetForm.code, newPassword: resetForm.newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetMessage('密码重置成功！请使用新密码登录');
        setTimeout(() => {
          setAuthMode('login');
          setResetForm({ email: '', code: '', newPassword: '', confirmPassword: '' });
          setResetStep('email');
        }, 2000);
      } else {
        setResetMessage(data.error || '重置失败');
      }
    } catch (error) {
      setResetMessage('网络错误，请重试');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="text-2xl text-center">我独自升级</CardTitle>
            <CardDescription className="text-center">
              让成长变成一场冒险
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as 'login' | 'register')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">登录</TabsTrigger>
                <TabsTrigger value="register">注册</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={handleAuth} className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="email">邮箱</Label>
                    <Input
                      id="email"
                      type="email"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">密码</Label>
                    <Input
                      id="password"
                      type="password"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      required
                    />
                  </div>
                  {authError && authMode === 'login' && (
                    <p className="text-red-500 text-sm">{authError}</p>
                  )}
                  <Button type="submit" className="w-full">登录</Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setAuthMode('reset')}
                      className="text-sm text-blue-400 hover:underline"
                    >
                      忘记密码？
                    </button>
                  </div>
                </form>
              </TabsContent>
              <TabsContent value="register">
                <form onSubmit={handleAuth} className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="username">用户名</Label>
                    <Input
                      id="username"
                      value={authForm.username}
                      onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-email">邮箱</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-password">密码</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-confirm-password">确认密码</Label>
                    <Input
                      id="reg-confirm-password"
                      type="password"
                      value={authForm.confirmPassword}
                      onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  {authError && authMode === 'register' && (
                    <p className="text-red-500 text-sm">{authError}</p>
                  )}
                  <Button type="submit" className="w-full">注册</Button>
                </form>
              </TabsContent>
              <TabsContent value="reset">
                <div className="space-y-4 mt-4">
                  {resetStep === 'email' && (
                    <form onSubmit={handleSendResetCode} className="space-y-4">
                      <div>
                        <Label htmlFor="reset-email">邮箱</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          value={resetForm.email}
                          onChange={(e) => setResetForm({ ...resetForm, email: e.target.value })}
                          placeholder="输入您的注册邮箱"
                          required
                        />
                      </div>
                      {resetMessage && <p className="text-blue-500 text-sm">{resetMessage}</p>}
                      <Button type="submit" className="w-full">发送验证码</Button>
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => setAuthMode('login')}
                          className="text-sm text-blue-400 hover:underline"
                        >
                          返回登录
                        </button>
                      </div>
                    </form>
                  )}
                  {resetStep === 'code' && (
                    <form onSubmit={handleVerifyCode} className="space-y-4">
                      <p className="text-slate-400 text-sm">验证码已发送到 {resetForm.email}</p>
                      <div>
                        <Label htmlFor="reset-code">验证码</Label>
                        <Input
                          id="reset-code"
                          type="text"
                          value={resetForm.code}
                          onChange={(e) => setResetForm({ ...resetForm, code: e.target.value })}
                          placeholder="输入6位验证码"
                          maxLength={6}
                          required
                        />
                      </div>
                      {resetMessage && <p className="text-blue-500 text-sm">{resetMessage}</p>}
                      <Button type="submit" className="w-full">验证</Button>
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => setResetStep('email')}
                          className="text-sm text-blue-400 hover:underline"
                        >
                          重新发送验证码
                        </button>
                      </div>
                    </form>
                  )}
                  {resetStep === 'password' && (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <div>
                        <Label htmlFor="reset-new-password">新密码</Label>
                        <Input
                          id="reset-new-password"
                          type="password"
                          value={resetForm.newPassword}
                          onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="reset-confirm-password">确认新密码</Label>
                        <Input
                          id="reset-confirm-password"
                          type="password"
                          value={resetForm.confirmPassword}
                          onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                          required
                        />
                      </div>
                      {resetMessage && <p className="text-blue-500 text-sm">{resetMessage}</p>}
                      <Button type="submit" className="w-full">重置密码</Button>
                    </form>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  const todayTasks = goals
    .flatMap((g) => g.milestones?.flatMap((m) => m.tasks || []) || [])
    .filter((t) => {
      const today = new Date().toDateString();
      return t.plannedDate && new Date(t.plannedDate).toDateString() === today && t.status === 'PENDING';
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-400" />
            <h1 className="text-xl font-bold text-white">我独自升级</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-yellow-400">
              <Trophy className="h-5 w-5" />
              <span className="font-semibold">{totalPoints} 积分</span>
              <span className="text-slate-400">Lv.{level}</span>
            </div>
            <Button variant="ghost" onClick={handleLogout} className="text-slate-300">
              退出
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  今日任务
                </CardTitle>
                <CardDescription>
                  {todayTasks.length} 个任务待完成
                </CardDescription>
              </CardHeader>
              <CardContent>
                {todayTasks.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">
                    暂无今日任务，快去创建目标吧！
                  </p>
                ) : (
                  <div className="space-y-3">
                    {todayTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{task.title}</h4>
                          {task.description && (
                            <p className="text-sm text-slate-400 mt-1">{task.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-sm">
                            <span className="text-yellow-400">{task.points} 积分</span>
                            {task.estimatedTime && (
                              <span className="text-slate-500">约 {task.estimatedTime} 分钟</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleTaskAction(task.id, 'complete')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            完成
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTaskAction(task.id, 'skip')}
                            className="border-slate-600"
                          >
                            <SkipForward className="h-4 w-4 mr-1" />
                            跳过
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Goals List */}
            <Card>
              <CardHeader>
                <CardTitle>我的目标</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateGoal} className="mb-6">
                  <div className="flex gap-2">
                    <Input
                      placeholder="输入你的目标..."
                      value={goalForm.title}
                      onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                      required
                    />
                    <Button type="submit">
                      <Plus className="h-4 w-4 mr-2" />
                      创建
                    </Button>
                  </div>
                </form>

                {goalsLoading ? (
                  <p className="text-slate-400 text-center py-8">加载中...</p>
                ) : goals.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">
                    还没有目标，立即创建一个开始你的升级之旅！
                  </p>
                ) : (
                  <div className="space-y-4">
                    {goals.map((goal) => {
                      const completedTasks = goal.milestones?.flatMap((m) => m.tasks || [])
                        .filter((t) => t.status === 'COMPLETED').length || 0;
                      const totalTasks = goal.milestones?.flatMap((m) => m.tasks || []).length || 0;
                      const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

                      return (
                        <div
                          key={goal.id}
                          className="p-4 rounded-lg bg-slate-800/50 border border-slate-700"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-white">{goal.title}</h3>
                              {goal.description && (
                                <p className="text-sm text-slate-400 mt-1">{goal.description}</p>
                              )}
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${
                              goal.status === 'ACTIVE' ? 'bg-green-600/20 text-green-400' :
                              goal.status === 'PAUSED' ? 'bg-yellow-600/20 text-yellow-400' :
                              'bg-blue-600/20 text-blue-400'
                            }`}>
                              {goal.status === 'ACTIVE' ? '进行中' :
                               goal.status === 'PAUSED' ? '已暂停' : '已完成'}
                            </span>
                          </div>

                          <div className="mb-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-400">进度</span>
                              <span className="text-slate-300">{completedTasks}/{totalTasks} 任务</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>

                          {totalTasks === 0 && (
                            <Button
                              size="sm"
                              onClick={() => handleGenerateTasks(goal.id)}
                              disabled={generatingGoalId === goal.id}
                              className="w-full"
                            >
                              {generatingGoalId === goal.id ? 'AI规划中...' : 'AI生成任务'}
                            </Button>
                          )}

                          {/* Milestones & Tasks */}
                          {goal.milestones && goal.milestones.length > 0 && (
                            <div className="mt-4 pl-4 border-l-2 border-slate-700 space-y-3">
                              {goal.milestones.map((milestone) => (
                                <div key={milestone.id}>
                                  <h4 className="text-sm font-medium text-slate-300 mb-2">
                                    📍 {milestone.title}
                                  </h4>
                                  {milestone.tasks && milestone.tasks.length > 0 && (
                                    <div className="space-y-2 ml-4">
                                      {milestone.tasks.map((task) => (
                                        <div
                                          key={task.id}
                                          className={`text-sm p-2 rounded ${
                                            task.status === 'COMPLETED' ? 'bg-green-900/30 text-green-300' :
                                            task.status === 'SKIPPED' ? 'bg-slate-700/50 text-slate-500 line-through' :
                                            'bg-slate-700/50 text-slate-300'
                                          }`}
                                        >
                                          {task.title}
                                          <span className="text-yellow-400 ml-2">
                                            {task.points}积分
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">玩家信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl font-bold text-white mb-3">
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="font-semibold text-white">{user?.username}</h3>
                  <p className="text-sm text-slate-400">{user?.email}</p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">等级</span>
                    <span className="text-yellow-400 font-semibold">Lv.{level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">积分</span>
                    <span className="text-yellow-400 font-semibold">{totalPoints}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">目标数</span>
                    <span className="text-white">{goals.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Points History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">积分记录</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center">暂无记录</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {transactions.slice(0, 10).map((t) => (
                      <div
                        key={t.id}
                        className="flex justify-between items-center text-sm py-2 border-b border-slate-700 last:border-0"
                      >
                        <div>
                          <p className="text-slate-300">{t.description}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(t.createdAt).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                        <span className={`font-semibold ${
                          t.type === 'EARNED' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {t.type === 'EARNED' ? '+' : '-'}{t.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
