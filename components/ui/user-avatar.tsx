import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  )
}

interface UserAvatarProps {
  user: { name: string; avatar_url?: string | null }
  className?: string
  fallbackClassName?: string
}

/**
 * Avatar that shows the user's photo (avatar_url) when set, otherwise falls
 * back to their initials. Uses Radix AvatarImage (a plain <img>), so any image
 * URL works without next/image remote config.
 */
export function UserAvatar({
  user,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  return (
    <Avatar className={className}>
      {user.avatar_url ? (
        <AvatarImage
          src={user.avatar_url}
          alt={user.name}
          className="object-cover"
        />
      ) : null}
      <AvatarFallback
        className={cn(
          'bg-sea-soft text-xs font-semibold text-sea-deep',
          fallbackClassName
        )}
      >
        {initialsOf(user.name)}
      </AvatarFallback>
    </Avatar>
  )
}
