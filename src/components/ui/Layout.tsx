import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ADMIN_EMAIL } from '@/config';
import type { User } from '@/types';

interface LayoutProps {
  user: User | null;
  onLogout: () => void;
  children: ReactNode;
}

export default function Layout({ user, onLogout, children }: LayoutProps) {
  return (
    <div className="w-full max-w-4xl px-8 py-12 mx-auto animate-fade-in">
      <header className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <Link 
          to="/" 
          className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent hover:opacity-80 transition-opacity"
        >
          BacktestAI
        </Link>
        <nav className="flex gap-6 items-center text-sm flex-wrap">
          <Link to="/pricing" className="font-medium text-foreground hover:text-primary transition-colors">
            Pricing
          </Link>
          <Link to="/contact" className="font-medium text-foreground hover:text-primary transition-colors">
            Contact
          </Link>
          {user ? (
            <>
              <Link to="/dashboard" className="font-medium text-primary hover:text-primary-glow transition-colors">
                Dashboard
              </Link>
              <Link to="/account" className="font-medium text-primary hover:text-primary-glow transition-colors">
                Account
              </Link>
              {user.email.toLowerCase() === ADMIN_EMAIL && (
                <Link to="/admin/train_ai" className="font-medium text-primary hover:text-primary-glow transition-colors">
                  Admin AI
                </Link>
              )}
              <span className="text-muted-foreground text-xs">{user.email}</span>
              <button
                onClick={onLogout}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-lg font-semibold transition-all hover:shadow-lg"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="font-medium text-primary hover:text-primary-glow transition-colors">
                Login
              </Link>
              <Link
                to="/signup"
                className="bg-gradient-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold hover:shadow-glow transition-all"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className="bg-card rounded-2xl p-8 shadow-xl border border-border">
        {children}
      </main>
    </div>
  );
}
