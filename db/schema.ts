import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const bases = sqliteTable('bases', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull().default('2026-09-04T00:00:00.000Z'),
});

export const dataTables = sqliteTable(
  'data_tables',
  {
    id: text('id').primaryKey(),
    baseId: text('base_id').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    createdAt: text('created_at').notNull().default('2026-09-04T00:00:00.000Z'),
  },
  (table) => [index('idx_data_tables_base_id').on(table.baseId)],
);

export const fields = sqliteTable(
  'fields',
  {
    id: text('id').primaryKey(),
    tableId: text('table_id').notNull(),
    name: text('name').notNull(),
    type: text('type').notNull(),
    position: integer('position').notNull().default(0),
    settings: text('settings').notNull().default('{}'),
    hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [
    index('idx_fields_table_position').on(table.tableId, table.position),
  ],
);

export const records = sqliteTable(
  'records',
  {
    id: text('id').primaryKey(),
    tableId: text('table_id').notNull(),
    valuesJson: text('values_json').notNull().default('{}'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_records_table_updated').on(table.tableId, table.updatedAt),
  ],
);

export const automations = sqliteTable(
  'automations',
  {
    id: text('id').primaryKey(),
    tableId: text('table_id').notNull(),
    name: text('name').notNull(),
    triggerType: text('trigger_type').notNull(),
    actionType: text('action_type').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    runs: integer('runs').notNull().default(0),
    lastRun: text('last_run').notNull().default('Noch nie'),
  },
  (table) => [
    index('idx_automations_table_enabled').on(table.tableId, table.enabled),
  ],
);
