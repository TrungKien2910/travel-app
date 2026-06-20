# Travel App — Design Spec
**Date:** 2026-06-20  
**Status:** Approved

---

## 1. Tổng quan

Ứng dụng web quản lý chuyến đi cho nhóm nhỏ. Người dùng có thể lên lịch trình chi tiết theo ngày và điểm đến, theo dõi chi tiêu thực tế so với dự tính của từng thành viên, upload ảnh và bill tại từng địa điểm, để lại feedback sau khi ghé thăm, và xem tổng kết toàn bộ chuyến đi.

**Mục tiêu cốt lõi:**
- Trả lời được câu hỏi: "Hôm nay nhóm mình đi đâu, mấy giờ, và tiêu hết bao nhiêu tiền?"
- Ai tiêu gì ở đâu đều rõ ràng, minh bạch trong nhóm
- Lưu lại ký ức chuyến đi qua ảnh, bill, và feedback

---

## 2. Tech Stack

| Layer | Công nghệ | Lý do chọn |
|---|---|---|
| Frontend + Backend | Next.js 14 App Router | Full-stack trong 1 repo, API routes tích hợp sẵn, deploy dễ |
| Styling | Tailwind CSS + shadcn/ui | Component đẹp có sẵn, customize dễ, không phải viết CSS từ đầu |
| Auth | NextAuth.js | Tích hợp sẵn với Next.js, hỗ trợ credentials (email/password) |
| ORM | Prisma | Type-safe, migration dễ, schema rõ ràng |
| Database | PostgreSQL | Quan hệ phức tạp (trip→day→destination→expense), cần joins |
| File upload | Local storage `/public/uploads/` | Đơn giản, không phụ thuộc dịch vụ ngoài |
| Charts | Recharts | Library biểu đồ phổ biến, tích hợp tốt với React |
| Drag & drop | dnd-kit | Nhẹ, hỗ trợ tốt cho danh sách có thể sắp xếp lại |

---

## 3. Phân quyền

### 3 loại người dùng

**Admin**
- Tạo tài khoản và đăng nhập vào hệ thống
- Tạo chuyến đi mới, chỉnh sửa thông tin chuyến, xóa chuyến
- Thêm/xóa ngày, thêm/sửa/xóa điểm đến trong từng ngày
- Thêm thành viên vào chuyến (chỉ user đã có tài khoản)
- Nhập/sửa/xóa chi tiêu của bất kỳ thành viên nào
- Upload/xóa ảnh và bill
- Cập nhật trạng thái điểm đến (pending → done / rejected / replaced)
- Thay thế điểm đến bằng điểm mới
- Chọn ảnh nổi bật (best shots) cho trang tổng kết

**Member (Viewer)**
- Có tài khoản trên hệ thống, được Admin thêm vào chuyến
- Xem toàn bộ lịch trình, chi tiêu, ảnh, bill
- Để lại feedback tại các điểm đến mình tham gia (ok / not_ok / maybe + ghi chú)
- Cập nhật feedback của chính mình bất kỳ lúc nào
- Không thể sửa lịch trình, chi tiêu, hay trạng thái điểm đến

**Guest (Khách)**
- Không có tài khoản hoặc chưa đăng nhập
- Chỉ xem được nếu có link chia sẻ trực tiếp đến chuyến đi
- Không thấy form sửa, nút thêm, hay thông tin nhạy cảm

---

## 4. Data Model

### User
```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  password_hash String
  name          String
  avatar_url    String?
  role          Role     @default(VIEWER)
  created_at    DateTime @default(now())

  trips_created  Trip[]
  trip_memberships TripMember[]
  expenses       DestinationExpense[]
  media_uploads  DestinationMedia[]
  feedbacks      DestinationFeedback[]
}

enum Role {
  ADMIN
  VIEWER
}
```

### Trip (Chuyến đi)
```prisma
model Trip {
  id          String   @id @default(cuid())
  title       String                        // VD: "Đà Nẵng - Hội An 4 ngày"
  description String?
  cover_image String?                       // ảnh bìa chuyến đi
  start_date  DateTime
  end_date    DateTime
  created_by  String
  created_at  DateTime @default(now())

  creator  User         @relation(fields: [created_by], references: [id])
  members  TripMember[]
  days     Day[]
}
```

### TripMember
```prisma
model TripMember {
  trip_id    String
  user_id    String
  joined_at  DateTime @default(now())

  trip  Trip @relation(fields: [trip_id], references: [id], onDelete: Cascade)
  user  User @relation(fields: [user_id], references: [id])

  @@id([trip_id, user_id])
}
```

### Day (Ngày trong chuyến)
```prisma
model Day {
  id          String   @id @default(cuid())
  trip_id     String
  date        DateTime
  day_number  Int                           // 1, 2, 3... tự động tính từ start_date
  label       String?                       // VD: "Ngày 1 - Đà Nẵng" — Admin tự đặt

  trip         Trip          @relation(fields: [trip_id], references: [id], onDelete: Cascade)
  destinations Destination[]

  @@unique([trip_id, day_number])
}
```

### Destination (Điểm đến)
```prisma
model Destination {
  id              String      @id @default(cuid())
  day_id          String
  name            String                    // VD: "Bà Nà Hills"
  description     String?                   // ghi chú, lưu ý khi đến
  order_index     Int                       // thứ tự trong ngày, dùng cho drag & drop
  start_time      DateTime?                 // giờ dự kiến bắt đầu
  end_time        DateTime?                 // giờ dự kiến kết thúc
  status          DestStatus  @default(PENDING)
  replaced_by_id  String?                   // nếu bị thay thế, trỏ sang destination mới
  budget_estimate Float?                    // ngân sách dự tính (VND)
  created_at      DateTime    @default(now())

  day          Day                  @relation(fields: [day_id], references: [id], onDelete: Cascade)
  replaced_by  Destination?         @relation("ReplacedBy", fields: [replaced_by_id], references: [id])
  replaces     Destination[]        @relation("ReplacedBy")
  expenses     DestinationExpense[]
  media        DestinationMedia[]
  feedbacks    DestinationFeedback[]
}

enum DestStatus {
  PENDING    // chưa đi — màu vàng
  DONE       // đã đi — màu xanh lá
  REJECTED   // không đi — màu đỏ
  REPLACED   // bị thay thế bởi điểm khác — màu xám
}
```

### DestinationExpense (Chi tiêu tại điểm đến)
```prisma
model DestinationExpense {
  id             String   @id @default(cuid())
  destination_id String
  user_id        String
  amount         Float                     // số tiền (VND)
  note           String?                   // VD: "vé tham quan", "ăn trưa"
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  destination Destination @relation(fields: [destination_id], references: [id], onDelete: Cascade)
  user        User        @relation(fields: [user_id], references: [id])
}
```

### DestinationMedia (Ảnh và Bill)
```prisma
model DestinationMedia {
  id             String    @id @default(cuid())
  destination_id String
  file_path      String                    // đường dẫn file lưu trên server
  file_name      String                    // tên file gốc
  file_size      Int                       // bytes
  type           MediaType                 // PHOTO | BILL
  is_best_shot   Boolean   @default(false) // Admin đánh dấu ảnh nổi bật cho summary
  uploaded_by    String
  created_at     DateTime  @default(now())

  destination Destination @relation(fields: [destination_id], references: [id], onDelete: Cascade)
  uploader    User        @relation(fields: [uploaded_by], references: [id])
}

enum MediaType {
  PHOTO
  BILL
}
```

### DestinationFeedback
```prisma
model DestinationFeedback {
  id             String         @id @default(cuid())
  destination_id String
  user_id        String
  status         FeedbackStatus
  note           String?                   // ghi chú tự do
  created_at     DateTime       @default(now())
  updated_at     DateTime       @updatedAt

  destination Destination @relation(fields: [destination_id], references: [id], onDelete: Cascade)
  user        User        @relation(fields: [user_id], references: [id])

  @@unique([destination_id, user_id])      // mỗi thành viên chỉ 1 feedback/điểm
}

enum FeedbackStatus {
  OK       // thích, ổn — icon 👍 xanh
  NOT_OK   // không ổn — icon 👎 đỏ
  MAYBE    // bình thường — icon 🤔 vàng
}
```

---

## 5. Cấu trúc trang (Pages)

---

### `/login` — Đăng nhập

**Mục đích:** Xác thực người dùng trước khi vào app.

**Nội dung trang:**
- Logo + tên app
- Form: Email, Password, nút "Đăng nhập"
- Thông báo lỗi rõ ràng nếu sai thông tin (không nói rõ sai email hay sai password vì lý do bảo mật)
- Sau đăng nhập thành công: redirect về `/dashboard`
- Nếu đã đăng nhập: tự redirect về `/dashboard`, không cho vào lại `/login`

**Không có tính năng đăng ký công khai** — tài khoản do Admin tạo thủ công (hoặc seed).

---

### `/dashboard` — Tổng quan chuyến đi

**Mục đích:** Cái nhìn nhanh nhất về chuyến đi đang diễn ra — hôm nay đi đâu, tiêu bao nhiêu, lịch trình ra sao.

**Logic chọn chuyến đi hiển thị:**
- Ưu tiên 1: chuyến đang diễn ra (start_date ≤ hôm nay ≤ end_date)
- Ưu tiên 2: chuyến sắp tới gần nhất (start_date > hôm nay)
- Nếu có nhiều chuyến: dropdown ở góc trên để switch

**Các block trên dashboard:**

**Block 1 — Banner "Hôm nay đi đâu"**
- Hiển thị điểm đến tiếp theo trong ngày dựa trên `start_time` so với giờ hiện tại
- Nếu đang trong khung giờ của 1 điểm: hiển thị điểm đó với trạng thái "Đang ở đây"
- Nếu chưa bắt đầu ngày: hiển thị điểm đầu tiên của ngày hôm nay
- Nếu chuyến chưa bắt đầu: hiển thị countdown "Còn X ngày đến chuyến đi"
- Nút quick action: **"Đánh dấu đã đi"** / **"Bỏ qua"** — cập nhật status ngay không cần vào trang chi tiết

**Block 2 — Progress lịch trình**
- Vòng tròn progress: `số điểm DONE / tổng số điểm` (%)
- Dưới vòng tròn: "X / Y điểm đã hoàn thành"
- Mini timeline ngang: các ngày trong chuyến, highlight ngày hiện tại

**Block 3 — Chi tiêu thành viên**
- Danh sách thành viên với avatar, tên, tổng tiền đã tiêu
- Progress bar ngang: phần trăm chi tiêu so với người tiêu nhiều nhất trong nhóm
- Click vào thành viên → mở trang `/trips/[id]/members`

**Block 4 — Lịch trình hôm nay**
- Timeline dọc các điểm đến trong ngày hiện tại theo thứ tự giờ
- Mỗi item: giờ bắt đầu, tên điểm, badge trạng thái, chi tiêu dự tính
- Nút xem thêm → `/trips/[id]`

---

### `/trips/[id]` — Chi tiết chuyến đi

**Mục đích:** Xem toàn bộ lịch trình của chuyến đi theo từng ngày, với chi tiêu tổng quan.

**Header chuyến đi:**
- Ảnh bìa (cover_image) nếu có, fallback màu gradient
- Tên chuyến đi, mô tả
- Thông tin tóm tắt: "X ngày · Y thành viên · Z điểm đến"
- Tổng chi tiêu: dự tính vs thực tế, hiển thị % đã dùng
- Nút "Cấu hình lịch trình" (Admin only) → `/trips/[id]/config`
- Nút "Thành viên" → `/trips/[id]/members`
- Nút "Tổng kết" → `/trips/[id]/summary`

**Danh sách ngày — Timeline dọc:**
- Mỗi ngày là 1 block riêng, sắp xếp theo thứ tự
- Header ngày: "Ngày X — DD/MM/YYYY" + label tùy chỉnh (nếu có)
- Tóm tắt ngày: số điểm đến, tổng chi tiêu dự tính vs thực tế
- Trong mỗi ngày: danh sách điểm đến theo thứ tự `order_index`

**Mỗi card điểm đến hiển thị:**
- Giờ bắt đầu → giờ kết thúc (hoặc "Chưa set giờ")
- Tên điểm đến
- Badge trạng thái với màu sắc:
  - 🟡 `PENDING` — chưa đi
  - 🟢 `DONE` — đã đi
  - 🔴 `REJECTED` — không đi
  - ⚫ `REPLACED` — đã thay thế (mờ đi, hiển thị tên điểm thay thế bên cạnh)
- Chi tiêu inline: "X,000đ / Y,000đ dự tính" — màu đỏ nếu vượt ngân sách
- Số feedback: icon + "3 ok · 1 not_ok"
- Click vào card → `/trips/[id]/destination/[destId]`

---

### `/trips/[id]/destination/[destId]` — Chi tiết điểm đến

**Mục đích:** Xem và quản lý toàn bộ thông tin của 1 điểm đến cụ thể.

**Header:**
- Tên điểm đến, badge trạng thái (Admin có thể click để đổi trạng thái ngay tại đây)
- Giờ bắt đầu → kết thúc
- Breadcrumb: Tên chuyến → Ngày X → Tên điểm

**4 Tab bên trong:**

**Tab 1 — Thông tin**
- Tên điểm đến (Admin: có thể sửa inline)
- Mô tả / ghi chú (Admin: textarea sửa inline)
- Giờ bắt đầu, giờ kết thúc
- Ngân sách dự tính
- Trạng thái với dropdown chọn (Admin only): PENDING / DONE / REJECTED / REPLACED
  - Nếu chọn REPLACED: modal yêu cầu nhập/chọn điểm thay thế
- Nếu bị thay thế: hiển thị "Đã thay thế bởi: [tên điểm mới]" có link sang điểm mới

**Tab 2 — Ảnh & Bill**

*Phần Ảnh:*
- Grid 3 cột (desktop) / 2 cột (mobile) hiển thị tất cả ảnh
- Hover/click ảnh → lightbox xem full
- Nút upload ảnh mới (Admin): chọn nhiều file cùng lúc, preview trước khi confirm
- Admin có thể xóa từng ảnh, đánh dấu "Best Shot" (dùng cho trang summary)
- Hiển thị: ai upload, lúc mấy giờ

*Phần Bill:*
- Section riêng bên dưới, tiêu đề "Hóa đơn / Bill"
- Hiển thị dạng danh sách có thumbnail rõ ràng (không grid như ảnh)
- Click → xem full bill để kiểm tra
- Hiển thị: tên file, ai upload, ngày giờ upload
- Nút upload bill (Admin): chấp nhận ảnh và PDF

**Tab 3 — Chi tiêu**

*Tổng quan:*
- Dòng đầu: "Thực tế: X,000đ / Dự tính: Y,000đ" — thanh progress, đỏ nếu vượt

*Danh sách chi tiêu từng thành viên:*
- Avatar + tên thành viên
- Các khoản tiêu của người đó tại điểm này: note + số tiền
- Tổng tiêu của người đó tại điểm này
- Admin: nút thêm/sửa/xóa khoản tiêu cho từng người

*Tính năng Split chi tiêu (Admin only):*
- Nút "Chia tiền nhóm"
- Nhập: tổng số tiền + ghi chú (VD: "Vé tham quan Bà Nà")
- Chọn thành viên sẽ chia (checkbox, mặc định tick hết)
- Hệ thống tự chia đều và tạo `DestinationExpense` cho từng người được chọn
- Hiển thị preview "Mỗi người: X,000đ" trước khi confirm

**Tab 4 — Feedback**

*Tổng hợp đầu trang:*
- 3 số lớn: `👍 X ok` · `👎 Y not_ok` · `🤔 Z maybe`
- Thanh tỉ lệ màu sắc trực quan

*Danh sách feedback từng thành viên:*
- Avatar + tên + icon trạng thái (ok/not_ok/maybe)
- Ghi chú (nếu có)
- Thời gian feedback
- Thành viên chưa feedback: hiển thị mờ với text "Chưa feedback"

*Form feedback (với thành viên đang đăng nhập):*
- 3 nút chọn: 👍 Ổn / 👎 Không ổn / 🤔 Bình thường
- Ô ghi chú tùy chọn
- Nút Lưu / Cập nhật (nếu đã feedback rồi)

---

### `/trips/[id]/config` — Cấu hình lịch trình *(Admin only)*

**Mục đích:** Xây dựng và chỉnh sửa toàn bộ cấu trúc lịch trình — ngày và điểm đến.

**Layout 2 cột (desktop):**
- Cột trái: danh sách ngày (accordion mở rộng)
- Cột phải: form thêm/sửa điểm đến đang được chọn

**Quản lý Ngày:**
- Nút "+ Thêm ngày" — tự điền ngày tiếp theo sau ngày cuối
- Mỗi ngày có: ngày tháng, label tùy chỉnh, nút xóa ngày (có confirm)
- Xóa ngày sẽ xóa toàn bộ điểm đến trong ngày đó (cảnh báo trước)

**Quản lý Điểm đến trong ngày:**
- Danh sách điểm đến có **drag & drop** để sắp xếp lại thứ tự
- Kéo thả cập nhật `order_index` realtime
- Nút "+ Thêm điểm đến" — mở form bên phải (hoặc modal trên mobile)
- Mỗi item: tên, giờ, badge trạng thái, nút sửa, nút xóa

**Form thêm/sửa điểm đến:**
- Tên điểm đến (bắt buộc)
- Mô tả / ghi chú
- Giờ bắt đầu, Giờ kết thúc (time picker)
- Ngân sách dự tính (number input, đơn vị VND)
- Nút Lưu / Hủy

**Conflict warning:**
- Khi set giờ, hệ thống kiểm tra tự động: nếu giờ của điểm đang sửa overlap với điểm khác trong cùng ngày → hiển thị cảnh báo vàng "Trùng giờ với [Tên điểm]" ngay dưới time picker
- Không block lưu, chỉ cảnh báo (vì đôi khi cố tình overlap là hợp lý)

**Tính năng Thay thế điểm đến:**
- Nút "Thay thế" trên mỗi điểm đến (trạng thái PENDING)
- Modal: form tạo điểm mới (tên, giờ, ngân sách)
- Sau confirm: điểm cũ → status `REPLACED` + `replaced_by_id` = id điểm mới, điểm mới được thêm vào ngày với `order_index` kế tiếp

---

### `/trips/[id]/members` — Thành viên & Chi tiêu *(Admin only)*

**Mục đích:** Quản lý danh sách thành viên và xem toàn bộ bức tranh chi tiêu của chuyến đi.

**Section 1 — Danh sách thành viên:**
- Grid avatar + tên + email
- Nút "Thêm thành viên": search user theo email, preview tên trước khi thêm
- Nút xóa thành viên (có confirm, cảnh báo nếu người đó đã có chi tiêu trong chuyến)

**Section 2 — Biểu đồ chi tiêu:**
- **Biểu đồ cột đứng (bar chart):** trục X là tên thành viên, trục Y là tổng tiền
- So sánh trực quan ai tiêu nhiều nhất / ít nhất
- Tooltip khi hover: hiển thị số tiền chính xác

**Section 3 — Bảng chi tiêu chi tiết:**
- Hàng: từng thành viên
- Cột: từng ngày trong chuyến + cột Tổng
- Ô giao nhau: tổng tiền thành viên đó tiêu trong ngày đó
- Hàng cuối: tổng theo ngày
- Cột cuối: tổng theo thành viên
- Highlight ô tiêu nhiều nhất trong mỗi ngày

**Section 4 — Ai chưa feedback:**
- Danh sách thành viên còn thiếu feedback ở điểm nào
- VD: "Minh chưa feedback: Bà Nà Hills, Hội An phố cổ"
- Click → đi thẳng đến tab Feedback của điểm đó

**Nút Export CSV:**
- Xuất bảng chi tiêu ra file CSV
- Format: mỗi hàng là 1 khoản tiêu (thành viên, điểm đến, ngày, số tiền, ghi chú)

---

### `/trips/[id]/summary` — Tổng kết chuyến đi

**Mục đích:** Nhìn lại toàn bộ chuyến đi sau khi kết thúc — con số, ảnh, và cảm nhận.

**Section 1 — Hero / Best Shots:**
- 1-3 ảnh Admin đánh dấu "best shot" hiển thị nổi bật đầu trang
- Overlay: tên chuyến đi, ngày đi, số thành viên

**Section 2 — Thống kê tổng quan:**
- Số điểm đã đi (DONE) / tổng điểm
- Tổng tiền thực tế vs tổng dự tính — badge xanh nếu trong ngân sách, đỏ nếu vượt
- Số ngày đi
- Tổng số ảnh đã chụp

**Section 3 — Biểu đồ ngân sách theo ngày:**
- Biểu đồ cột nhóm (grouped bar chart): mỗi ngày có 2 cột — dự tính (xám) vs thực tế (xanh/đỏ)
- Nhìn thấy ngay ngày nào vượt ngân sách

**Section 4 — Chi tiêu từng thành viên:**
- Bảng: avatar + tên + tổng tiêu + % so với tổng chuyến
- Highlight "Người tiêu nhiều nhất 🏆"

**Section 5 — Điểm đến yêu thích:**
- Top 3 điểm được feedback `OK` nhiều nhất
- Hiển thị: ảnh đại diện, tên điểm, số lượt ok/not_ok/maybe

**Section 6 — Gallery ảnh toàn chuyến:**
- Masonry grid tất cả ảnh từ tất cả điểm đến
- Filter theo ngày
- Click → lightbox xem full

---

## 6. UI/UX

### Design System

| Element | Giá trị |
|---|---|
| Component library | shadcn/ui |
| Primary color | `#0ea5e9` (sky-500) — xanh biển |
| Accent color | `#f97316` (orange-500) — cam |
| Success | `#22c55e` (green-500) |
| Danger | `#ef4444` (red-500) |
| Warning | `#eab308` (yellow-500) |
| Neutral | `#6b7280` (gray-500) |
| Background | `#f0f9ff` (sky-50) — xanh nhạt |
| Font | Inter (Google Fonts) |
| Icons | Lucide React |
| Charts | Recharts |

### Layout tổng thể
- **Top Navbar** cố định (sticky): logo trái, menu giữa (Dashboard / Chuyến đi), avatar + tên user phải
- **Mobile:** navbar collapse thành hamburger → slide-out menu từ bên trái
- **Desktop:** sidebar ẩn, navbar đủ không gian
- Max content width: `1200px`, căn giữa

### UX Patterns nhất quán

**Badge trạng thái điểm đến:**
- `PENDING`: viền vàng, chữ vàng, background vàng nhạt
- `DONE`: viền xanh, chữ xanh, background xanh nhạt
- `REJECTED`: viền đỏ, chữ đỏ, background đỏ nhạt
- `REPLACED`: viền xám, chữ xám, background xám nhạt, text gạch ngang

**Progress bar chi tiêu:**
- < 80% ngân sách: màu xanh
- 80–100%: màu vàng (cảnh báo)
- > 100%: màu đỏ (vượt ngân sách)

**Empty states:**
- Mỗi section trống có hình minh họa nhỏ + text hướng dẫn hành động tiếp theo
- VD: "Chưa có điểm đến nào. Nhấn + để thêm điểm đến đầu tiên."

**Loading states:**
- Skeleton loading cho cards và danh sách
- Spinner cho actions (submit form, upload file)

**Confirmation dialogs:**
- Dùng cho: xóa ngày, xóa điểm đến, xóa thành viên, thay thế điểm đến
- Text xác nhận rõ hành động và hậu quả

---

## 7. Business Rules

1. **Feedback:** Chỉ thành viên trong `TripMember` của chuyến đó mới feedback được. Mỗi người 1 feedback / điểm đến, có thể cập nhật bất kỳ lúc nào.

2. **Thay thế điểm đến:** Điểm cũ chuyển sang `status = REPLACED` và `replaced_by_id` trỏ sang điểm mới. Điểm cũ vẫn hiển thị trong lịch trình nhưng mờ đi, có link sang điểm thay thế.

3. **Tính tổng chi tiêu thành viên:**
   - Tổng của 1 người trong 1 chuyến = `SUM(DestinationExpense.amount WHERE user_id = X AND destination.day.trip_id = trip_id)`
   - Tổng chi tiêu thực tế của 1 ngày = `SUM(DestinationExpense.amount WHERE destination.day_id = day_id)`
   - Tổng chi tiêu thực tế của 1 điểm đến = `SUM(DestinationExpense.amount WHERE destination_id = dest_id)`

4. **Conflict warning:** Hai điểm bị overlap giờ khi `A.start_time < B.end_time AND A.end_time > B.start_time`. Chỉ cảnh báo, không block.

5. **Xóa ngày:** Cascade xóa toàn bộ điểm đến, chi tiêu, ảnh/bill, feedback thuộc ngày đó.

6. **Xóa thành viên:** Không xóa dữ liệu chi tiêu và feedback của người đó (giữ lại để không làm lệch số liệu). Chỉ xóa record trong `TripMember`.

7. **File upload:** Lưu theo đường dẫn `/public/uploads/[trip_id]/[destination_id]/[filename]`. Max file size: 10MB/file. Chấp nhận: jpg, png, webp (ảnh), jpg, png, pdf (bill).

8. **Admin check:** Kiểm tra `user.role === 'ADMIN'` ở cả API route (server-side) và UI (ẩn nút). Không chỉ dựa vào UI để bảo vệ.

---

## 8. API Routes (Next.js Route Handlers)

```
POST   /api/auth/[...nextauth]     — NextAuth handler

GET    /api/trips                  — danh sách chuyến đi của user
POST   /api/trips                  — tạo chuyến đi mới
GET    /api/trips/[id]             — chi tiết 1 chuyến
PUT    /api/trips/[id]             — sửa thông tin chuyến
DELETE /api/trips/[id]             — xóa chuyến

GET    /api/trips/[id]/days        — danh sách ngày
POST   /api/trips/[id]/days        — thêm ngày
PUT    /api/trips/[id]/days/[dayId]    — sửa ngày
DELETE /api/trips/[id]/days/[dayId]   — xóa ngày (cascade)

GET    /api/days/[dayId]/destinations         — danh sách điểm đến trong ngày
POST   /api/days/[dayId]/destinations         — thêm điểm đến
PUT    /api/destinations/[destId]             — sửa điểm đến
DELETE /api/destinations/[destId]             — xóa điểm đến
PATCH  /api/destinations/[destId]/status      — cập nhật trạng thái
PATCH  /api/destinations/[destId]/reorder     — cập nhật order_index sau drag & drop
POST   /api/destinations/[destId]/replace     — thay thế điểm đến

GET    /api/destinations/[destId]/expenses    — danh sách chi tiêu
POST   /api/destinations/[destId]/expenses    — thêm chi tiêu
POST   /api/destinations/[destId]/expenses/split — split chi tiêu cho nhóm
PUT    /api/expenses/[expId]                  — sửa chi tiêu
DELETE /api/expenses/[expId]                  — xóa chi tiêu

POST   /api/destinations/[destId]/media       — upload ảnh/bill
DELETE /api/media/[mediaId]                   — xóa file
PATCH  /api/media/[mediaId]/best-shot         — toggle best shot

GET    /api/destinations/[destId]/feedbacks   — danh sách feedback
POST   /api/destinations/[destId]/feedbacks   — thêm/cập nhật feedback

GET    /api/trips/[id]/members                — danh sách thành viên
POST   /api/trips/[id]/members                — thêm thành viên
DELETE /api/trips/[id]/members/[userId]       — xóa thành viên

GET    /api/trips/[id]/summary                — dữ liệu tổng kết
GET    /api/trips/[id]/export/csv             — xuất CSV chi tiêu

GET    /api/users/search?email=               — tìm user để thêm vào chuyến
```

---

## 9. Ngoài phạm vi v1

- Map view (hiển thị điểm đến trên bản đồ Google Maps / Leaflet)
- Thông báo realtime / activity log (ai vừa cập nhật gì)
- Share card (ảnh recap chia sẻ lên mạng xã hội)
- Template điểm đến hay dùng (lưu lại để thêm nhanh lần sau)
- Copy ngày (clone nguyên 1 ngày sang ngày khác)
- Đăng ký tài khoản công khai
- Nhiều Admin trong 1 chuyến đi
