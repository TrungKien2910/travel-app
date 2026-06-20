import { auth } from '@/lib/auth'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PasswordForm } from '@/components/account/password-form'

export default async function AccountPage() {
  const session = await auth()
  const user = session!.user
  const initials =
    user.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? '?'

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="font-display text-2xl font-bold text-ink">Tài khoản</h1>

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="h-14 w-14 ring-1 ring-line">
            <AvatarFallback className="bg-sea-soft text-lg font-semibold text-sea-deep">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-display text-lg font-semibold text-ink">
              {user.name}
            </p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <span className="mt-1 inline-flex rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
              {(user as any).role === 'ADMIN' ? 'Quản trị' : 'Thành viên'}
            </span>
          </div>
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
