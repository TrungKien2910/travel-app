import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminHash = await bcrypt.hash('admin123', 10)
  const viewerHash = await bcrypt.hash('viewer123', 10)

  await prisma.user.upsert({
    where: { email: 'admin@travel.app' },
    update: {},
    create: {
      email: 'admin@travel.app',
      password_hash: adminHash,
      name: 'Admin',
      role: 'ADMIN',
    },
  })

  await prisma.user.upsert({
    where: { email: 'minh@travel.app' },
    update: {},
    create: {
      email: 'minh@travel.app',
      password_hash: viewerHash,
      name: 'Minh',
      role: 'VIEWER',
    },
  })

  await prisma.user.upsert({
    where: { email: 'lan@travel.app' },
    update: {},
    create: {
      email: 'lan@travel.app',
      password_hash: viewerHash,
      name: 'Lan',
      role: 'VIEWER',
    },
  })

  console.log('Seeded: admin@travel.app / admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
