import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Lightbulb, Lock } from 'lucide-react';
import { countWords, validateAnswer } from '@shared/text.ts';
import type { GradeResult, Stars as StarCount } from '@shared/types.ts';
import { Button, Card, Chip, EmptyState, ErrorNote, PageSpinner, Stars, cx } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { TYPE_LABEL, TYPE_TONE } from '@/features/curriculum/api';
import { ResultView } from '@/features/results/ResultView';
import { gradeSubmission, useExerciseContext } from './api';
import { useDraft } from './useDraft';

type Phase =
  | { kind: 'writing' }
  | { kind: 'grading' }
  | { kind: 'rejected'; reason: string }
  | { kind: 'error'; message: string }
  | { kind: 'done'; answer: string; result: GradeResult; stars: StarCount; xp: number; celebrate: boolean };

const PLACEHOLDER = {
  paragraph: 'Viết đoạn văn tiếng Anh của bạn ở đây…',
  translate_vi_en: 'Viết bản dịch tiếng Anh ở đây…',
  translate_en_vi: 'Viết bản dịch tiếng Việt ở đây…',
};

function GradingState() {
  return (
    <div role="status" className="flex flex-col items-center justify-center rounded-2xl border border-line bg-surface py-16 text-center shadow-[var(--shadow-tactile)]">
      <span className="text-[48px]" style={{ animation: 'pencil-bob 1.2s ease-in-out infinite' }} aria-hidden>
        ✏️
      </span>
      <p className="mt-4 text-[19px] font-bold">Cô giáo AI đang đọc bài của bạn…</p>
      <p className="mt-1 text-muted">Thường mất khoảng 5–15 giây.</p>
    </div>
  );
}

export function ExercisePage() {
  const { exerciseId = '' } = useParams();
  const { data, isLoading, isFetching, error } = useExerciseContext(exerciseId);
  const [answer, setAnswer, clearDraft] = useDraft(exerciseId);
  const [phase, setPhase] = useState<Phase>({ kind: 'writing' });
  const [forId, setForId] = useState(exerciseId);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const qc = useQueryClient();
  const { refreshProfile } = useAuth();

  if (forId !== exerciseId) {
    setForId(exerciseId);
    setPhase({ kind: 'writing' });
  }

  if (isLoading) return <PageSpinner />;
  if (error || !data) {
    return <EmptyState title="Không mở được bài tập" action={<Link className="font-semibold text-indigo" to="/learn">Về lộ trình</Link>}>{error?.message}</EmptyState>;
  }
  const { exercise, topic, isOpen, nextExerciseId, best } = data;

  if (!isOpen && isFetching) return <PageSpinner />; // progress may be stale right after an unlock
  if (!isOpen) {
    return (
      <EmptyState title="Bài này chưa mở" action={<Link className="font-semibold text-indigo" to={`/topics/${topic.id}`}>Về chủ đề</Link>}>
        <Lock className="mx-auto mb-2" aria-hidden /> Hoàn thành bài trước với ít nhất 2 sao để mở bài này.
      </EmptyState>
    );
  }

  const words = countWords(answer);
  const check = validateAnswer(answer);
  const outOfRange =
    words > 0 && ((exercise.min_words != null && words < exercise.min_words) || (exercise.max_words != null && words > exercise.max_words));

  function insertWord(word: string) {
    const el = textRef.current;
    const start = el?.selectionStart ?? answer.length;
    const end = el?.selectionEnd ?? answer.length;
    const before = answer.slice(0, start);
    const needsSpace = before.length > 0 && !/\s$/.test(before);
    const insert = `${needsSpace ? ' ' : ''}${word} `;
    const next = before + insert + answer.slice(end);
    setAnswer(next);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + insert.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  async function submit() {
    const checked = validateAnswer(answer);
    if (!checked.ok) return;
    setPhase({ kind: 'grading' });
    const res = await gradeSubmission({ exercise_id: exercise.id, answer: checked.text });
    if (!res.ok) {
      setPhase({ kind: 'error', message: res.message_vi });
      return;
    }
    if (res.kind === 'rejected') {
      setPhase({ kind: 'rejected', reason: res.reason_vi });
      return;
    }
    clearDraft();
    setPhase({
      kind: 'done',
      answer: checked.text,
      result: res.result,
      stars: res.stars,
      xp: res.xp_gained,
      celebrate: res.stars === 3 || res.newly_unlocked,
    });
    void qc.invalidateQueries({ queryKey: ['progress'] });
    void qc.invalidateQueries({ queryKey: ['submissions'] });
    void qc.invalidateQueries({ queryKey: ['usage'] });
    void refreshProfile();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={`/topics/${topic.id}`} className="inline-flex items-center gap-1 text-[15px] font-semibold text-muted hover:text-ink">
        <ChevronLeft size={18} aria-hidden /> {topic.title}
      </Link>

      <header className="mt-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={TYPE_TONE[exercise.type]}>{TYPE_LABEL[exercise.type]}</Chip>
          {best && (
            <span className="inline-flex items-center gap-1.5 text-[14px] text-muted">
              Tốt nhất <Stars value={best.best_stars} size={15} />
            </span>
          )}
        </div>
        <h1 className="mt-2 text-[28px] leading-tight">{exercise.title}</h1>
      </header>

      {phase.kind === 'done' ? (
        <ResultView
          answer={phase.answer}
          result={phase.result}
          stars={phase.stars}
          xpGained={phase.xp}
          exerciseType={exercise.type}
          celebrate={phase.celebrate}
          nextHref={nextExerciseId ? `/exercises/${nextExerciseId}` : null}
          onRetry={() => {
            setAnswer(phase.answer);
            setPhase({ kind: 'writing' });
          }}
        />
      ) : phase.kind === 'grading' ? (
        <GradingState />
      ) : (
        <div className="space-y-5">
          <Card className="p-5">
            <p className="text-[17px] leading-relaxed">{exercise.prompt}</p>
            {exercise.source_text && (
              <blockquote
                lang={exercise.type === 'translate_en_vi' ? 'en' : 'vi'}
                className="mt-4 rounded-xl border-l-4 border-indigo bg-indigo-soft/60 px-4 py-3 text-[18px] leading-relaxed"
              >
                {exercise.source_text}
              </blockquote>
            )}
          </Card>

          {(exercise.hints.vocabulary.length > 0 || exercise.hints.starter) && (
            <div className="rounded-2xl bg-surface/60 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-[14px] font-semibold text-muted">
                <Lightbulb size={16} aria-hidden /> Gợi ý từ vựng, bấm để chèn
              </p>
              <div className="flex flex-wrap gap-2">
                {exercise.hints.vocabulary.map((w) => (
                  <button
                    key={w}
                    type="button"
                    aria-label={`Chèn từ ${w.split(':')[0].trim()}`}
                    onClick={() => insertWord(w.split(':')[0].trim())}
                    className="rounded-full border-2 border-line bg-surface px-3 py-1 text-[14px] font-medium hover:border-indigo/50"
                  >
                    {w}
                  </button>
                ))}
              </div>
              {exercise.hints.starter && (
                <p className="mt-3 text-[14px] text-muted">
                  Câu mở đầu gợi ý: <span className="font-semibold text-ink">{exercise.hints.starter}</span>
                </p>
              )}
            </div>
          )}

          {phase.kind === 'rejected' && (
            <div role="alert" className="rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-[#7a4b06]">
              {phase.reason}
            </div>
          )}
          {phase.kind === 'error' && (
            <ErrorNote action={<Button variant="secondary" onClick={submit}>Thử lại</Button>}>{phase.message}</ErrorNote>
          )}

          <div>
            <label htmlFor="answer" className="sr-only">
              Bài viết của bạn
            </label>
            <textarea
              id="answer"
              ref={textRef}
              lang={exercise.type === 'translate_en_vi' ? 'vi' : 'en'}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={PLACEHOLDER[exercise.type]}
              spellCheck={false}
              rows={8}
              className="w-full rounded-2xl border-2 border-line bg-surface p-4 text-[18px] leading-[1.8] shadow-[var(--shadow-tactile)] placeholder:text-muted/60 focus:border-indigo focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <span className={cx('text-[14px] font-medium', outOfRange ? 'text-warn' : 'text-muted')}>
                {words} từ
                {exercise.min_words != null && exercise.max_words != null && ` (nên viết ${exercise.min_words}–${exercise.max_words} từ)`}
              </span>
              <div className="flex items-center gap-3">
                {!check.ok && answer.length > 0 && <span className="text-[14px] text-bad">{check.message_vi}</span>}
                <Button size="lg" onClick={submit} disabled={!check.ok}>
                  Nộp bài
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
