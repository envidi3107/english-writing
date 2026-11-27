import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ExerciseRow } from '@/lib/db';

const exercise: ExerciseRow = {
  id: 'E1', topic_id: 'T1', position: 1, type: 'paragraph', title: 'Gia đình của tôi', prompt: 'Viết về gia đình bạn.',
  source_text: null, hints: { vocabulary: ['father', 'mother'], starter: 'There are' }, min_words: 25, max_words: 40,
  reference_answer: null, is_published: true, published_at: null, created_at: '', updated_at: '',
};

const gradeSubmission = vi.fn();
const ctx = { isOpen: true, isFetching: false };
vi.mock('./api', () => ({
  useExerciseContext: () => ({
    isLoading: false,
    isFetching: ctx.isFetching,
    error: null,
    data: { exercise, levelPosition: 1, levelTitle: 'Làm quen', topic: { id: 'T1', title: 'Gia đình', icon: '👨' }, isOpen: ctx.isOpen, nextExerciseId: 'E2', best: undefined },
  }),
  gradeSubmission: (...args: unknown[]) => gradeSubmission(...args),
}));

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ refreshProfile: async () => {} }),
}));

import { ExercisePage } from './ExercisePage';

function renderPage() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/exercises/E1']}>
        <Routes>
          <Route path="/exercises/:exerciseId" element={<ExercisePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  gradeSubmission.mockReset();
  ctx.isOpen = true;
  ctx.isFetching = false;
});

test('submit disabled for whitespace answer', async () => {
  renderPage();
  await userEvent.type(screen.getByRole('textbox', { name: 'Bài viết của bạn' }), '   ');
  expect(screen.getByRole('button', { name: 'Nộp bài' })).toBeDisabled();
});

test('keeps draft and shows retry on ai_error', async () => {
  gradeSubmission.mockResolvedValue({ ok: false, code: 'ai_error', message_vi: 'AI đang bận hoặc gặp lỗi.' });
  renderPage();
  const box = screen.getByRole('textbox', { name: 'Bài viết của bạn' });
  await userEvent.type(box, 'My family have four people.');
  await userEvent.click(screen.getByRole('button', { name: 'Nộp bài' }));
  await waitFor(() => expect(screen.getByText('AI đang bận hoặc gặp lỗi.')).toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Bài viết của bạn' })).toHaveValue('My family have four people.');
  expect(localStorage.getItem('draft:E1')).toBe('My family have four people.');
});

test('hint chip inserts the word into the answer', async () => {
  renderPage();
  await userEvent.click(screen.getByRole('button', { name: 'Chèn từ father' }));
  expect(screen.getByRole('textbox', { name: 'Bài viết của bạn' })).toHaveValue('father ');
});

test('waits for fresh progress instead of flashing "locked" right after unlocking', () => {
  ctx.isOpen = false;
  ctx.isFetching = true;
  renderPage();
  expect(screen.queryByText('Bài này chưa mở')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toBeInTheDocument();
});

test('shows locked once progress is fresh', () => {
  ctx.isOpen = false;
  renderPage();
  expect(screen.getByText('Bài này chưa mở')).toBeInTheDocument();
});
