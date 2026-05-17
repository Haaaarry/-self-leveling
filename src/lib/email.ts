import nodemailer from 'nodemailer';

export async function sendEmail(to: string, subject: string, html: string) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.qq.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

export function createResetEmailTemplate(code: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">密码重置验证码</h2>
      <p style="color: #666; font-size: 16px;">您好，</p>
      <p style="color: #666; font-size: 16px;">您请求重置密码，您的验证码是：</p>
      <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
        <span style="font-size: 32px; font-weight: bold; color: #333; letter-spacing: 8px;">${code}</span>
      </div>
      <p style="color: #999; font-size: 14px;">验证码有效期为10分钟，请尽快完成验证。</p>
      <p style="color: #999; font-size: 14px;">如果您没有请求重置密码，请忽略此邮件。</p>
    </div>
  `;
}
