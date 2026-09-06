export const CONDITIONAL_OPERATORS = [
  'equals',
  'not-equals',
  'contains',
  'greater-than',
  'less-than',
  'empty',
  'not-empty',
] as const;

export const CONDITIONAL_COLORS = [
  'green',
  'amber',
  'red',
  'blue',
  'violet',
  'slate',
] as const;

export type ConditionalOperator = (typeof CONDITIONAL_OPERATORS)[number];
export type ConditionalColor = (typeof CONDITIONAL_COLORS)[number];

export type ConditionalRule = {
  id: string;
  operator: ConditionalOperator;
  value: string;
  color: ConditionalColor;
};

function isConditionalOperator(value: unknown): value is ConditionalOperator {
  return CONDITIONAL_OPERATORS.includes(value as ConditionalOperator);
}

function isConditionalColor(value: unknown): value is ConditionalColor {
  return CONDITIONAL_COLORS.includes(value as ConditionalColor);
}

export function normalizeConditionalRules(value: unknown): ConditionalRule[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 20)
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const source = entry as Record<string, unknown>;
      const operator = isConditionalOperator(source.operator)
        ? source.operator
        : 'equals';
      const color = isConditionalColor(source.color) ? source.color : 'green';
      const id =
        typeof source.id === 'string' && source.id.trim()
          ? source.id.trim().slice(0, 80)
          : `rule_${index + 1}`;
      const ruleValue =
        typeof source.value === 'string' ||
        typeof source.value === 'number' ||
        typeof source.value === 'boolean'
          ? String(source.value).trim().slice(0, 160)
          : '';
      return { id, operator, value: ruleValue, color };
    })
    .filter((rule): rule is ConditionalRule => Boolean(rule));
}

function normalizedText(value: unknown) {
  return typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
    ? String(value).trim().toLocaleLowerCase('de')
    : '';
}

function normalizedNumber(value: unknown) {
  const raw =
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
      ? String(value)
      : '';
  const compact = raw
    .trim()
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
    .replace(/[^\d.+-]/g, '');
  const number = Number(compact);
  return Number.isFinite(number) ? number : null;
}

export function matchesConditionalRule(rule: ConditionalRule, value: unknown) {
  const actual = normalizedText(value);
  const expected = normalizedText(rule.value);
  switch (rule.operator) {
    case 'equals':
      return actual === expected;
    case 'not-equals':
      return actual !== expected;
    case 'contains':
      return Boolean(expected) && actual.includes(expected);
    case 'greater-than': {
      const actualNumber = normalizedNumber(value);
      const expectedNumber = normalizedNumber(rule.value);
      return (
        actualNumber !== null &&
        expectedNumber !== null &&
        actualNumber > expectedNumber
      );
    }
    case 'less-than': {
      const actualNumber = normalizedNumber(value);
      const expectedNumber = normalizedNumber(rule.value);
      return (
        actualNumber !== null &&
        expectedNumber !== null &&
        actualNumber < expectedNumber
      );
    }
    case 'empty':
      return actual === '';
    case 'not-empty':
      return actual !== '';
  }
}

export function conditionalClassName(
  rules: ConditionalRule[] | undefined,
  value: unknown,
) {
  const match = rules?.find((rule) => matchesConditionalRule(rule, value));
  return match ? `conditional-format conditional-${match.color}` : '';
}
