// 邮件发送辅助函数
// 在开发环境中，验证码会打印到控制台
// 生产环境可以接入 SendGrid、Resend 等邮件服务

export async function sendResetEmail(email: string, code: string): Promise<void> {
  console.log('========== 密码重置验证码 ==========');
  console.log(`发送至: ${email}`);
  console.log(`验证码: ${code}`);
  console.log('===================================');
  
  // 如果配置了 SENDGRID_API_KEY，可以使用 SendGrid 发送
  // if (process.env.SENDGRID_API_KEY) {
  //   await sendViaSendGrid(email, code);
  // }
}
