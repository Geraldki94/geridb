'use client';

import {
  type ChangeEvent,
  type SyntheticEvent,
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
  Filter,
  FileUp,
  Gauge,
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
  TrendingUp,
  Workflow,
  Zap,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
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
type FieldType =
  | 'text'
  | 'email'
  | 'single-select'
  | 'currency'
  | 'date'
  | 'phone'
  | 'url'
  | 'number'
  | 'checkbox'
  | 'rating';

type Field = { key: string; label: string; type: FieldType; width?: number };
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
  { key: 'company', label: 'Firma', type: 'text', width: 210 },
  { key: 'contact', label: 'Ansprechperson', type: 'text', width: 170 },
  { key: 'email', label: 'E-Mail', type: 'email', width: 210 },
  { key: 'status', label: 'Status', type: 'single-select', width: 130 },
  { key: 'value', label: 'Volumen', type: 'currency', width: 125 },
  { key: 'date', label: 'Nächster Termin', type: 'date', width: 160 },
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

const chartData = [
  { month: 'Apr', value: 24 },
  { month: 'Mai', value: 31 },
  { month: 'Jun', value: 28 },
  { month: 'Jul', value: 44 },
  { month: 'Aug', value: 53 },
  { month: 'Sep', value: 61 },
];

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
  const [records, setRecords] = useState<RecordItem[]>(INITIAL_RECORDS);
  const [fields, setFields] = useState<Field[]>(INITIAL_FIELDS);
  const [automations, setAutomations] =
    useState<Automation[]>(INITIAL_AUTOMATIONS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Alle');
  const [sortBy, setSortBy] = useState('company');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [hiddenFields, setHiddenFields] = useState<string[]>([]);
  const [addRecordOpen, setAddRecordOpen] = useState(false);
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');
  const [fieldSequence, setFieldSequence] = useState(1);
  const [csvMessage, setCsvMessage] = useState('');
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'local'>(
    'saved',
  );
  const [form, setForm] = useState({
    company: '',
    contact: '',
    email: '',
    status: 'Kontakt',
    value: '',
    date: '',
  });

  const createRecord = useCallback(
    async (input: typeof form) => {
      setSaveState('saving');
      const optimistic: RecordItem = {
        id: `CRM-${1043 + records.length}`,
        company: input.company.trim(),
        contact: input.contact.trim(),
        email: input.email.trim(),
        status: input.status,
        value: Number(input.value) || 0,
        date: input.date,
      };
      setRecords((current) => [optimistic, ...current]);
      try {
        const response = await fetch('/api/v1/records', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(optimistic),
        });
        if (!response.ok) throw new Error();
        const data = (await response.json()) as { record: RecordItem };
        setRecords((current) =>
          current.map((record) =>
            record.id === optimistic.id ? data.record : record,
          ),
        );
        setSaveState('saved');
        return data.record;
      } catch {
        setSaveState('local');
        return optimistic;
      }
    },
    [records.length],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/v1/records', { signal: controller.signal })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{ records?: RecordItem[] }>)
          : Promise.reject(),
      )
      .then((data: { records?: RecordItem[] }) => {
        if (data.records?.length) setRecords(data.records);
      })
      .catch(() => setSaveState('local'));
    return () => controller.abort();
  }, []);

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
          name: 'list_customer_records',
          title: 'Kundendatensätze auflisten',
          description:
            'Liest die aktuell sichtbaren Kundendatensätze aus GeriDB.',
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
                `${record.company} ${record.contact} ${record.email}`
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
          name: 'create_customer_record',
          title: 'Kundendatensatz anlegen',
          description:
            'Legt einen neuen Kundendatensatz an und zeigt ihn in der Tabelle.',
          inputSchema: {
            type: 'object',
            properties: {
              company: { type: 'string', minLength: 1 },
              contact: { type: 'string' },
              email: { type: 'string' },
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
  }, [createRecord, records]);

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
  }, [records, search, sortBy, sortDirection, statusFilter]);

  async function submitRecord(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.company.trim()) return;
    await createRecord(form);
    setForm({
      company: '',
      contact: '',
      email: '',
      status: 'Kontakt',
      value: '',
      date: '',
    });
    setAddRecordOpen(false);
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
      const columnIndex = (key: keyof typeof CSV_HEADER_ALIASES) =>
        normalizedHeaders.findIndex((candidate) =>
          CSV_HEADER_ALIASES[key].some(
            (alias) => normalizeCsvHeader(alias) === candidate,
          ),
        );
      const companyIndex = columnIndex('company');
      if (companyIndex < 0)
        throw new Error('Die CSV-Datei benötigt eine Spalte „Firma“.');

      const contactIndex = columnIndex('contact');
      const emailIndex = columnIndex('email');
      const statusIndex = columnIndex('status');
      const valueIndex = columnIndex('value');
      const dateIndex = columnIndex('date');
      const imported: RecordItem[] = [];
      let failed = 0;
      const allowedStatuses = ['Kontakt', 'Angebot', 'Aktiv', 'Pausiert'];

      for (const row of rows.slice(0, 500)) {
        const company = row[companyIndex]?.trim();
        if (!company) continue;
        const rawStatus = row[statusIndex]?.trim() || 'Kontakt';
        const payload = {
          company,
          contact: contactIndex >= 0 ? row[contactIndex] || '' : '',
          email: emailIndex >= 0 ? row[emailIndex] || '' : '',
          status: allowedStatuses.includes(rawStatus) ? rawStatus : 'Kontakt',
          value: valueIndex >= 0 ? parseCsvNumber(row[valueIndex] || '') : 0,
          date: dateIndex >= 0 ? parseCsvDate(row[dateIndex] || '') : '',
        };
        const response = await fetch('/api/v1/records', {
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
    link.download = `geridb-kunden-${new Date().toISOString().slice(0, 10)}.csv`;
    document.documentElement.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setCsvMessage(`${displayedRecords.length} Zeilen als CSV exportiert.`);
  }

  function addField() {
    if (!newFieldName.trim()) return;
    const key = `custom_${fieldSequence}`;
    setFields((current) => [
      ...current,
      { key, label: newFieldName.trim(), type: newFieldType, width: 160 },
    ]);
    setRecords((current) =>
      current.map((record) => ({
        ...record,
        [key]: newFieldType === 'checkbox' ? false : '',
      })),
    );
    setNewFieldName('');
    setNewFieldType('text');
    setFieldSequence((current) => current + 1);
    setAddFieldOpen(false);
    setSaveState('local');
  }

  function insertField(field: Field, side: 'left' | 'right') {
    const index = fields.findIndex((item) => item.key === field.key);
    const added: Field = {
      key: `custom_${fieldSequence}`,
      label: 'Neues Feld',
      type: 'text',
      width: 150,
    };
    const next = [...fields];
    next.splice(index + (side === 'right' ? 1 : 0), 0, added);
    setFields(next);
    setFieldSequence((current) => current + 1);
    setSaveState('local');
  }

  function duplicateField(field: Field) {
    setFields((current) => [
      ...current,
      {
        ...field,
        key: `${field.key}_copy_${fieldSequence}`,
        label: `${field.label} Kopie`,
      },
    ]);
    setFieldSequence((current) => current + 1);
    setSaveState('local');
  }

  function fieldMenu(field: Field) {
    return (
      <DropdownMenuContent className="field-menu" align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>FELD-ID: {field.key}</DropdownMenuLabel>
          <DropdownMenuItem>
            <Pencil /> Feld bearbeiten
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => duplicateField(field)}>
            <Copy /> Feld duplizieren
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings2 /> Format &amp; Beschreibung
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              setHiddenFields((current) => [...current, field.key])
            }
          >
            <EyeOff /> Feld ausblenden
          </DropdownMenuItem>
          <DropdownMenuItem>
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
            onClick={() =>
              setStatusFilter(field.key === 'status' ? 'Aktiv' : 'Alle')
            }
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
            onClick={() =>
              setFields((current) =>
                current.filter((item) => item.key !== field.key),
              )
            }
          >
            <Trash2 /> Feld löschen
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    );
  }

  function renderCell(record: RecordItem, field: Field) {
    const value = record[field.key];
    if (field.key === 'company')
      return (
        <div className="company-cell">
          <span>{record.company.slice(0, 1)}</span>
          <div>
            <strong>{record.company}</strong>
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
          <span>GeriDB</span>
        </button>
        <button className="workspace-switcher" type="button">
          <span className="workspace-avatar">NW</span>
          <span className="min-w-0 flex-1 text-left">
            <strong className="block truncate">Nordwind Studio</strong>
            <small>Team Workspace</small>
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
            <Workflow size={17} /> Automationen <span>3</span>
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
            <Plus size={15} />
          </div>
          <button className="database-item active" type="button">
            <span className="db-dot cobalt" /> CRM &amp; Kontakte
          </button>
          <button className="database-item" type="button">
            <span className="db-dot violet" /> Projekte
          </button>
          <button className="database-item" type="button">
            <span className="db-dot amber" /> Content Plan
          </button>
        </div>
        <div className="sidebar-footer">
          <div className="usage-row">
            <span>Speicher</span>
            <span>2,4 / 10 GB</span>
          </div>
          <div className="usage-bar">
            <span />
          </div>
          <div className="user-chip">
            <span>GH</span>
            <div>
              <strong>Gerald</strong>
              <small>Administrator</small>
            </div>
            <MoreHorizontal size={16} />
          </div>
        </div>
      </aside>

      <section className="workspace-main">
        <header className="topbar">
          <div>
            <div className="eyebrow">
              <span>CRM &amp; Kontakte</span>
              <span>/</span>
              <strong>
                {view === 'grid'
                  ? 'Kunden'
                  : view === 'dashboard'
                    ? 'Dashboard'
                    : view === 'automations'
                      ? 'Automationen'
                      : 'API & Webhooks'}
              </strong>
            </div>
            <h1>
              {view === 'grid'
                ? 'Kunden'
                : view === 'dashboard'
                  ? 'Vertriebsdashboard'
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
            <Button variant="outline" size="sm">
              Teilen
            </Button>
            {view === 'grid' ? (
              <Button
                size="sm"
                className="primary-button"
                onClick={() => setAddRecordOpen(true)}
              >
                <Plus size={15} /> Datensatz
              </Button>
            ) : view === 'automations' ? (
              <Button size="sm" className="primary-button">
                <Plus size={15} /> Automation
              </Button>
            ) : (
              <Button size="sm" className="primary-button">
                <Plus size={15} /> {view === 'api' ? 'API-Schlüssel' : 'Widget'}
              </Button>
            )}
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
                  {statusFilter !== 'Alle' && <Badge>1</Badge>}
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
              <Button variant="ghost" size="sm">
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
                {statusFilter === 'Alle' ? 'Alle Kunden' : statusFilter}
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
            {hiddenFields.length > 0 && (
              <div className="hidden-fields">
                <EyeOff size={14} /> {hiddenFields.length} ausgeblendete Felder{' '}
                <button onClick={() => setHiddenFields([])}>
                  Alle anzeigen
                </button>
              </div>
            )}
            <div className="grid-surface">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="row-check">
                      <input aria-label="Alle auswählen" type="checkbox" />
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
                        onClick={() => setAddFieldOpen(true)}
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
                        <MoreHorizontal size={16} />
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
              <button
                className="add-row"
                type="button"
                onClick={() => setAddRecordOpen(true)}
              >
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
          <Dashboard records={records} automations={automations} />
        )}
        {view === 'automations' && (
          <Automations
            automations={automations}
            onToggle={(id, enabled) => {
              setAutomations((current) =>
                current.map((item) =>
                  item.id === id ? { ...item, enabled } : item,
                ),
              );
              void fetch('/api/v1/automations', {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ id, enabled }),
              });
            }}
          />
        )}
        {view === 'api' && <ApiPanel />}
      </section>

      <Dialog open={addRecordOpen} onOpenChange={setAddRecordOpen}>
        <DialogContent className="record-dialog">
          <form onSubmit={submitRecord}>
            <DialogHeader>
              <DialogTitle>Neuer Kundendatensatz</DialogTitle>
              <DialogDescription>
                Die Werte werden sofort in der Tabelle und über die API
                verfügbar.
              </DialogDescription>
            </DialogHeader>
            <div className="form-grid">
              <label htmlFor="company-input">
                <span>Firma *</span>
                <Input
                  id="company-input"
                  value={form.company}
                  onChange={(event) =>
                    setForm({ ...form, company: event.target.value })
                  }
                />
              </label>
              <label htmlFor="contact-input">
                <span>Ansprechperson</span>
                <Input
                  id="contact-input"
                  value={form.contact}
                  onChange={(event) =>
                    setForm({ ...form, contact: event.target.value })
                  }
                />
              </label>
              <label htmlFor="email-input">
                <span>E-Mail</span>
                <Input
                  id="email-input"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                />
              </label>
              <label htmlFor="status-input">
                <span>Status</span>
                <Select
                  value={form.status}
                  onValueChange={(status) =>
                    setForm({ ...form, status: String(status) })
                  }
                >
                  <SelectTrigger id="status-input">
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
              </label>
              <label htmlFor="value-input">
                <span>Volumen (€)</span>
                <Input
                  id="value-input"
                  type="number"
                  value={form.value}
                  onChange={(event) =>
                    setForm({ ...form, value: event.target.value })
                  }
                />
              </label>
              <label htmlFor="date-input">
                <span>Nächster Termin</span>
                <Input
                  id="date-input"
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm({ ...form, date: event.target.value })
                  }
                />
              </label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddRecordOpen(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={!form.company.trim()}>
                Datensatz anlegen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addFieldOpen} onOpenChange={setAddFieldOpen}>
        <DialogContent className="field-dialog">
          <DialogHeader>
            <DialogTitle>Feld hinzufügen</DialogTitle>
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
            <Button onClick={addField} disabled={!newFieldName.trim()}>
              Feld hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Dashboard({
  records,
  automations,
}: {
  records: RecordItem[];
  automations: Automation[];
}) {
  const value = records.reduce(
    (sum, record) => sum + Number(record.value || 0),
    0,
  );
  const active = records.filter((record) => record.status === 'Aktiv').length;
  return (
    <div className="dashboard-view">
      <div className="metric-grid">
        <Metric
          icon={CreditCard}
          label="Pipeline-Volumen"
          value={new Intl.NumberFormat('de-AT', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0,
          }).format(value)}
          change="+12,4 %"
          tone="blue"
        />
        <Metric
          icon={Gauge}
          label="Aktive Kunden"
          value={String(active)}
          change="+8,1 %"
          tone="green"
        />
        <Metric
          icon={TrendingUp}
          label="Abschlussrate"
          value="67 %"
          change="+4,2 %"
          tone="violet"
        />
        <Metric
          icon={Zap}
          label="Automationen"
          value={String(automations.filter((item) => item.enabled).length)}
          change="156 Läufe"
          tone="amber"
        />
      </div>
      <div className="dashboard-grid">
        <Card className="chart-card">
          <CardHeader>
            <div>
              <CardTitle>Pipeline-Entwicklung</CardTitle>
              <p>Neue Verkaufschancen der letzten 6 Monate</p>
            </div>
            <Badge variant="secondary">+27 %</Badge>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ value: { label: 'Chancen', color: '#3469e8' } }}
              className="pipeline-chart"
            >
              <BarChart data={chartData} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="value"
                  fill="var(--color-value)"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="status-card">
          <CardHeader>
            <CardTitle>Statusverteilung</CardTitle>
          </CardHeader>
          <CardContent>
            {['Aktiv', 'Angebot', 'Kontakt', 'Pausiert'].map((status) => {
              const count = records.filter(
                (record) => record.status === status,
              ).length;
              return (
                <div className="status-row" key={status}>
                  <span>
                    <i className={STATUS_CLASS[status]} />
                    {status}
                  </span>
                  <div>
                    <b
                      style={{
                        width: `${Math.max(10, (count / Math.max(1, records.length)) * 100)}%`,
                      }}
                    />
                  </div>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
      <Card className="activity-card">
        <CardHeader>
          <CardTitle>Aktuelle Automationsläufe</CardTitle>
          <Button variant="ghost" size="sm">
            Alle ansehen
          </Button>
        </CardHeader>
        <CardContent>
          {automations.map((item) => (
            <div className="activity-row" key={item.id}>
              <span className="activity-icon">
                <Zap />
              </span>
              <div>
                <strong>{item.name}</strong>
                <small>{item.action}</small>
              </div>
              <Badge variant="secondary">Erfolgreich</Badge>
              <time>{item.lastRun}</time>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  change,
  tone,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  change: string;
  tone: string;
}) {
  return (
    <Card className="metric-card">
      <CardContent>
        <span className={`metric-icon ${tone}`}>
          <Icon />
        </span>
        <div>
          <small>{label}</small>
          <strong>{value}</strong>
          <em>{change}</em>
        </div>
      </CardContent>
    </Card>
  );
}

function Automations({
  automations,
  onToggle,
}: {
  automations: Automation[];
  onToggle: (id: string, value: boolean) => void;
}) {
  return (
    <div className="automations-view">
      <div className="section-intro">
        <div>
          <h2>Abläufe ohne Code verbinden</h2>
          <p>
            Starte Aktionen bei Änderungen, Zeitpunkten oder eingehenden
            Webhooks.
          </p>
        </div>
        <Badge variant="secondary">
          <CircleDot /> {automations.filter((item) => item.enabled).length}{' '}
          aktiv
        </Badge>
      </div>
      <div className="automation-list">
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
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal />
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
          <button>
            <span>1</span>
            <div>
              <small>WENN</small>
              <strong>Ein Datensatz geändert wird</strong>
            </div>
            <ChevronDown />
          </button>
          <span className="builder-line" />
          <button>
            <span>2</span>
            <div>
              <small>DANN</small>
              <strong>Webhook senden</strong>
            </div>
            <ChevronDown />
          </button>
          <Button>
            <Sparkles /> Automation erstellen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ApiPanel() {
  const [copied, setCopied] = useState(false);
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
                <code>/api/v1/records</code>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void navigator.clipboard?.writeText(curl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }}
              >
                {copied ? <Check /> : <Copy />}
                {copied ? 'Kopiert' : 'Kopieren'}
              </Button>
            </CardHeader>
            <CardContent>
              <pre>{curl}</pre>
            </CardContent>
          </Card>
          <div className="endpoint-list">
            <div>
              <Badge className="method-post">POST</Badge>
              <code>/api/v1/records</code>
              <span>Datensatz anlegen</span>
            </div>
            <div>
              <Badge className="method-patch">PATCH</Badge>
              <code>/api/v1/records</code>
              <span>Datensatz aktualisieren</span>
            </div>
            <div>
              <Badge className="method-delete">DELETE</Badge>
              <code>/api/v1/records?id=:id</code>
              <span>Datensatz löschen</span>
            </div>
          </div>
        </section>
        <aside>
          <Card className="api-key-card">
            <CardHeader>
              <CardTitle>API-Schlüssel</CardTitle>
              <Badge variant="secondary">1 aktiv</Badge>
            </CardHeader>
            <CardContent>
              <span className="api-key-label">Live-Schlüssel</span>
              <div>
                <code>geridb_live_••••••••4f92</code>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="API-Schlüssel kopieren"
                >
                  <Copy />
                </Button>
              </div>
              <small>Zuletzt verwendet: vor 4 Minuten</small>
            </CardContent>
          </Card>
          <Card className="webhook-card">
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="webhook-icon">
                <Workflow />
              </span>
              <strong>Ereignisse in Echtzeit</strong>
              <p>
                Informiere externe Systeme über neue oder geänderte Datensätze.
              </p>
              <Button variant="outline">Webhook hinzufügen</Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
