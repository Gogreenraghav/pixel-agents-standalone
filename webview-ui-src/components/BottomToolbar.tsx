import { useEffect, useRef, useState } from 'react';

import type { WorkspaceFolder } from '../hooks/useExtensionMessages.js';
import { vscode } from '../vscodeApi.js';
import { SettingsModal } from './SettingsModal.js';

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

export function saveCustomRole(role: string): string[] {
  const roles = getCustomRoles();
  if (!roles.includes(role)) {
    roles.push(role);
    localStorage.setItem(CUSTOM_ROLES_KEY, JSON.stringify(roles));
    // Notify other components
    window.dispatchEvent(new Event('pixel_office_roles_updated'));
  }
  return roles;
}

export function deleteCustomRole(role: string): string[] {
  const roles = getCustomRoles().filter(r => r !== role);
  localStorage.setItem(CUSTOM_ROLES_KEY, JSON.stringify(roles));
  window.dispatchEvent(new Event('pixel_office_roles_updated'));
  return roles;
}

interface BottomToolbarProps {
  onHireAgent?: (name: string, role: string, dept: string, salary: number, currency: string, country: string) => void;
  currentFloor?: number;
  onFloorChange?: (floor: number) => void;
  onStatsClick?: () => void;
  statsOpen?: boolean;
  isEditMode: boolean;
  onOpenClaude: () => void;
  onToggleEditMode: () => void;
  isDebugMode: boolean;
  onToggleDebugMode: () => void;
  alwaysShowOverlay: boolean;
  onToggleAlwaysShowOverlay: () => void;
  workspaceFolders: WorkspaceFolder[];
  externalAssetDirectories: string[];
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 10,
  left: 10,
  zIndex: 'var(--pixel-controls-z)',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  background: 'var(--pixel-bg)',
  border: '2px solid var(--pixel-border)',
  borderRadius: 0,
  padding: '4px 6px',
  boxShadow: 'var(--pixel-shadow)',
};

const btnBase: React.CSSProperties = {
  padding: '5px 10px',
  fontSize: '24px',
  color: 'var(--pixel-text)',
  background: 'var(--pixel-btn-bg)',
  border: '2px solid transparent',
  borderRadius: 0,
  cursor: 'pointer',
};

const btnActive: React.CSSProperties = {
  ...btnBase,
  background: 'var(--pixel-active-bg)',
  border: '2px solid var(--pixel-accent)',
};

// ── Hire Dialog styles ─────────────────────────────────────────────────────

const COUNTRIES = [
  { name: 'Global', flag: '🌍', cur: 'USD', sym: '$' },
  { name: 'India', flag: '🇮🇳', cur: 'INR', sym: '₹' },
  { name: 'USA', flag: '🇺🇸', cur: 'USD', sym: '$' },
  { name: 'UK', flag: '🇬🇧', cur: 'GBP', sym: '£' },
  { name: 'Europe', flag: '🇪🇺', cur: 'EUR', sym: '€' },
  { name: 'Japan', flag: '🇯🇵', cur: 'JPY', sym: '¥' },
  { name: 'Russia', flag: '🇷🇺', cur: 'RUB', sym: '₽' },
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', INR: '₹', GBP: '£', EUR: '€', JPY: '¥', RUB: '₽',
};

// Base USD monthly salaries - DEFAULT ROLES
const DEFAULT_ROLE_SALARY: Record<string, number> = {
  CEO: 12000, CTO: 10000, Manager: 6000, Developer: 5000, Designer: 4500, QA: 4000,
  HR: 4000, Marketing: 4500, Sales: 4000, Analyst: 4500, DevOps: 5500, Intern: 1500,
};

// Conversion rates to USD (approx)
const FX_RATES: Record<string, number> = {
  USD: 1, INR: 84, GBP: 0.78, EUR: 0.92, JPY: 150, RUB: 90,
};

function HireDialog({ onClose, onHire }: { onClose: () => void; onHire: (name: string, role: string, dept: string, salary: number, currency: string, country: string) => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Developer');
  const [customRole, setCustomRole] = useState('');
  const [dept, setDept] = useState('Engineering');
  const [country, setCountry] = useState('Global');
  const [currency, setCurrency] = useState('USD');
  const [salaryStr, setSalaryStr] = useState(String(DEFAULT_ROLE_SALARY['Developer']));
  const [hovered, setHovered] = useState<string | null>(null);
  const [customRoles, setCustomRoles] = useState<string[]>(getCustomRoles());
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showManageRoles, setShowManageRoles] = useState(false);

  // Get all roles including custom
  const allRoles = [
    ...Object.keys(DEFAULT_ROLE_SALARY),
    ...customRoles,
    'Other'
  ];

  // Listen for custom role updates
  useEffect(() => {
    const handleUpdate = () => setCustomRoles([...getCustomRoles()]);
    window.addEventListener('pixel_office_roles_updated', handleUpdate);
    return () => window.removeEventListener('pixel_office_roles_updated', handleUpdate);
  }, []);

  // Update salary when role changes
  useEffect(() => {
    if (role === 'Other' || showCustomInput) {
      const baseUsd = DEFAULT_ROLE_SALARY['Other'] ?? 4000;
      const rate = FX_RATES[currency] ?? 1;
      setSalaryStr(String(Math.round(baseUsd * rate)));
    } else {
      const baseUsd = DEFAULT_ROLE_SALARY[role] ?? 4000;
      const rate = FX_RATES[currency] ?? 1;
      setSalaryStr(String(Math.round(baseUsd * rate)));
    }
  }, [role, currency, showCustomInput]);

  useEffect(() => {
    const c = COUNTRIES.find(x => x.name === country);
    if (c) setCurrency(c.cur);
  }, [country]);

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    if (newRole === 'Other') {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
      setCustomRole('');
    }
  };

  const handleCreateCustomRole = () => {
    if (customRole.trim()) {
      const newRoles = saveCustomRole(customRole.trim());
      setCustomRoles(newRoles);
      setRole(customRole.trim());
      setShowCustomInput(false);
      setCustomRole('');
    }
  };

  const handleDeleteCustomRole = (r: string) => {
    const newRoles = deleteCustomRole(r);
    setCustomRoles(newRoles);
    if (role === r) {
      setRole('Developer');
    }
  };

  const handleHire = () => {
    const finalName = name.trim() || `Agent ${Math.floor(Math.random() * 1000)}`;
    const finalRole = role === 'Other' ? customRole.trim() : role;
    const finalSalary = parseInt(salaryStr, 10) || 0;
    
    if (!finalRole) {
      alert('Please enter a custom role name!');
      return;
    }
    
    onHire(finalName, finalRole, dept, finalSalary, currency, country);
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '6px', background: 'var(--pixel-bg)', color: 'var(--pixel-text)',
    border: '2px solid var(--pixel-border)', fontFamily: 'monospace', fontSize: '18px', boxSizing: 'border-box',
  };

  return (
    <div style={{
      position: 'absolute', bottom: '100%', left: 0, marginBottom: 8,
      background: 'var(--pixel-agent-bg)', border: '2px solid var(--pixel-agent-border)',
      boxShadow: 'var(--pixel-shadow)', width: 380, zIndex: 'var(--pixel-controls-z)',
      display: 'flex', flexDirection: 'column', fontFamily: 'monospace',
      maxHeight: '80vh',
      overflowY: 'auto',
    }}>
      <div style={{
        background: 'var(--pixel-active-bg)', borderBottom: '2px solid var(--pixel-agent-border)',
        padding: '6px 10px', fontSize: '20px', color: 'var(--pixel-agent-text)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>👤 Hire Agent</span>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--pixel-text)', fontSize: '20px', cursor: 'pointer', padding: '0 4px' }}>✕</button>
      </div>

      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 4, color: 'var(--pixel-text-dim)', fontSize: '16px' }}>Name</label>
          <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Agent Name..." style={inputStyle} onKeyDown={e => { if (e.key === 'Enter') handleHire(); if (e.key === 'Escape') onClose(); }} />
        </div>

        {/* Role Selection */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label style={{ color: 'var(--pixel-text-dim)', fontSize: '16px' }}>Role</label>
            <button 
              onClick={() => setShowManageRoles(!showManageRoles)}
              style={{ 
                background: showManageRoles ? '#cc88ff50' : 'transparent', 
                border: '1px solid #cc88ff', 
                color: '#cc88ff', 
                fontSize: '12px', 
                padding: '2px 6px', 
                cursor: 'pointer',
                borderRadius: '4px'
              }}
            >
              🌟 Manage Custom Roles ({customRoles.length})
            </button>
          </div>
          
          {/* Manage Custom Roles Panel */}
          {showManageRoles && (
            <div style={{
              background: '#1a1a2e',
              border: '1px solid #cc88ff',
              borderRadius: '4px',
              padding: '8px',
              marginBottom: '8px',
              maxHeight: '120px',
              overflowY: 'auto'
            }}>
              {customRoles.length === 0 ? (
                <p style={{ color: '#888', fontSize: '12px', textAlign: 'center' }}>No custom roles yet</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {customRoles.map(r => (
                    <span key={r} style={{
                      background: '#cc88ff30',
                      border: '1px solid #cc88ff',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#cc88ff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {r}
                      <button 
                        onClick={() => handleDeleteCustomRole(r)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ff6666',
                          cursor: 'pointer',
                          padding: '0 2px',
                          fontSize: '10px'
                        }}
                      >✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <select value={role} onChange={e => handleRoleChange(e.target.value)} style={inputStyle}>
            {allRoles.map(r => (
              <option key={r} value={r}>
                {r === 'Other' ? '🌟 Other (Create New)' : r}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Role Input */}
        {showCustomInput && (
          <div style={{
            background: '#1a1a2e',
            border: '1px solid #cc88ff',
            borderRadius: '4px',
            padding: '8px'
          }}>
            <label style={{ display: 'block', marginBottom: 4, color: '#cc88ff', fontSize: '14px' }}>
              🌟 Create New Custom Role
            </label>
            <input 
              type="text" 
              value={customRole} 
              onChange={e => setCustomRole(e.target.value)}
              placeholder="e.g., Advocate, Revolutionary, Doctor..."
              style={{ ...inputStyle, borderColor: '#cc88ff' }}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateCustomRole(); }}
            />
            <button 
              onClick={handleCreateCustomRole}
              disabled={!customRole.trim()}
              style={{
                marginTop: '6px',
                padding: '4px 8px',
                background: customRole.trim() ? '#cc88ff' : '#444',
                color: customRole.trim() ? '#000' : '#888',
                border: 'none',
                cursor: customRole.trim() ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontFamily: 'monospace',
                borderRadius: '4px'
              }}
            >
              + Add & Use This Role
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 4, color: 'var(--pixel-text-dim)', fontSize: '16px' }}>Dept</label>
            <select value={dept} onChange={e => setDept(e.target.value)} style={inputStyle}>
              {['Engineering', 'Design', 'Management', 'QA', 'Marketing', 'Sales', 'HR', 'Operations', 'Legal', 'Finance'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 4, color: 'var(--pixel-text-dim)', fontSize: '16px' }}>Location</label>
            <select value={country} onChange={e => setCountry(e.target.value)} style={inputStyle}>
              {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.flag} {c.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 4, color: 'var(--pixel-text-dim)', fontSize: '16px' }}>Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)} style={inputStyle}>
              {Object.keys(CURRENCY_SYMBOLS).map(c => <option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>)}
            </select>
          </div>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', marginBottom: 4, color: 'var(--pixel-text-dim)', fontSize: '16px' }}>Monthly Salary</label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--pixel-bg)', border: '2px solid var(--pixel-border)' }}>
              <span style={{ padding: '0 8px', color: '#aaccff', fontSize: '18px' }}>{CURRENCY_SYMBOLS[currency] ?? '$'}</span>
              <input type="number" value={salaryStr} onChange={e => setSalaryStr(e.target.value)} style={{ ...inputStyle, border: 'none', flex: 1 }} onKeyDown={e => { if (e.key === 'Enter') handleHire(); if (e.key === 'Escape') onClose(); }} />
            </div>
          </div>
        </div>

        <button onClick={handleHire} onMouseEnter={() => setHovered('hire')} onMouseLeave={() => setHovered(null)} style={{
          marginTop: 4, padding: '8px', fontSize: '20px', background: hovered === 'hire' ? 'var(--pixel-agent-hover-bg)' : 'var(--pixel-agent-bg)',
          color: 'var(--pixel-agent-text)', border: '2px solid var(--pixel-agent-border)', cursor: 'pointer', fontFamily: 'monospace',
        }}>✓ Hire Agent</button>
      </div>
    </div>
  );
}

export function BottomToolbar({
  isEditMode,
  onOpenClaude,
  onToggleEditMode,
  isDebugMode,
  onToggleDebugMode,
  alwaysShowOverlay,
  onToggleAlwaysShowOverlay,
  workspaceFolders,
  externalAssetDirectories,
  onHireAgent,
  currentFloor,
  onFloorChange,
  onStatsClick,
  statsOpen,
}: BottomToolbarProps) {
  const [showHire, setShowHire] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleFloorChange = (delta: number) => {
    if (onFloorChange && currentFloor !== undefined) {
      const next = currentFloor + delta;
      if (next >= 1 && next <= 4) onFloorChange(next);
    }
  };

  return (
    <>
      <div style={panelStyle}>
        <ToolBtn title="Hire Agent (H)" onClick={() => setShowHire(s => !s)} active={showHire}>
          👤
        </ToolBtn>
        <ToolBtn title="Edit Mode (E)" onClick={onToggleEditMode} active={isEditMode}>
          🖋️
        </ToolBtn>
        <ToolBtn title="Debug Mode (D)" onClick={onToggleDebugMode} active={isDebugMode}>
          🐛
        </ToolBtn>
        <ToolBtn title="Stats Dashboard" onClick={onStatsClick} active={!!statsOpen}>
          📊
        </ToolBtn>

        <div style={{ width: '2px', height: '30px', background: 'var(--pixel-border)', margin: '0 4px' }} />

        <ToolBtn title="Previous Floor (←)" onClick={() => handleFloorChange(-1)}>
          ◀
        </ToolBtn>
        <span style={{ fontSize: '14px', color: 'var(--pixel-text)', fontFamily: 'monospace', padding: '0 6px', minWidth: '40px', textAlign: 'center' }}>
          F{currentFloor}
        </span>
        <ToolBtn title="Next Floor (→)" onClick={() => handleFloorChange(+1)}>
          ▶
        </ToolBtn>

        <div style={{ width: '2px', height: '30px', background: 'var(--pixel-border)', margin: '0 4px' }} />

        <ToolBtn title="Open Claude" onClick={onOpenClaude}>
          🤖
        </ToolBtn>
        <ToolBtn title="Settings" onClick={() => setShowSettings(s => !s)} active={showSettings}>
          ⚙️
        </ToolBtn>
      </div>

      {showHire && (
        <HireDialog onClose={() => setShowHire(false)} onHire={onHireAgent ?? (() => {})} />
      )}
      {showSettings && (
        <SettingsModal
          workspaceFolders={workspaceFolders}
          externalAssetDirectories={externalAssetDirectories}
          alwaysShowOverlay={alwaysShowOverlay}
          onToggleAlwaysShowOverlay={onToggleAlwaysShowOverlay}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}

function ToolBtn({ title, onClick, active, children }: { title: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={active ? btnActive : btnBase}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--pixel-hover-bg)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--pixel-btn-bg)'; }}
    >
      {children}
    </button>
  );
}
