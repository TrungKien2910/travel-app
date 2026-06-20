# Chuyển upload ảnh/bill sang Supabase Storage — Design

**Date:** 2026-06-20
**App:** Travel (d:\travel)

## Lý do

App hiện ghi file upload vào `public/uploads/` trên đĩa local. Vercel chạy
serverless không có ổ đĩa lâu dài → file sẽ mất sau mỗi deploy/lần chạy. Chuyển
sang **Supabase Storage** (đã có Supabase) để chạy đúng trên Vercel.

## Kiến trúc

- Helper `lib/storage.ts` dùng `@supabase/supabase-js` với **service-role key**
  (chỉ server). Hàm `uploadMedia(path, file)` → trả public URL; `deleteMedia(path)`.
- Bucket **public** tên `media`. Path lưu: `[tripId]/[destId]/[filename]`.
- DB không đổi: `DestinationMedia.file_path` lưu **public URL Supabase** thay vì
  `/uploads/...`. Vì các trang chỉ render `file_path`, không cần sửa hiển thị.

## Env

Thêm (đã có giá trị từ trước):
- `SUPABASE_URL=https://ebdaysfygmurmnaceydj.supabase.co`
- `SUPABASE_SERVICE_KEY=<service/secret key>`

Vào `.env` và `.env.local` (gitignored). Trên Vercel nhập cùng các biến.

## Thay đổi

1. Cài `@supabase/supabase-js`.
2. `lib/storage.ts`:
   - Tạo client 1 lần (singleton) với service key, `auth.persistSession=false`.
   - `uploadMedia(objectPath, buffer, contentType)`: `storage.from('media')
     .upload(objectPath, buffer, { contentType, upsert: false })`, rồi
     `getPublicUrl` → trả `{ url, path }`.
   - `deleteMedia(objectPath)`: `storage.from('media').remove([objectPath])`.
   - `pathFromUrl(url)`: tách object path từ public URL (để xóa). Lưu `file_path`
     = public URL; khi xóa, suy ra object path từ URL.
3. API upload (`app/api/destinations/[destId]/media/route.ts`): thay
   `mkdir/writeFile` bằng `uploadMedia`. Giữ nguyên validate size/type. `file_path`
   = public URL trả về.
4. API xóa (`app/api/media/[mediaId]/route.ts`): thay `unlink` bằng
   `deleteMedia(pathFromUrl(media.file_path))`; bỏ qua lỗi nếu object đã mất.
5. `next.config.mjs`: thêm `images.remotePatterns` cho host
   `ebdaysfygmurmnaceydj.supabase.co` path `/storage/v1/object/public/**`.
6. Tạo bucket `media` (public) — script 1 lần qua service key.

## Không đổi / YAGNI

- Avatar (đã là URL dán tay) — không liên quan.
- DB schema, các trang hiển thị ảnh.
- KHÔNG di chuyển ảnh cũ trong `public/uploads` (ảnh test local). `public/uploads`
  vẫn gitignored.

## Kiểm thử

- Tạo bucket thành công (public).
- Upload 1 ảnh qua API → 201, `file_path` là public URL Supabase, mở URL ra ảnh.
- Xóa qua API → object biến mất khỏi Storage, DB xóa.
- `next.config` cho phép render ảnh từ host Supabase (build không cảnh báo image).
- Build sạch.
