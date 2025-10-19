import type { User } from '../types';

interface HomePageProps {
  user: User | null;
}

export default function HomePage({ user }: HomePageProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <section>
        <h1 style={{ fontSize: 32, margin: '0 0 12px 0', color: '#1f2937' }}>
          Welcome to BacktestAI
        </h1>
        <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6 }}>
          {user
            ? `You are logged in as ${user.email}.`
            : 'Sign up or log in to access your backtesting workspace.'}
        </p>
      </section>
      <section
        style={{
          display: 'grid',
          gap: 16,
          padding: 24,
          borderRadius: 12,
          background: '#f1f5f9'
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20, color: '#1f2937' }}>Getting started</h2>
        <ul style={{ margin: 0, paddingLeft: 18, color: '#4b5563', lineHeight: 1.6 }}>
          <li>Create an account via the sign-up page.</li>
          <li>Log in to confirm your credentials.</li>
          <li>Explore the dashboard once authentication succeeds.</li>
        </ul>
      </section>
    </div>
  );
}
