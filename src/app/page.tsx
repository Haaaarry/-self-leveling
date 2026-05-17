'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { ToastContainer, toast } from '@/components/toast';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Target, Trophy, CheckCircle, SkipForward, Plus, Zap, Trash2, Sparkles, Star, Swords, Shield, Brain } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated, setUser, logout } = useAuthStore();
  const { goals, setGoals, loading: goalsLoading } = useGoalsStore();
  const { totalPoints, level, setPoints, transactions, setTransactions } = usePointsStore();
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', username: '', confirmPassword: '' });
  const [resetForm, setResetForm] = useState({ email: '', code: '', newPassword: '', confirmPassword: '' });
  const [authError, setAuthError] = useState('');
  const [resetStep, setResetStep] = useState<'email' | 'code' | 'password'>('email');
  const [resetMessage, setResetMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [goalForm, setGoalForm] = useState({ title: '', description: '', durationDays: '' });
  const [generatingGoalId, setGeneratingGoalId] = useState<string | null>(null);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  
  // AI Token 状态
  const [aiTokens, setAiTokens] = useState<{ balance: number; transactions: any[] }>({ balance: 0, transactions: [] });
  
  // 确认对话框状态
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserData();
      fetchAiTokens();
    }
  }, [isAuthenticated]);

  // 倒计时效果
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

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
        setAiTokens(prev => ({ ...prev, balance: user.aiTokens || 0 }));
      }

      if (goalsRes.ok) {
        const { goals } = await goalsRes.json();
        // 使用 Map 去重：按 id 去重，保留最新的数据
        const goalsMap = new Map();
        goals.forEach((g: typeof goals[0]) => goalsMap.set(g.id, g));
        setGoals(Array.from(goalsMap.values()));
      }

      if (pointsRes.ok) {
        const { transactions } = await pointsRes.json();
        // 使用 Map 去重并替换
        const txMap = new Map();
        transactions.forEach((t: typeof transactions[0]) => txMap.set(t.id, t));
        setTransactions(Array.from(txMap.values()).slice(0, 20));
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const fetchAiTokens = async () => {
    try {
      const res = await fetch('/api/tokens');
      if (res.ok) {
        const data = await res.json();
        setAiTokens({ balance: data.balance, transactions: data.transactions || [] });
      }
    } catch (error) {
      console.error('Failed to fetch AI tokens:', error);
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
    
    // 验证天数输入
    const days = parseInt(goalForm.durationDays);
    if (isNaN(days) || days <= 0) {
      toast.warning('请输入完成目标所需的天数（阿拉伯数字）');
      return;
    }
    
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: goalForm.title,
          description: goalForm.description,
          durationDays: days,
        }),
      });

      if (res.ok) {
        const { goal } = await res.json();
        setGoals([goal, ...goals]);
        setGoalForm({ title: '', description: '', durationDays: '' });
        toast.success(`新任务已创建！目标：${goal.title}`);
      }
    } catch (error) {
      console.error('Create goal error:', error);
      toast.error('创建目标失败，请重试');
    }
  };

  const handleGenerateTasks = async (goalId: string) => {
    setGeneratingGoalId(goalId);
    toast.info('AI正在为你规划任务，请稍候...');
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId }),
      });

      if (res.ok) {
        const { totalPoints, remainingTokens, tokensUsed } = await res.json();
        fetchUserData();
        fetchAiTokens();
        toast.achievement(`任务生成成功！共 ${totalPoints} 积分等你挑战！本次消耗 ${tokensUsed} AI额度`);
      } else if (res.status === 402) {
        const { error, remainingTokens } = await res.json();
        toast.error(`AI额度不足！剩余: ${remainingTokens}`);
      } else {
        const { error } = await res.json();
        toast.error(error || '任务生成失败');
      }
    } catch (error) {
      console.error('Generate tasks error:', error);
      toast.error('网络错误，任务生成失败');
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
        if (action === 'complete') {
          toast.success('任务完成！积分已到账！');
        } else {
          toast.info('任务已跳过');
        }
      } else {
        const { error } = await res.json();
        toast.error(error || '操作失败');
      }
    } catch (error) {
      console.error('Task action error:', error);
      toast.error('网络错误');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    logout();
  };

  const handleDeleteGoal = (goalId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: '⚠️ 确认删除',
      message: '确定要删除这个目标吗？所有关联的任务也会被删除。',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/goals/${goalId}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            setGoals(goals.filter((g) => g.id !== goalId));
            toast.success('目标已删除');
          } else {
            const { error } = await res.json();
            toast.error(error || '删除失败');
          }
        } catch (error) {
          console.error('Delete goal error:', error);
          toast.error('网络错误');
        }
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
      },
    });
  };

  const toggleMilestone = (milestoneId: string) => {
    setExpandedMilestones((prev) => {
      const next = new Set(prev);
      if (next.has(milestoneId)) {
        next.delete(milestoneId);
      } else {
        next.add(milestoneId);
      }
      return next;
    });
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
        setResetMessage('验证码已发送，请查收');
        setResendCooldown(60); // 60秒倒计时
      } else {
        setResetMessage(data.error || '发送失败');
      }
    } catch (error) {
      setResetMessage('网络错误，请重试');
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setResetMessage('');
    try {
      const res = await fetch('/api/auth/reset-password/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetForm.email }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetMessage('新的验证码已发送，请查收');
        setResendCooldown(60);
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
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] relative overflow-hidden">
        {/* 背景动画 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        {/* 游戏风格卡片 */}
        <div className="relative w-[420px]">
          {/* 标题区域 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4 shadow-lg shadow-purple-500/50">
              <Swords className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
              我独自升级
            </h1>
            <p className="text-slate-400 mt-2 text-sm tracking-wider">LEVEL UP YOUR LIFE</p>
          </div>
          
          <div className="bg-gradient-to-b from-slate-800/90 to-slate-900/90 border-2 border-cyan-500/30 rounded-2xl p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-sm">
            <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as 'login' | 'register')}>
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-700/50">
                <TabsTrigger value="login" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-cyan-500">
                  <Shield className="w-4 h-4 mr-2" />登录
                </TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-500">
                  <Star className="w-4 h-4 mr-2" />注册
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleAuth} className="space-y-4">
                  <div>
                    <Label className="text-slate-300 text-sm">邮箱</Label>
                    <Input
                      id="email"
                      type="email"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                      required
                      className="mt-1 bg-slate-700/50 border-slate-600 text-white focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm">密码</Label>
                    <Input
                      id="password"
                      type="password"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      required
                      className="mt-1 bg-slate-700/50 border-slate-600 text-white focus:border-cyan-500"
                    />
                  </div>
                  {authError && authMode === 'login' && (
                    <p className="text-red-400 text-sm bg-red-500/10 p-2 rounded">{authError}</p>
                  )}
                  <Button type="submit" className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold py-2 shadow-lg shadow-cyan-500/30">
                    <Shield className="w-4 h-4 mr-2" />进入冒险
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setAuthMode('reset')}
                      className="text-sm text-cyan-400 hover:text-cyan-300 hover:underline"
                    >
                      忘记密码？
                    </button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleAuth} className="space-y-4">
                  <div>
                    <Label className="text-slate-300 text-sm">用户名</Label>
                    <Input
                      id="username"
                      value={authForm.username}
                      onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                      required
                      className="mt-1 bg-slate-700/50 border-slate-600 text-white focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm">邮箱</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                      required
                      className="mt-1 bg-slate-700/50 border-slate-600 text-white focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm">密码</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      required
                      className="mt-1 bg-slate-700/50 border-slate-600 text-white focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm">确认密码</Label>
                    <Input
                      id="reg-confirm-password"
                      type="password"
                      value={authForm.confirmPassword}
                      onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                      required
                      className="mt-1 bg-slate-700/50 border-slate-600 text-white focus:border-purple-500"
                    />
                  </div>
                  {authError && authMode === 'register' && (
                    <p className="text-red-400 text-sm bg-red-500/10 p-2 rounded">{authError}</p>
                  )}
                  <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold py-2 shadow-lg shadow-purple-500/30">
                    <Star className="w-4 h-4 mr-2" />创建角色
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="reset">
                <div className="space-y-4">
                  {resetStep === 'email' && (
                    <form onSubmit={handleSendResetCode} className="space-y-4">
                      <div>
                        <Label className="text-slate-300 text-sm">邮箱</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          value={resetForm.email}
                          onChange={(e) => setResetForm({ ...resetForm, email: e.target.value })}
                          placeholder="输入您的注册邮箱"
                          required
                          className="mt-1 bg-slate-700/50 border-slate-600 text-white"
                        />
                      </div>
                      {resetMessage && <p className="text-cyan-400 text-sm">{resetMessage}</p>}
                      <Button type="submit" className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500">
                        发送验证码
                      </Button>
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => setAuthMode('login')}
                          className="text-sm text-cyan-400 hover:text-cyan-300 hover:underline"
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
                        <Label className="text-slate-300 text-sm">验证码</Label>
                        <Input
                          id="reset-code"
                          type="text"
                          value={resetForm.code}
                          onChange={(e) => setResetForm({ ...resetForm, code: e.target.value })}
                          placeholder="输入6位验证码"
                          maxLength={6}
                          required
                          className="mt-1 bg-slate-700/50 border-slate-600 text-white"
                        />
                      </div>
                      {resetMessage && <p className="text-cyan-400 text-sm">{resetMessage}</p>}
                      <Button type="submit" className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500">
                        验证
                      </Button>
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={handleResendCode}
                          disabled={resendCooldown > 0}
                          className={`text-sm ${resendCooldown > 0 ? 'text-slate-500' : 'text-cyan-400 hover:text-cyan-300 hover:underline'}`}
                        >
                          {resendCooldown > 0 ? `${resendCooldown}秒后可重新发送` : '重新发送验证码'}
                        </button>
                      </div>
                    </form>
                  )}
                  {resetStep === 'password' && (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <div>
                        <Label className="text-slate-300 text-sm">新密码</Label>
                        <Input
                          id="reset-new-password"
                          type="password"
                          value={resetForm.newPassword}
                          onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
                          required
                          className="mt-1 bg-slate-700/50 border-slate-600 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300 text-sm">确认新密码</Label>
                        <Input
                          id="reset-confirm-password"
                          type="password"
                          value={resetForm.confirmPassword}
                          onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                          required
                          className="mt-1 bg-slate-700/50 border-slate-600 text-white"
                        />
                      </div>
                      {resetMessage && <p className="text-cyan-400 text-sm">{resetMessage}</p>}
                      <Button type="submit" className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500">
                        重置密码
                      </Button>
                    </form>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        <ToastContainer />
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
    <div className="min-h-screen bg-[#0a0a1a] relative">
      {/* 背景效果 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-cyan-500/20 bg-[#0a0a1a]/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                我独自升级
              </h1>
              <p className="text-xs text-slate-500">LEVEL UP</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* AI Token 显示 */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 shadow-lg shadow-blue-500/30">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div className="text-right">
                <p className="text-blue-400 font-bold text-sm">{aiTokens.balance.toLocaleString()}</p>
                <p className="text-xs text-slate-400">AI额度</p>
              </div>
            </div>
            {/* 等级显示 */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-500/30">
                <span className="text-xs font-bold text-white">Lv{level}</span>
              </div>
              <div className="text-right">
                <p className="text-yellow-400 font-bold text-sm">{totalPoints}</p>
                <p className="text-xs text-slate-400">积分</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition-all hover:border-red-500/50 hover:text-red-400"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Tasks */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-cyan-500/20 rounded-2xl p-6 shadow-xl shadow-cyan-500/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">今日任务</h2>
                    <p className="text-sm text-slate-400">{todayTasks.length} 个任务待完成</p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30">
                  <span className="text-cyan-400 text-sm font-medium">今日挑战</span>
                </div>
              </div>
              
              {todayTasks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-slate-500" />
                  </div>
                  <p className="text-slate-400">暂无今日任务</p>
                  <p className="text-sm text-slate-500 mt-1">快去创建目标开始冒险吧！</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-700/50 hover:border-cyan-500/30 transition-all group"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-white group-hover:text-cyan-300 transition-colors">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-slate-400 mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1 text-yellow-400 text-sm">
                            <Star className="w-3 h-3" /> {task.points} 积分
                          </span>
                          {task.estimatedTime && (
                            <span className="text-slate-500 text-sm">⚔️ {task.estimatedTime} 分钟</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTaskAction(task.id, 'complete')}
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-medium shadow-lg shadow-green-500/30 transition-all hover:scale-105"
                        >
                          <CheckCircle className="w-4 h-4 inline mr-1" />
                          完成
                        </button>
                        <button
                          onClick={() => handleTaskAction(task.id, 'skip')}
                          className="px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-slate-400 hover:bg-slate-600/50 hover:text-slate-300 transition-all"
                        >
                          <SkipForward className="w-4 h-4 inline mr-1" />
                          跳过
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Goals List */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-purple-500/20 rounded-2xl p-6 shadow-xl shadow-purple-500/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">我的任务</h2>
                  <p className="text-sm text-slate-400">{goals.length} 个冒险任务</p>
                </div>
              </div>
              
              {/* 创建目标表单 */}
              <form onSubmit={handleCreateGoal} className="mb-6">
                <div className="flex gap-3 flex-wrap items-end">
                  <div className="flex-1 min-w-[200px]">
                    <Input
                      placeholder="输入新任务..."
                      value={goalForm.title}
                      onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                      required
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-purple-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="天数"
                      min="1"
                      value={goalForm.durationDays}
                      onChange={(e) => setGoalForm({ ...goalForm, durationDays: e.target.value })}
                      className="w-20 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    />
                    <span className="text-slate-400 text-sm">天</span>
                  </div>
                  <Input
                    placeholder="描述..."
                    value={goalForm.description}
                    onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                    className="w-40 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold shadow-lg shadow-purple-500/30 transition-all hover:scale-105"
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    创建
                  </button>
                </div>
              </form>

              {goalsLoading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 mx-auto rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                  <p className="text-slate-400 mt-4">加载中...</p>
                </div>
              ) : goals.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
                    <Target className="w-8 h-8 text-slate-500" />
                  </div>
                  <p className="text-slate-400">还没有任务</p>
                  <p className="text-sm text-slate-500 mt-1">创建一个开始你的升级之旅！</p>
                </div>
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
                        className="p-5 rounded-xl bg-slate-900/50 border border-slate-700/50 hover:border-purple-500/30 transition-all"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-white">{goal.title}</h3>
                            {goal.description && (
                              <p className="text-sm text-slate-400 mt-1">{goal.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              goal.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                              goal.status === 'PAUSED' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                              'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}>
                              {goal.status === 'ACTIVE' ? '⚔️ 进行中' :
                               goal.status === 'PAUSED' ? '⏸️ 已暂停' : '✓ 已完成'}
                            </span>
                            <button
                              onClick={() => handleDeleteGoal(goal.id)}
                              className="p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-red-400 hover:bg-red-500/20 transition-all"
                              title="删除"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {totalTasks > 0 && (
                          <div className="mb-4">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-slate-400">任务进度</span>
                              <span className="text-slate-300">{completedTasks}/{totalTasks}</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-700/50 overflow-hidden">
                              <div 
                                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {totalTasks === 0 && (
                          <button
                            onClick={() => handleGenerateTasks(goal.id)}
                            disabled={generatingGoalId === goal.id}
                            className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-purple-500/30 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {generatingGoalId === goal.id ? (
                              <>
                                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                AI规划中...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 inline mr-2" />
                                AI生成任务
                              </>
                            )}
                          </button>
                        )}

                        {/* Milestones & Tasks */}
                        {goal.milestones && goal.milestones.length > 0 && (
                          <div className="mt-4 pl-4 border-l-2 border-purple-500/30 space-y-2">
                            {goal.milestones.map((milestone) => {
                              const isExpanded = expandedMilestones.has(milestone.id);
                              const completedCount = milestone.tasks?.filter(t => t.status === 'COMPLETED').length || 0;
                              const totalCount = milestone.tasks?.length || 0;
                              
                              return (
                                <div key={milestone.id}>
                                  <button
                                    onClick={() => toggleMilestone(milestone.id)}
                                    className="flex items-center justify-between w-full text-left p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-purple-400 text-xs">{isExpanded ? '▼' : '▶'}</span>
                                      <span className="text-sm font-medium text-slate-300">
                                        {milestone.title}
                                      </span>
                                      <span className="text-xs text-slate-500">
                                        ({completedCount}/{totalCount})
                                      </span>
                                    </div>
                                  </button>
                                  {isExpanded && milestone.tasks && milestone.tasks.length > 0 && (
                                    <div className="space-y-2 ml-4 mt-2">
                                      {milestone.tasks.map((task) => (
                                        <div
                                          key={task.id}
                                          className={`text-sm p-3 rounded-lg ${
                                            task.status === 'COMPLETED' ? 'bg-green-500/10 border border-green-500/20 text-green-300' :
                                            task.status === 'SKIPPED' ? 'bg-slate-800/30 text-slate-500 line-through' :
                                            'bg-slate-800/30 text-slate-300 border border-slate-700/30'
                                          }`}
                                        >
                                          {task.status === 'COMPLETED' && <CheckCircle className="w-3 h-3 inline mr-2" />}
                                          {task.title}
                                          <span className="text-yellow-400 ml-2 text-xs">
                                            ★ {task.points}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Info */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-yellow-500/20 rounded-2xl p-6 shadow-xl shadow-yellow-500/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-white">玩家信息</h2>
              </div>
              
              <div className="text-center mb-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl font-bold text-white mb-3 shadow-lg shadow-purple-500/30 ring-4 ring-purple-500/20">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <h3 className="font-bold text-white text-lg">{user?.username}</h3>
                <p className="text-sm text-slate-400">{user?.email}</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900/50">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400" /> 等级
                  </span>
                  <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400">
                    Lv.{level}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900/50">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400" /> 积分
                  </span>
                  <span className="text-xl font-bold text-yellow-400">{totalPoints}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900/50">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Target className="w-4 h-4 text-cyan-400" /> 任务数
                  </span>
                  <span className="text-lg font-bold text-cyan-400">{goals.length}</span>
                </div>
              </div>
            </div>

            {/* Points History */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-cyan-500/20 rounded-2xl p-6 shadow-xl shadow-cyan-500/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-white">积分记录</h2>
              </div>
              
              {transactions.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">暂无记录</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {transactions.slice(0, 10).map((t) => (
                    <div
                      key={t.id}
                      className="flex justify-between items-center text-sm py-3 px-3 rounded-lg bg-slate-900/30 hover:bg-slate-900/50 transition-colors"
                    >
                      <div>
                        <p className="text-slate-300">{t.description}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(t.createdAt).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                      <span className={`font-bold ${
                        t.type === 'EARNED' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {t.type === 'EARNED' ? '+' : '-'}{t.amount}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Token 记录 */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-purple-500/20 rounded-2xl p-6 shadow-xl shadow-purple-500/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-white">AI额度</h2>
                </div>
                <span className="text-2xl font-bold text-blue-400">{aiTokens.balance.toLocaleString()}</span>
              </div>
              
              {aiTokens.transactions.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">暂无使用记录</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {aiTokens.transactions.slice(0, 5).map((t) => (
                    <div
                      key={t.id}
                      className="flex justify-between items-center text-sm py-2 px-3 rounded-lg bg-slate-900/30"
                    >
                      <div>
                        <p className="text-slate-300 text-xs">{t.description}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(t.createdAt).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                      <span className={`font-bold ${
                        t.type === 'GRANTED' ? 'text-green-400' : 'text-purple-400'
                      }`}>
                        {t.type === 'GRANTED' ? '+' : '-'}{t.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Toast & Confirm Dialog */}
      <ToastContainer />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })}
      />
    </div>
  );
}
