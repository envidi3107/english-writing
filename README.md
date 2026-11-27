# VietWrite: luyện viết tiếng Anh có AI chấm bài

Web luyện viết tiếng Anh cho người mới bắt đầu (A1–A2). Lộ trình 5 cấp độ, 15 chủ đề, 45 bài. Có 3 dạng bài: viết đoạn văn, dịch Việt → Anh, dịch Anh → Việt. Gemini chấm điểm, sửa lỗi ngay trong bài và giải thích bằng tiếng Việt như một giáo viên.

- **Frontend:** React + TypeScript (Vite, Tailwind CSS v4, TanStack Query, React Router), đọc ghi thẳng Supabase Postgres, được bảo vệ bằng Row Level Security.
- **Chấm bài:** một Supabase Edge Function duy nhất (`grade-submission`) gọi Gemini và ghi điểm, XP, chuỗi ngày học, tiến độ và mức dùng AI. API key Gemini chỉ nằm trong secret của function.
- Thiết kế: [docs/superpowers/specs](docs/superpowers/specs/2026-11-27-english-writing-design.md). Kế hoạch: [docs/superpowers/plans](docs/superpowers/plans/2026-11-27-english-writing.md).

## Chạy trên máy (local)

Cần Node 20+ và Docker Desktop đang chạy.

```bash
npm install
npx supabase start          # lần đầu tải image Docker, mất vài phút
npx supabase db reset       # tạo bảng + nạp 45 bài học (seed.sql)
```

`supabase start` in ra `API_URL` và `ANON_KEY`. Tạo file `.env.local` ở thư mục gốc:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<ANON_KEY>
```

Tạo `supabase/functions/.env` từ [supabase/functions/.env.example](supabase/functions/.env.example):

```bash
GEMINI_API_KEY=<key từ https://aistudio.google.com/apikey>
GEMINI_MODEL=gemini-2.5-flash
FAKE_AI=false     # true = trả kết quả mẫu, không gọi Gemini (để thử giao diện)
```

Chạy Edge Function và web (hai terminal):

```bash
npx supabase functions serve grade-submission --env-file supabase/functions/.env
npm run dev                 # http://localhost:5173
```

### Gán quyền quản trị

Đăng ký tài khoản trên web, sau đó chạy SQL (Supabase Studio → SQL Editor, local là http://127.0.0.1:54323):

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'email-cua-ban@example.com');
```

Tải lại trang, menu **Quản trị** sẽ xuất hiện.

## Kiểm thử

```bash
npm test                    # Vitest: logic sao/XP/streak/mở khóa, parse kết quả AI, Edge Function, giao diện
npm run typecheck
npx supabase test db        # pgTAP: kiểm tra RLS (cần supabase start)
```

## Triển khai lên Supabase cloud

1. Tạo project trên https://supabase.com, rồi liên kết và đẩy schema cùng bài học:

   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push --include-seed
   ```

2. Đặt secret và deploy function:

   ```bash
   npx supabase secrets set GEMINI_API_KEY=<key> GEMINI_MODEL=gemini-2.5-flash
   npx supabase functions deploy grade-submission
   ```

   Nên kiểm tra tên model Gemini "flash" mới nhất tại https://ai.google.dev/gemini-api/docs/models và cập nhật `GEMINI_MODEL`.

3. **Authentication → Sign In / Providers → Email:** tắt *Confirm email* (web dùng cá nhân). Sau khi tạo xong tài khoản của bạn, tắt *Allow new users to sign up* để người lạ không đăng ký được.
4. **Authentication → URL Configuration:** đặt *Site URL* là domain của web và thêm `https://<domain>/reset-password` vào *Redirect URLs* (cho chức năng quên mật khẩu).
5. Deploy frontend tĩnh (Vercel, Netlify, Cloudflare Pages…):
   - Build command `npm run build`, thư mục xuất bản `dist`.
   - Biến môi trường `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` (lấy ở Project Settings → API; dùng anon/publishable key, **không** dùng service role/secret key).
   - Cấu hình rewrite mọi đường dẫn về `/index.html` (SPA). Netlify: tạo `public/_redirects` chứa `/* /index.html 200`. Vercel: thêm `vercel.json` với `{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}`.

## Mức dùng AI

Thanh "AI hôm nay" trên đầu trang và trang **Hồ sơ → Mức dùng AI** đọc từ bảng `ai_usage_log`, gồm mọi lần gọi Gemini, kể cả khi lỗi và khi admin thử chấm. Ngân sách (lượt/ngày, token/tháng) chỉnh trong **Quản trị → Cài đặt**. Thanh có màu xanh khi dùng dưới 70%, vàng từ 70–90%, đỏ khi trên 90%. Thanh chỉ để cảnh báo, không chặn việc chấm bài.

## Nếu sau này mở cho nhiều người

- Cấu hình SMTP riêng (Authentication → Emails → SMTP). Máy chủ gửi email có sẵn của Supabase bị giới hạn số lượng, chỉ hợp để thử nghiệm.
- Bật lại xác nhận email, và cân nhắc thêm giới hạn số lượt chấm mỗi người trong `supabase/functions/grade-submission/handler.ts`.

## Cấu trúc

```text
supabase/
  migrations/              bảng, trigger, RLS
  seed.sql                 45 bài học soạn sẵn
  tests/database/          pgTAP
  functions/_shared/       logic dùng chung (sao, XP, streak, mở khóa, prompt, parse kết quả AI, usage)
  functions/grade-submission/  Edge Function (handler.ts thuần + index.ts Deno)
src/
  components/              UI kit + layout
  features/                auth, curriculum, practice, results, history, profile, admin, landing
```
