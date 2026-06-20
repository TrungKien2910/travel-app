# Địa chỉ điểm đến + Drawer "Lịch trình ngày" — Design

**Date:** 2026-06-20
**App:** Travel (d:\travel)

## Mục tiêu

1. Mỗi điểm đến có thể lưu **địa chỉ**, hiển thị kèm nút **Chỉ đường** (mở Google Maps).
2. Ở trang chi tiết điểm đến, thêm nút mở **drawer** liệt kê nhanh các điểm đến
   **cùng ngày** để biết "tiếp theo đi đâu" mà không rời trang.

Không làm (YAGNI): nhúng bản đồ thật trong app (chỉ link ra Google Maps);
mốc-nhỏ-trong-một-điểm-đến.

---

## Phần A — Địa chỉ điểm đến

**DB:** thêm `address String?` vào model `Destination`. Migration tên
`add_destination_address`. Không phá dữ liệu cũ (nullable).

**API:** các route ghi destination nhận thêm `address`:
- `POST /api/days/[dayId]/destinations` — create
- `PUT /api/destinations/[destId]` — update (cả nhánh order-only giữ nguyên,
  không đụng address)
- `POST /api/destinations/[destId]/replace` — điểm mới nhận address nếu gửi
- Chuẩn hoá: `address?.trim() || null`.

**Form nhập:**
- Trang Cấu hình (`config/page.tsx`): thêm ô "Địa chỉ" vào form thêm/sửa điểm
  đến (`destForm.address`).
- Tab Thông tin (`info-tab.tsx`): khi sửa, thêm ô "Địa chỉ".

**Hiển thị (tab Thông tin):** nếu có address, hiện 1 dòng "Địa chỉ" + nút
**"Chỉ đường"** → mở `https://www.google.com/maps/search/?api=1&query=<encodeURIComponent(address)>`
ở tab mới (`target="_blank" rel="noopener noreferrer"`). Không có address thì
không hiện gì.

Card timeline: KHÔNG thêm địa chỉ (giữ card gọn — đã quyết).

---

## Phần B — Drawer "Lịch trình ngày"

**UI:** trang chi tiết điểm đến thêm nút **"Lịch trình ngày"** (gần header).
Bấm → `Sheet` (component có sẵn) trượt từ phải, liệt kê mọi điểm đến cùng
`day_id`, sắp theo `order_index`:
- Mỗi mục: tên + giờ (nếu có) + StatusBadge.
- Điểm đang xem: tô sáng (viền/nền sea-soft), nhãn "Đang xem".
- Các mục khác là link sang trang điểm đó; bấm → điều hướng.
- Header drawer: "Ngày {day_number} — {date}".

**Data:** trang detail đã query `dest.day` (có `trip`). Bổ sung vào query đó:
`day.destinations` (id, name, order_index, start_time, end_time, status) — cùng
một round-trip, không thêm query tuần tự. Lọc bỏ status REPLACED khỏi danh sách
(điểm đã thay không cần xem trong lịch trình ngày), nhưng vẫn cho phép điểm
đang xem hiện kể cả khi nó REPLACED.

**Component:** `components/destinations/day-schedule-drawer.tsx` (client), nhận
`destinations`, `currentDestId`, `tripId`, `dayNumber`, `dayDate`.

---

## Files

**DB:** `prisma/schema.prisma` (+ migration)

**Sửa:**
- `app/api/days/[dayId]/destinations/route.ts`
- `app/api/destinations/[destId]/route.ts`
- `app/api/destinations/[destId]/replace/route.ts`
- `app/(app)/trips/[tripId]/config/page.tsx` (ô địa chỉ + state)
- `components/destinations/info-tab.tsx` (ô địa chỉ + hiển thị + nút Chỉ đường)
- `app/(app)/trips/[tripId]/destination/[destId]/page.tsx` (query day.destinations,
  render nút mở drawer)

**Tạo mới:**
- `components/destinations/day-schedule-drawer.tsx`

## Kiểm thử
- E2E trên Supabase: tạo/sửa điểm đến có address → lưu đúng; nút Chỉ đường có
  URL Google Maps đúng (encode); drawer liệt kê đúng điểm cùng ngày, tô sáng
  điểm hiện tại; replace mang address.
- Build sạch; chụp màn hình tab Thông tin (có địa chỉ + nút) và drawer.
