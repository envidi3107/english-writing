import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { Button, Card, ErrorNote, PageSpinner, TextField } from '@/components/ui';
import { fetchSettings, updateSettings } from './api';

export function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });
  const [daily, setDaily] = useState('');
  const [monthly, setMonthly] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) {
      setDaily(String(data.daily_request_budget));
      setMonthly(String(data.monthly_token_budget));
    }
  }, [data]);

  if (isLoading) return <PageSpinner />;
  if (error) return <ErrorNote>Không tải được cài đặt. {error.message}</ErrorNote>;

  async function save(e: FormEvent) {
    e.preventDefault();
    const d = Number(daily);
    const m = Number(monthly);
    if (!Number.isInteger(d) || d <= 0 || !Number.isInteger(m) || m <= 0) {
      setMsg({ ok: false, text: 'Ngân sách phải là số nguyên dương.' });
      return;
    }
    setBusy(true);
    try {
      await updateSettings({ daily_request_budget: d, monthly_token_budget: m });
      await qc.invalidateQueries({ queryKey: ['settings'] });
      await qc.invalidateQueries({ queryKey: ['usage'] });
      setMsg({ ok: true, text: 'Đã lưu cài đặt.' });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link to="/admin" className="inline-flex items-center gap-1 text-[15px] font-semibold text-muted hover:text-ink">
        <ChevronLeft size={18} aria-hidden /> Quản trị
      </Link>
      <h1 className="mt-4 text-[28px]">Cài đặt ngân sách AI</h1>
      <p className="mt-1 text-muted">Chỉ dùng để vẽ thanh theo dõi mức dùng, không chặn việc chấm bài. Nên đặt theo hạn mức gói Gemini bạn đang dùng.</p>
      <Card className="mt-6 p-5">
        <form onSubmit={save} className="space-y-4" noValidate>
          {msg && (msg.ok ? <p className="font-semibold text-good">{msg.text}</p> : <ErrorNote>{msg.text}</ErrorNote>)}
          <TextField id="daily" label="Số lượt chấm mỗi ngày" inputMode="numeric" value={daily} onChange={(e) => { setDaily(e.target.value.replace(/\D/g, '')); setMsg(null); }} />
          <TextField id="monthly" label="Số token mỗi tháng" inputMode="numeric" value={monthly} onChange={(e) => { setMonthly(e.target.value.replace(/\D/g, '')); setMsg(null); }} />
          <Button type="submit" loading={busy}>Lưu cài đặt</Button>
        </form>
      </Card>
    </div>
  );
}
