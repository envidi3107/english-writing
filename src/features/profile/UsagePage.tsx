import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { usageTone } from '@shared/usage.ts';
import { Card, ErrorNote, PageSpinner, ProgressBar } from '@/components/ui';
import { formatTokens, useUsage } from './api';

const TONE_TEXT = { ok: 'Còn thoải mái', warn: 'Sắp chạm ngân sách', danger: 'Gần hết ngân sách' };

function Meter({ title, used, budget, format = String }: { title: string; used: number; budget: number; format?: (n: number) => string }) {
  const tone = usageTone(used, budget);
  const pct = budget > 0 ? Math.round((used / budget) * 100) : 0;
  return (
    <Card className="p-5">
      <p className="text-[14px] font-semibold text-muted">{title}</p>
      <p className="mt-1 text-[30px] leading-tight font-extrabold">
        {format(used)} <span className="text-[16px] font-semibold text-muted">/ {format(budget)}</span>
      </p>
      <ProgressBar value={used} max={budget} tone={tone} label={title} className="mt-3" />
      <p className="mt-2 text-[13px] text-muted">
        Đã dùng {pct}%. {TONE_TEXT[tone]}.
      </p>
    </Card>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-[14px] font-semibold text-muted">{title}</p>
      <p className="mt-1 text-[30px] leading-tight font-extrabold">{value}</p>
    </Card>
  );
}

function DailyChart({ daily }: { daily: { date: string; requests: number; tokens: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 600;
  const H = 180;
  const pad = { top: 12, bottom: 24, left: 28, right: 4 };
  const max = Math.max(4, ...daily.map((d) => d.requests));
  const niceMax = Math.ceil(max / 4) * 4;
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const slot = plotW / daily.length;
  const barW = Math.max(2, slot - 2);
  const y = (v: number) => pad.top + plotH - (v / niceMax) * plotH;
  const short = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
  const h = hover !== null ? daily[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Biểu đồ số lượt chấm AI theo ngày trong 30 ngày gần nhất">
        {[0, niceMax / 2, niceMax].map((v) => (
          <g key={v}>
            <line x1={pad.left} x2={W - pad.right} y1={y(v)} y2={y(v)} stroke="#e8ebfa" strokeWidth={1} />
            <text x={pad.left - 6} y={y(v) + 4} textAnchor="end" fontSize={10} fill="#646a92">{v}</text>
          </g>
        ))}
        {daily.map((d, i) => {
          const x = pad.left + i * slot + 1;
          const top = y(d.requests);
          const bh = pad.top + plotH - top;
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.left + i * slot} y={pad.top} width={slot} height={plotH} fill="transparent" />
              {d.requests > 0 && (
                <path
                  d={`M${x},${top + Math.min(4, bh)} q0,-${Math.min(4, bh)} ${Math.min(4, barW / 2)},-${Math.min(4, bh)} h${barW - 2 * Math.min(4, barW / 2)} q${Math.min(4, barW / 2)},0 ${Math.min(4, barW / 2)},${Math.min(4, bh)} V${pad.top + plotH} H${x} Z`}
                  fill={hover === i ? '#3f3fae' : '#5b5bd6'}
                />
              )}
            </g>
          );
        })}
        {[0, 10, 20, 29].map((i) => (
          <text key={i} x={pad.left + i * slot + slot / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="#646a92">
            {short(daily[i].date)}
          </text>
        ))}
      </svg>
      {h && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 rounded-lg border border-line bg-surface px-3 py-2 text-[13px] shadow-md"
          style={{ left: `clamp(0px, calc(${((hover + 0.5) / daily.length) * 100}% - 70px), calc(100% - 140px))` }}
        >
          <div className="font-semibold">{short(h.date)}</div>
          <div>{h.requests} lượt chấm</div>
          <div className="text-muted">{formatTokens(h.tokens)} token</div>
        </div>
      )}
    </div>
  );
}

export function UsagePage() {
  const { data, isLoading, error } = useUsage();
  if (isLoading) return <PageSpinner />;
  if (error || !data) return <ErrorNote>Không tải được số liệu. {error?.message}</ErrorNote>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/profile" className="inline-flex items-center gap-1 text-[15px] font-semibold text-muted hover:text-ink">
        <ChevronLeft size={18} aria-hidden /> Hồ sơ
      </Link>
      <h1 className="mt-4 text-[28px]">Mức dùng AI</h1>
      <p className="mt-1 text-muted">
        Ngân sách chỉ để theo dõi, không chặn việc chấm bài. Quản trị viên chỉnh ngân sách trong phần Cài đặt.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Meter title="Lượt chấm hôm nay" used={data.todayRequests} budget={data.budget.daily_request_budget} />
        <Meter title="Token tháng này" used={data.monthTokens} budget={data.budget.monthly_token_budget} format={formatTokens} />
        <Stat title="Token hôm nay" value={formatTokens(data.todayTokens)} />
        <Stat title="Lượt chấm tháng này" value={String(data.monthRequests)} />
      </div>

      <Card className="mt-6 p-5">
        <h2 className="text-[17px]">Lượt chấm 30 ngày gần nhất</h2>
        <div className="mt-4">
          <DailyChart daily={data.daily} />
        </div>
        <details className="mt-3 text-[14px]">
          <summary className="cursor-pointer font-semibold text-indigo">Xem dạng bảng</summary>
          <table className="mt-3 w-full text-left">
            <thead className="text-muted">
              <tr>
                <th className="py-1 font-semibold">Ngày</th>
                <th className="py-1 font-semibold">Lượt</th>
                <th className="py-1 font-semibold">Token</th>
              </tr>
            </thead>
            <tbody>
              {[...data.daily].reverse().map((d) => (
                <tr key={d.date} className="border-t border-line">
                  <td className="py-1">{d.date.split('-').reverse().join('/')}</td>
                  <td className="py-1">{d.requests}</td>
                  <td className="py-1">{d.tokens.toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </Card>
    </div>
  );
}
