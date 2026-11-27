# Thiết kế: Web luyện viết tiếng Anh có AI chấm bài

Ngày: 2026-11-27 · Thư mục dự án: `english-writing/`

## 1. Mục đích

Một web giúp người học tiếng Anh **trình độ cơ bản (A1–A2)** luyện viết theo lộ trình chủ đề từ dễ đến khó. Học viên viết, AI (Gemini) chấm điểm và sửa lỗi **như một giáo viên**: chỉ ra từng lỗi, sửa lại, giải thích ngắn bằng tiếng Việt, kèm nhận xét chung và bài mẫu. Mục tiêu là tạo cảm giác "có người chấm bài cho mình" và động lực luyện đều đặn mỗi ngày.

Người dùng mục tiêu *(giả định của người thiết kế)*: người Việt, nên toàn bộ giao diện và lời giải thích bằng tiếng Việt, câu sửa và bài mẫu bằng tiếng Anh.

## 2. Mục tiêu / Không làm / Thất bại nếu

**Mục tiêu**
- Lộ trình bài học có cấp độ, chủ đề, bài tập, mở khóa dần.
- 3 dạng bài: **viết đoạn văn theo đề**, **dịch Việt → Anh**, **dịch Anh → Việt**.
- AI chấm điểm theo tiêu chí, sửa lỗi inline, thẻ giải thích từng lỗi, nhận xét chung, bài mẫu.
- Đăng nhập; lưu tiến độ, XP, chuỗi ngày học (streak), lịch sử bài nộp xem lại được.
- Trang quản trị để thêm/sửa/ẩn bài học.
- Bộ bài học soạn sẵn đi kèm.
- Giao diện đẹp, rõ ràng, dùng tốt trên điện thoại.

**Không làm (bản đầu)**
- Đăng nhập Google/Facebook (chỉ email + mật khẩu; Google để sau vì cần tạo OAuth client).
- Luyện nói, nghe, đọc; bảng xếp hạng; thanh toán; app mobile native.
- Đa ngôn ngữ giao diện (chỉ tiếng Việt).
- Giới hạn lượt chấm, captcha, chống lạm dụng (bản đầu chỉ chủ dự án dùng).

**Thất bại nếu (dù chạy được)**
- Lời sửa lỗi khó hiểu với người mới (thuật ngữ nặng, giải thích bằng tiếng Anh).
- AI sửa "quá tay": viết lại cả bài thay vì sửa đúng lỗi, khiến học viên không nhận ra mình sai chỗ nào.
- Lộ API key Gemini ra trình duyệt.
- Học viên tự sửa được điểm/XP của mình hoặc đọc được bài của người khác.

## 3. Ràng buộc (đã chốt với chủ dự án)

- **React + TypeScript.**
- **Dữ liệu đọc ghi thẳng Supabase Postgres từ frontend**, không có server backend riêng. Bảo mật bằng Row Level Security (RLS).
- **AI: Gemini**, gọi qua **một Supabase Edge Function** để giấu API key.
- **Phong cách giao diện: bản B "Tươi vui & có thưởng"**: màu sáng, bo tròn, sao + XP, lỗi gạch đỏ / sửa tô xanh inline, mỗi lỗi là một thẻ riêng có nhãn loại lỗi. (Mockup tham khảo: [`docs/superpowers/mockups/visual-style.html`](../mockups/visual-style.html), bản B.)
- Có đăng nhập. Có trang quản trị. Người thiết kế soạn sẵn bộ bài học.

## 4. Lựa chọn của người thiết kế (chưa được chủ dự án duyệt riêng, sửa được)

### 4.1 Công nghệ
- Vite + React 18 + TypeScript, React Router, TanStack Query, `@supabase/supabase-js`.
- Tailwind CSS. Font **Be Vietnam Pro** (hiển thị dấu tiếng Việt đẹp). Icon `lucide-react`.
- Edge Function viết bằng Deno/TypeScript, gọi Gemini REST API với **structured output (JSON schema)**. Tên model để trong biến môi trường `GEMINI_MODEL` (mặc định một model "flash" hiện hành, builder kiểm tra tên mới nhất), key trong secret `GEMINI_API_KEY`.

### 4.2 Ai được ghi gì (quan trọng cho chống gian lận)
- **Edge Function `grade-submission`** nhận `{exercise_id, answer}` cùng JWT của người dùng, rồi:
  1. Xác thực người dùng, đọc đề bài từ DB.
  2. Kiểm tra độ dài bài (tối đa ~1500 ký tự). **Không giới hạn số lần chấm** (xem 4.7).
  3. Gọi Gemini, kiểm tra JSON trả về đúng schema.
  4. Dùng service role ghi `submissions` (bài làm + kết quả chấm), cập nhật `user_progress`, XP, streak, và ghi một dòng `ai_usage_log` với số token lấy từ `usageMetadata` của Gemini (ghi cả lần gọi lỗi hoặc bị từ chối).
  5. Trả kết quả cho client.
- Như vậy điểm, XP và tiến độ **chỉ do Edge Function ghi**, client không sửa được.
- Mọi thứ khác (đọc bài học, đọc lịch sử của mình, sửa hồ sơ, quản trị nội dung) client làm thẳng với Supabase, được bảo vệ bằng RLS.

### 4.3 Mô hình dữ liệu (phác thảo)
- `profiles` (id = auth.users.id, display_name, role `'learner' | 'admin'`, xp, streak_count, last_active_date, created_at)
- `levels` (id, order, title, description, is_published)
- `topics` (id, level_id, order, title, description, icon/emoji, is_published)
- `exercises` (id, topic_id, order, type `'paragraph' | 'translate_vi_en' | 'translate_en_vi'`, title, prompt, source_text (cho bài dịch), hints (jsonb: từ vựng gợi ý, câu mẫu mở đầu), min_words, max_words, reference_answer (tùy chọn, giúp AI chấm bài dịch), is_published)
- `submissions` (id, user_id, exercise_id, answer, result jsonb, overall_score, stars, created_at)
- `user_progress` (user_id, exercise_id, best_score, best_stars, attempts, completed_at), khóa chính (user_id, exercise_id)
- `ai_usage_log` (id, user_id, kind `'grade' | 'admin_test'`, model, input_tokens, output_tokens, success, created_at). Chỉ Edge Function ghi, chủ sở hữu và admin đọc được.
- `app_settings` (một dòng: `daily_request_budget`, `monthly_token_budget`). Admin sửa được. Hai con số này chỉ dùng để vẽ thanh tiến trình, không chặn gì.

**RLS:**
- Bài học: ai đã đăng nhập đều đọc được bài `is_published`. Admin đọc/ghi tất cả.
- `submissions` và `user_progress`: chỉ chủ sở hữu được đọc, client không được ghi.
- `profiles`: chủ sở hữu đọc và chỉ sửa được `display_name`. Cột `role`, `xp`, `streak` không được tự sửa (dùng trigger hoặc tách quyền theo cột).
- Admin đầu tiên được gán bằng câu SQL thủ công (ghi trong README).

### 4.4 Chấm bài: kết quả AI trả về
```
{
  overall_score: 0–10,
  criteria: [{ key, label_vi, score: 0–10 }],   // paragraph: đúng đề, ngữ pháp, từ vựng, mạch lạc
                                                 // dịch: đúng nghĩa, ngữ pháp, tự nhiên
  corrected_text: string,       // bài của học viên, chỉ sửa lỗi, giữ nguyên ý và cách diễn đạt
  errors: [{ original, correction, type: 'grammar'|'vocabulary'|'spelling'|'punctuation'|'word_order'|'meaning',
             explanation_vi, }],
  general_feedback_vi: string,  // 2–4 câu, giọng cô giáo khích lệ: khen điểm tốt trước, rồi nêu 1–2 điểm cần cải thiện
  model_answer: string          // một bài mẫu ở đúng trình độ A1–A2
}
```
- Prompt yêu cầu rõ: trình độ A1–A2, **sửa tối thiểu**, giải thích tiếng Việt đơn giản, không dùng thuật ngữ nặng, giọng khích lệ. Bài lạc đề hoặc quá ngắn: điểm thấp và nhắc nhẹ nhàng. Nội dung vô nghĩa hoặc không phải bài làm: trả lời từ chối thân thiện.
- Bài **Anh → Việt**: học viên viết tiếng Việt, AI chấm độ đúng nghĩa và sự tự nhiên; `corrected_text` là bản dịch tiếng Việt đã sửa.
- **Hiển thị inline**: client so sánh từng từ giữa `answer` và `corrected_text` (thư viện diff), từ bị bỏ thì gạch đỏ, từ thêm vào thì tô xanh. Danh sách thẻ lỗi lấy từ `errors`.
- **Sao**: overall ≥ 5 được 1★, ≥ 6.5 được 2★, ≥ 8.5 được 3★. **Qua bài khi ≥ 2★.**
- **XP**: lần đầu đạt mức sao nào thì được thưởng mức đó (1★ = 10, 2★ = 20, 3★ = 30, chỉ cộng phần chênh so với lần tốt nhất trước đó), nên làm lại không "cày" được XP.
- **Streak**: có ít nhất 1 bài nộp trong ngày (theo giờ Việt Nam, UTC+7) thì chuỗi +1, bỏ một ngày thì về 1.

### 4.5 Mở khóa
- Trong một chủ đề, bài tiếp theo mở khi bài trước đạt ≥ 2★.
- Chủ đề tiếp theo mở khi xong chủ đề trước. Cấp độ tiếp theo mở khi xong mọi chủ đề của cấp độ trước.
- Kiểm tra ở cả client (để hiển thị khóa) lẫn Edge Function (từ chối chấm bài chưa mở).
- **Không bao giờ khóa lại** những gì học viên đã mở. Khi admin thêm, ẩn hoặc sắp xếp lại bài, phần học viên đã tới vẫn mở. Cách làm: một mục được tính là mở nếu mục trước nó đạt ≥ 2★, **hoặc** học viên đã có tiến độ ở chính mục đó hay ở bất kỳ mục nào phía sau. Bài admin mới thêm vào một chủ đề đã xong thì hiện ra để làm thêm, nhưng không chặn các chủ đề phía sau.

### 4.6 Màn hình
1. **Trang giới thiệu** (chưa đăng nhập): giới thiệu ngắn, minh họa màn chấm bài, nút Đăng ký/Đăng nhập.
2. **Đăng ký / Đăng nhập / Quên mật khẩu.**
3. **Lộ trình (trang chủ sau đăng nhập):** thanh trên cùng hiện XP, streak 🔥, tên. Các cấp độ xếp dọc, trong mỗi cấp là các thẻ chủ đề kèm tiến độ (x/3 bài, sao). Mục khóa hiện mờ có ổ khóa. Có nút "Tiếp tục bài đang học".
4. **Chủ đề:** danh sách bài tập với nhãn loại (Viết đoạn / Dịch V→A / Dịch A→V), sao đạt được, trạng thái khóa.
5. **Làm bài:** đề bài, gợi ý từ vựng (chip bấm để chèn), khung viết có đếm từ và gợi ý độ dài, nút "Nộp bài". Với bài dịch thì có thêm khối văn bản nguồn. Nháp được lưu tạm trong localStorage.
6. **Đang chấm:** trạng thái chờ vui vẻ (vài giây), có xử lý lỗi và nút thử lại.
7. **Kết quả (theo mockup B):** dải màu đầu trang có sao + XP nhận được. Bài đã sửa hiển thị inline. Điểm theo từng tiêu chí. Thẻ lỗi kèm nhãn loại. Nhận xét của cô giáo. Bài mẫu (thu gọn được). Hai nút "Làm lại" / "Bài tiếp theo". Có hiệu ứng ăn mừng nhỏ khi đạt 3★ hoặc mở khóa bài mới.
8. **Lịch sử:** danh sách bài đã nộp (lọc theo chủ đề), bấm vào thì xem lại màn kết quả.
9. **Hồ sơ:** tên hiển thị, thống kê (tổng XP, streak, số bài, lỗi hay gặp theo loại), đổi mật khẩu, đăng xuất.
10. **Quản trị** (chỉ admin): quản lý cấp độ, chủ đề, bài tập (thêm/sửa/xóa, sắp xếp thứ tự, bật/tắt xuất bản). Form bài tập đổi trường theo loại bài. Nút **"Thử chấm"** để admin xem AI chấm đề này thế nào (gọi Edge Function ở chế độ không lưu).

**Phong cách thị giác (bản B):** nền sáng hơi tím-xanh nhạt, màu nhấn chính indigo/violet, XP màu vàng, đúng = xanh lá, sai = đỏ hồng. Bo góc lớn, thẻ có bóng đáy nhẹ, nút to dễ bấm. Responsive: điện thoại dùng một cột với thanh điều hướng dưới, máy tính có thanh điều hướng trên. Tránh sao chép nhận diện của bất kỳ sản phẩm có sẵn nào.

### 4.7 Dùng cá nhân & thanh theo dõi mức dùng AI (chủ dự án đã chốt)
- Hiện tại **chỉ một mình chủ dự án dùng**. Tài khoản đó vừa là học viên vừa là admin. **Không giới hạn số lần chấm**, không cần chống lạm dụng.
- Đăng nhập email + mật khẩu, **không bắt xác nhận email**. Quên mật khẩu dùng máy chủ gửi email có sẵn của Supabase, đủ cho một người. README hướng dẫn tắt đăng ký mới trong Supabase sau khi tạo xong tài khoản, và cách cấu hình SMTP nếu sau này mở cho nhiều người.
- **Có thanh tiến trình cho biết đã dùng AI bao nhiêu** *(người thiết kế hiểu là mức dùng Gemini)*:
  - Trên thanh điều hướng có một thanh nhỏ "AI hôm nay: 12 / 250 lượt". Bấm vào thì ra chi tiết.
  - Trang chi tiết (trong Hồ sơ): số lượt chấm và token theo **ngày** và **tháng**, mỗi chỉ số có thanh tiến trình so với ngân sách trong `app_settings`, kèm biểu đồ cột nhỏ 30 ngày gần nhất.
  - Thanh đổi màu: xanh khi dưới 70%, vàng từ 70–90%, đỏ khi trên 90%. **Chỉ để cảnh báo, không chặn.**
  - Ngân sách mặc định lấy theo hạn mức free tier hiện hành của model Gemini đang dùng (builder tra cứu), admin chỉnh được.

### 4.8 Bộ bài học soạn sẵn
- **Builder soạn toàn bộ nội dung**: đề bài, văn bản nguồn cho bài dịch, từ vựng gợi ý, đáp án tham khảo, tất cả đúng trình độ A1–A2. Sau khi soạn, đọc rà lại một lượt riêng (đúng trình độ, tiếng Việt tự nhiên, đáp án chính xác) rồi mới đưa vào seed.
- 5 cấp độ × 3 chủ đề × 3 bài (mỗi chủ đề có 1 bài viết đoạn, 1 bài dịch V→A, 1 bài dịch A→V) = **45 bài**, nạp bằng file seed SQL.
- Gợi ý lộ trình:
  - Cấp 1 "Làm quen": bản thân, gia đình, đồ vật quanh em
  - Cấp 2 "Hằng ngày": thói quen hằng ngày, đồ ăn, nhà của em
  - Cấp 3 "Sở thích & con người": sở thích, bạn thân, thời tiết & mùa
  - Cấp 4 "Kể chuyện": cuối tuần vừa rồi (quá khứ), một chuyến đi, một ngày đáng nhớ
  - Cấp 5 "Kế hoạch & ý kiến": kế hoạch tương lai, so sánh, nêu ý kiến đơn giản
- Độ dài tăng dần: cấp 1 khoảng 25–40 từ, cấp 5 khoảng 80–120 từ. Bài dịch có 3–5 câu.

## 5. Để builder tự quyết
- Cấu trúc thư mục, cách tổ chức component, thư viện diff, form, toast, hiệu ứng.
- Chi tiết prompt Gemini (theo yêu cầu ở mục 4.4), cách xử lý lỗi và retry.
- Kiểm thử: test đơn vị cho logic sao/XP/streak/mở khóa và parse kết quả AI; test RLS bằng SQL.
- Cách triển khai frontend (Vercel/Netlify/Cloudflare Pages), viết hướng dẫn trong README.
- Cách quản lý migration (Supabase CLI `supabase/migrations`).
