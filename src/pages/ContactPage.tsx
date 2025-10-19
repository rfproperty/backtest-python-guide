import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../types';

interface ContactPageProps {
  user: User | null;
}

interface ContactFormState {
  name: string;
  email: string;
  message: string;
}

const INITIAL_FORM: ContactFormState = {
  name: '',
  email: '',
  message: ''
};

export default function ContactPage({ user }: ContactPageProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState<ContactFormState>({
    name: user?.email?.split('@')[0] ?? '',
    email: user?.email ?? '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('submitting');
    setError(null);

    try {
      const response = await fetch('https://formspree.io/f/mqkrnela', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        throw new Error('Failed to send message.');
      }

      setStatus('success');
      setForm(INITIAL_FORM);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '48px auto', background: '#f9fafb', borderRadius: 20, padding: 32 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Contact Us</h1>
      <p style={{ color: '#4b5563', marginBottom: 24 }}>
        Have questions about BacktestAI? Leave us a message and we’ll get back to you in one business day.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }} htmlFor="name">
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>Your Name</span>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={form.name}
            onChange={handleChange}
            style={{
              borderRadius: 12,
              border: '1px solid #d1d5db',
              padding: '10px 14px',
              fontSize: 15
            }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }} htmlFor="email">
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>Email</span>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            style={{
              borderRadius: 12,
              border: '1px solid #d1d5db',
              padding: '10px 14px',
              fontSize: 15
            }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }} htmlFor="message">
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1f2937' }}>Message</span>
          <textarea
            id="message"
            name="message"
            rows={5}
            required
            value={form.message}
            onChange={handleChange}
            style={{
              borderRadius: 12,
              border: '1px solid #d1d5db',
              padding: '10px 14px',
              fontSize: 15,
              resize: 'vertical'
            }}
          />
        </label>

        <button
          type="submit"
          disabled={status === 'submitting'}
          style={{
            border: 'none',
            borderRadius: 12,
            background: '#2563eb',
            color: '#fff',
            padding: '12px 16px',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {status === 'submitting' ? 'Sending…' : 'Send message'}
        </button>
      </form>

      {status === 'success' && (
        <p style={{ marginTop: 16, color: '#047857', fontWeight: 600 }}>Thanks! We received your message.</p>
      )}
      {status === 'error' && error && (
        <p style={{ marginTop: 16, color: '#b91c1c', fontWeight: 600 }}>{error}</p>
      )}
    </div>
  );
}
