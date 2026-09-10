export type CsvFieldType =
  | 'text'
  | 'long-text'
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

export type CsvColumn = {
  index: number;
  label: string;
  normalizedLabel: string;
  occurrence: number;
  inferredType: CsvFieldType;
};

export function normalizeCsvHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function parseCsv(text: string) {
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

function tryParseCsvNumber(value: string) {
  const normalized = value
    .replace(/[€$£\s]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export function parseCsvNumber(value: string) {
  return tryParseCsvNumber(value) ?? 0;
}

export function parseCsvDate(value: string) {
  const match = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (match)
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  return value.slice(0, 10);
}

const SINGLE_SELECT_HEADERS = new Set([
  'status',
  'phase',
  'kategorie',
  'category',
  'prioritat',
  'priority',
  'zustand',
  'typ',
  'type',
]);

const LONG_TEXT_HEADERS = new Set([
  'beschreibung',
  'description',
  'inhalt',
  'content',
  'notiz',
  'notizen',
  'notes',
  'kommentar',
]);

export function inferCsvFieldType(
  values: string[],
  headerLabel = '',
): CsvFieldType {
  const samples = values
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 100);
  if (!samples.length) return 'text';

  if (SINGLE_SELECT_HEADERS.has(normalizeCsvHeader(headerLabel)))
    return 'single-select';
  if (
    LONG_TEXT_HEADERS.has(normalizeCsvHeader(headerLabel)) ||
    samples.some((value) => value.includes('\n') || value.length > 120)
  )
    return 'long-text';

  const every = (test: (value: string) => boolean) => samples.every(test);
  if (
    every((value) =>
      ['1', '0', 'true', 'false', 'ja', 'nein', 'yes', 'no', 'x'].includes(
        value.toLowerCase(),
      ),
    )
  )
    return 'checkbox';
  if (every((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)))
    return 'email';
  if (
    every((value) => {
      try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    })
  )
    return 'url';
  if (
    every((value) =>
      /^(?:\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4})$/.test(value),
    )
  )
    return 'date';
  if (every((value) => /^(?:19|20|21)\d{2}$/.test(value))) return 'year';
  if (every((value) => /^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)))
    return 'time';
  if (
    every(
      (value) => /[+()\s/-]/.test(value) && /^\+?[\d()\s/-]{6,}$/.test(value),
    )
  )
    return 'phone';
  if (
    every((value) => tryParseCsvNumber(value) !== null) &&
    samples.some((value) => /€|\bEUR\b/i.test(value))
  )
    return 'currency';
  if (
    every(
      (value) =>
        tryParseCsvNumber(value) !== null &&
        !/^0\d+/.test(value.replace(/\D/g, '')),
    )
  )
    return 'number';
  return 'text';
}

export function describeCsvColumns(header: string[], rows: string[][]) {
  if (header.length > 100)
    throw new Error('Eine CSV-Datei darf höchstens 100 Spalten enthalten.');
  const occurrences = new Map<string, number>();
  return header.map<CsvColumn>((rawLabel, index) => {
    const label = rawLabel.trim() || `Spalte ${index + 1}`;
    const normalizedLabel = normalizeCsvHeader(label) || `spalte${index + 1}`;
    const occurrence = (occurrences.get(normalizedLabel) || 0) + 1;
    occurrences.set(normalizedLabel, occurrence);
    return {
      index,
      label: occurrence === 1 ? label : `${label} (${occurrence})`,
      normalizedLabel,
      occurrence,
      inferredType: inferCsvFieldType(
        rows.map((row) => row[index] || ''),
        label,
      ),
    };
  });
}

export function parseCsvValue(value: string, type: CsvFieldType) {
  const raw = value.trim();
  if (type === 'currency' || type === 'number' || type === 'rating')
    return parseCsvNumber(raw);
  if (type === 'date') return parseCsvDate(raw);
  if (type === 'checkbox')
    return ['1', 'true', 'ja', 'yes', 'x'].includes(raw.toLowerCase());
  return raw;
}
