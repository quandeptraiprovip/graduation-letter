# Thiệp mời lễ tốt nghiệp (Next.js)

Trang thiệp mời tốt nghiệp chạy trên **Next.js 15** (App Router), deploy được trên **Vercel** và nối **GitHub**.

## Chạy local

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

Ghi local: lưu thẳng vào thư mục `data/` (không cần token).

## Ảnh

Đặt file vào `public/images/`, rồi gán đường dẫn trong `lib/config.ts` (ví dụ `portrait: "/images/chan-dung.jpg"`). Để trống sẽ hiện khung placeholder.

## Lời chúc, RSVP & chữ ký

| File | Mục đích |
|------|----------|
| `data/guestbook.csv` | Sổ lưu bút |
| `data/rsvp.csv` | Xác nhận tham dự |
| `data/signatures.csv` + `data/signatures/*.png` | Chữ ký (`/chu-ky`) |

### Vercel (bắt buộc cấu hình GitHub)

Trên Vercel, ổ đĩa serverless **chỉ đọc** (`EROFS`). App **không thể** ghi `data/guestbook.csv` trực tiếp.

Khi đã set `GITHUB_TOKEN` + `GITHUB_REPO`:

- Mỗi lời chúc / RSVP / chữ ký được **commit lên GitHub** (CSV + PNG).
- Trang web **đọc dữ liệu mới từ GitHub** ngay — không cần redeploy sau mỗi lượt gửi.
- Máy bạn: `git pull` để tải CSV/ảnh về.

Kiểm tra sau deploy: `GET /api/health/storage` → `{ "ok": true, "persistence": "github" }`.

### Tạo GitHub token

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens**.
2. **Fine-grained token** (khuyên dùng):
   - Repository: repo của bạn (vd. `graduation-letter`)
   - Permissions: **Contents** → **Read and write**
3. Hoặc **Classic token** với scope `repo`.

### Biến môi trường trên Vercel

Project → **Settings** → **Environment Variables** — bật cho **Production** (và Preview nếu cần):

| Biến | Giá trị |
|------|---------|
| `GITHUB_TOKEN` | PAT vừa tạo |
| `GITHUB_REPO` | `quandeptraiprovip/graduation-letter` |
| `GITHUB_BRANCH` | `main` (tuỳ chọn) |

**Redeploy** sau khi thêm biến (Deployments → ⋯ → Redeploy).

### (Tuỳ chọn) Test GitHub trên máy

Trong `.env.local`:

```env
GITHUB_TOKEN=ghp_...
GITHUB_REPO=quandeptraiprovip/graduation-letter
GITHUB_BRANCH=main
```

Khi có hai biến trên, `npm run dev` cũng ghi/đọc qua GitHub thay vì file local.

## Deploy Vercel + GitHub

1. Push project lên GitHub.
2. Import repo trên [vercel.com](https://vercel.com).
3. Thêm `GITHUB_TOKEN` và `GITHUB_REPO`, redeploy.
4. Mở `/api/health/storage` — phải `"ok": true`.

## Bản HTML gốc

File Design Component cũ nằm trong `legacy/`.
