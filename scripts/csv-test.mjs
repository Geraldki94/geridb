import assert from 'node:assert/strict';
import { describeCsvColumns, parseCsv, parseCsvValue } from '../lib/csv.ts';

const [header, ...rows] = parseCsv(
  '\uFEFFKundennummer;Notiz;Erledigt;Termin;Betrag\r\n' +
    'KD-001;"Rückruf, am Vormittag";ja;08.09.2026;1.250,50 €\r\n' +
    'KD-002;Angebot senden;nein;2026-09-12;980,00 €',
);

assert.deepEqual(header, [
  'Kundennummer',
  'Notiz',
  'Erledigt',
  'Termin',
  'Betrag',
]);
assert.equal(rows.length, 2);
assert.equal(rows[0][1], 'Rückruf, am Vormittag');

const columns = describeCsvColumns(header, rows);
assert.deepEqual(
  columns.map((column) => [column.label, column.inferredType]),
  [
    ['Kundennummer', 'text'],
    ['Notiz', 'text'],
    ['Erledigt', 'checkbox'],
    ['Termin', 'date'],
    ['Betrag', 'currency'],
  ],
);
assert.equal(parseCsvValue('08.09.2026', 'date'), '2026-09-08');
assert.equal(parseCsvValue('1.250,50 €', 'currency'), 1250.5);
assert.equal(parseCsvValue('ja', 'checkbox'), true);

const duplicateColumns = describeCsvColumns(
  ['Name', 'Name', ''],
  [['A', 'B', 'C']],
);
assert.deepEqual(
  duplicateColumns.map((column) => column.label),
  ['Name', 'Name (2)', 'Spalte 3'],
);

console.log(
  'CSV test passed: headers, inferred fields, duplicate names and values.',
);
