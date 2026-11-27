import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { usageTone } from '@shared/usage.ts';
import { ProgressBar, cx } from '@/components/ui';
import { useUsage } from '@/features/profile/api';

/** "AI hôm nay: 12 / 250 lượt" with a progress bar; links to the usage details page. */
export function UsageMeter({ compact }: { compact?: boolean }) {
  const { data } = useUsage();
  if (!data) return null;
  const used = data.todayRequests;
  const budget = data.budget.daily_request_budget;
  const tone = usageTone(used, budget);

  return (
    <Link
      to="/profile/usage"
      className={cx('group block rounded-lg', compact ? 'flex items-center gap-3' : '')}
      title="Xem chi tiết mức dùng AI"
    >
      <span className={cx('flex items-center gap-1 text-[12px] font-semibold text-muted group-hover:text-ink', compact ? 'shrink-0' : 'mb-1')}>
        <Sparkles size={13} aria-hidden />
        AI hôm nay: {used} / {budget} lượt
      </span>
      <ProgressBar value={used} max={budget} tone={tone} label="Lượt chấm AI hôm nay" className={compact ? 'h-1.5' : 'h-2'} />
    </Link>
  );
}
