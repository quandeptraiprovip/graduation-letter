# Thiệp mời lễ tốt nghiệp (Next.js)

Trang thiệp mời tốt nghiệp chạy trên **Next.js 15** (App Router), deploy được trên **Vercel**.

## Chạy local

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

**Không cấu hình gì thêm:** dữ liệu ghi vào thư mục `data/` (CSV + PNG chữ ký).

**Muốn giống production:** copy `.env.example` → `.env.local`, điền Google Sheets + (tuỳ chọn) Blob.

## Ảnh

Đặt file vào `public/images/`, rồi gán đường dẫn trong `lib/config.ts` (ví dụ `portrait: "/images/chan-dung.jpg"`). Để trống sẽ hiện khung placeholder.

## Lưu trữ dữ liệu

| Dữ liệu | Local (mặc định) | Production (Vercel) |
|--------|------------------|---------------------|
| Lời chúc | `data/guestbook.csv` | Google Sheet tab **Guestbook** (`lat`, `lng`, `place` tuỳ chọn) |
| RSVP | `data/rsvp.csv` | Google Sheet tab **RSVP** |
| Chữ ký (tên, thời gian, link ảnh) | `data/signatures.csv` | Google Sheet tab **Signatures** |
| File PNG chữ ký | `data/signatures/*.png` | **Vercel Blob** (URL lưu trong Sheet) |

Trên Vercel, ổ đĩa serverless **chỉ đọc** (`EROFS`) — không ghi được `data/`. Không nên nhét ảnh PNG vào Google Sheet; Sheet chỉ giữ metadata và URL.

Kiểm tra sau deploy: `GET /api/health/storage` → `"ok": true`, `"persistence": "google-sheets"`, `"signatures": "vercel-blob"`.

### Google Sheets

1. Tạo một Google Spreadsheet, copy **Spreadsheet ID** từ URL (`/d/<ID>/edit`).
2. [Google Cloud Console](https://console.cloud.google.com/) → tạo project → bật **Google Sheets API**.
3. **IAM** → **Service Accounts** → tạo account → tạo key JSON.
4. Mở Sheet → **Share** → thêm email service account (dạng `...@....iam.gserviceaccount.com`) với quyền **Editor**.
5. App tự tạo các tab `Guestbook`, `RSVP`, `Signatures` và hàng tiêu đề khi ghi lần đầu.

### Biến môi trường (Vercel)

Project → **Settings** → **Environment Variables** — bật **Production** (và Preview nếu cần), rồi **Redeploy**:

| Biến | Mô tả |
|------|--------|
| `GOOGLE_SHEETS_ID` | ID spreadsheet |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Toàn bộ file JSON key (một dòng), **hoặc** |
| `GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY` | Tách từ JSON (`\n` trong key giữ nguyên hoặc dùng chuỗi thật xuống dòng) |
| `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → Blob → Create store → token Read/Write |

Ví dụ `.env.local`:

```env
GOOGLE_SHEETS_ID=1abc...
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

### GitHub (legacy, không bắt buộc)

Phiên bản cũ ghi CSV/PNG lên repo qua `GITHUB_TOKEN` + `GITHUB_REPO`. Vẫn có trong code nếu chưa chuyển Sheets, nhưng khuyến nghị dùng Sheets + Blob.

## Deploy Vercel

1. Push project lên GitHub.
2. Import repo trên [vercel.com](https://vercel.com).
3. Thêm biến Sheets + Blob, redeploy.
4. Mở `/api/health/storage`.

## Bản HTML gốc

File Design Component cũ nằm trong `legacy/`.
