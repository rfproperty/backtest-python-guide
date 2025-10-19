import type { User } from '../types';

interface HomePageProps {
  user: User | null;
}

export default function HomePage({ user }: HomePageProps) {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-3xl font-bold text-foreground mb-3">
          Welcome to BacktestAI
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          {user
            ? `You are logged in as ${user.email}.`
            : 'Sign up or log in to access your backtesting workspace.'}
        </p>
      </section>
      <section className="bg-muted rounded-xl p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Getting started</h2>
        <ul className="space-y-2 text-muted-foreground leading-relaxed list-disc pl-5">
          <li>Create an account via the sign-up page.</li>
          <li>Log in to confirm your credentials.</li>
          <li>Explore the dashboard once authentication succeeds.</li>
        </ul>
      </section>
    </div>
  );
}
