import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Chip, EmptyState, ErrorNote, PageSpinner, Stars } from '@/components/ui';
import { TYPE_LABEL, TYPE_TONE } from '@/features/curriculum/api';
import { formatDateTimeVi, useMySubmissions } from '@/features/profile/api';

export function HistoryPage() {
  const { data, isLoading, error } = useMySubmissions();
  const [topicId, setTopicId] = useState('');

  const topics = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of data ?? []) if (s.exercise?.topic) m.set(s.exercise.topic.id, s.exercise.topic.title);
    return [...m.entries()];
  }, [data]);

  if (isLoading) return <PageSpinner />;
  if (error) return <ErrorNote>Không tải được lịch sử. {error.message}</ErrorNote>;
  if (!data?.length) {
    return (
      <EmptyState title="Chưa có bài nào" action={<Link to="/learn" className="font-semibold text-indigo">Làm bài đầu tiên</Link>}>
        Bài bạn nộp sẽ được lưu ở đây cùng phần sửa lỗi.
      </EmptyState>
    );
  }

  const rows = topicId ? data.filter((s) => s.exercise?.topic?.id === topicId) : data;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px]">Lịch sử bài làm</h1>
          <p className="mt-1 text-muted">{data.length} bài đã nộp</p>
        </div>
        <label className="text-[14px] font-semibold">
          <span className="mb-1 block text-muted">Lọc theo chủ đề</span>
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            className="h-11 rounded-xl border-2 border-line bg-surface px-3 font-medium focus:border-indigo focus:outline-none"
          >
            <option value="">Tất cả chủ đề</option>
            {topics.map(([id, title]) => (
              <option key={id} value={id}>{title}</option>
            ))}
          </select>
        </label>
      </div>

      <ul className="mt-6 space-y-3">
        {rows.map((s) => (
          <li key={s.id}>
            <Link
              to={`/submissions/${s.id}`}
              className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-tactile)] hover:border-indigo/50"
            >
              <span className="text-[28px] leading-none" aria-hidden>{s.exercise?.topic?.icon ?? '📝'}</span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  {s.exercise && <Chip tone={TYPE_TONE[s.exercise.type]}>{TYPE_LABEL[s.exercise.type]}</Chip>}
                  <span className="text-[13px] text-muted">{formatDateTimeVi(s.created_at)}</span>
                </span>
                <span className="mt-1 block truncate font-semibold">{s.exercise?.title ?? 'Bài tập đã ẩn'}</span>
              </span>
              <span className="flex flex-col items-end gap-1">
                <Stars value={s.stars} size={16} />
                <span className="text-[13px] font-semibold text-muted">{s.overall_score.toFixed(1)}/10</span>
              </span>
              <ChevronRight size={20} className="text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
