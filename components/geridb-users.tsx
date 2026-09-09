'use client';

import {
  type ComponentProps,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { CheckCircle2, Mail, ShieldCheck, Trash2, UserPlus, UsersRound } from 'lucide-react';
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
  admin: 'Datenbanken, Felder, Benutzer, API-Schlüssel und Datensätze verwalten',
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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const loadUsers = useCallback(async () => {
    const response = await fetch('/api/v1/users');
    const data = (await response.json().catch(() => ({}))) as {
      users?: WorkspaceUser[];
      error?: string;
    };
    if (!response.ok) throw new Error(data.error || 'Benutzer konnten nicht geladen werden.');
    setUsers(data.users || []);
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
        body: JSON.stringify({ name, email, role }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Benutzer konnte nicht angelegt werden.');
      setName('');
      setEmail('');
      setRole('viewer');
      await loadUsers();
      setMessage('Benutzer wurde vorgemerkt und beim ersten Anmelden zugeordnet.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Benutzer konnte nicht angelegt werden.');
    } finally {
      setBusy(false);
    }
  }

  async function updateUser(id: string, changes: Partial<Pick<WorkspaceUser, 'role' | 'active'>>) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/v1/users', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, ...changes }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Benutzer konnte nicht geändert werden.');
      await loadUsers();
      setMessage('Berechtigung gespeichert.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Benutzer konnte nicht geändert werden.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(user: WorkspaceUser) {
    if (!window.confirm(`${user.email} wirklich aus dem Workspace entfernen?`)) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/v1/users?id=${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Benutzer konnte nicht gelöscht werden.');
      await loadUsers();
      setMessage('Benutzer entfernt.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Benutzer konnte nicht gelöscht werden.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="users-view">
      <div className="users-intro">
        <div>
          <span className="users-kicker"><ShieldCheck /> Rollen &amp; Zugriff</span>
          <h2>Benutzerverwaltung</h2>
          <p>Lege fest, wer GeriDB administrieren, Datensätze bearbeiten oder nur lesen darf.</p>
        </div>
        <Badge variant="secondary">{users.filter((user) => user.active).length} aktiv</Badge>
      </div>

      <div className="users-layout">
        <Card className="users-list-card">
          <CardHeader>
            <CardTitle><UsersRound /> Workspace-Benutzer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="users-list">
              {users.map((user) => (
                <article className={`user-row ${user.active ? '' : 'inactive'}`} key={user.id}>
                  <span className="user-avatar">{(user.name || user.email).slice(0, 2).toUpperCase()}</span>
                  <div className="user-identity">
                    <strong>{user.name || 'Ohne Namen'} {user.id === currentUser.id && <small>Du</small>}</strong>
                    <span><Mail /> {user.email || 'Lokaler Administrator'}</span>
                    <small>{user.platformUserId ? 'Anmeldung verknüpft' : 'Einladung vorgemerkt'}</small>
                  </div>
                  <Select
                    value={user.role}
                    disabled={busy}
                    onValueChange={(value) => void updateUser(user.id, { role: value as WorkspaceRole })}
                  >
                    <SelectTrigger aria-label={`Rolle für ${user.email || user.name}`} className="user-role-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_LABELS) as WorkspaceRole[]).map((value) => (
                        <SelectItem key={value} value={value}>{ROLE_LABELS[value]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <label className="user-active-toggle">
                    <Switch
                      checked={user.active}
                      disabled={busy || user.id === currentUser.id}
                      onCheckedChange={(active) => void updateUser(user.id, { active })}
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
              {!users.length && <p className="users-empty">Noch keine Benutzer vorhanden.</p>}
            </div>
          </CardContent>
        </Card>

        <div className="users-side">
          <Card className="invite-card">
            <CardHeader><CardTitle><UserPlus /> Benutzer hinzufügen</CardTitle></CardHeader>
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
                <label>
                  <span>Rolle</span>
                  <Select value={role} onValueChange={(value) => setRole(value as WorkspaceRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_LABELS) as WorkspaceRole[]).map((value) => (
                        <SelectItem key={value} value={value}>{ROLE_LABELS[value]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <small>{ROLE_DESCRIPTIONS[role]}</small>
                </label>
                <Button className="primary-button" disabled={busy || !email.trim()} type="submit">
                  <UserPlus /> {busy ? 'Bitte warten…' : 'Benutzer hinzufügen'}
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card className="access-info-card">
            <CardContent>
              <CheckCircle2 />
              <div><strong>Sicher zugeordnet</strong><p>Die E-Mail wird beim ersten Zugriff mit der angemeldeten Sites-Identität verknüpft.</p></div>
            </CardContent>
          </Card>
        </div>
      </div>
      {message && <output className="users-message">{message}</output>}
    </div>
  );
}
