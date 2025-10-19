import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ADMIN_EMAIL } from '../config';
import type { User } from '../types';

interface LayoutProps {
  user: User | null;
  onLogout: () => void;
  children: ReactNode;
}

export default function Layout({ user, onLogout, children }: LayoutProps) {
  return (
    <div style={{ width: '100%', maxWidth: 640, padding: '48px 32px' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32
        }}
      >
        <Link to="/" style={{ textDecoration: 'none', color: '#111827', fontSize: 24, fontWeight: 600 }}>
          BacktestAI
        </Link>
        <nav style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 14 }}>
          <Link to="/pricing" style={{ color: '#111827', textDecoration: 'none', fontWeight: 500 }}>
            Pricing
          </Link>
          <Link to="/contact" style={{ color: '#111827', textDecoration: 'none', fontWeight: 500 }}>
            Contact
          </Link>
          {user ? (
            <>
              <Link to="/dashboard" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                Dashboard
              </Link>
              <Link to="/account" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                Account
              </Link>
              {user.email.toLowerCase() === ADMIN_EMAIL && (
                <Link to="/admin/train_ai" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                  Admin AI
                </Link>
              )}
              <span style={{ color: '#4b5563' }}>{user.email}</span>
              <button
                onClick={onLogout}
                style={{
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  padding: '8px 14px',
                  borderRadius: 8,
                  cursor: 'pointer'
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                Login
              </Link>
              <Link
                to="/signup"
                style={{
                  color: '#fff',
                  background: '#2563eb',
                  textDecoration: 'none',
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontWeight: 500
                }}
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>
      <main
        style={{
          background: '#fff',
          padding: '32px',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(30, 64, 175, 0.15)'
        }}
      >
        {children}
      </main>
    </div>
  );
}
