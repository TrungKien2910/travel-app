# Hải trình — Quản lý chuyến đi nhóm

Web app lên lịch trình, chia chi tiêu, lưu ảnh/bill và ghi cảm nhận cho những
chuyến đi nhóm nhỏ. Xây trên **Next.js 14 (App Router)**, **Prisma + PostgreSQL
(Supabase)**, **NextAuth**, **Tailwind + shadcn/ui** và **Recharts**.

## Tính năng

- **3 vai trò**: Admin (toàn quyền), Viewer (xem + cảm nhận), khách qua link.
- **Lịch trình** theo từng ngày với timeline "day-rail", kéo–thả sắp xếp điểm
  đến, cảnh báo trùng giờ, và luồng "thay thế" điểm đến.
- **Chi tiêu**: ghi theo từng người, chia đều nhóm, so ngân sách dự tính vs thực tế.
- **Ảnh & Bill**: upload (≤10MB), đánh dấu "ảnh đẹp", xóa kèm file trên đĩa.
- **Cảm nhận**: mỗi thành viên 1 đánh giá / điểm đến (👍 / 👎 / 🤔).
- **Trang thành viên**: biểu đồ chi tiêu, bảng ma trận theo ngày, xuất CSV (UTF-8).
- **Tổng kết**: ảnh nổi bật, thống kê, biểu đồ ngân sách, gallery ảnh có lightbox.
- **Tổng quan**: tự chọn chuyến đang/sắp/đã đi, banner "hôm nay", vòng tiến độ.

## Yêu cầu

- Node.js ≥ 18 (đã thử trên Node 22)
- Một database PostgreSQL (dự án này dùng Supabase)

## Cài đặt

```bash
npm install
```

Tạo file `.env` (cho Prisma CLI) và `.env.local` (cho Next.js) với cùng giá trị:

```env
# Pooled connection (chạy app) — port 6543
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true"
# Direct connection (migrate) — port 5432
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"

NEXTAUTH_SECRET="đặt-một-chuỗi-bí-mật"
NEXTAUTH_URL="http://localhost:3000"
AUTH_SECRET="đặt-một-chuỗi-bí-mật"
AUTH_TRUST_HOST="true"
```

> Với Supabase, connection string lấy tại **Project Settings → Database →
> Connection string** (chọn cả "Transaction" port 6543 và "Session" port 5432).

## Khởi tạo database

```bash
npx prisma migrate deploy   # áp dụng migration
npx prisma db seed          # tạo 3 user mẫu
```

Tài khoản mẫu sau khi seed:

| Email             | Mật khẩu    | Vai trò |
| ----------------- | ----------- | ------- |
| admin@travel.app  | `admin123`  | ADMIN   |
| minh@travel.app   | `viewer123` | VIEWER  |
| lan@travel.app    | `viewer123` | VIEWER  |

## Chạy

```bash
npm run dev      # http://localhost:3000
npm run build    # build production
npm start        # chạy bản build
```

## Cấu trúc

- `app/(auth)/` — trang đăng nhập
- `app/(app)/` — khu vực đã đăng nhập (dashboard, trips, members, summary…)
- `app/api/` — route handlers (đều kiểm tra auth + vai trò server-side)
- `components/` — UI (shadcn primitives trong `components/ui/`)
- `lib/` — `auth.ts`, `prisma.ts`, `format.ts`, `utils.ts`
- `prisma/` — `schema.prisma`, migration, seed

Ảnh upload lưu tại `public/uploads/[tripId]/[destId]/` (đã gitignore).

## Thiết kế

Bảng màu "golden-hour coastal": biển teal `#0E7C9D`, nắng cam `#F2994A`, nền cát
`#FBF7F0`; chữ hiển thị **Sora**, nội dung **Inter**.
