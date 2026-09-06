'use client';

import {
  type ChangeEvent,
  type SyntheticEvent,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowDownAZ,
  ArrowUpAZ,
  BarChart3,
  Braces,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock3,
  Copy,
  CreditCard,
  Download,
  EyeOff,
  ExternalLink,
  Filter,
  FileUp,
  GitFork,
  Grid2X2,
  GripVertical,
  LayoutDashboard,
  Link2,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Star,
  Table2,
  TextCursorInput,
  Trash2,
  Workflow,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type View = 'grid' | 'dashboard' | 'automations' | 'api';
const Dashboard = lazy(() => import('@/components/geridb-dashboard'));
type FieldType =
  | 'text'
  | 'email'
  | 'single-select'
  | 'currency'
  | 'date'
  | 'year'
  | 'time'
  | 'phone'
  | 'url'
  | 'number'
  | 'checkbox'
  | 'rating';

type Field = {
  id?: string;
  key: string;
  label: string;
  type: FieldType;
  width?: number;
  hidden?: boolean;
};
type RecordItem = {
  id: string;
  company: string;
  contact: string;
  email: string;
  status: string;
  value: number;
  date: string;
  [key: string]: string | number | boolean;
};
type Automation = {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  runs: number;
  lastRun: string;
};
type DatabaseDefinition = {
  id: string;
  baseId: string;
  name: string;
  title: string;
  description: string;
  color: string;
  fields: Field[];
  fallbackRecords: RecordItem[];
};

const INITIAL_RECORDS: RecordItem[] = [
  {
    id: 'CRM-1042',
    company: 'Alpenwerk GmbH',
    contact: 'Mara Leitner',
    email: 'mara@alpenwerk.at',
    status: 'Aktiv',
    value: 24800,
    date: '2026-09-08',
  },
  {
    id: 'CRM-1041',
    company: 'Nordlicht Studio',
    contact: 'David Kern',
    email: 'david@nordlicht.io',
    status: 'Angebot',
    value: 12400,
    date: '2026-09-12',
  },
  {
    id: 'CRM-1040',
    company: 'Wiener Kollektiv',
    contact: 'Laura Weiß',
    email: 'laura@wiener-kollektiv.at',
    status: 'Kontakt',
    value: 8950,
    date: '2026-09-18',
  },
  {
    id: 'CRM-1039',
    company: 'Berg & Tal OG',
    contact: 'Simon Auer',
    email: 'simon@bergundtal.at',
    status: 'Aktiv',
    value: 31200,
    date: '2026-09-22',
  },
  {
    id: 'CRM-1038',
    company: 'Pixelgarten',
    contact: 'Nina Berger',
    email: 'nina@pixelgarten.dev',
    status: 'Pausiert',
    value: 6700,
    date: '2026-10-01',
  },
  {
    id: 'CRM-1037',
    company: 'Studio Donau',
    contact: 'Emil Graf',
    email: 'emil@studiodonau.at',
    status: 'Angebot',
    value: 16800,
    date: '2026-10-05',
  },
];

const INITIAL_FIELDS: Field[] = [
  {
    id: 'fld_company',
    key: 'company',
    label: 'Firma',
    type: 'text',
    width: 210,
  },
  {
    id: 'fld_contact',
    key: 'contact',
    label: 'Ansprechperson',
    type: 'text',
    width: 170,
  },
  { id: 'fld_email', key: 'email', label: 'E-Mail', type: 'email', width: 210 },
  {
    id: 'fld_status',
    key: 'status',
    label: 'Status',
    type: 'single-select',
    width: 130,
  },
  {
    id: 'fld_value',
    key: 'value',
    label: 'Volumen',
    type: 'currency',
    width: 125,
  },
  {
    id: 'fld_date',
    key: 'date',
    label: 'Nächster Termin',
    type: 'date',
    width: 160,
  },
  {
    id: 'fld_phone',
    key: 'phone',
    label: 'Telefonnummer',
    type: 'phone',
    width: 170,
  },
  {
    id: 'fld_notes',
    key: 'notes',
    label: 'Gesprächsnotiz',
    type: 'text',
    width: 260,
  },
];

const PROJECT_FIELDS: Field[] = [
  {
    id: 'fld_projects_company',
    key: 'company',
    label: 'Projekt',
    type: 'text',
    width: 220,
  },
  {
    id: 'fld_projects_contact',
    key: 'contact',
    label: 'Verantwortlich',
    type: 'text',
    width: 170,
  },
  {
    id: 'fld_projects_email',
    key: 'email',
    label: 'Kunde',
    type: 'text',
    width: 190,
  },
  {
    id: 'fld_projects_status',
    key: 'status',
    label: 'Phase',
    type: 'single-select',
    width: 130,
  },
  {
    id: 'fld_projects_value',
    key: 'value',
    label: 'Budget',
    type: 'currency',
    width: 125,
  },
  {
    id: 'fld_projects_date',
    key: 'date',
    label: 'Deadline',
    type: 'date',
    width: 150,
  },
];

const CONTENT_FIELDS: Field[] = [
  {
    id: 'fld_content_company',
    key: 'company',
    label: 'Titel',
    type: 'text',
    width: 240,
  },
  {
    id: 'fld_content_contact',
    key: 'contact',
    label: 'Autor',
    type: 'text',
    width: 160,
  },
  {
    id: 'fld_content_email',
    key: 'email',
    label: 'Kanal',
    type: 'text',
    width: 160,
  },
  {
    id: 'fld_content_status',
    key: 'status',
    label: 'Status',
    type: 'single-select',
    width: 130,
  },
  {
    id: 'fld_content_value',
    key: 'value',
    label: 'Reichweite',
    type: 'number',
    width: 125,
  },
  {
    id: 'fld_content_date',
    key: 'date',
    label: 'Veröffentlichung',
    type: 'date',
    width: 170,
  },
];

const PROJECT_RECORDS: RecordItem[] = [
  {
    id: 'PRJ-204',
    company: 'Website Relaunch',
    contact: 'Lena Hoffmann',
    email: 'Nordlicht Studio',
    status: 'Aktiv',
    value: 18000,
    date: '2026-10-18',
  },
  {
    id: 'PRJ-203',
    company: 'Herbstkampagne',
    contact: 'Mara Leitner',
    email: 'Alpenwerk GmbH',
    status: 'Angebot',
    value: 9200,
    date: '2026-09-30',
  },
  {
    id: 'PRJ-202',
    company: 'CRM Migration',
    contact: 'Simon Auer',
    email: 'Berg & Tal OG',
    status: 'Kontakt',
    value: 14500,
    date: '2026-11-12',
  },
];

const CONTENT_RECORDS: RecordItem[] = [
  {
    id: 'CNT-302',
    company: 'Behind the Scenes',
    contact: 'Nina Berger',
    email: 'Instagram',
    status: 'Aktiv',
    value: 4200,
    date: '2026-09-10',
  },
  {
    id: 'CNT-301',
    company: 'n8n-Automationen im Alltag',
    contact: 'Emil Graf',
    email: 'LinkedIn',
    status: 'Angebot',
    value: 7600,
    date: '2026-09-15',
  },
  {
    id: 'CNT-300',
    company: 'Kundenstory Alpenwerk',
    contact: 'Laura Weiß',
    email: 'Blog',
    status: 'Kontakt',
    value: 2800,
    date: '2026-09-22',
  },
];

const INITIAL_DATABASES: DatabaseDefinition[] = [
  {
    id: 'tbl_customers',
    baseId: 'base_crm',
    name: 'CRM & Kontakte',
    title: 'Kunden',
    description: 'Zentrale Kunden- und Vertriebsdaten',
    color: 'cobalt',
    fields: INITIAL_FIELDS,
    fallbackRecords: INITIAL_RECORDS,
  },
  {
    id: 'tbl_projects',
    baseId: 'base_projects',
    name: 'Projekte',
    title: 'Projekte',
    description: 'Projektplanung, Budgets und Deadlines',
    color: 'violet',
    fields: PROJECT_FIELDS,
    fallbackRecords: PROJECT_RECORDS,
  },
  {
    id: 'tbl_content',
    baseId: 'base_content',
    name: 'Content Plan',
    title: 'Content Plan',
    description: 'Redaktionsplan für alle Kanäle',
    color: 'amber',
    fields: CONTENT_FIELDS,
    fallbackRecords: CONTENT_RECORDS,
  },
];

const INITIAL_AUTOMATIONS: Automation[] = [
  {
    id: 'auto-1',
    name: 'Neue Anfrage qualifizieren',
    trigger: 'Neuer Datensatz',
    action: 'Status auf Kontakt setzen',
    enabled: true,
    runs: 48,
    lastRun: 'vor 12 Min.',
  },
  {
    id: 'auto-2',
    name: 'Angebot nachfassen',
    trigger: 'Termin erreicht',
    action: 'E-Mail versenden',
    enabled: true,
    runs: 16,
    lastRun: 'vor 2 Std.',
  },
  {
    id: 'auto-3',
    name: 'CRM an Webhook melden',
    trigger: 'Status ist Aktiv',
    action: 'Webhook aufrufen',
    enabled: true,
    runs: 92,
    lastRun: 'gestern',
  },
];

const FIELD_TYPES: { value: FieldType; label: string; icon: typeof Mail }[] = [
  { value: 'text', label: 'Einzeiliger Text', icon: TextCursorInput },
  { value: 'number', label: 'Zahl', icon: BarChart3 },
  { value: 'currency', label: 'Währung', icon: CreditCard },
  { value: 'single-select', label: 'Einfachauswahl', icon: CircleDot },
  { value: 'date', label: 'Datum', icon: CalendarDays },
  { value: 'year', label: 'Jahr', icon: CalendarDays },
  { value: 'time', label: 'Uhrzeit', icon: Clock3 },
  { value: 'checkbox', label: 'Kontrollkästchen', icon: CheckCircle2 },
  { value: 'phone', label: 'Telefonnummer', icon: Phone },
  { value: 'email', label: 'E-Mail', icon: Mail },
  { value: 'url', label: 'URL', icon: Link2 },
  { value: 'rating', label: 'Bewertung', icon: Star },
];

const STATUS_CLASS: Record<string, string> = {
  Aktiv: 'status-green',
  Angebot: 'status-amber',
  Kontakt: 'status-blue',
  Pausiert: 'status-slate',
};

function formatValue(value: string | number | boolean, field: Field) {
  if (field.type === 'currency')
    return new Intl.NumberFormat('de-AT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(Number(value));
  if (field.type === 'date' && value)
    return new Intl.DateTimeFormat('de-AT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(`${value}T12:00:00`));
  if (field.type === 'checkbox') return value ? 'Ja' : 'Nein';
  if (field.type === 'rating') return '★'.repeat(Number(value) || 0);
  return String(value || '—');
}

const CSV_HEADER_ALIASES = {
  company: ['firma', 'company', 'unternehmen'],
  contact: ['ansprechperson', 'kontakt', 'contact', 'name'],
  email: ['email', 'emailadresse'],
  phone: ['telefonnummer', 'telefon', 'phone', 'mobil'],
  status: ['status'],
  value: ['volumen', 'wert', 'value', 'umsatz'],
  date: ['nachstertermin', 'termin', 'datum', 'date'],
} as const;

function normalizeCsvHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function parseCsv(text: string) {
  const source = text.replace(/^\uFEFF/, '');
  const firstLine = source.split(/\r?\n/, 1)[0] || '';
  const candidates = [';', ',', '\t'];
  const delimiter = candidates.reduce((best, candidate) =>
    firstLine.split(candidate).length > firstLine.split(best).length
      ? candidate
      : best,
  );
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function parseCsvNumber(value: string) {
  const normalized = value
    .replace(/[€\s]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function parseCsvDate(value: string) {
  const match = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (match)
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  return value.slice(0, 10);
}

function escapeCsvCell(value: string | number | boolean | null | undefined) {
  const text = String(value ?? '');
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function KernTableWorkspace() {
  const [view, setView] = useState<View>('grid');
  const [databases, setDatabases] =
    useState<DatabaseDefinition[]>(INITIAL_DATABASES);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState('tbl_customers');
  const [records, setRecords] = useState<RecordItem[]>(INITIAL_RECORDS);
  const [fields, setFields] = useState<Field[]>(INITIAL_FIELDS);
  const [automations, setAutomations] =
    useState<Automation[]>(INITIAL_AUTOMATIONS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Alle');
  const [sortBy, setSortBy] = useState('company');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [columnFilter, setColumnFilter] = useState<{
    key: string;
    value: string;
  } | null>(null);
  const [displayFieldKey, setDisplayFieldKey] = useState('company');
  const [hiddenFields, setHiddenFields] = useState<string[]>([]);
  const [addRecordOpen, setAddRecordOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);
  const [addDatabaseOpen, setAddDatabaseOpen] = useState(false);
  const [newDatabaseName, setNewDatabaseName] = useState('');
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [fieldInsertPosition, setFieldInsertPosition] = useState<number | null>(
    null,
  );
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');
  const [addAutomationOpen, setAddAutomationOpen] = useState(false);
  const [automationForm, setAutomationForm] = useState({
    name: '',
    trigger: 'Neuer Datensatz',
    action: 'Webhook aufrufen',
  });
  const [csvMessage, setCsvMessage] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    action: () => Promise<void>;
  } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'local'>(
    'saved',
  );
  const [form, setForm] = useState<Record<string, string>>({
    company: '',
    contact: '',
    email: '',
    status: 'Kontakt',
    value: '',
    date: '',
  });

  const selectedDatabase =
    databases.find((database) => database.id === selectedDatabaseId) ||
    INITIAL_DATABASES[0];

  const recordsEndpoint = `/api/v1/records?table=${encodeURIComponent(selectedDatabase.id)}`;
  const fieldsEndpoint = `/api/v1/fields?table=${encodeURIComponent(selectedDatabase.id)}`;
  const automationsEndpoint = `/api/v1/automations?table=${encodeURIComponent(selectedDatabase.id)}`;

  const createRecord = useCallback(
    async (input: Record<string, string>) => {
      setSaveState('saving');
      setActionMessage('');
      const values = Object.fromEntries(
        fields.map((field) => {
          const raw = input[field.key] || '';
          return [
            field.key,
            field.type === 'number' ||
            field.type === 'currency' ||
            field.type === 'rating'
              ? Number(raw) || 0
              : field.type === 'checkbox'
                ? raw === 'true'
                : raw.trim(),
          ];
        }),
      ) as Record<string, string | number | boolean>;
      const optimistic: RecordItem = {
        id: `tmp_${crypto.randomUUID()}`,
        company: String(values.company || '').trim(),
        contact: String(values.contact || ''),
        email: String(values.email || ''),
        status: String(values.status || 'Kontakt'),
        value: Number(values.value) || 0,
        date: String(values.date || ''),
        ...values,
      };
      setRecords((current) => [optimistic, ...current]);
      try {
        const response = await fetch(recordsEndpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(optimistic),
        });
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(
            data.error || 'Datensatz konnte nicht gespeichert werden.',
          );
        }
        const data = (await response.json()) as { record: RecordItem };
        setRecords((current) =>
          current.map((record) =>
            record.id === optimistic.id ? data.record : record,
          ),
        );
        setSaveState('saved');
        return data.record;
      } catch (error) {
        setRecords((current) =>
          current.filter((record) => record.id !== optimistic.id),
        );
        setSaveState('local');
        const message =
          error instanceof Error
            ? error.message
            : 'Datensatz konnte nicht gespeichert werden.';
        setActionMessage(message);
        throw error;
      }
    },
    [fields, recordsEndpoint],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/v1/tables', { signal: controller.signal })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{
              tables?: Omit<DatabaseDefinition, 'fields' | 'fallbackRecords'>[];
            }>)
          : Promise.reject(),
      )
      .then((data) => {
        if (!data.tables?.length) return;
        setDatabases(
          data.tables
            .map((table) => {
              const fallback = INITIAL_DATABASES.find(
                (item) => item.id === table.id,
              );
              return {
                ...table,
                fields: fallback?.fields || INITIAL_FIELDS,
                fallbackRecords: fallback?.fallbackRecords || [],
              };
            })
            .sort((left, right) => {
              const leftIndex = INITIAL_DATABASES.findIndex(
                (item) => item.id === left.id,
              );
              const rightIndex = INITIAL_DATABASES.findIndex(
                (item) => item.id === right.id,
              );
              return (
                (leftIndex < 0 ? 99 : leftIndex) -
                (rightIndex < 0 ? 99 : rightIndex)
              );
            }),
        );
      })
      .catch(() => setSaveState('local'));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const current =
      databases.find((database) => database.id === selectedDatabaseId) ||
      INITIAL_DATABASES[0];
    Promise.all([
      fetch(`/api/v1/records?table=${encodeURIComponent(current.id)}`, {
        signal: controller.signal,
      }),
      fetch(`/api/v1/fields?table=${encodeURIComponent(current.id)}`, {
        signal: controller.signal,
      }),
      fetch(`/api/v1/automations?table=${encodeURIComponent(current.id)}`, {
        signal: controller.signal,
      }),
    ])
      .then(async ([recordResponse, fieldResponse, automationResponse]) => {
        if (!recordResponse.ok || !fieldResponse.ok || !automationResponse.ok)
          throw new Error('Tabelle konnte nicht vollständig geladen werden.');
        const recordData = (await recordResponse.json()) as {
          records?: RecordItem[];
        };
        const fieldData = (await fieldResponse.json()) as { fields?: Field[] };
        const automationData = (await automationResponse.json()) as {
          automations?: Automation[];
        };
        setRecords(recordData.records || []);
        if (fieldData.fields?.length) {
          setFields(fieldData.fields);
          setHiddenFields(
            fieldData.fields
              .filter((field) => field.hidden)
              .map((field) => field.key),
          );
        }
        setAutomations(automationData.automations || []);
        setSaveState('saved');
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setSaveState('local');
        setActionMessage(
          error instanceof Error
            ? error.message
            : 'Tabelle konnte nicht geladen werden.',
        );
      });
    return () => controller.abort();
  }, [databases, selectedDatabaseId]);

  useEffect(() => {
    const context =
      typeof document === 'undefined'
        ? undefined
        : (
            document as Document & {
              modelContext?: {
                registerTool: (
                  tool: unknown,
                  options?: { signal?: AbortSignal },
                ) => void | Promise<void>;
              };
            }
          ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = async () => {
      await context.registerTool(
        {
          name: 'list_records',
          title: `${selectedDatabase.name}: Datensätze auflisten`,
          description: `Liest Datensätze aus der aktiven GeriDB-Tabelle „${selectedDatabase.name}“.`,
          inputSchema: {
            type: 'object',
            properties: { search: { type: 'string' } },
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          execute(input: unknown) {
            const query =
              typeof input === 'object' && input && 'search' in input
                ? String(
                    (input as { search?: string }).search || '',
                  ).toLowerCase()
                : '';
            const visible = records.filter(
              (record) =>
                !query ||
                `${record.company} ${record.contact} ${record.email} ${record.phone || ''}`
                  .toLowerCase()
                  .includes(query),
            );
            return { count: visible.length, records: visible.slice(0, 50) };
          },
        },
        { signal: lifecycle.signal },
      );
      await context.registerTool(
        {
          name: 'create_record',
          title: `${selectedDatabase.name}: Datensatz anlegen`,
          description: `Legt einen Datensatz in „${selectedDatabase.name}“ an und zeigt ihn in der Tabelle.`,
          inputSchema: {
            type: 'object',
            properties: {
              company: { type: 'string', minLength: 1 },
              contact: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
              status: {
                type: 'string',
                enum: ['Kontakt', 'Angebot', 'Aktiv', 'Pausiert'],
              },
              value: { type: 'number' },
              date: { type: 'string' },
            },
            required: ['company'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          async execute(input: unknown) {
            if (
              !input ||
              typeof input !== 'object' ||
              !('company' in input) ||
              !String((input as { company?: string }).company).trim()
            )
              throw new Error('Firma ist erforderlich.');
            const source = input as Partial<RecordItem>;
            const created = await createRecord({
              company: String(source.company),
              contact: String(source.contact || ''),
              email: String(source.email || ''),
              phone: String(source.phone || ''),
              status: String(source.status || 'Kontakt'),
              value: String(source.value || 0),
              date: String(source.date || ''),
            });
            return {
              id: created.id,
              company: created.company,
              status: created.status,
            };
          },
        },
        { signal: lifecycle.signal },
      );
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, [createRecord, records, selectedDatabase.name]);

  const visibleFields = fields.filter(
    (field) => !hiddenFields.includes(field.key),
  );
  const displayedRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...records]
      .filter(
        (record) => statusFilter === 'Alle' || record.status === statusFilter,
      )
      .filter(
        (record) =>
          !columnFilter ||
          String(record[columnFilter.key] ?? '')
            .toLowerCase()
            .includes(columnFilter.value.toLowerCase()),
      )
      .filter(
        (record) =>
          !query ||
          Object.values(record).some((value) =>
            String(value).toLowerCase().includes(query),
          ),
      )
      .sort((a, b) => {
        const left = a[sortBy] ?? '';
        const right = b[sortBy] ?? '';
        const result =
          typeof left === 'number' && typeof right === 'number'
            ? left - right
            : String(left).localeCompare(String(right), 'de');
        return sortDirection === 'asc' ? result : -result;
      });
  }, [columnFilter, records, search, sortBy, sortDirection, statusFilter]);

  async function submitRecord(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.company.trim()) return;
    try {
      if (editingRecord) {
        setSaveState('saving');
        const payload = Object.fromEntries(
          fields.map((field) => {
            const raw = form[field.key] || '';
            return [
              field.key,
              field.type === 'number' ||
              field.type === 'currency' ||
              field.type === 'rating'
                ? Number(raw) || 0
                : field.type === 'checkbox'
                  ? raw === 'true'
                  : raw.trim(),
            ];
          }),
        );
        const response = await fetch(recordsEndpoint, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: editingRecord.id, ...payload }),
        });
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(
            data.error || 'Datensatz konnte nicht geändert werden.',
          );
        }
        const data = (await response.json()) as { record: RecordItem };
        setRecords((current) =>
          current.map((record) =>
            record.id === editingRecord.id ? data.record : record,
          ),
        );
        setSaveState('saved');
      } else {
        await createRecord(form);
      }
      setAddRecordOpen(false);
      setEditingRecord(null);
      setActionMessage(
        editingRecord ? 'Datensatz aktualisiert.' : 'Datensatz angelegt.',
      );
    } catch (error) {
      setSaveState('local');
      setActionMessage(
        error instanceof Error
          ? error.message
          : 'Datensatz konnte nicht gespeichert werden.',
      );
    }
  }

  function openNewRecord() {
    setEditingRecord(null);
    setForm(
      Object.fromEntries(
        fields.map((field) => [
          field.key,
          field.key === 'status' ? 'Kontakt' : '',
        ]),
      ),
    );
    setActionMessage('');
    setAddRecordOpen(true);
  }

  function openEditRecord(record: RecordItem) {
    setEditingRecord(record);
    setForm(
      Object.fromEntries(
        fields.map((field) => [field.key, String(record[field.key] ?? '')]),
      ),
    );
    setActionMessage('');
    setAddRecordOpen(true);
  }

  function deleteRecord(record: RecordItem) {
    setConfirmation({
      title: 'Datensatz löschen?',
      description: `„${record.company}“ wird dauerhaft aus ${selectedDatabase.name} entfernt.`,
      action: async () => {
        setSaveState('saving');
        const response = await fetch(
          `${recordsEndpoint}&id=${encodeURIComponent(record.id)}`,
          { method: 'DELETE' },
        );
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          setSaveState('local');
          setActionMessage(
            data.error || 'Datensatz konnte nicht gelöscht werden.',
          );
          return;
        }
        setRecords((current) =>
          current.filter((item) => item.id !== record.id),
        );
        setSaveState('saved');
        setActionMessage('Datensatz gelöscht.');
      },
    });
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setCsvMessage(`Importiert ${file.name}…`);
    setSaveState('saving');

    try {
      const [header = [], ...rows] = parseCsv(await file.text());
      const normalizedHeaders = header.map(normalizeCsvHeader);
      const fieldIndexes = new Map(
        fields.map((field) => {
          const aliases = [field.key, field.label];
          if (field.key in CSV_HEADER_ALIASES)
            aliases.push(
              ...CSV_HEADER_ALIASES[
                field.key as keyof typeof CSV_HEADER_ALIASES
              ],
            );
          return [
            field.key,
            normalizedHeaders.findIndex((candidate) =>
              aliases.some((alias) => normalizeCsvHeader(alias) === candidate),
            ),
          ];
        }),
      );
      const companyIndex = fieldIndexes.get('company') ?? -1;
      if (companyIndex < 0)
        throw new Error(
          `Die CSV-Datei benötigt die Spalte „${fields.find((field) => field.key === 'company')?.label || 'Name'}“.`,
        );
      const imported: RecordItem[] = [];
      let failed = 0;
      const allowedStatuses = ['Kontakt', 'Angebot', 'Aktiv', 'Pausiert'];

      for (const row of rows.slice(0, 500)) {
        const company = row[companyIndex]?.trim();
        if (!company) continue;
        const payload = Object.fromEntries(
          fields.map((field) => {
            const index = fieldIndexes.get(field.key) ?? -1;
            const raw = index >= 0 ? row[index] || '' : '';
            if (field.key === 'company') return [field.key, company];
            if (
              field.type === 'currency' ||
              field.type === 'number' ||
              field.type === 'rating'
            )
              return [field.key, parseCsvNumber(raw)];
            if (field.type === 'date') return [field.key, parseCsvDate(raw)];
            if (field.type === 'checkbox')
              return [
                field.key,
                ['1', 'true', 'ja', 'x'].includes(raw.trim().toLowerCase()),
              ];
            if (field.type === 'single-select')
              return [
                field.key,
                allowedStatuses.includes(raw.trim()) ? raw.trim() : 'Kontakt',
              ];
            return [field.key, raw.trim()];
          }),
        );
        const response = await fetch(recordsEndpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          const data = (await response.json()) as { record: RecordItem };
          imported.push(data.record);
        } else {
          failed += 1;
        }
      }

      setRecords((current) => [...imported.toReversed(), ...current]);
      setSaveState(failed ? 'local' : 'saved');
      setCsvMessage(
        failed
          ? `${imported.length} Zeilen importiert, ${failed} übersprungen.`
          : `${imported.length} Zeilen erfolgreich importiert.`,
      );
    } catch (error) {
      setSaveState('local');
      setCsvMessage(
        error instanceof Error ? error.message : 'CSV-Import fehlgeschlagen.',
      );
    }
  }

  function exportCsv() {
    const csv = [
      visibleFields.map((field) => escapeCsvCell(field.label)).join(';'),
      ...displayedRecords.map((record) =>
        visibleFields
          .map((field) => escapeCsvCell(record[field.key]))
          .join(';'),
      ),
    ].join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `geridb-${selectedDatabase.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.documentElement.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setCsvMessage(`${displayedRecords.length} Zeilen als CSV exportiert.`);
  }

  async function addField() {
    if (!newFieldName.trim()) return;
    setSaveState('saving');
    const response = await fetch(fieldsEndpoint, {
      method: editingField ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(
        editingField
          ? {
              id: editingField.id,
              label: newFieldName.trim(),
              type: newFieldType,
            }
          : {
              label: newFieldName.trim(),
              type: newFieldType,
              position: fieldInsertPosition ?? fields.length,
            },
      ),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setSaveState('local');
      setActionMessage(data.error || 'Feld konnte nicht gespeichert werden.');
      return;
    }
    if (editingField) {
      setFields((current) =>
        current.map((field) =>
          field.key === editingField.key
            ? { ...field, label: newFieldName.trim(), type: newFieldType }
            : field,
        ),
      );
      setActionMessage('Feld aktualisiert.');
    } else {
      const data = (await response.json()) as { field: Field };
      setFields((current) => {
        const next = [...current];
        next.splice(fieldInsertPosition ?? next.length, 0, data.field);
        return next;
      });
      setRecords((current) =>
        current.map((record) => ({
          ...record,
          [data.field.key]: data.field.type === 'checkbox' ? false : '',
        })),
      );
      setActionMessage('Feld angelegt.');
    }
    setNewFieldName('');
    setNewFieldType('text');
    setEditingField(null);
    setFieldInsertPosition(null);
    setAddFieldOpen(false);
    setSaveState('saved');
  }

  function openAddField(position = fields.length, name = '') {
    setEditingField(null);
    setFieldInsertPosition(position);
    setNewFieldName(name);
    setNewFieldType('text');
    setActionMessage('');
    setAddFieldOpen(true);
  }

  function openEditField(field: Field) {
    setEditingField(field);
    setFieldInsertPosition(null);
    setNewFieldName(field.label);
    setNewFieldType(field.type);
    setActionMessage('');
    setAddFieldOpen(true);
  }

  function insertField(field: Field, side: 'left' | 'right') {
    const index = fields.findIndex((item) => item.key === field.key);
    openAddField(index + (side === 'right' ? 1 : 0), 'Neues Feld');
  }

  async function duplicateField(field: Field) {
    const response = await fetch(fieldsEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        label: `${field.label} Kopie`,
        type: field.type,
        position: fields.length,
      }),
    });
    if (!response.ok) {
      setActionMessage('Feld konnte nicht dupliziert werden.');
      return;
    }
    const data = (await response.json()) as { field: Field };
    setFields((current) => [...current, data.field]);
    setRecords((current) =>
      current.map((record) => ({
        ...record,
        [data.field.key]: record[field.key] ?? '',
      })),
    );
    await Promise.all(
      records.map((record) =>
        fetch(recordsEndpoint, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: record.id,
            [data.field.key]: record[field.key] ?? '',
          }),
        }),
      ),
    );
    setActionMessage('Feld dupliziert.');
  }

  async function hideField(field: Field, hidden: boolean) {
    if (field.id) {
      const response = await fetch(fieldsEndpoint, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: field.id, hidden }),
      });
      if (!response.ok) {
        setActionMessage('Feldsichtbarkeit konnte nicht gespeichert werden.');
        return;
      }
    }
    setHiddenFields((current) =>
      hidden
        ? Array.from(new Set([...current, field.key]))
        : current.filter((key) => key !== field.key),
    );
  }

  function deleteField(field: Field) {
    if (
      !field.id ||
      ['company', 'contact', 'email', 'status', 'value', 'date'].includes(
        field.key,
      )
    ) {
      setActionMessage('Die sechs Basisfelder können nicht gelöscht werden.');
      return;
    }
    setConfirmation({
      title: 'Feld löschen?',
      description: `„${field.label}“ wird aus dieser Tabelle entfernt.`,
      action: async () => {
        const response = await fetch(
          `${fieldsEndpoint}&id=${encodeURIComponent(field.id!)}`,
          {
            method: 'DELETE',
          },
        );
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          setActionMessage(data.error || 'Feld konnte nicht gelöscht werden.');
          return;
        }
        setFields((current) =>
          current.filter((item) => item.key !== field.key),
        );
        setActionMessage('Feld gelöscht.');
      },
    });
  }

  function activateDatabase(database: DatabaseDefinition) {
    setSelectedDatabaseId(database.id);
    setRecords(database.fallbackRecords);
    setFields(database.fields);
    setAutomations(database.id === 'tbl_customers' ? INITIAL_AUTOMATIONS : []);
    setHiddenFields([]);
    setSearch('');
    setStatusFilter('Alle');
    setColumnFilter(null);
    setDisplayFieldKey('company');
    setCsvMessage('');
    setActionMessage('');
    setSaveState('saving');
    setView('grid');
  }

  async function createDatabase(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newDatabaseName.trim()) return;
    setSaveState('saving');
    const response = await fetch('/api/v1/tables', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: newDatabaseName.trim() }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setSaveState('local');
      setActionMessage(data.error || 'Tabelle konnte nicht angelegt werden.');
      return;
    }
    const data = (await response.json()) as {
      table: Omit<DatabaseDefinition, 'fields' | 'fallbackRecords'>;
    };
    const database: DatabaseDefinition = {
      ...data.table,
      fields: INITIAL_FIELDS.map((field) => ({ ...field, id: undefined })),
      fallbackRecords: [],
    };
    setDatabases((current) => [...current, database]);
    setNewDatabaseName('');
    setAddDatabaseOpen(false);
    activateDatabase(database);
    setActionMessage(`Tabelle „${database.name}“ angelegt.`);
  }

  function deleteDatabase(database: DatabaseDefinition) {
    setConfirmation({
      title: 'Datenbank löschen?',
      description: `„${database.name}“ und alle enthaltenen Datensätze werden dauerhaft entfernt.`,
      action: async () => {
        const response = await fetch(
          `/api/v1/tables?id=${encodeURIComponent(database.id)}`,
          {
            method: 'DELETE',
          },
        );
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          setActionMessage(
            data.error || 'Datenbank konnte nicht gelöscht werden.',
          );
          return;
        }
        setDatabases((current) =>
          current.filter((item) => item.id !== database.id),
        );
        if (selectedDatabaseId === database.id)
          activateDatabase(INITIAL_DATABASES[0]);
        setActionMessage(`Datenbank „${database.name}“ gelöscht.`);
      },
    });
  }

  async function createAutomation(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!automationForm.name.trim()) return;
    const response = await fetch(automationsEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(automationForm),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setActionMessage(
        data.error || 'Automation konnte nicht angelegt werden.',
      );
      return;
    }
    const data = (await response.json()) as { automation: Automation };
    setAutomations((current) => [...current, data.automation]);
    setAutomationForm({
      name: '',
      trigger: 'Neuer Datensatz',
      action: 'Webhook aufrufen',
    });
    setAddAutomationOpen(false);
    setActionMessage('Automation angelegt.');
  }

  async function toggleAutomation(id: string, enabled: boolean) {
    const previous = automations;
    setAutomations((current) =>
      current.map((item) => (item.id === id ? { ...item, enabled } : item)),
    );
    const response = await fetch(automationsEndpoint, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, enabled }),
    });
    if (!response.ok) {
      setAutomations(previous);
      setActionMessage('Automation konnte nicht geändert werden.');
    }
  }

  function deleteAutomation(id: string) {
    const automation = automations.find((item) => item.id === id);
    if (!automation) return;
    setConfirmation({
      title: 'Automation löschen?',
      description: `„${automation.name}“ wird dauerhaft entfernt.`,
      action: async () => {
        const response = await fetch(
          `${automationsEndpoint}&id=${encodeURIComponent(id)}`,
          { method: 'DELETE' },
        );
        if (!response.ok) {
          setActionMessage('Automation konnte nicht gelöscht werden.');
          return;
        }
        setAutomations((current) => current.filter((item) => item.id !== id));
        setActionMessage('Automation gelöscht.');
      },
    });
  }

  async function shareWorkspace() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setActionMessage('Link in die Zwischenablage kopiert.');
    } catch {
      setActionMessage(`Link: ${window.location.href}`);
    }
  }

  function fieldMenu(field: Field) {
    return (
      <DropdownMenuContent className="field-menu" align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>FELD-ID: {field.key}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => openEditField(field)}>
            <Pencil /> Feld bearbeiten
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => duplicateField(field)}>
            <Copy /> Feld duplizieren
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openEditField(field)}>
            <Settings2 /> Format &amp; Beschreibung
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void hideField(field, true)}>
            <EyeOff /> Feld ausblenden
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDisplayFieldKey(field.key)}>
            <Star /> Als Anzeigewert setzen
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setSortBy(field.key);
              setSortDirection('asc');
            }}
          >
            <ArrowDownAZ /> Aufsteigend sortieren
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setSortBy(field.key);
              setSortDirection('desc');
            }}
          >
            <ArrowUpAZ /> Absteigend sortieren
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const value = window.prompt(
                `Nach welchem Wert in „${field.label}“ filtern?`,
              );
              if (value !== null)
                setColumnFilter(
                  value.trim() ? { key: field.key, value: value.trim() } : null,
                );
            }}
          >
            <Filter /> Nach diesem Feld filtern
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => insertField(field, 'right')}>
            <Plus /> Rechts einfügen
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => insertField(field, 'left')}>
            <Plus /> Links einfügen
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={[
              'company',
              'contact',
              'email',
              'status',
              'value',
              'date',
            ].includes(field.key)}
            onClick={() => deleteField(field)}
          >
            <Trash2 /> Feld löschen
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    );
  }

  function renderCell(record: RecordItem, field: Field) {
    const value = record[field.key];
    if (field.key === displayFieldKey)
      return (
        <div className="company-cell">
          <span>{String(value || '–').slice(0, 1)}</span>
          <div>
            <strong>{String(value || '—')}</strong>
            <small>{record.id}</small>
          </div>
        </div>
      );
    if (field.type === 'email' && value)
      return <a href={`mailto:${value}`}>{String(value)}</a>;
    if (field.type === 'url' && value)
      return (
        <a href={String(value)} target="_blank" rel="noreferrer">
          {String(value)}
        </a>
      );
    if (field.type === 'single-select')
      return (
        <span
          className={`status-pill ${STATUS_CLASS[String(value)] || 'status-slate'}`}
        >
          {String(value || '—')}
        </span>
      );
    if (field.type === 'checkbox')
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          readOnly
          aria-label={`${field.label}: ${value ? 'Ja' : 'Nein'}`}
        />
      );
    return (
      <span className={field.type === 'rating' ? 'rating-value' : undefined}>
        {formatValue(value, field)}
      </span>
    );
  }

  return (
    <main className="app-shell">
      <aside className="workspace-sidebar">
        <button
          className="brand-mark"
          type="button"
          onClick={() => setView('grid')}
          aria-label="GeriDB Startseite"
        >
          <span className="brand-icon">
            <Grid2X2 size={17} strokeWidth={2.5} />
          </span>
          <span className="brand-copy">
            <strong>GeriDB</strong>
            <small>Open Data Studio</small>
          </span>
        </button>
        <button
          className="workspace-switcher"
          type="button"
          onClick={() => activateDatabase(selectedDatabase)}
        >
          <span className="workspace-avatar">GD</span>
          <span className="min-w-0 flex-1 text-left">
            <strong className="block truncate">GeriDB Workspace</strong>
            <small>Self-hosted</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <nav className="primary-nav" aria-label="Hauptnavigation">
          <p>Workspace</p>
          <button
            className={view === 'grid' ? 'active' : ''}
            onClick={() => setView('grid')}
          >
            <Table2 size={17} /> Tabellen
          </button>
          <button
            className={view === 'dashboard' ? 'active' : ''}
            onClick={() => setView('dashboard')}
          >
            <LayoutDashboard size={17} /> Dashboard
          </button>
          <button
            className={view === 'automations' ? 'active' : ''}
            onClick={() => setView('automations')}
          >
            <Workflow size={17} /> Automationen{' '}
            <span>{automations.length}</span>
          </button>
          <button
            className={view === 'api' ? 'active' : ''}
            onClick={() => setView('api')}
          >
            <Braces size={17} /> API &amp; Webhooks
          </button>
        </nav>
        <div className="sidebar-section">
          <div className="section-label">
            <span>Datenbanken</span>
            <button
              type="button"
              aria-label="Neue Datenbank anlegen"
              onClick={() => {
                setNewDatabaseName('');
                setActionMessage('');
                setAddDatabaseOpen(true);
              }}
            >
              <Plus size={15} />
            </button>
          </div>
          {databases.map((database) => (
            <div className="database-row" key={database.id}>
              <button
                className={`database-item ${selectedDatabase.id === database.id ? 'active' : ''}`}
                type="button"
                onClick={() => activateDatabase(database)}
              >
                <span className={`db-dot ${database.color}`} /> {database.name}
              </button>
              {!INITIAL_DATABASES.some((item) => item.id === database.id) && (
                <button
                  type="button"
                  className="database-delete"
                  aria-label={`${database.name} löschen`}
                  onClick={() => deleteDatabase(database)}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <a
            className="opensource-link"
            href="https://github.com/Geraldki94/geridb"
            target="_blank"
            rel="noreferrer"
          >
            <span className="opensource-icon">
              <GitFork size={16} />
            </span>
            <div>
              <strong>Open Source</strong>
              <small>Repository auf GitHub</small>
            </div>
            <ExternalLink size={13} />
          </a>
          <a
            className="opensource-link"
            href="https://geridb.gerald-hierzberger.chatgpt.site/"
            target="_blank"
            rel="noreferrer"
          >
            <span className="opensource-icon website-icon">
              <Link2 size={16} />
            </span>
            <div>
              <strong>GeriDB Website</strong>
              <small>Öffentliche Live-Version</small>
            </div>
            <ExternalLink size={13} />
          </a>
          <p className="edition-label">Community Edition · MIT</p>
        </div>
      </aside>

      <section className="workspace-main">
        <header className="topbar">
          <div>
            <div className="eyebrow">
              <span>{selectedDatabase.name}</span>
              <span>/</span>
              <strong>
                {view === 'grid'
                  ? selectedDatabase.title
                  : view === 'dashboard'
                    ? 'Dashboard'
                    : view === 'automations'
                      ? 'Automationen'
                      : 'API & Webhooks'}
              </strong>
            </div>
            <h1>
              {view === 'grid'
                ? selectedDatabase.title
                : view === 'dashboard'
                  ? `${selectedDatabase.title} – Dashboard`
                  : view === 'automations'
                    ? 'Automationen'
                    : 'API & Webhooks'}
            </h1>
          </div>
          <div className="top-actions">
            {view === 'grid' && (
              <label className="search-box">
                <Search size={16} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Datensätze durchsuchen"
                  placeholder="Suchen…"
                />
              </label>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void shareWorkspace()}
            >
              Teilen
            </Button>
            {view === 'grid' ? (
              <Button
                size="sm"
                className="primary-button"
                onClick={openNewRecord}
              >
                <Plus size={15} /> Datensatz
              </Button>
            ) : view === 'automations' ? (
              <Button
                size="sm"
                className="primary-button"
                onClick={() => setAddAutomationOpen(true)}
              >
                <Plus size={15} /> Automation
              </Button>
            ) : null}
          </div>
        </header>

        <div className="viewbar">
          <Tabs value={view} onValueChange={(next) => setView(next as View)}>
            <TabsList className="view-tabs" variant="line">
              <TabsTrigger value="grid">
                <Table2 /> Tabelle
              </TabsTrigger>
              <TabsTrigger value="dashboard">
                <LayoutDashboard /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="automations">
                <Sparkles /> Abläufe
              </TabsTrigger>
              <TabsTrigger value="api">
                <Braces /> API
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {view === 'grid' && (
            <div className="view-actions">
              <input
                ref={csvInputRef}
                className="csv-file-input"
                type="file"
                accept=".csv,text/csv"
                aria-label="CSV-Datei auswählen"
                onChange={importCsv}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => csvInputRef.current?.click()}
              >
                <FileUp /> CSV importieren
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={displayedRecords.length === 0}
                onClick={exportCsv}
              >
                <Download /> CSV exportieren
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="sm" />}
                >
                  <Filter /> Filter{' '}
                  {(statusFilter !== 'Alle' || columnFilter) && (
                    <Badge>1</Badge>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Status filtern</DropdownMenuLabel>
                    {['Alle', 'Aktiv', 'Angebot', 'Kontakt', 'Pausiert'].map(
                      (status) => (
                        <DropdownMenuItem
                          key={status}
                          onClick={() => setStatusFilter(status)}
                        >
                          {statusFilter === status ? (
                            <Check />
                          ) : (
                            <span className="menu-spacer" />
                          )}
                          {status}
                        </DropdownMenuItem>
                      ),
                    )}
                    {columnFilter && (
                      <DropdownMenuItem onClick={() => setColumnFilter(null)}>
                        <Trash2 /> Spaltenfilter löschen
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSortDirection((current) =>
                    current === 'asc' ? 'desc' : 'asc',
                  )
                }
              >
                {sortDirection === 'asc' ? <ArrowDownAZ /> : <ArrowUpAZ />}{' '}
                Sortieren
              </Button>
              <Button variant="ghost" size="sm" onClick={() => openAddField()}>
                <Settings2 /> Felder
              </Button>
            </div>
          )}
        </div>

        {view === 'grid' && (
          <>
            <div className="table-summary">
              <span>
                <CircleDot size={14} />{' '}
                {statusFilter === 'Alle' && !columnFilter
                  ? `Alle ${selectedDatabase.title}`
                  : columnFilter
                    ? `${fields.find((field) => field.key === columnFilter.key)?.label}: ${columnFilter.value}`
                    : statusFilter}
              </span>
              <span>{displayedRecords.length} Datensätze</span>
              <span
                className={`sync-ok ${saveState === 'local' ? 'sync-local' : ''}`}
              >
                {saveState === 'saving' ? (
                  <Clock3 size={14} />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                {saveState === 'saving'
                  ? 'Speichert…'
                  : saveState === 'local'
                    ? 'Lokaler Entwurf'
                    : 'Gespeichert'}
              </span>
            </div>
            {csvMessage && (
              <output className="csv-feedback" aria-live="polite">
                {csvMessage}
              </output>
            )}
            {actionMessage && (
              <output className="csv-feedback" aria-live="polite">
                {actionMessage}
              </output>
            )}
            {hiddenFields.length > 0 && (
              <div className="hidden-fields">
                <EyeOff size={14} /> {hiddenFields.length} ausgeblendete Felder{' '}
                <button
                  onClick={() => {
                    const hidden = fields.filter((field) =>
                      hiddenFields.includes(field.key),
                    );
                    void Promise.all(
                      hidden.map((field) => hideField(field, false)),
                    );
                  }}
                >
                  Alle anzeigen
                </button>
              </div>
            )}
            <div className="grid-surface">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="row-check">
                      <span aria-label="Zeilennummer">#</span>
                    </TableHead>
                    {visibleFields.map((field) => (
                      <TableHead
                        key={field.key}
                        style={{ minWidth: field.width }}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <button
                                type="button"
                                className="column-button"
                                aria-label={`${field.label}: Feldmenü öffnen`}
                              />
                            }
                          >
                            <span>{field.label}</span>
                            <ChevronDown />
                          </DropdownMenuTrigger>
                          {fieldMenu(field)}
                        </DropdownMenu>
                      </TableHead>
                    ))}
                    <TableHead className="add-column">
                      <button
                        type="button"
                        onClick={() => openAddField()}
                        aria-label="Feld hinzufügen"
                      >
                        <Plus />
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedRecords.map((record, index) => (
                    <TableRow key={record.id}>
                      <TableCell className="row-check">
                        <span>{index + 1}</span>
                      </TableCell>
                      {visibleFields.map((field) => (
                        <TableCell key={field.key}>
                          {renderCell(record, field)}
                        </TableCell>
                      ))}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <button
                                type="button"
                                className="row-menu-button"
                                aria-label={`${record.company}: Aktionen`}
                              />
                            }
                          >
                            <MoreHorizontal size={16} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                onClick={() => openEditRecord(record)}
                              >
                                <Pencil /> Datensatz bearbeiten
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => deleteRecord(record)}
                              >
                                <Trash2 /> Datensatz löschen
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {displayedRecords.length === 0 && (
                <div className="empty-table">
                  <Search />
                  <strong>Keine passenden Datensätze</strong>
                  <span>Ändere Suche oder Filter.</span>
                </div>
              )}
              <button className="add-row" type="button" onClick={openNewRecord}>
                <Plus size={15} /> Neuen Datensatz hinzufügen
              </button>
            </div>
            <footer className="data-footer">
              <span>
                1–{displayedRecords.length} von {displayedRecords.length}
              </span>
              <span>Zeilen pro Seite: 25</span>
            </footer>
          </>
        )}

        {view === 'dashboard' && (
          <Suspense
            fallback={
              <div className="dashboard-loading">Dashboard wird geladen…</div>
            }
          >
            <Dashboard
              records={records}
              automations={automations}
              database={selectedDatabase}
            />
          </Suspense>
        )}
        {view === 'automations' && (
          <Automations
            automations={automations}
            onToggle={(id, enabled) => void toggleAutomation(id, enabled)}
            onCreate={() => setAddAutomationOpen(true)}
            onDelete={(id) => deleteAutomation(id)}
          />
        )}
        {view === 'api' && <ApiPanel database={selectedDatabase} />}
      </section>

      <Dialog
        open={addRecordOpen}
        onOpenChange={(open) => {
          setAddRecordOpen(open);
          if (!open) setEditingRecord(null);
        }}
      >
        <DialogContent className="record-dialog">
          <form onSubmit={submitRecord}>
            <DialogHeader>
              <DialogTitle>
                {editingRecord
                  ? 'Datensatz bearbeiten'
                  : `Neuer Datensatz – ${selectedDatabase.name}`}
              </DialogTitle>
              <DialogDescription>
                Die Werte werden persistent gespeichert und sind sofort über die
                API verfügbar.
              </DialogDescription>
            </DialogHeader>
            <div className="form-grid">
              {fields.map((field) => {
                const inputId = `record-${field.key}`;
                return (
                  <label htmlFor={inputId} key={field.key}>
                    <span>
                      {field.label}
                      {field.key === 'company' ? ' *' : ''}
                    </span>
                    {field.type === 'single-select' ? (
                      <Select
                        value={form[field.key] || 'Kontakt'}
                        onValueChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            [field.key]: String(value),
                          }))
                        }
                      >
                        <SelectTrigger id={inputId}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['Kontakt', 'Angebot', 'Aktiv', 'Pausiert'].map(
                            (status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    ) : field.type === 'checkbox' ? (
                      <Switch
                        id={inputId}
                        checked={form[field.key] === 'true'}
                        onCheckedChange={(checked) =>
                          setForm((current) => ({
                            ...current,
                            [field.key]: String(checked),
                          }))
                        }
                      />
                    ) : (
                      <Input
                        id={inputId}
                        type={
                          field.type === 'currency' ||
                          field.type === 'number' ||
                          field.type === 'rating' ||
                          field.type === 'year'
                            ? 'number'
                            : field.type === 'date'
                              ? 'date'
                              : field.type === 'time'
                                ? 'time'
                                : field.type === 'email'
                                  ? 'email'
                                  : field.type === 'phone'
                                    ? 'tel'
                                    : field.type === 'url'
                                      ? 'url'
                                      : 'text'
                        }
                        value={form[field.key] || ''}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            [field.key]: event.target.value,
                          }))
                        }
                      />
                    )}
                  </label>
                );
              })}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddRecordOpen(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={!form.company?.trim()}>
                {editingRecord ? 'Änderungen speichern' : 'Datensatz anlegen'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addFieldOpen} onOpenChange={setAddFieldOpen}>
        <DialogContent className="field-dialog">
          <DialogHeader>
            <DialogTitle>
              {editingField ? 'Feld bearbeiten' : 'Feld hinzufügen'}
            </DialogTitle>
            <DialogDescription>
              Wähle Datentyp und Format für die neue Spalte.
            </DialogDescription>
          </DialogHeader>
          <label className="dialog-label" htmlFor="new-field-input">
            <span>Feldname</span>
            <Input
              id="new-field-input"
              value={newFieldName}
              onChange={(event) => setNewFieldName(event.target.value)}
              placeholder="z. B. Telefonnummer"
            />
          </label>
          <div className="field-type-list">
            {FIELD_TYPES.map(({ value, label, icon: Icon }) => (
              <button
                type="button"
                key={value}
                className={newFieldType === value ? 'active' : ''}
                onClick={() => setNewFieldType(value)}
              >
                <Icon />
                <span>{label}</span>
                {newFieldType === value && <Check />}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFieldOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => void addField()}
              disabled={!newFieldName.trim()}
            >
              {editingField ? 'Änderungen speichern' : 'Feld hinzufügen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDatabaseOpen} onOpenChange={setAddDatabaseOpen}>
        <DialogContent className="record-dialog">
          <form onSubmit={createDatabase}>
            <DialogHeader>
              <DialogTitle>Neue Datenbank anlegen</DialogTitle>
              <DialogDescription>
                Erstellt eine eigene persistente Tabelle mit sechs Basisfeldern.
              </DialogDescription>
            </DialogHeader>
            <label className="dialog-label" htmlFor="database-name-input">
              <span>Name</span>
              <Input
                id="database-name-input"
                value={newDatabaseName}
                onChange={(event) => setNewDatabaseName(event.target.value)}
                placeholder="z. B. Aufgaben"
              />
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDatabaseOpen(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={!newDatabaseName.trim()}>
                Datenbank anlegen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addAutomationOpen} onOpenChange={setAddAutomationOpen}>
        <DialogContent className="record-dialog">
          <form onSubmit={createAutomation}>
            <DialogHeader>
              <DialogTitle>Automation anlegen</DialogTitle>
              <DialogDescription>
                Speichert einen Ablauf für „{selectedDatabase.name}“.
              </DialogDescription>
            </DialogHeader>
            <div className="form-grid">
              <label htmlFor="automation-name-input">
                <span>Name *</span>
                <Input
                  id="automation-name-input"
                  value={automationForm.name}
                  onChange={(event) =>
                    setAutomationForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="z. B. n8n informieren"
                />
              </label>
              <label htmlFor="automation-trigger-input">
                <span>Auslöser</span>
                <Select
                  value={automationForm.trigger}
                  onValueChange={(trigger) =>
                    setAutomationForm((current) => ({
                      ...current,
                      trigger: String(trigger),
                    }))
                  }
                >
                  <SelectTrigger id="automation-trigger-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      'Neuer Datensatz',
                      'Datensatz geändert',
                      'Termin erreicht',
                    ].map((trigger) => (
                      <SelectItem key={trigger} value={trigger}>
                        {trigger}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label htmlFor="automation-action-input">
                <span>Aktion</span>
                <Select
                  value={automationForm.action}
                  onValueChange={(action) =>
                    setAutomationForm((current) => ({
                      ...current,
                      action: String(action),
                    }))
                  }
                >
                  <SelectTrigger id="automation-action-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      'Webhook aufrufen',
                      'Status setzen',
                      'E-Mail vorbereiten',
                    ].map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddAutomationOpen(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={!automationForm.name.trim()}>
                Automation anlegen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
      >
        <DialogContent className="record-dialog">
          <DialogHeader>
            <DialogTitle>{confirmation?.title}</DialogTitle>
            <DialogDescription>{confirmation?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmation(null)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const pending = confirmation;
                setConfirmation(null);
                if (pending) void pending.action();
              }}
            >
              Endgültig löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Automations({
  automations,
  onToggle,
  onCreate,
  onDelete,
}: {
  automations: Automation[];
  onToggle: (id: string, value: boolean) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="automations-view">
      <div className="section-intro">
        <div>
          <h2>Abläufe ohne Code verbinden</h2>
          <p>
            Definiere Regeln für Änderungen, Termine und Webhooks. n8n oder ein
            eigener Runner führt sie aus.
          </p>
        </div>
        <Badge variant="secondary">
          <CircleDot /> {automations.filter((item) => item.enabled).length}{' '}
          aktiv
        </Badge>
      </div>
      <div className="automation-list">
        {automations.length === 0 && (
          <Card className="automation-card">
            <CardContent>
              <div className="automation-copy">
                <strong>Noch keine Automationen</strong>
                <p>Lege den ersten Ablauf für diese Tabelle an.</p>
              </div>
              <Button onClick={onCreate}>
                <Plus /> Automation anlegen
              </Button>
            </CardContent>
          </Card>
        )}
        {automations.map((item) => (
          <Card className="automation-card" key={item.id}>
            <CardContent>
              <GripVertical className="drag-handle" />
              <span className="automation-symbol">
                <Zap />
              </span>
              <div className="automation-copy">
                <strong>{item.name}</strong>
                <p>
                  <span>{item.trigger}</span>
                  <i>→</i>
                  <span>{item.action}</span>
                </p>
              </div>
              <div className="automation-meta">
                <small>{item.runs} Läufe</small>
                <small>{item.lastRun}</small>
              </div>
              <Switch
                checked={item.enabled}
                onCheckedChange={(enabled) => onToggle(item.id, enabled)}
                aria-label={`${item.name} ${item.enabled ? 'deaktivieren' : 'aktivieren'}`}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${item.name} löschen`}
                onClick={() => onDelete(item.id)}
              >
                <Trash2 />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="builder-card">
        <CardHeader>
          <div>
            <span className="builder-kicker">Visueller Builder</span>
            <CardTitle>Neue Automation</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="builder-step">
            <span>1</span>
            <div>
              <small>WENN</small>
              <strong>Ein Ereignis in der Tabelle eintritt</strong>
            </div>
          </div>
          <span className="builder-line" />
          <div className="builder-step">
            <span>2</span>
            <div>
              <small>DANN</small>
              <strong>GeriDB die konfigurierte Aktion speichert</strong>
            </div>
          </div>
          <Button onClick={onCreate}>
            <Sparkles /> Automation erstellen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ApiPanel({ database }: { database: DatabaseDefinition }) {
  const [copied, setCopied] = useState(false);
  const endpoint = `/api/v1/records?table=${encodeURIComponent(database.id)}`;
  const baseUrl =
    typeof window === 'undefined'
      ? 'https://your-geridb.example'
      : window.location.origin;
  const apiUrl = `${baseUrl}${endpoint}`;
  const copyText = (text: string) => {
    void navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const curl = `curl https://your-geridb.example/api/v1/records \\\n+  -H "Authorization: Bearer geridb_live_••••••••"`;
  return (
    <div className="api-view">
      <div className="api-layout">
        <section>
          <div className="section-intro">
            <div>
              <h2>REST API</h2>
              <p>
                Jede Tabelle ist sofort über eine konsistente JSON-API
                erreichbar.
              </p>
            </div>
            <Badge className="api-online">
              <span /> Online
            </Badge>
          </div>
          <Card className="endpoint-card">
            <CardHeader>
              <div>
                <Badge className="method-get">GET</Badge>
                <code>{endpoint}</code>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyText(`${curl.slice(0, 4)} "${apiUrl}"`)}
              >
                {copied ? <Check /> : <Copy />}
                {copied ? 'Kopiert' : 'Kopieren'}
              </Button>
            </CardHeader>
            <CardContent>
              <pre>{`${curl.slice(0, 4)} "${apiUrl}"`}</pre>
            </CardContent>
          </Card>
          <div className="endpoint-list">
            <div>
              <Badge className="method-post">POST</Badge>
              <code>{endpoint}</code>
              <span>Datensatz anlegen</span>
            </div>
            <div>
              <Badge className="method-patch">PATCH</Badge>
              <code>{endpoint}</code>
              <span>Datensatz aktualisieren</span>
            </div>
            <div>
              <Badge className="method-delete">DELETE</Badge>
              <code>{`${endpoint}&id=:id`}</code>
              <span>Datensatz löschen</span>
            </div>
          </div>
        </section>
        <aside>
          <Card className="api-key-card">
            <CardHeader>
              <CardTitle>Aktive Tabelle</CardTitle>
              <Badge variant="secondary">REST</Badge>
            </CardHeader>
            <CardContent>
              <span className="api-key-label">Tabellen-ID</span>
              <div>
                <code>{database.id}</code>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Tabellen-ID kopieren"
                  onClick={() => copyText(database.id)}
                >
                  <Copy />
                </Button>
              </div>
              <small>{database.name} · direkt per JSON erreichbar</small>
            </CardContent>
          </Card>
          <Card className="webhook-card">
            <CardHeader>
              <CardTitle>n8n &amp; Webhooks</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="webhook-icon">
                <Workflow />
              </span>
              <strong>Per HTTP Request verbinden</strong>
              <p>
                Nutze die Tabellen-URL in einem n8n-HTTP-Request-Node mit GET,
                POST, PATCH oder DELETE.
              </p>
              <Button variant="outline" onClick={() => copyText(apiUrl)}>
                <Copy /> API-URL kopieren
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
