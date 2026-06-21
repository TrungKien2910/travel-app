export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + 'đ'
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(date))
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(date))
}

// Vietnam time zone — times are always shown in Vietnam local time, regardless
// of where the server/browser runs.
const VN_TZ = 'Asia/Ho_Chi_Minh'

export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: VN_TZ,
  }).format(new Date(date))
}

/** "HH:mm" of a stored DateTime in Vietnam time — for prefilling time inputs. */
export function timeInputValue(date: string | Date | null | undefined): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: VN_TZ,
  }).format(new Date(date))
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`
  return String(Math.round(value))
}
