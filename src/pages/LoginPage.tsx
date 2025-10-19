import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL, login } from '../api/client';
import type { User } from '../types';

interface LoginPageProps {
  onSuccess: (user: User) => void;
}

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google/login`;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email.toLowerCase(), password);
      onSuccess(user);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to login.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Log in</h1>
        <p className="mt-2 text-muted-foreground">Access your BacktestAI account.</p>
      </div>
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-border bg-card text-foreground font-semibold hover:bg-muted transition-all"
      >
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google logo"
          className="w-5 h-5"
        />
        Continue with Google
      </button>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-muted-foreground text-xs">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none transition-all"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none transition-all"
        />
      </label>
      {error && (
        <p className="text-destructive text-sm font-medium">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="bg-gradient-primary text-primary-foreground px-4 py-3 rounded-lg text-base font-semibold hover:shadow-glow transition-all disabled:opacity-70"
      >
        {loading ? 'Signing in…' : 'Log in'}
      </button>
      <p className="text-sm text-muted-foreground">
        No account yet?{' '}
        <Link to="/signup" className="text-primary font-semibold hover:text-primary-glow transition-colors">
          Create one
        </Link>
      </p>
    </form>
  );
}
