# Travel App — Tóm tắt dự án

**Date:** 2026-06-20

---

## Ứng dụng là gì?

Web quản lý chuyến đi nhóm nhỏ — lên lịch trình, theo dõi chi tiêu, upload ảnh/bill, feedback điểm đến.

---

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Frontend + Backend | Next.js 14 App Router |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | NextAuth.js |
| ORM | Prisma |
| Database | PostgreSQL |
| Charts | Recharts |
| Drag & Drop | dnd-kit |
| File upload | Local storage `/public/uploads/` |

---

## 3 Role người dùng

| Role | Quyền |
|---|---|
| **Admin** | Toàn quyền: tạo/sửa/xóa chuyến đi, ngày, điểm đến, chi tiêu, upload, quản lý thành viên |
| **Member** | Xem tất cả + để lại feedback tại điểm đến |
| **Guest** | Chỉ xem (cần link chia sẻ) |

---

## 7 Trang chính

| Trang | Chức năng |
|---|---|
| `/login` | Đăng nhập email/password |
| `/dashboard` | Highlight hôm nay đi đâu, countdown ngày, progress vòng tròn, chi tiêu nhóm |
| `/trips/[id]` | Timeline lịch trình theo từng ngày, chi tiêu inline, badge trạng thái |
| `/trips/[id]/destination/[id]` | 4 tab: Thông tin / Ảnh & Bill / Chi tiêu / Feedback |
| `/trips/[id]/config` | Admin: thêm/sửa/xóa ngày + điểm đến, drag & drop sắp xếp, cảnh báo trùng giờ |
| `/trips/[id]/members` | Biểu đồ chi tiêu, bảng matrix theo ngày, ai chưa feedback, export CSV |
| `/trips/[id]/summary` | Tổng kết: stats, biểu đồ ngân sách, member spend, top điểm đến, gallery ảnh |

---

## Database — 7 bảng

```
User
 └── Trip (created_by)
      ├── TripMember (trip_id, user_id)
      └── Day (trip_id)
           └── Destination (day_id)
                ├── DestinationExpense (destination_id, user_id)
                ├── DestinationMedia   (destination_id, uploaded_by)
                └── DestinationFeedback (destination_id, user_id)
```

### Enums

| Enum | Giá trị |
|---|---|
| `Role` | ADMIN, VIEWER |
| `DestStatus` | PENDING, DONE, REJECTED, REPLACED |
| `MediaType` | PHOTO, BILL |
| `FeedbackStatus` | OK, NOT_OK, MAYBE |

---

## 3 Implementation Plan

### Plan 1 — Foundation
**File:** `docs/superpowers/plans/2026-06-20-travel-app-plan-1-foundation.md`

| Task | Nội dung |
|---|---|
| Task 1 | Scaffold Next.js 14 + Tailwind + shadcn/ui |
| Task 2 | Prisma schema + PostgreSQL migration + seed users |
| Task 3 | NextAuth credentials auth + JWT session + middleware |
| Task 4 | Login page với form + error handling |
| Task 5 | Navbar responsive + authenticated layout |

---

### Plan 2 — Core Features
**File:** `docs/superpowers/plans/2026-06-20-travel-app-plan-2-core-features.md`

| Task | Nội dung |
|---|---|
| Task 1 | Trip CRUD API + trang tạo chuyến đi |
| Task 2 | Trip detail page + Day CRUD API + timeline UI |
| Task 3 | Destination CRUD API + Config page (drag & drop, conflict warning) |
| Task 4 | Expense API + Feedback API + Destination detail page (4 tabs) |
| Task 5 | File upload API (ảnh + bill) + MediaTab |

---

### Plan 3 — Advanced Pages
**File:** `docs/superpowers/plans/2026-06-20-travel-app-plan-3-advanced-pages.md`

| Task | Nội dung |
|---|---|
| Task 1 | Members page: add/remove, bar chart, expense matrix, CSV export |
| Task 2 | Summary page: best shots, stats, budget chart, top destinations, gallery |
| Task 3 | Dashboard: today banner, countdown, progress ring, member spend, today timeline |

---

## Tính năng nổi bật

- **Drag & drop** sắp xếp lại thứ tự điểm đến trong ngày
- **Split chi tiêu** — nhập 1 số tiền, chia đều cho các thành viên được chọn
- **Conflict warning** — cảnh báo vàng khi 2 điểm đến trùng giờ
- **Lịch sử thay thế** — điểm cũ giữ lại với trạng thái "replaced", có link sang điểm mới
- **Best shot** — Admin đánh dấu ảnh nổi bật, hiển thị đầu trang tổng kết
- **Export CSV** — xuất toàn bộ bảng chi tiêu ra file
- **Quick action** — cập nhật trạng thái điểm đến ngay từ dashboard

---

## UI/UX

| Element | Giá trị |
|---|---|
| Primary | `#0ea5e9` — xanh biển |
| Accent | `#f97316` — cam |
| Background | `#f0f9ff` — xanh nhạt |
| Font | Inter |
| Layout | Top navbar sticky, responsive, hamburger trên mobile |

### Badge trạng thái điểm đến

| Trạng thái | Màu |
|---|---|
| PENDING — Chưa đi | Vàng |
| DONE — Đã đi | Xanh lá |
| REJECTED — Không đi | Đỏ |
| REPLACED — Thay thế | Xám + gạch ngang |

---

## Ngoài phạm vi v1

- Map view (Google Maps / Leaflet)
- Thông báo realtime / activity log
- Share card chia sẻ mạng xã hội
- Template điểm đến hay dùng
- Copy nguyên 1 ngày sang ngày khác
- Đăng ký tài khoản công khai
- Nhiều Admin trong 1 chuyến đi
