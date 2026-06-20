import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { UserAvatar } from '@/components/ui/user-avatar'
import { AvatarForm } from '@/components/account/avatar-form'
import { PasswordForm } from '@/components/account/password-form'

export default async function AccountPage() {
  const session = await auth()
  const dbUser = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { name: true, email: true, role: true, avatar_url: true },
  })
  const user = dbUser ?? {
    name: session!.user.name ?? '',
    email: session!.user.email ?? '',
    role: (session!.user as any).role,
    avatar_url: null,
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="font-display text-2xl font-bold text-ink">Tài khoản</h1>

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <UserAvatar
            user={user}
            className="h-14 w-14 ring-1 ring-line"
            fallbackClassName="text-lg"
          />
          <div>
            <p className="font-display text-lg font-semibold text-ink">
              {user.name}
            </p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <span className="mt-1 inline-flex rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
              {user.role === 'ADMIN' ? 'Quản trị' : 'Thành viên'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ảnh đại diện</CardTitle>
          <CardDescription>
            Dùng đường dẫn ảnh có sẵn (vd từ Facebook, Google Photos…).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarForm name={user.name} initialUrl={user.avatar_url} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Đổi mật khẩu</CardTitle>
          <CardDescription>
            Nhập mật khẩu hiện tại để xác nhận, sau đó đặt mật khẩu mới.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
