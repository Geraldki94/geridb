'use client';

import { type ComponentProps, useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  LockKeyhole,
  LogOut,
  Mail,
  ShieldCheck,
  Trash2,
  UserPlus,
  UsersRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export type WorkspaceRole = 'admin' | 'editor' | 'viewer';

export type WorkspaceUser = {
  id: string;
  platformUserId: string | null;
  email: string;
  name: string;
  role: WorkspaceRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string | null;
  passwordConfigured?: boolean;
};

export type WorkspaceUserSummary = Pick<
  WorkspaceUser,
  'id' | 'email' | 'name' | 'role' | 'active'
>;

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  admin: 'Admin',
  editor: 'Bearbeiter',
  viewer: 'Leser',
};

const ROLE_DESCRIPTIONS: Record<WorkspaceRole, string> = {
  admin:
    'Datenbanken, Felder, Benutzer, API-Schlüssel und Datensätze verwalten',
  editor: 'Datensätze lesen, anlegen, ändern und löschen',
  viewer: 'Tabellen und Dashboards ausschließlich lesen',
};

type Props = {
  currentUser: WorkspaceUserSummary;
};

type FormSubmitEvent = Parameters<
  NonNullable<ComponentProps<'form'>['onSubmit']>
>[0];

export default function GeriDbUsers({ currentUser }: Props) {
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('viewer');
  const [password, setPassword] = useState('');
  const [editUserId, setEditUserId] = useState('');
  const [editName, setEditName] = useState('');
  const [replacementPassword, setReplacementPassword] = useState('');
  const [authMode, setAuthMode] = useState<'platform' | 'password' | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const loadUsers = useCallback(async () => {
    const response = await fetch('/api/v1/users');
    const data = (await response.json().catch(() => ({}))) as {
      users?: WorkspaceUser[];
      error?: string;
      authMode?: 'platform' | 'password' | null;
    };
    if (!response.ok)
      throw new Error(data.error || 'Benutzer konnten nicht geladen werden.');
    setUsers(data.users || []);
    setAuthMode(data.authMode || null);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadUsers().catch((error: unknown) =>
        setMessage(
          error instanceof Error
            ? error.message
            : 'Benutzer konnten nicht geladen werden.',
        ),
      );
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadUsers]);

  async function inviteUser(event: FormSubmitEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, role, password }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || 'Benutzer konnte nicht angelegt werden.');
      setName('');
      setEmail('');
      setRole('viewer');
      setPassword('');
      await loadUsers();
      setMessage(
        authMode === 'password'
          ? 'Benutzer mit lokalem Zugang angelegt.'
          : 'Benutzer wurde vorgemerkt und beim ersten Anmelden zugeordnet.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Benutzer konnte nicht angelegt werden.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function updateUser(
    id: string,
    changes: Partial<Pick<WorkspaceUser, 'role' | 'active'>>,
  ) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/v1/users', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, ...changes }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || 'Benutzer konnte nicht geändert werden.');
      await loadUsers();
      setMessage('Berechtigung gespeichert.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Benutzer konnte nicht geändert werden.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(user: WorkspaceUser) {
    if (!window.confirm(`${user.email} wirklich aus dem Workspace entfernen?`))
      return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(
        `/api/v1/users?id=${encodeURIComponent(user.id)}`,
        {
          method: 'DELETE',
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || 'Benutzer konnte nicht gelöscht werden.');
      await loadUsers();
      setMessage('Benutzer entfernt.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Benutzer konnte nicht gelöscht werden.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    await fetch('/api/v1/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    }).catch(() => undefined);
    window.location.reload();
  }

  async function updateCredentials(event: FormSubmitEvent) {
    event.preventDefault();
    if (!editUserId) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/v1/users', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: editUserId,
          name: editName,
          ...(replacementPassword ? { password: replacementPassword } : {}),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || 'Zugang konnte nicht geändert werden.');
      setReplacementPassword('');
      await loadUsers();
      setMessage('Name und Zugang wurden aktualisiert.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Zugang konnte nicht geändert werden.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="users-view">
      <div className="users-intro">
        <div>
          <span className="users-kicker">
            <ShieldCheck /> Rollen &amp; Zugriff
          </span>
          <h2>Benutzerverwaltung</h2>
          <p>
            Lege fest, wer GeriDB administrieren, Datensätze bearbeiten oder nur
            lesen darf.
          </p>
        </div>
        <div className="users-intro-actions">
          <Badge variant="secondary">
            {users.filter((user) => user.active).length} aktiv
          </Badge>
          {authMode === 'password' && (
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              <LogOut /> Abmelden
            </Button>
          )}
        </div>
      </div>

      <div className="users-layout">
        <Card className="users-list-card">
          <CardHeader>
            <CardTitle>
              <UsersRound /> Workspace-Benutzer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="users-list">
              {users.map((user) => (
                <article
                  className={`user-row ${user.active ? '' : 'inactive'}`}
                  key={user.id}
                >
                  <span className="user-avatar">
                    {(user.name || user.email).slice(0, 2).toUpperCase()}
                  </span>
                  <div className="user-identity">
                    <strong>
                      {user.name || 'Ohne Namen'}{' '}
                      {user.id === currentUser.id && <small>Du</small>}
                    </strong>
                    <span>
                      <Mail /> {user.email || 'Lokaler Administrator'}
                    </span>
                    <small>
                      {authMode === 'password'
                        ? user.passwordConfigured
                          ? 'Passwort eingerichtet'
                          : 'Kein Passwort eingerichtet'
                        : user.platformUserId
                          ? 'Anmeldung verknüpft'
                          : 'Einladung vorgemerkt'}
                    </small>
                  </div>
                  <Select
                    value={user.role}
                    disabled={busy}
                    onValueChange={(value) =>
                      void updateUser(user.id, { role: value as WorkspaceRole })
                    }
                  >
                    <SelectTrigger
                      aria-label={`Rolle für ${user.email || user.name}`}
                      className="user-role-select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_LABELS) as WorkspaceRole[]).map(
                        (value) => (
                          <SelectItem key={value} value={value}>
                            {ROLE_LABELS[value]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <label className="user-active-toggle">
                    <Switch
                      checked={user.active}
                      disabled={busy || user.id === currentUser.id}
                      onCheckedChange={(active) =>
                        void updateUser(user.id, { active })
                      }
                    />
                    <span>{user.active ? 'Aktiv' : 'Gesperrt'}</span>
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={busy || user.id === currentUser.id}
                    aria-label={`${user.email || user.name} entfernen`}
                    onClick={() => void deleteUser(user)}
                  >
                    <Trash2 />
                  </Button>
                </article>
              ))}
              {!users.length && (
                <p className="users-empty">Noch keine Benutzer vorhanden.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="users-side">
          <Card className="invite-card">
            <CardHeader>
              <CardTitle>
                <UserPlus /> Benutzer hinzufügen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={inviteUser}>
                <label htmlFor="workspace-user-name">Name</label>
                <Input
                  id="workspace-user-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Vor- und Nachname"
                />
                <label htmlFor="workspace-user-email">E-Mail</label>
                <Input
                  id="workspace-user-email"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@unternehmen.at"
                />
                {authMode === 'password' && (
                  <>
                    <label htmlFor="workspace-user-password">
                      Temporäres Passwort
                    </label>
                    <Input
                      id="workspace-user-password"
                      required
                      type="password"
                      minLength={12}
                      maxLength={128}
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    <small className="invite-password-hint">
                      <LockKeyhole /> Mindestens 12 Zeichen. Teile das Passwort
                      über einen sicheren Kanal.
                    </small>
                  </>
                )}
                <label>
                  <span>Rolle</span>
                  <Select
                    value={role}
                    onValueChange={(value) => setRole(value as WorkspaceRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_LABELS) as WorkspaceRole[]).map(
                        (value) => (
                          <SelectItem key={value} value={value}>
                            {ROLE_LABELS[value]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <small>{ROLE_DESCRIPTIONS[role]}</small>
                </label>
                <Button
                  className="primary-button"
                  disabled={
                    busy ||
                    !email.trim() ||
                    (authMode === 'password' && password.length < 12)
                  }
                  type="submit"
                >
                  <UserPlus /> {busy ? 'Bitte warten…' : 'Benutzer hinzufügen'}
                </Button>
              </form>
            </CardContent>
          </Card>
          {authMode === 'password' && (
            <Card className="invite-card">
              <CardHeader>
                <CardTitle>
                  <LockKeyhole /> Zugang bearbeiten
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={updateCredentials}>
                  <label htmlFor="workspace-user-edit-select">Benutzer</label>
                  <Select
                    value={editUserId}
                    onValueChange={(value) => {
                      if (!value) return;
                      setEditUserId(value);
                      setEditName(
                        users.find((user) => user.id === value)?.name || '',
                      );
                      setReplacementPassword('');
                    }}
                  >
                    <SelectTrigger id="workspace-user-edit-select">
                      <SelectValue placeholder="Benutzer auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <label htmlFor="workspace-user-edit-name">Anzeigename</label>
                  <Input
                    id="workspace-user-edit-name"
                    disabled={!editUserId}
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                  />
                  <label htmlFor="workspace-user-replacement-password">
                    Neues Passwort <small>optional</small>
                  </label>
                  <Input
                    id="workspace-user-replacement-password"
                    disabled={!editUserId}
                    type="password"
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    value={replacementPassword}
                    onChange={(event) =>
                      setReplacementPassword(event.target.value)
                    }
                  />
                  <Button
                    className="primary-button"
                    disabled={
                      busy ||
                      !editUserId ||
                      (replacementPassword.length > 0 &&
                        replacementPassword.length < 12)
                    }
                    type="submit"
                  >
                    <LockKeyhole /> Zugang speichern
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
          <Card className="access-info-card">
            <CardContent>
              <CheckCircle2 />
              <div>
                <strong>
                  {authMode === 'password'
                    ? 'Lokale Anmeldung'
                    : 'Sicher zugeordnet'}
                </strong>
                <p>
                  {authMode === 'password'
                    ? 'Passwörter werden ausschließlich als starker Hash gespeichert. Admins können Zugänge zurücksetzen.'
                    : 'Die E-Mail wird beim ersten Zugriff mit der angemeldeten Sites-Identität verknüpft.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {message && <output className="users-message">{message}</output>}
    </div>
  );
}
