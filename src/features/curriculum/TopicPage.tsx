import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { isPassed } from '@shared/scoring.ts';
import { Chip, EmptyState, PageSpinner, Stars, cx } from '@/components/ui';
import { TYPE_LABEL, TYPE_TONE, useCurriculum } from './api';

export function TopicPage() {
  const { topicId } = useParams();
  const { data, isLoading } = useCurriculum();
  if (isLoading) return <PageSpinner />;

  const level = data?.levels.find((l) => l.topics.some((t) => t.id === topicId));
  const topic = level?.topics.find((t) => t.id === topicId);
  if (!data || !level || !topic) {
    return <EmptyState title="Không tìm thấy chủ đề" action={<Link className="font-semibold text-indigo" to="/learn">Về lộ trình</Link>} />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/learn" className="inline-flex items-center gap-1 text-[15px] font-semibold text-muted hover:text-ink">
        <ChevronLeft size={18} aria-hidden /> Lộ trình
      </Link>
      <header className="mt-4 flex items-center gap-4">
        <span className="text-[52px] leading-none" aria-hidden>{topic.icon ?? '📝'}</span>
        <div>
          <p className="text-[14px] font-semibold text-muted">Cấp {level.position}: {level.title}</p>
          <h1 className="text-[28px] leading-tight">{topic.title}</h1>
          {topic.description && <p className="mt-1 text-muted">{topic.description}</p>}
        </div>
      </header>

      <ol className="mt-8 space-y-3">
        {topic.exercises.map((e) => {
          const open = data.open.has(e.id);
          const p = data.progress.get(e.id);
          const content = (
            <>
              <span
                className={cx(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-extrabold',
                  p && isPassed(p.best_stars) ? 'bg-good-soft text-good' : open ? 'bg-indigo-soft text-indigo-deep' : 'bg-line text-muted',
                )}
                aria-hidden
              >
                {open ? e.position : <Lock size={16} />}
              </span>
              <span className="min-w-0 flex-1">
                <Chip tone={TYPE_TONE[e.type]}>{TYPE_LABEL[e.type]}</Chip>
                <span className="mt-1 line-clamp-2 block font-semibold">{e.title}</span>
              </span>
              {p ? <Stars value={p.best_stars} /> : open ? <span className="text-[14px] font-semibold text-indigo">Bắt đầu</span> : null}
              {open && <ChevronRight size={20} className="text-muted" aria-hidden />}
            </>
          );
          const cls = 'flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-tactile)]';
          return (
            <li key={e.id}>
              {open ? (
                <Link to={`/exercises/${e.id}`} className={cx(cls, 'hover:border-indigo/50')}>
                  {content}
                </Link>
              ) : (
                <div className={cx(cls, 'opacity-55')} title="Hoàn thành bài trước với ít nhất 2 sao để mở" aria-disabled>
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
