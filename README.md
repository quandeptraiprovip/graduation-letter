# Thiệp mời lễ tốt nghiệp (Next.js)

Trang thiệp mời tốt nghiệp chạy trên **Next.js 15** (App Router), deploy được trên **Vercel** và nối **GitHub**.

## Chạy local

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

## Ảnh

Đặt file vào `public/images/`, rồi gán đường dẫn trong `lib/config.ts` (ví dụ `portrait: "/images/chan-dung.jpg"`). Để trống sẽ hiện khung placeholder.

## Lời chúc & RSVP (CSV)

| File | Mục đích |
|------|----------|
| `data/guestbook.csv` | Sổ lưu bút |
| `data/rsvp.csv` | Xác nhận tham dự |

- **Local:** API ghi trực tiếp vào `data/*.csv`.
- **Vercel:** filesystem serverless **không ghi được** lâu dài. Khi có biến môi trường GitHub (bên dưới), mỗi lời chúc/RSVP được **append vào file CSV trên repo** qua GitHub Contents API.

### Biến môi trường trên Vercel

| Biến | Ví dụ |
|------|--------|
| `GITHUB_TOKEN` | PAT có quyền `contents: write` |
| `GITHUB_REPO` | `username/thiep-moi-tot-nghiep` |
| `GITHUB_BRANCH` | `main` (tuỳ chọn) |

Token cần quyền ghi file trong repo. Mỗi lần khách gửi, CSV trên GitHub được cập nhật (commit mới). Bạn có thể `git pull` để đồng bộ về máy.

## Deploy Vercel + GitHub

1. Push project lên GitHub.
2. Import repo trên [vercel.com](https://vercel.com).
3. Thêm biến môi trường `GITHUB_TOKEN` và `GITHUB_REPO`.
4. Deploy — framework preset: **Next.js**.

## Bản HTML gốc

File Design Component cũ nằm trong `legacy/`.
