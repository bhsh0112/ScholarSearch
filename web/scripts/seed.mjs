import prismaPkg from "@prisma/client";
const { PrismaClient } = prismaPkg;

/**
 * V1 种子数据：
 * - 创建单用户（APP_USER_EMAIL）
 * - 创建默认 Project（APP_PROJECT_NAME）
 */
async function main() {
  const prisma = new PrismaClient();
  const email = process.env.APP_USER_EMAIL || "you@example.com";
  const projectName = process.env.APP_PROJECT_NAME || "My Research";

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  const existing = await prisma.project.findFirst({
    where: { userId: user.id, name: projectName },
  });

  if (!existing) {
    await prisma.project.create({
      data: { userId: user.id, name: projectName },
    });
  }

  await prisma.$disconnect();
  console.log(`Seeded: user=${email}, project=${projectName}`);
}

main().catch(async (e) => {
  console.error(e);
  process.exitCode = 1;
});


