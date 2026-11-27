import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, LogOut, Sparkles } from 'lucide-react';
import { isPassed } from '@shared/scoring.ts';
import { displayStreak } from '@shared/streak.ts';
import { Button, Card, Chip, ErrorNote, TextField } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { authErrorVi } from '@/features/auth/AuthLayout';
import { ERROR_LABEL } from '@/features/results/parts';
import { supabase } from '@/lib/supabase';
import { updateDisplayName, useMyErrorResults, useMySubmissions } from './api';
import { countErrorTypes } from './stats';

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-[13px] font-semibold text-muted">{label}</p>
      <p className="mt-1 text-[26px] leading-tight font-extrabold">{value}</p>
    </Card>
  );
}

export function ProfilePage() {
  const { profile, session, refreshProfile, signOut } = useAuth();
  const submissions = useMySubmissions();
  const results = useMyErrorResults();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<'name' | 'pw' | null>(null);

  const passedCount = new Set((submissions.data ?? []).filter((s) => isPassed(s.stars)).map((s) => s.exercise_id)).size;
  const topErrors = countErrorTypes(results.data ?? []).slice(0, 4);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy('name');
    try {
      await updateDisplayName(session.user.id, name);
      await refreshProfile();
      setNameMsg('Đã lưu tên hiển thị.');
    } catch (err) {
      setNameMsg((err as Error).message);
    }
    setBusy(null);
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setPwMsg({ ok: false, text: 'Mật khẩu cần ít nhất 6 ký tự.' });
      return;
    }
    setBusy('pw');
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(null);
    setPwMsg(error ? { ok: false, text: authErrorVi(error.message) } : { ok: true, text: 'Đã đổi mật khẩu.' });
    if (!error) setPassword('');
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-[28px]">{profile?.display_name || 'Hồ sơ của bạn'}</h1>
        <p className="text-muted">{session?.user.email}</p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Thống kê">
        <Tile label="Tổng XP" value={profile?.xp ?? 0} />
        <Tile label="Chuỗi ngày học" value={`${profile ? displayStreak(profile, new Date()) : 0} 🔥`} />
        <Tile label="Bài đã nộp" value={submissions.data?.length ?? 0} />
        <Tile label="Bài đã qua" value={passedCount} />
      </section>

      <Link
        to="/profile/usage"
        className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 font-semibold shadow-[var(--shadow-tactile)] hover:border-indigo/50"
      >
        <Sparkles className="text-indigo" aria-hidden />
        <span className="flex-1">Mức dùng AI theo ngày và tháng</span>
        <ChevronRight className="text-muted" aria-hidden />
      </Link>

      <section>
        <h2 className="text-[19px]">Lỗi bạn hay gặp</h2>
        {topErrors.length === 0 ? (
          <p className="mt-2 text-muted">Chưa có dữ liệu. Hãy nộp vài bài để xem thống kê.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {topErrors.map((e) => (
              <li key={e.type} className="flex items-center gap-3">
                <Chip tone="indigo" className="w-28 justify-center">{ERROR_LABEL[e.type]}</Chip>
                <span className="font-semibold">{e.count} lần</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Card className="p-5">
        <form onSubmit={saveName} className="space-y-3">
          <TextField id="display-name" label="Tên hiển thị" value={name} maxLength={40} onChange={(e) => { setName(e.target.value); setNameMsg(null); }} />
          <div className="flex items-center gap-3">
            <Button type="submit" variant="secondary" loading={busy === 'name'}>Lưu tên</Button>
            {nameMsg && <span className="text-[14px] text-muted">{nameMsg}</span>}
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <form onSubmit={savePassword} className="space-y-3">
          <TextField id="new-password" label="Mật khẩu mới" type="password" autoComplete="new-password" value={password} onChange={(e) => { setPassword(e.target.value); setPwMsg(null); }} />
          {pwMsg && (pwMsg.ok ? <p className="text-[14px] text-good">{pwMsg.text}</p> : <ErrorNote>{pwMsg.text}</ErrorNote>)}
          <Button type="submit" variant="secondary" loading={busy === 'pw'} disabled={!password}>Đổi mật khẩu</Button>
        </form>
      </Card>

      <Button variant="ghost" onClick={() => void signOut()}>
        <LogOut size={18} aria-hidden /> Đăng xuất
      </Button>
    </div>
  );
}
