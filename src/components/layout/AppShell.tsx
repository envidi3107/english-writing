import { NavLink, Outlet } from 'react-router-dom';
import { BookOpen, History, Settings2, UserRound } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthProvider';
import { cx } from '@/components/ui';
import { Brand } from './Brand';
import { UsageMeter } from './UsageMeter';

const NAV = [
  { to: '/learn', label: 'Lộ trình', icon: BookOpen },
  { to: '/submissions', label: 'Lịch sử', icon: History },
  { to: '/profile', label: 'Hồ sơ', icon: UserRound },
];

function StatPills() {
  const { profile } = useAuth();
  if (!profile) return null;
  return (
    <div className="flex items-center gap-2 text-[14px] font-bold">
      <span className="inline-flex items-center gap-1 rounded-full bg-[#fff1e6] px-2.5 py-1 text-[#c2410c]" title="Chuỗi ngày học liên tục">
        <span aria-hidden>🔥</span>
        {profile.streak_count}
        <span className="sr-only">ngày liên tục</span>
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-xp px-2.5 py-1 text-xp-ink" title="Tổng điểm kinh nghiệm">
        {profile.xp} XP
      </span>
    </div>
  );
}

export function AppShell() {
  const { isAdmin } = useAuth();
  const items = isAdmin ? [...NAV, { to: '/admin', label: 'Quản trị', icon: Settings2 }] : NAV;

  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-line bg-mist/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4">
          <Brand to="/learn" />
          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Điều hướng chính">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cx('rounded-xl px-3 py-2 text-[15px] font-semibold', isActive ? 'bg-indigo-soft text-indigo-deep' : 'text-muted hover:text-ink')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <div className="hidden w-44 lg:block">
              <UsageMeter />
            </div>
            <StatPills />
          </div>
        </div>
        <div className="px-4 pb-2 lg:hidden">
          <div className="mx-auto max-w-5xl">
            <UsageMeter compact />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 md:py-10">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:hidden"
        aria-label="Điều hướng chính"
      >
        <div className="mx-auto flex max-w-md justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cx('flex min-w-16 flex-col items-center gap-0.5 py-2 text-[12px] font-semibold', isActive ? 'text-indigo' : 'text-muted')
              }
            >
              <Icon size={22} strokeWidth={2.2} aria-hidden />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
