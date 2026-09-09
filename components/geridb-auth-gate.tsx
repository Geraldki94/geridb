'use client';

import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { Database, KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type AuthStatus = {
  authenticated: boolean;
  setupRequired: boolean;
  platformAuthenticated: boolean;
  authMode: 'platform' | 'password' | null;
  error?: string;
};

type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<'form'>['onSubmit']>
>[0];

export function GeriDbAuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    const response = await fetch('/api/v1/auth', { cache: 'no-store' });
    const data = (await response.json().catch(() => ({}))) as AuthStatus;
    if (!response.ok)
      throw new Error(
        data.error || 'Anmeldestatus konnte nicht geladen werden.',
      );
    setStatus(data);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadStatus().catch((error: unknown) =>
        setMessage(
          error instanceof Error
            ? error.message
            : 'Anmeldestatus konnte nicht geladen werden.',
        ),
      );
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadStatus]);

  async function submit(event: FormSubmitEvent) {
    event.preventDefault();
    setMessage('');
    if (status?.setupRequired && password !== confirmation) {
      setMessage('Die beiden Passwörter stimmen nicht überein.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/v1/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: status?.setupRequired ? 'setup' : 'login',
          name,
          email,
          password,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as AuthStatus;
      if (!response.ok)
        throw new Error(data.error || 'Die Anmeldung ist fehlgeschlagen.');
      setStatus(data);
      setPassword('');
      setConfirmation('');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Die Anmeldung ist fehlgeschlagen.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (status?.authenticated) return children;

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel">
        <div className="auth-brand-mark">
          <Database />
          <span>
            <strong>GeriDB</strong>
            <small>by GH Opticore</small>
          </span>
        </div>
        <div className="auth-brand-copy">
          <span>Sicher. Offen. Selbst gehostet.</span>
          <h1>Deine Datenbank gehört dir.</h1>
          <p>
            Tabellen, APIs und Automationen mit klar geregeltem Zugriff für dein
            Team.
          </p>
        </div>
        <small>Community Edition · MIT</small>
      </section>

      <section className="auth-form-panel">
        <Card className="auth-card">
          <CardHeader>
            <span className="auth-card-icon">
              {status?.setupRequired ? <ShieldCheck /> : <KeyRound />}
            </span>
            <CardTitle>
              {status?.setupRequired
                ? 'Ersten Admin anlegen'
                : 'Bei GeriDB anmelden'}
            </CardTitle>
            <p>
              {status?.setupRequired
                ? 'Dieser Schritt erscheint nur einmal. Es gibt kein voreingestelltes Admin-Passwort.'
                : 'Melde dich mit deiner E-Mail-Adresse und deinem persönlichen Passwort an.'}
            </p>
          </CardHeader>
          <CardContent>
            {!status && !message ? (
              <div className="auth-loading">
                <LoaderCircle /> Anmeldung wird geprüft…
              </div>
            ) : status?.platformAuthenticated ? (
              <div className="auth-denied">
                <ShieldCheck />
                <strong>Noch nicht freigeschaltet</strong>
                <p>
                  Ein GeriDB-Admin muss deine E-Mail-Adresse zuerst hinzufügen.
                </p>
              </div>
            ) : (
              <form className="auth-form" onSubmit={submit}>
                {status?.setupRequired && (
                  <label htmlFor="setup-name">
                    <span>Name</span>
                    <Input
                      id="setup-name"
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Vor- und Nachname"
                    />
                  </label>
                )}
                <label htmlFor="login-email">
                  <span>E-Mail</span>
                  <Input
                    id="login-email"
                    required
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@unternehmen.at"
                  />
                </label>
                <label htmlFor="login-password">
                  <span>Passwort</span>
                  <Input
                    id="login-password"
                    required
                    type="password"
                    minLength={12}
                    maxLength={128}
                    autoComplete={
                      status?.setupRequired
                        ? 'new-password'
                        : 'current-password'
                    }
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  {status?.setupRequired && (
                    <small>Mindestens 12 Zeichen</small>
                  )}
                </label>
                {status?.setupRequired && (
                  <label htmlFor="setup-password-confirmation">
                    <span>Passwort wiederholen</span>
                    <Input
                      id="setup-password-confirmation"
                      required
                      type="password"
                      minLength={12}
                      maxLength={128}
                      autoComplete="new-password"
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                    />
                  </label>
                )}
                {message && <output className="auth-message">{message}</output>}
                <Button className="primary-button auth-submit" disabled={busy}>
                  {busy && <LoaderCircle className="auth-spinner" />}
                  {status?.setupRequired ? 'Admin anlegen' : 'Anmelden'}
                </Button>
              </form>
            )}
            {message && !status && (
              <output className="auth-message">{message}</output>
            )}
          </CardContent>
        </Card>
        <a
          href="https://opticoreconsulting.at/"
          target="_blank"
          rel="noreferrer"
        >
          GH Opticore Consulting
        </a>
      </section>
    </main>
  );
}
