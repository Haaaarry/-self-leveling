import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

config({ path: '.env.local' });

const prisma = new PrismaClient();

async function main() {
  const email = 'ljz_zjut@163.com';
  const newPassword = 'password123';
  
  const passwordHash = await bcrypt.hash(newPassword, 12);
  
  const user = await prisma.user.update({
    where: { email },
    data: { passwordHash },
    select: { id: true, email: true, username: true },
  });
  
  console.log('密码已重置!');
  console.log(`邮箱: ${user.email}`);
  console.log(`用户名: ${user.username}`);
  console.log(`新密码: ${newPassword}`);
}

main()
  .catch((e) => {
    console.error('错误:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
