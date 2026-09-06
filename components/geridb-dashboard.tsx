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
  status: string;
  value: number;
  date: string;
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
  fields: Array<{ key: string; label: string; type: string }>;
};

const STATUS_CLASS: Record<string, string> = {
  Aktiv: 'status-green',
  Angebot: 'status-amber',
  Kontakt: 'status-blue',
  Pausiert: 'status-slate',
};

export default function GeriDbDashboard({
  records,
  automations,
  database,
}: {
  records: DashboardRecord[];
  automations: DashboardAutomation[];
  database: DashboardDatabase;
}) {
  const value = records.reduce(
    (sum, record) => sum + Number(record.value || 0),
    0,
  );
  const active = records.filter((record) => record.status === 'Aktiv').length;
  const valueField = database.fields.find((field) => field.key === 'value');
  const recordChartData = Object.entries(
    records.reduce<Record<string, number>>((months, record) => {
      const date = new Date(record.date);
      const month = Number.isNaN(date.getTime())
        ? 'Ohne Datum'
        : new Intl.DateTimeFormat('de-AT', { month: 'short' }).format(date);
      months[month] = (months[month] || 0) + Number(record.value || 0);
      return months;
    }, {}),
  ).map(([month, monthValue]) => ({ month, value: monthValue }));

  return (
    <div className="dashboard-view">
      <div className="metric-grid">
        <Metric
          icon={CreditCard}
          label={valueField?.label || 'Gesamtwert'}
          value={
            valueField?.type === 'currency'
              ? new Intl.NumberFormat('de-AT', {
                  style: 'currency',
                  currency: 'EUR',
                  maximumFractionDigits: 0,
                }).format(value)
              : new Intl.NumberFormat('de-AT').format(value)
          }
          change={`${records.length} Datensätze`}
          tone="blue"
        />
        <Metric
          icon={Gauge}
          label="Aktive Datensätze"
          value={String(active)}
          change={`von ${records.length}`}
          tone="green"
        />
        <Metric
          icon={TrendingUp}
          label="Aktiv-Quote"
          value={`${records.length ? Math.round((active / records.length) * 100) : 0} %`}
          change={database.name}
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
              <CardTitle>{valueField?.label || 'Wert'} nach Monat</CardTitle>
              <p>Live aus den Datensätzen von {database.name}</p>
            </div>
            <Badge variant="secondary">Live</Badge>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ value: { label: 'Wert', color: '#355f4d' } }}
              className="pipeline-chart"
            >
              <BarChart data={recordChartData} accessibilityLayer>
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
          <Badge variant="secondary">{automations.length} Abläufe</Badge>
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
