import type { OfficeEvent } from './OfficeEvents.js';
import { useState, useEffect } from 'react';

// Custom roles storage
const CUSTOM_ROLES_KEY = 'pixel_office_custom_roles';

export function getCustomRoles(): string[] {
  try {
    const stored = localStorage.getItem(CUSTOM_ROLES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveCustomRole(role: string) {
  const roles = getCustomRoles();
  if (!roles.includes(role)) {
    roles.push(role);
    localStorage.setItem(CUSTOM_ROLES_KEY, JSON.stringify(roles));
  }
  return roles;
}

export function deleteCustomRole(role: string) {
  const roles = getCustomRoles().filter(r => r !== role);
  localStorage.setItem(CUSTOM_ROLES_KEY, JSON.stringify(roles));
  return roles;
}

// All available roles (default + custom)
export function getAllRoles(): string[] {
  const defaultRoles = [
    'CEO', 'CTO', 'Manager', 'Developer', 'Designer', 'QA',
    'HR', 'Marketing', 'Sales', 'Analyst', 'DevOps', 'Intern'
  ];
  const customRoles = getCustomRoles();
  return [...defaultRoles, ...customRoles, 'Other'];
}

// Salary for roles
export const ROLE_SALARY: Record<string, number> = {
  CEO:       12000,
  CTO:       10000,
  Manager:    6000,
  Developer:  5000,
  Designer:   4500,
  QA:         4000,
  HR:         4000,
  Marketing:  4500,
  Sales:      4000,
  Analyst:    4500,
  DevOps:     5500,
  Intern:     1500,
  // Custom roles get default salary
  Other:      4000,
};

const DEPT_COLORS: Record<string, string> = {
  Engineering: '#00ff88',
  Design:      '#ff88cc',
  Management:  '#cc88ff',
  QA:          '#aaff00',
  Marketing:   '#ffaa44',
  Sales:       '#44aaff',
  HR:          '#ff6666',
  Operations:  '#ffdd44',
  Legal:       '#88ccff',
  Finance:     '#88ff88',
  Other:       '#aaaaff',
};

const STATUS_COLORS: Record<string, string> = {
  Working:    '#00ff88',
  'On Break': '#ffaa44',
  'In Meeting':'#44aaff',
  Idle:       '#888888',
};

interface HiredAgent {
  id: string;
  name: string;
  role: string;
  dept: string;
  status: string;
  hireDate: string;
  zone?: string;
  salary?: number;
  currency?: string;
  country?: string;
  performance?: number;
  level?: number;
}

// Exchange rates (simplified)
const fxRates: Record<string, number> = {
  USD: 1,
  EUR: 0.85,
  GBP: 0.73,
  INR: 74,
  JPY: 110,
};

function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥'
  };
  return `${symbols[currency] || '$'}${Math.round(amount).toLocaleString()}`;
}

export function StatsDashboard({ agents, events, selectedAgent, onAgentSelect }: {
  agents: HiredAgent[];
  events: OfficeEvent[];
  selectedAgent: HiredAgent | null;
  onAgentSelect: (id: string | null) => void;
}) {
  const [customRoles, setCustomRoles] = useState<string[]>(getCustomRoles());

  // Listen for custom role updates
  useEffect(() => {
    const handleUpdate = () => {
      setCustomRoles([...getCustomRoles()]);
    };
    window.addEventListener('pixel_office_roles_updated', handleUpdate);
    return () => window.removeEventListener('pixel_office_roles_updated', handleUpdate);
  }, []);

  const monthlyCost = agents.reduce((sum, a) => {
    const sal = a.salary ?? ROLE_SALARY[a.role] ?? 4000;
    const rate = fxRates[a.currency ?? 'USD'] ?? 1;
    return sum + sal / rate;
  }, 0);

  const avgPerformance = agents.length
    ? Math.round(agents.reduce((s, a) => s + (a.performance ?? 75), 0) / agents.length)
    : 0;

  const todayEvents = events.filter(e => {
    const today = new Date().toDateString();
    return new Date(e.time).toDateString() === today;
  });

  const deptMap: Record<string, { count: number; cost: number }> = {};
  agents.forEach(a => {
    if (!deptMap[a.dept]) deptMap[a.dept] = { count: 0, cost: 0 };
    deptMap[a.dept].count++;
    deptMap[a.dept].cost += (a.salary ?? ROLE_SALARY[a.role] ?? 4000) / (fxRates[a.currency ?? 'USD'] ?? 1);
  });

  const statuses = {
    Working: agents.filter(a => a.status === 'Working').length,
    'On Break': agents.filter(a => a.status === 'On Break').length,
    'In Meeting': agents.filter(a => a.status === 'In Meeting').length,
    Idle: agents.filter(a => a.status === 'Idle').length,
  };

  return (
    <div style={{
      background: 'var(--pixel-panel)',
      border: '2px solid var(--pixel-border)',
      padding: '12px',
      fontSize: '13px',
      minWidth: '220px',
      maxHeight: '80vh',
      overflowY: 'auto',
    }}>
      <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '12px', color: 'var(--pixel-accent)' }}>
        📊 Office Stats
      </div>

      <div style={{ display: 'grid', gap: '8px' }}>
        <StatItem label="Total Agents" value={agents.length} color="#00ff88" />
        <StatItem label="Monthly Cost" value={`${formatCurrency(monthlyCost, 'USD')}/mo`} color="#ffaa44" />
        <StatItem label="Avg Performance" value={`${avgPerformance}%`} color="#44aaff" />
        <StatItem label="Today's Events" value={todayEvents.length} color="#cc88ff" />
      </div>

      <Divider />

      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px', color: 'var(--pixel-text-dim)' }}>
        STATUS
      </div>
      <div style={{ display: 'grid', gap: '4px' }}>
        {Object.entries(statuses).map(([status, count]) => (
          <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: STATUS_COLORS[status] || '#888'
              }} />
              {status}
            </span>
            <span style={{ color: STATUS_COLORS[status] || '#888' }}>{count}</span>
          </div>
        ))}
      </div>

      <Divider />

      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px', color: 'var(--pixel-text-dim)' }}>
        DEPARTMENTS
      </div>
      <div style={{ display: 'grid', gap: '6px' }}>
        {Object.entries(deptMap).sort((a, b) => b[1].count - a[1].count).map(([dept, data]) => (
          <div key={dept}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '2px',
                  background: DEPT_COLORS[dept] || '#aaaaff'
                }} />
                {dept}
              </span>
              <span>{data.count}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--pixel-text-dim)', marginLeft: '14px' }}>
              {formatCurrency(data.cost, 'USD')}/mo
            </div>
          </div>
        ))}
      </div>

      {customRoles.length > 0 && (
        <>
          <Divider />
          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px', color: '#cc88ff' }}>
            🌟 CUSTOM ROLES
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {customRoles.map(role => (
              <span key={role} style={{
                background: '#cc88ff30',
                border: '1px solid #cc88ff',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                color: '#cc88ff'
              }}>
                {role}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'var(--pixel-text-dim)' }}>{label}</span>
      <span style={{ color, fontWeight: 'bold' }}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: '1px solid var(--pixel-border)', margin: '10px 0' }} />;
}

export { DEPT_COLORS, STATUS_COLORS, fxRates };
