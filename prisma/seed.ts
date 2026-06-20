import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const users: { email: string; name: string; role: Role; password: string }[] = [
  { email: 'admin@travel.app', name: 'Admin', role: 'ADMIN', password: 'admin123' },
  { email: 'minh@travel.app', name: 'Minh', role: 'VIEWER', password: 'viewer123' },
  { email: 'lan@travel.app', name: 'Lan', role: 'VIEWER', password: 'viewer123' },
  { email: 'an@travel.app', name: 'An', role: 'VIEWER', password: 'viewer123' },
  { email: 'binh@travel.app', name: 'Bình', role: 'VIEWER', password: 'viewer123' },
  { email: 'cuong@travel.app', name: 'Cường', role: 'VIEWER', password: 'viewer123' },
  { email: 'dung@travel.app', name: 'Dung', role: 'VIEWER', password: 'viewer123' },
  { email: 'ha@travel.app', name: 'Hà', role: 'VIEWER', password: 'viewer123' },
]

async function main() {
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        password_hash: await bcrypt.hash(u.password, 10),
      },
    })
  }
  console.log(`Seeded ${users.length} users (admin@travel.app / admin123)`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
