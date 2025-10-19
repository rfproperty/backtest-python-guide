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
    <div className="max-w-2xl mx-auto my-12 bg-muted rounded-2xl p-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-foreground mb-3">Contact Us</h1>
      <p className="text-muted-foreground mb-6">
        Have questions about BacktestAI? Leave us a message and we'll get back to you in one business day.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2" htmlFor="name">
          <span className="text-sm font-semibold text-foreground">Your Name</span>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={form.name}
            onChange={handleChange}
            className="rounded-xl border border-input bg-background px-4 py-3 text-foreground focus:ring-2 focus:ring-ring focus:outline-none transition-all"
          />
        </label>

        <label className="flex flex-col gap-2" htmlFor="email">
          <span className="text-sm font-semibold text-foreground">Email</span>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            className="rounded-xl border border-input bg-background px-4 py-3 text-foreground focus:ring-2 focus:ring-ring focus:outline-none transition-all"
          />
        </label>

        <label className="flex flex-col gap-2" htmlFor="message">
          <span className="text-sm font-semibold text-foreground">Message</span>
          <textarea
            id="message"
            name="message"
            rows={5}
            required
            value={form.message}
            onChange={handleChange}
            className="rounded-xl border border-input bg-background px-4 py-3 text-foreground resize-vertical focus:ring-2 focus:ring-ring focus:outline-none transition-all"
          />
        </label>

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="bg-gradient-primary text-primary-foreground px-4 py-3 rounded-xl font-semibold hover:shadow-glow transition-all disabled:opacity-70"
        >
          {status === 'submitting' ? 'Sending…' : 'Send message'}
        </button>
      </form>

      {status === 'success' && (
        <p className="mt-4 text-success font-semibold">Thanks! We received your message.</p>
      )}
      {status === 'error' && error && (
        <p className="mt-4 text-destructive font-semibold">{error}</p>
      )}
    </div>
  );
}
