# Dashboard đầy đủ hơn + Đổi ảnh đại diện — Design

**Date:** 2026-06-20
**App:** Hải trình (d:\travel)

## Mục tiêu

1. Cho phép mỗi người **đổi ảnh đại diện** bằng cách dán URL ảnh.
2. Làm **dashboard đầy đủ & trực quan hơn** để mọi thành viên (cả viewer) nắm
   nhanh: tiền nong, tiến độ, việc cần làm, và không khí chuyến đi.

Không làm (YAGNI): tính "ai nợ ai", upload file avatar, biểu đồ mới ở dashboard
(đã có ở trang Tổng kết).

---

## Phần A — Avatar (dán URL)

**Dữ liệu:** dùng cột `User.avatar_url` đã có sẵn trong schema. Không cần migration.

**API mới:** `PATCH /api/account/profile`
- Auth: bất kỳ user đăng nhập (sửa của chính mình).
- Body: `{ avatar_url: string | null }`.
- Validate: rỗng/null → xóa ảnh (về fallback chữ). Nếu có → phải là URL bắt đầu
  `http://` hoặc `https://`, độ dài ≤ 2048; sai → 400.
- Trả về `{ id, name, avatar_url }`.

**UI:** thêm vào trang `/account` một card "Ảnh đại diện":
- Ô nhập URL + nút "Lưu ảnh".
- Preview avatar ngay bên cạnh (đổi theo URL đang gõ).
- Nút "Xóa ảnh" để về fallback chữ viết tắt.
- Component client `components/account/avatar-form.tsx`.

**Hiển thị toàn app:** tạo helper `<UserAvatar user={{name, avatar_url}} />` bọc
`Avatar` + `AvatarImage` (src = avatar_url) + `AvatarFallback` (chữ viết tắt).
Thay các chỗ đang render avatar bằng helper này **ở những nơi đã có avatar_url**
trong dữ liệu: navbar, dashboard member-spend, trang Thành viên (grid), tab Chi
tiêu, tab Cảm nhận. Nơi nào query chưa kèm `avatar_url` thì bổ sung select.

**Lưu ý NextAuth:** session token (JWT) chứa name/email, KHÔNG có avatar_url.
Navbar lấy avatar qua `useSession` sẽ không tự cập nhật cho tới lần đăng nhập
sau. Chấp nhận: sau khi đổi avatar, navbar cập nhật ở lần refresh session/đăng
nhập lại; các trang server-component (lấy từ DB) hiện ngay. Không nhồi avatar
vào JWT để giữ token nhỏ.

`next/image` cần cho phép host ngoài. Vì URL tùy ý, dùng `<img>` thường bên
trong AvatarImage (Radix AvatarImage là `<img>`) — không qua `next/image`, nên
không cần cấu hình `remotePatterns`.

---

## Phần B — Dashboard 4 khối mới

Giữ nguyên: today-banner, vòng tiến độ + day pills, lịch hôm nay.
Thêm/nâng cấp, theo thứ tự từ trên xuống:

### B1. Hàng 4 thẻ thống kê nhanh (đặt ngay dưới banner)
4 thẻ nhỏ, mỗi thẻ 1 số lớn + nhãn:
- **Tổng chi tiêu** (đã chi cả chuyến).
- **Trung bình / người** = tổng chi ÷ số thành viên.
- **Điểm đã đi** = `x/y` (DONE / tổng).
- **Còn lại** = số ngày tới khi kết thúc, hoặc "Đang diễn ra" / "Đã xong".

Component server-friendly (nhận props, không cần client). Dùng lại style thẻ
giống trang Summary để đồng bộ.

### B2. Khối "Việc cần làm" (accent cam, nổi bật)
Tổng hợp việc còn dở của chuyến đang xem:
- **Chưa cho cảm nhận:** với mỗi thành viên, đếm số điểm `DONE` mà họ chưa
  feedback. Hiển thị "Minh: 3 điểm chưa nhận xét".
- **Điểm quá hạn chưa cập nhật:** điểm thuộc ngày hôm nay hoặc đã qua mà vẫn
  `PENDING`. Hiển thị tên + link tới điểm đó.
- Mỗi dòng có link nhảy tới đúng chỗ (trang thành viên / điểm đến).
- Nếu không có việc gì → trạng thái rỗng tích cực: "Mọi thứ đã ổn ✓".
- Chỉ tính trên các điểm không bị REPLACED.

### B3. Chi tiêu thành viên — nâng cấp khối hiện có
Giữ thanh bar tỉ lệ, thêm:
- Ảnh đại diện thật (từ Phần A) thay avatar chữ.
- Huy hiệu 🏆 cho người chi nhiều nhất.
- % của mỗi người trên tổng chi.
- Sắp xếp giảm dần theo số tiền (hiện đã sort).

### B4. "Ảnh đẹp gần nhất" (khối kỉ niệm)
- Lấy tối đa 4 ảnh `is_best_shot = true` mới nhất của chuyến.
- Dải ảnh ngang, bo góc; click mở trang điểm đến chứa ảnh.
- Nếu không có ảnh best-shot nào → **ẩn hẳn khối** (không hiện khung trống).

**Quyền xem:** tất cả khối đều chỉ-đọc, viewer xem được hết. Nút quick-action
(Đã đi/Bỏ qua) ở banner vẫn chỉ admin.

**Hiệu năng:** dashboard đã fetch `fullTrip` (members + days + destinations +
expenses + feedbacks count). Cần bổ sung vào query đó: `feedbacks { user_id }`
trên destination (để tính "chưa feedback") và `media (best_shot)` (để lấy ảnh
đẹp) và `avatar_url` cho members — tất cả trong **cùng một** round-trip, không
thêm query tuần tự mới.

---

## Files

**Tạo mới:**
- `app/api/account/profile/route.ts` — PATCH avatar_url
- `components/account/avatar-form.tsx`
- `components/ui/user-avatar.tsx` — helper Avatar + AvatarImage + fallback
- `components/dashboard/stat-cards.tsx` — B1
- `components/dashboard/pending-tasks.tsx` — B2 ("Việc cần làm")
- `components/dashboard/best-shots-strip.tsx` — B4

**Sửa:**
- `app/(app)/account/page.tsx` — thêm card avatar
- `app/(app)/dashboard/page.tsx` — fetch thêm field + render 4 khối
- `components/dashboard/member-spend-list.tsx` — avatar thật + 🏆 + %
- `components/navbar.tsx`, `components/members/member-grid.tsx`,
  `components/destinations/expense-tab.tsx`,
  `components/destinations/feedback-tab.tsx` — dùng `<UserAvatar>`

## Kiểm thử
- E2E trên Supabase: PATCH avatar (URL hợp lệ/không hợp lệ/xóa), dashboard render
  đủ 4 khối, "việc cần làm" tính đúng, viewer xem được.
- Build sạch, chụp màn hình dashboard + account.
