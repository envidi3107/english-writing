import { Link, Navigate } from 'react-router-dom';
import { Brand, MarkedSentence } from '@/components/layout/Brand';
import { Chip, PageSpinner, Stars } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';

const LEVELS = [
  { title: 'Làm quen', note: 'Bản thân, gia đình, đồ vật quanh em' },
  { title: 'Hằng ngày', note: 'Thói quen, món ăn, ngôi nhà' },
  { title: 'Sở thích & con người', note: 'Sở thích, bạn thân, thời tiết' },
  { title: 'Kể chuyện', note: 'Cuối tuần, chuyến đi, ngày đáng nhớ' },
  { title: 'Kế hoạch & ý kiến', note: 'Tương lai, so sánh, nêu ý kiến' },
];

const KINDS = [
  { chip: 'Viết đoạn', tone: 'indigo' as const, text: 'Viết 3–8 câu theo đề, có gợi ý từ vựng và câu mở đầu.' },
  { chip: 'Dịch Việt → Anh', tone: 'green' as const, text: 'Chuyển câu tiếng Việt quen thuộc sang tiếng Anh tự nhiên.' },
  { chip: 'Dịch Anh → Việt', tone: 'yellow' as const, text: 'Đọc hiểu đoạn tiếng Anh ngắn và diễn đạt lại bằng tiếng Việt.' },
];

export function LandingPage() {
  const { session, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (session) return <Navigate to="/learn" replace />;

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Brand />
        <Link to="/login" className="rounded-xl px-3 py-2 font-semibold text-indigo hover:bg-indigo-soft">
          Đăng nhập
        </Link>
      </header>

      <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 pt-8 pb-16 md:grid-cols-[1fr_1.05fr] md:pt-16">
        <div>
          <h1 className="text-[34px] leading-[1.15] sm:text-[44px]">Viết tiếng Anh mỗi ngày, có cô giáo sửa từng lỗi.</h1>
          <p className="mt-5 max-w-md text-[18px] leading-relaxed text-muted">
            Bài học đi từ câu giới thiệu bản thân đến nêu ý kiến. Viết xong là có điểm, lỗi được gạch và giải thích bằng tiếng Việt.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/signup"
              className="inline-flex h-13 items-center rounded-xl bg-indigo px-6 text-[17px] font-semibold text-white shadow-[var(--shadow-tactile-indigo)] active:translate-y-[2px] active:shadow-none"
            >
              Bắt đầu bài đầu tiên
            </Link>
            <Link
              to="/login"
              className="inline-flex h-13 items-center rounded-xl border-2 border-line bg-surface px-6 text-[17px] font-semibold shadow-[var(--shadow-tactile)]"
            >
              Tôi đã có tài khoản
            </Link>
          </div>
        </div>

        <div className="relative" aria-label="Ví dụ một bài đã được chấm">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_4px_0_var(--color-line)]">
            <div className="flex items-center justify-between bg-indigo px-5 py-3 text-white">
              <span className="font-semibold">Gia đình của tôi</span>
              <span className="flex items-center gap-2">
                <Stars value={2} />
                <Chip tone="yellow">+20 XP</Chip>
              </span>
            </div>
            <div className="p-5 text-[21px] sm:text-[24px]">
              <MarkedSentence />
            </div>
            <div className="mx-5 mb-5 flex gap-3 rounded-xl bg-mist p-4 text-[15px]">
              <Chip tone="red">Ngữ pháp</Chip>
              <p>
                <b>work → works</b>. Chủ ngữ “My father” là một người (ngôi thứ ba số ít) nên động từ thêm <b>-s</b>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-12 md:grid-cols-3">
          {KINDS.map((k) => (
            <div key={k.chip}>
              <Chip tone={k.tone}>{k.chip}</Chip>
              <p className="mt-3 text-[16px] leading-relaxed">{k.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="text-[26px]">Lộ trình 5 cấp độ, 45 bài</h2>
        <p className="mt-2 max-w-xl text-muted">Đạt từ 2 sao để mở bài tiếp theo. Bài khó dần cả về độ dài lẫn ngữ pháp.</p>
        <ol className="mt-8 grid gap-3 sm:grid-cols-5">
          {LEVELS.map((l, i) => (
            <li key={l.title} className="rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-tactile)]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-soft font-extrabold text-indigo-deep">{i + 1}</span>
              <div className="mt-3 font-bold">{l.title}</div>
              <div className="mt-1 text-[14px] text-muted">{l.note}</div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="pb-10 text-center text-[14px] text-muted">VietWrite · luyện viết tiếng Anh cho người mới bắt đầu</footer>
    </div>
  );
}
