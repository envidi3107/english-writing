import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button, ErrorNote, TextField } from '@/components/ui';
import { AuthLayout, authErrorVi } from './AuthLayout';
import { useAuth } from './AuthProvider';

function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/learn';
}

export function LoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = safeNext(params.get('next'));

  if (session) return <Navigate to={next} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError(authErrorVi(err.message));
    else navigate(next, { replace: true });
  }

  return (
    <AuthLayout
      title="Đăng nhập"
      subtitle="Tiếp tục bài học của bạn."
      footer={
        <>
          Chưa có tài khoản? <Link className="font-semibold text-indigo" to="/signup">Đăng ký</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <ErrorNote>{error}</ErrorNote>}
        <TextField id="email" label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField id="password" label="Mật khẩu" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="text-right text-[14px]">
          <Link to="/forgot-password" className="font-semibold text-indigo">Quên mật khẩu?</Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!email || !password}>
          Đăng nhập
        </Button>
      </form>
    </AuthLayout>
  );
}

export function SignupPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/learn" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError('Mật khẩu cần ít nhất 6 ký tự.');
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (err) setError(authErrorVi(err.message));
    else if (data.session) navigate('/learn', { replace: true });
    else setNotice('Đã tạo tài khoản. Hãy kiểm tra email để xác nhận rồi đăng nhập.');
  }

  return (
    <AuthLayout
      title="Tạo tài khoản"
      subtitle="Bắt đầu từ bài đầu tiên: giới thiệu bản thân bằng tiếng Anh."
      footer={
        <>
          Đã có tài khoản? <Link className="font-semibold text-indigo" to="/login">Đăng nhập</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <ErrorNote>{error}</ErrorNote>}
        {notice && <div className="rounded-xl bg-good-soft px-4 py-3 text-good">{notice}</div>}
        <TextField id="email" label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField
          id="password"
          label="Mật khẩu"
          type="password"
          autoComplete="new-password"
          hint="Ít nhất 6 ký tự."
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!email || !password}>
          Tạo tài khoản
        </Button>
      </form>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (err) setError(authErrorVi(err.message));
    else setSent(true);
  }

  return (
    <AuthLayout
      title="Quên mật khẩu"
      subtitle="Nhập email, chúng tôi sẽ gửi liên kết để bạn đặt mật khẩu mới."
      footer={<Link className="font-semibold text-indigo" to="/login">Quay lại đăng nhập</Link>}
    >
      {sent ? (
        <div className="rounded-xl bg-good-soft px-4 py-3 text-good">Đã gửi liên kết đặt lại mật khẩu tới {email}. Hãy kiểm tra hộp thư.</div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && <ErrorNote>{error}</ErrorNote>}
          <TextField id="email" label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!email}>
            Gửi liên kết
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError('Mật khẩu cần ít nhất 6 ký tự.');
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) setError(authErrorVi(err.message));
    else navigate('/learn', { replace: true });
  }

  return (
    <AuthLayout title="Đặt mật khẩu mới">
      {!loading && !session ? (
        <ErrorNote action={<Link className="font-semibold underline" to="/forgot-password">Gửi lại</Link>}>
          Liên kết đã hết hạn hoặc không hợp lệ.
        </ErrorNote>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && <ErrorNote>{error}</ErrorNote>}
          <TextField id="password" label="Mật khẩu mới" type="password" autoComplete="new-password" hint="Ít nhất 6 ký tự." value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!password}>
            Lưu mật khẩu
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
