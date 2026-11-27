import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, RotateCcw } from 'lucide-react';
import type { ExerciseType, GradeResult, Stars as StarCount } from '@shared/types.ts';
import { isPassed } from '@shared/scoring.ts';
import { Button, Card, Chip, Stars, cx } from '@/components/ui';
import { Celebration, CriteriaBars, ErrorCard, InlineDiff } from './parts';

export interface ResultViewProps {
  answer: string;
  result: GradeResult;
  stars: StarCount;
  xpGained?: number;
  exerciseType: ExerciseType;
  onRetry?: () => void;
  nextHref?: string | null;
  celebrate?: boolean;
}

const HEADLINE: Record<number, string> = {
  0: 'Cố lên, thử lại nhé!',
  1: 'Gần được rồi!',
  2: 'Làm tốt lắm!',
  3: 'Xuất sắc!',
};

export function ResultView({ answer, result, stars, xpGained, exerciseType, onRetry, nextHref, celebrate }: ResultViewProps) {
  const [showModel, setShowModel] = useState(false);
  const passed = isPassed(stars);
  const modelLang = exerciseType === 'translate_en_vi' ? 'Bài dịch mẫu' : 'Bài mẫu';

  return (
    <div className="space-y-6">
      {celebrate && <Celebration />}

      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-indigo px-5 py-4 text-white shadow-[var(--shadow-tactile-indigo)]">
        <Stars value={stars} size={30} className="[&_svg]:animate-[pop-in_.5s_ease-out_both]" />
        <div className="flex-1">
          <p className="text-[21px] font-bold leading-tight">{HEADLINE[stars]}</p>
          <p className="text-[14px] text-white/80">
            {passed ? 'Bạn đã qua bài này.' : 'Cần ít nhất 2 sao để qua bài và mở bài tiếp theo.'}
          </p>
        </div>
        {xpGained !== undefined && xpGained > 0 && <Chip tone="yellow" className="text-[15px]">+{xpGained} XP</Chip>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 text-[16px] text-muted">Bài của bạn sau khi sửa</h2>
            <InlineDiff original={answer} corrected={result.corrected_text} />
          </Card>

          <Card className="border-l-4 border-l-indigo p-5">
            <h2 className="mb-2 text-[16px] text-muted">Cô giáo nhận xét</h2>
            <p className="text-[17px] leading-relaxed">{result.general_feedback_vi}</p>
          </Card>

          <section>
            <h2 className="mb-3 text-[18px]">
              {result.errors.length > 0 ? `${result.errors.length} lỗi cần sửa` : 'Không có lỗi nào. Tuyệt vời!'}
            </h2>
            {result.errors.length > 0 && (
              <ul className="space-y-3" aria-label="Các lỗi cần sửa">
                {result.errors.map((e, i) => (
                  <ErrorCard key={i} error={e} />
                ))}
              </ul>
            )}
          </section>

          <Card className="p-0">
            <button
              type="button"
              aria-expanded={showModel}
              onClick={() => setShowModel((v) => !v)}
              className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left font-semibold"
            >
              {modelLang}
              <ChevronDown size={20} className={cx('transition-transform', showModel && 'rotate-180')} aria-hidden />
            </button>
            {showModel && <p className="px-5 pb-5 text-[17px] leading-relaxed whitespace-pre-wrap">{result.model_answer}</p>}
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <CriteriaBars criteria={result.criteria} overall={result.overall_score} />
          </Card>
          <div className="flex flex-col gap-3">
            {nextHref && passed && (
              <Link
                to={nextHref}
                className="inline-flex h-13 items-center justify-center rounded-xl bg-indigo px-6 text-[17px] font-semibold text-white shadow-[var(--shadow-tactile-indigo)] active:translate-y-[2px] active:shadow-none"
              >
                Bài tiếp theo
              </Link>
            )}
            {onRetry && (
              <Button variant="secondary" size="lg" onClick={onRetry}>
                <RotateCcw size={18} aria-hidden /> Làm lại
              </Button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
