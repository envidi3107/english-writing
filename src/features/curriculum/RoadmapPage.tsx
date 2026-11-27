import { Link } from 'react-router-dom';
import { Lock, PenLine } from 'lucide-react';
import { Chip, cx, EmptyState, ErrorNote, PageSpinner, ProgressBar, Button } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { locateExercise, TYPE_LABEL, TYPE_TONE, useCurriculum } from './api';
import type { TopicStatus, TopicWithExercises } from './curriculumState';

const LOCK_HINT = 'Hoàn thành bài trước với ít nhất 2 sao để mở';

function TopicCard({ topic, status }: { topic: TopicWithExercises; status: TopicStatus }) {
  const done = status.total > 0 && status.done === status.total;
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[34px] leading-none" aria-hidden>{topic.icon ?? '📝'}</span>
        {!status.open ? (
          <Lock size={18} className="text-muted" aria-label="Chưa mở" />
        ) : done ? (
          <Chip tone="green">Xong</Chip>
        ) : null}
      </div>
      <h3 className="mt-3 text-[17px] leading-snug">{topic.title}</h3>
      {topic.description && <p className="mt-1 line-clamp-2 text-[14px] text-muted">{topic.description}</p>}
      <div className="mt-auto pt-4">
        <div className="mb-1.5 flex justify-between text-[13px] font-semibold text-muted">
          <span>{status.done}/{status.total} bài</span>
          <span aria-label={`${status.stars} sao`}>★ {status.stars}</span>
        </div>
        <ProgressBar value={status.done} max={status.total} tone={done ? 'ok' : 'indigo'} label={`Tiến độ ${topic.title}`} />
      </div>
    </>
  );
  const base = 'flex min-h-48 flex-col rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-tactile)]';
  if (!status.open) {
    return (
      <div className={cx(base, 'opacity-55')} aria-disabled title={LOCK_HINT}>
        {body}
      </div>
    );
  }
  return (
    <Link to={`/topics/${topic.id}`} className={cx(base, 'transition-[border-color,transform] hover:-translate-y-0.5 hover:border-indigo/50')}>
      {body}
    </Link>
  );
}

export function RoadmapPage() {
  const { profile } = useAuth();
  const { data, isLoading, error, refetch } = useCurriculum();

  if (isLoading) return <PageSpinner />;
  if (error || !data) {
    return <ErrorNote action={<Button variant="secondary" onClick={() => refetch()}>Thử lại</Button>}>Không tải được lộ trình. {error?.message}</ErrorNote>;
  }
  if (data.levels.length === 0) return <EmptyState title="Chưa có bài học nào">Quản trị viên chưa xuất bản bài học.</EmptyState>;

  const next = data.nextExerciseId ? locateExercise(data.levels, data.nextExerciseId) : null;
  const totalExercises = data.levels.reduce((n, l) => n + l.topics.reduce((m, t) => m + t.exercises.length, 0), 0);
  const passed = [...data.topicStatus.values()].reduce((n, s) => n + s.done, 0);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-[28px]">Chào {profile?.display_name || 'bạn'}!</h1>
        <p className="mt-1 text-muted">Bạn đã qua {passed}/{totalExercises} bài.</p>

        {next ? (
          <Link
            to={`/exercises/${next.exercise.id}`}
            className="mt-5 flex flex-col gap-4 rounded-2xl bg-indigo p-5 text-white shadow-[var(--shadow-tactile-indigo)] transition-transform active:translate-y-[2px] sm:flex-row sm:items-center"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15" aria-hidden>
              <PenLine size={24} />
            </span>
            <span className="flex-1">
              <span className="block text-[14px] text-white/75">
                Học tiếp chủ đề “{next.topic.title}”
              </span>
              <span className="mt-0.5 block text-[20px] font-bold">{next.exercise.title}</span>
            </span>
            <span className="flex items-center gap-3">
              <Chip tone={TYPE_TONE[next.exercise.type]}>{TYPE_LABEL[next.exercise.type]}</Chip>
              <span className="rounded-xl bg-white px-4 py-2 font-semibold text-indigo-deep">Làm bài</span>
            </span>
          </Link>
        ) : (
          <div className="mt-5 rounded-2xl bg-good-soft p-5 font-semibold text-good">
            Bạn đã hoàn thành toàn bộ lộ trình. Hãy làm lại bài cũ để lấy 3 sao nhé!
          </div>
        )}
      </section>

      {data.levels.map((level) => {
        const levelOpen = data.levelOpen.get(level.id);
        return (
          <section key={level.id} aria-labelledby={`level-${level.id}`}>
            <div className="mb-4 flex items-center gap-3">
              <span
                className={cx(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[17px] font-extrabold',
                  levelOpen ? 'bg-indigo text-white' : 'bg-line text-muted',
                )}
                aria-hidden
              >
                {level.position}
              </span>
              <div>
                <h2 id={`level-${level.id}`} className="text-[21px] leading-tight">
                  Cấp {level.position}: {level.title}
                </h2>
                {level.description && <p className="text-[14px] text-muted">{level.description}</p>}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {level.topics.map((topic) => (
                <TopicCard key={topic.id} topic={topic} status={data.topicStatus.get(topic.id)!} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
