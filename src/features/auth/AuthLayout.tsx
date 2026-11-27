import type { ReactNode } from 'react';
import { Brand, MarkedSentence } from '@/components/layout/Brand';

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-dvh md:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-indigo p-10 text-white md:flex md:flex-col">
        <div className="[&_span]:text-white">
          <Brand />
        </div>
        <div className="my-auto max-w-md">
          <div className="rounded-2xl bg-white p-6 text-[22px] text-ink shadow-[0_4px_0_#3f3fae]">
            <MarkedSentence />
          </div>
          <p className="mt-6 text-[17px] leading-relaxed text-white/85">
            Viết một đoạn ngắn mỗi ngày. Cô giáo AI chỉ ra từng lỗi, sửa lại và giải thích bằng tiếng Việt.
          </p>
        </div>
      </aside>

      <main className="flex flex-col px-4 py-8 sm:px-8">
        <div className="md:hidden">
          <Brand />
        </div>
        <div className="mx-auto my-auto w-full max-w-sm py-10">
          <h1 className="text-[28px] leading-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-6 text-[15px] text-muted">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

export function authErrorVi(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email hoặc mật khẩu không đúng.';
  if (m.includes('password should be at least') || m.includes('weak password')) return 'Mật khẩu cần ít nhất 6 ký tự.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Email này đã có tài khoản. Hãy đăng nhập.';
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) return 'Hệ thống đang tắt đăng ký tài khoản mới.';
  if (m.includes('email not confirmed')) return 'Email chưa được xác nhận. Hãy kiểm tra hộp thư.';
  if (m.includes('rate limit')) return 'Bạn thao tác quá nhanh. Hãy thử lại sau ít phút.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.';
  return 'Có lỗi xảy ra: ' + message;
}
