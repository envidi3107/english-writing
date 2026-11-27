import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { EmptyState, PageSpinner } from '@/components/ui';
import { ResultView } from '@/features/results/ResultView';
import { formatDateTimeVi, useSubmission } from '@/features/profile/api';

export function SubmissionPage() {
  const { id = '' } = useParams();
  const { data, isLoading, error } = useSubmission(id);
  if (isLoading) return <PageSpinner />;
  if (error || !data) {
    return <EmptyState title="Không tìm thấy bài đã nộp" action={<Link className="font-semibold text-indigo" to="/submissions">Về lịch sử</Link>} />;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/submissions" className="inline-flex items-center gap-1 text-[15px] font-semibold text-muted hover:text-ink">
        <ChevronLeft size={18} aria-hidden /> Lịch sử
      </Link>
      <header className="mt-4 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[14px] text-muted">Nộp lúc {formatDateTimeVi(data.created_at)}</p>
          <h1 className="text-[28px] leading-tight">{data.exercise?.title ?? 'Bài tập đã ẩn'}</h1>
        </div>
        {data.exercise && (
          <Link to={`/exercises/${data.exercise_id}`} className="rounded-xl px-3 py-2 font-semibold text-indigo hover:bg-indigo-soft">
            Làm lại bài này
          </Link>
        )}
      </header>
      <ResultView answer={data.answer} result={data.result} stars={data.stars} exerciseType={data.exercise?.type ?? 'paragraph'} />
    </div>
  );
}
