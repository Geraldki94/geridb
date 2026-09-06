import {
  conditionalClassName,
  matchesConditionalRule,
  normalizeConditionalRules,
} from '../lib/conditional-format.ts';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const rules = normalizeConditionalRules([
  { id: 'won', operator: 'equals', value: 'Gewonnen', color: 'green' },
  { id: 'large', operator: 'greater-than', value: '10.000', color: 'amber' },
  { id: 'blank', operator: 'empty', value: '', color: 'red' },
  { id: 'invalid', operator: 'unknown', value: 'x', color: 'pink' },
]);

assert(rules.length === 4, 'Regeln wurden nicht normalisiert.');
assert(
  matchesConditionalRule(rules[0], 'gewonnen'),
  'Textvergleich sollte Groß-/Kleinschreibung ignorieren.',
);
assert(
  matchesConditionalRule(rules[1], '€ 12.500'),
  'Numerischer Vergleich mit deutschem Format ist fehlgeschlagen.',
);
assert(
  matchesConditionalRule(rules[2], ''),
  'Leere Werte wurden nicht erkannt.',
);
assert(
  conditionalClassName(rules, 'Gewonnen') ===
    'conditional-format conditional-green',
  'Farbklasse wurde nicht ermittelt.',
);
assert(
  rules[3].operator === 'equals' && rules[3].color === 'green',
  'Ungültige Regelwerte wurden nicht sicher ersetzt.',
);

console.log(
  'Conditional formatting test passed: text, numbers, empty values and colors.',
);
