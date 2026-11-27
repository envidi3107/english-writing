import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';
import * as auth from './AuthProvider';

function LoginProbe() {
  const loc = useLocation();
  return <div>login page {loc.search}</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route path="/learn" element={<RequireAuth><div>secret roadmap</div></RequireAuth>} />
      </Routes>
    </MemoryRouter>,
  );
}

const baseAuth = { profile: null, isAdmin: false, refreshProfile: async () => {}, signOut: async () => {} };

test('redirects to /login with next when no session', () => {
  vi.spyOn(auth, 'useAuth').mockReturnValue({ ...baseAuth, session: null, loading: false });
  renderAt('/learn');
  expect(screen.getByText(/login page/)).toHaveTextContent('?next=%2Flearn');
});

test('renders children when session exists', () => {
  vi.spyOn(auth, 'useAuth').mockReturnValue({ ...baseAuth, session: {} as never, loading: false });
  renderAt('/learn');
  expect(screen.getByText('secret roadmap')).toBeInTheDocument();
});

test('shows nothing but a spinner while loading', () => {
  vi.spyOn(auth, 'useAuth').mockReturnValue({ ...baseAuth, session: null, loading: true });
  renderAt('/learn');
  expect(screen.queryByText(/login page/)).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toBeInTheDocument();
});
