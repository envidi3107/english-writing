import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const tree = [
  {
    id: 'L1', position: 1, title: 'Làm quen', description: null, is_published: true, created_at: '',
    topics: [
      {
        id: 'T1', level_id: 'L1', position: 1, title: 'Gia đình', description: null, icon: '👪', is_published: true, created_at: '',
        exercises: [
          {
            id: 'E1', topic_id: 'T1', position: 1, type: 'paragraph', title: 'Gia đình của tôi', prompt: 'Viết về gia đình', source_text: null,
            hints: { vocabulary: [] }, min_words: 25, max_words: 40, reference_answer: null, is_published: true, created_at: '', updated_at: '',
          },
        ],
      },
    ],
  },
];

const deleteRow = vi.fn();
const upsertExercise = vi.fn();
vi.mock('./api', () => ({
  fetchAdminTree: vi.fn(async () => tree),
  deleteRow: (...a: unknown[]) => deleteRow(...a),
  upsertExercise: (...a: unknown[]) => upsertExercise(...a),
  upsertLevel: vi.fn(),
  upsertTopic: vi.fn(),
  swapPositions: vi.fn(),
}));
vi.mock('@/features/practice/api', () => ({ gradeSubmission: vi.fn() }));

import { AdminPage } from './AdminPage';
import { ExerciseFormPage } from './ExerciseFormPage';

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/exercises/new" element={<ExerciseFormPage />} />
          <Route path="/admin/exercises/:id" element={<ExerciseFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  deleteRow.mockReset();
  upsertExercise.mockReset();
});

test('shows translation fields only for translation types', async () => {
  renderAt('/admin/exercises/new?topic=T1');
  const type = await screen.findByLabelText('Loại bài');
  await userEvent.selectOptions(type, 'paragraph');
  expect(screen.queryByLabelText('Văn bản cần dịch')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Số từ tối thiểu')).toBeInTheDocument();
  await userEvent.selectOptions(type, 'translate_vi_en');
  expect(screen.getByLabelText('Văn bản cần dịch')).toBeInTheDocument();
  expect(screen.getByLabelText('Đáp án tham khảo')).toBeInTheDocument();
  expect(screen.queryByLabelText('Số từ tối thiểu')).not.toBeInTheDocument();
});

test('blocks save when min_words > max_words', async () => {
  renderAt('/admin/exercises/E1');
  const min = await screen.findByLabelText('Số từ tối thiểu');
  await userEvent.clear(min);
  await userEvent.type(min, '50');
  await userEvent.click(screen.getByRole('button', { name: 'Lưu bài tập' }));
  expect(await screen.findByText('Số từ tối thiểu phải nhỏ hơn hoặc bằng số từ tối đa.')).toBeInTheDocument();
  expect(upsertExercise).not.toHaveBeenCalled();
});

test('shows hide suggestion when delete is restricted', async () => {
  deleteRow.mockResolvedValue({ ok: false, restricted: true, message_vi: 'Mục này đã có bài làm của học viên nên không xóa được. Hãy tắt "Xuất bản" để ẩn đi.' });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  renderAt('/admin');
  const row = (await screen.findByText('Gia đình của tôi')).closest('li')!;
  await userEvent.click(within(row).getByRole('button', { name: 'Xóa Gia đình của tôi' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Hãy tắt "Xuất bản" để ẩn đi.'));
  expect(deleteRow).toHaveBeenCalledWith('exercises', 'E1');
});
