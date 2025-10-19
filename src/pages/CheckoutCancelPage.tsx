import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cancelCheckout } from '../api/client';

export default function CheckoutCancelPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string>('Processing…');

  useEffect(() => {
    let cancelled = false;

    cancelCheckout()
      .then((res) => {
        if (!cancelled) {
          setMessage(res.message || 'Checkout cancelled.');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMessage('Checkout cancelled.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1 style={{ margin: 0, fontSize: 30, color: '#0f172a' }}>Checkout cancelled</h1>
      <p style={{ margin: 0, color: '#1f2937' }}>{message}</p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          type="button"
          onClick={() => navigate('/pricing')}
          style={{
            border: 'none',
            background: '#2563eb',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: 10,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          View pricing
        </button>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          style={{
            border: '1px solid #cbd5f5',
            background: '#eff6ff',
            color: '#1d4ed8',
            padding: '10px 16px',
            borderRadius: 10,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Back to dashboard
        </button>
      </div>
    </div>
  );
}
