'use client';

import {
  CreditCard,
  Gauge,
  TrendingUp,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

type DashboardRecord = {
  id: string;
  [key: string]: string | number | boolean;
};

type DashboardAutomation = {
  id: string;
  name: string;
  action: string;
  enabled: boolean;
  runs: number;
  lastRun: string;
};

type DashboardDatabase = {
  name: string;
  fields: Array<{
    key: string;
    label: string;
    type: string;
    options?: string[];
  }>;
};

const STATUS_TONES = [
  'status-green',
  'status-amber',
  'status-blue',
  'status-slate',
];

export default function GeriDbDashboard({
  records,
  automations,
  database,
}: {
  records: DashboardRecord[];
  automations: DashboardAutomation[];
  database: DashboardDatabase;
}) {
  const numberField =
    database.fields.find((field) => field.type === 'currency') ||
    database.fields.find((field) => ['number', 'rating'].includes(field.type));
  const selectField = database.fields.find(
    (field) => field.type === 'single-select',
  );
  const dateField = database.fields.find((field) => field.type === 'date');
  const labelField =
    database.fields.find((field) =>
      ['text', 'email', 'phone', 'url'].includes(field.type),
    ) || database.fields[0];
  const totalNumber = numberField
    ? records.reduce(
        (sum, record) => sum + Number(record[numberField.key] || 0),
        0,
      )
    : 0;
  const selectValues = selectField
    ? Array.from(
        new Set([
          ...(selectField.options || []),
          ...records
            .map((record) => String(record[selectField.key] || '').trim())
            .filter(Boolean),
        ]),
      )
    : [];
  const distribution = selectField
    ? selectValues.map((label) => ({
        label,
        count: records.filter(
          (record) => String(record[selectField.key] || '') === label,
        ).length,
      }))
    : database.fields.slice(0, 6).map((field) => ({
        label: field.label,
        count: records.filter((record) => {
          const value = record[field.key];
          return value !== '' && value !== null && value !== undefined;
        }).length,
      }));
  const mostFrequent = [...distribution].sort(
    (left, right) => right.count - left.count,
  )[0];

  let chartTitle = numberField?.label || 'Datensätze';
  let chartDescription = `Live aus ${database.name}`;
  let recordChartData: Array<{ label: string; value: number }> = [];

  if (dateField) {
    chartTitle = `${numberField?.label || 'Datensätze'} nach ${dateField.label}`;
    const grouped = records.reduce<Record<string, number>>((groups, record) => {
      const date = new Date(String(record[dateField.key] || ''));
      const label = Number.isNaN(date.getTime())
        ? 'Ohne Datum'
        : new Intl.DateTimeFormat('de-AT', {
            month: 'short',
            year: '2-digit',
          }).format(date);
      groups[label] =
        (groups[label] || 0) +
        (numberField ? Number(record[numberField.key] || 0) : 1);
      return groups;
    }, {});
    recordChartData = Object.entries(grouped).map(([label, value]) => ({
      label,
      value,
    }));
  } else if (selectField) {
    chartTitle = `${numberField?.label || 'Datensätze'} nach ${selectField.label}`;
    recordChartData = distribution.map((item) => ({
      label: item.label,
      value: numberField
        ? records
            .filter(
              (record) => String(record[selectField.key] || '') === item.label,
            )
            .reduce(
              (sum, record) => sum + Number(record[numberField.key] || 0),
              0,
            )
        : item.count,
    }));
  } else {
    chartDescription = `Die ersten Datensätze aus ${database.name}`;
    recordChartData = records.slice(0, 10).map((record, index) => ({
      label: String(record[labelField?.key] || `#${index + 1}`).slice(0, 18),
      value: numberField ? Number(record[numberField.key] || 0) : 1,
    }));
  }

  const formatNumber = (value: number) =>
    numberField?.type === 'currency'
      ? new Intl.NumberFormat('de-AT', {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 0,
        }).format(value)
      : new Intl.NumberFormat('de-AT', {
          maximumFractionDigits: 2,
        }).format(value);

  const filledCells = records.reduce(
    (count, record) =>
      count +
      database.fields.filter((field) => {
        const value = record[field.key];
        return value !== '' && value !== null && value !== undefined;
      }).length,
    0,
  );

  const dashboardSources = [
    {
      label: 'Kennzahl',
      value: numberField?.label || 'Anzahl der Datensätze',
    },
    {
      label: 'Gruppierung',
      value: dateField?.label || selectField?.label || 'Einzelne Datensätze',
    },
    {
      label: 'Verteilung',
      value: selectField?.label || 'Ausgefüllte Felder',
    },
  ];

  return (
    <div className="dashboard-view">
      <section className="dashboard-guide" aria-label="Dashboard-Erklärung">
        <div>
          <strong>
            Dieses Dashboard entsteht automatisch aus deiner Tabelle.
          </strong>
          <p>
            Zahlen liefern Kennzahlen, Auswahlfelder die Verteilung und ein
            Datumsfeld den zeitlichen Verlauf. Änderungen an Feldern und
            Datensätzen werden hier sofort sichtbar.
          </p>
        </div>
        <dl>
          {dashboardSources.map((source) => (
            <div key={source.label}>
              <dt>{source.label}</dt>
              <dd>{source.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="metric-grid">
        <Metric
          icon={CreditCard}
          label={numberField ? `Summe · ${numberField.label}` : 'Datensätze'}
          value={
            numberField ? formatNumber(totalNumber) : String(records.length)
          }
          change={database.name}
          tone="blue"
        />
        <Metric
          icon={Gauge}
          label={selectField ? `Top · ${selectField.label}` : 'Felder'}
          value={
            selectField
              ? mostFrequent?.label || '—'
              : String(database.fields.length)
          }
          change={
            selectField
              ? `${mostFrequent?.count || 0} Datensätze`
              : `${records.length} Datensätze`
          }
          tone="green"
        />
        <Metric
          icon={TrendingUp}
          label="Datenabdeckung"
          value={`${records.length && database.fields.length ? Math.round((filledCells / (records.length * database.fields.length)) * 100) : 0} %`}
          change={`${filledCells} ausgefüllte Zellen`}
          tone="violet"
        />
        <Metric
          icon={Zap}
          label="Automationen"
          value={String(automations.filter((item) => item.enabled).length)}
          change={`${automations.reduce((sum, item) => sum + item.runs, 0)} Läufe`}
          tone="amber"
        />
      </div>
      <div className="dashboard-grid">
        <Card className="chart-card">
          <CardHeader>
            <div>
              <CardTitle>{chartTitle}</CardTitle>
              <p>{chartDescription}</p>
            </div>
            <Badge variant="secondary">Live</Badge>
          </CardHeader>
          <CardContent>
            {recordChartData.length ? (
              <ChartContainer
                config={{ value: { label: 'Wert', color: '#355f4d' } }}
                className="pipeline-chart"
              >
                <BarChart data={recordChartData} accessibilityLayer>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="value"
                    fill="var(--color-value)"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <DashboardEmpty text="Lege Datensätze an, damit hier eine Auswertung erscheint." />
            )}
          </CardContent>
        </Card>
        <Card className="status-card">
          <CardHeader>
            <CardTitle>
              {selectField
                ? `Verteilung · ${selectField.label}`
                : 'Feldabdeckung'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {distribution.length ? (
              distribution.map((item, index) => {
                return (
                  <div className="status-row" key={item.label}>
                    <span>
                      <i
                        className={STATUS_TONES[index % STATUS_TONES.length]}
                      />
                      {item.label}
                    </span>
                    <div>
                      <b
                        style={{
                          width: `${Math.max(10, (item.count / Math.max(1, records.length)) * 100)}%`,
                        }}
                      />
                    </div>
                    <strong>{item.count}</strong>
                  </div>
                );
              })
            ) : (
              <DashboardEmpty text="Füge Felder oder Auswahlmöglichkeiten hinzu." />
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="activity-card">
        <CardHeader>
          <CardTitle>Aktuelle Automationsläufe</CardTitle>
          <Badge variant="secondary">{automations.length} Abläufe</Badge>
        </CardHeader>
        <CardContent>
          {automations.length ? (
            automations.map((item) => (
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
            ))
          ) : (
            <DashboardEmpty text="Für diese Datenbank sind noch keine Automationen angelegt." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardEmpty({ text }: { text: string }) {
  return <p className="dashboard-empty">{text}</p>;
}

function Metric({
  icon: Icon,
  label,
  value,
  change,
  tone,
}: {
  icon: LucideIcon;
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
