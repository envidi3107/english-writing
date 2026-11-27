import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { GradeResult } from '@shared/types.ts';
import { ResultView } from './ResultView';

const result: GradeResult = {
  overall_score: 7.2,
  criteria: [
    { key: 'task', label_vi: 'Đúng đề', score: 9 },
    { key: 'grammar', label_vi: 'Ngữ pháp', score: 6 },
    { key: 'vocabulary', label_vi: 'Từ vựng', score: 7 },
    { key: 'coherence', label_vi: 'Mạch lạc', score: 7 },
  ],
  corrected_text: 'My family has four people.',
  errors: [
    { original: 'have', correction: 'has', type: 'grammar', explanation_vi: 'Chủ ngữ số ít đi với has.' },
    { original: 'peoples', correction: 'people', type: 'vocabulary', explanation_vi: 'People đã là số nhiều.' },
  ],
  general_feedback_vi: 'Bài viết rõ ràng!',
  model_answer: 'There are four people in my family.',
};

function renderView() {
  return render(
    <MemoryRouter>
      <ResultView answer="My family have four peoples." result={result} stars={2} xpGained={20} exerciseType="paragraph" />
    </MemoryRouter>,
  );
}

test('renders one card per error with Vietnamese type label', () => {
  renderView();
  const list = screen.getByRole('list', { name: 'Các lỗi cần sửa' });
  const items = within(list).getAllByRole('listitem');
  expect(items).toHaveLength(2);
  expect(within(items[0]).getByText('Ngữ pháp')).toBeInTheDocument();
  expect(within(items[1]).getByText('Từ vựng')).toBeInTheDocument();
  expect(within(items[0]).getByText('Chủ ngữ số ít đi với has.')).toBeInTheDocument();
});

test('model answer is collapsed by default', () => {
  renderView();
  const toggle = screen.getByRole('button', { name: /Bài mẫu/ });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText('There are four people in my family.')).not.toBeInTheDocument();
});

test('shows stars, xp and teacher feedback', () => {
  renderView();
  expect(screen.getByRole('img', { name: '2 trên 3 sao' })).toBeInTheDocument();
  expect(screen.getByText('+20 XP')).toBeInTheDocument();
  expect(screen.getByText('Bài viết rõ ràng!')).toBeInTheDocument();
});
