import { useState, useEffect } from 'react';
import { ShieldCheck, Users, Building, Settings, FileBarChart, ClipboardList, UserCheck, Download, AlertCircle, Save, Eye } from './Icons';

function AdminPanel({ user }) {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [settings, setSettings] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user.role === 'platform_admin') {
      fetchAdminData();
    }
  }, [user]);

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const [usersRes, orgsRes, settingsRes, logsRes] = await Promise.all([
        fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/organizations', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/settings', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/audit-logs', { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);

      const usersData = await usersRes.json();
      const orgsData = await orgsRes.json();
      const settingsData = await settingsRes.json();
      const logsData = await logsRes.json();

      setUsers(usersData.users || []);
      setOrganizations(orgsData.organizations || []);
      setSettings(settingsData.settings);
      setAuditLogs(logsData.logs || []);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        alert('Settings updated successfully');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update settings');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(users.map(user => user.id === userId ? data.user : user));
        alert('Role updated successfully');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update role');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const handleImpersonate = async (userId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/admin/impersonate/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Impersonation token generated for ${data.user.email}`);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to impersonate user');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const handleExportReport = async (type) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/reports/export/${type}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_export.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to export report');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  if (user.role !== 'platform_admin') {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <AlertCircle size={40} style={{ color: '#dc2626', marginBottom: '12px' }} />
        <h2 style={{ marginBottom: '8px' }}>Access Restricted</h2>
        <p style={{ color: 'var(--text-muted)' }}>You do not possess platform administration privileges.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-spinner-container">
        <div className="spinner"></div>
        <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Loading platform administration portal...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <ShieldCheck size={28} style={{ color: '#8b5cf6' }} />
          Platform Administration
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          Manage global users, organizations, system configurations, and security audit logs
        </p>
      </div>
      
      {/* Navigation Tabs */}
      <div className="tab-bar">
        <button 
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} />
          <span>Users ({users.length})</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'organizations' ? 'active' : ''}`}
          onClick={() => setActiveTab('organizations')}
        >
          <Building size={16} />
          <span>Organizations ({organizations.length})</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={16} />
          <span>System Settings</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <FileBarChart size={16} />
          <span>Reports & Analytics</span>
        </button>
        <button 
          className={`tab-button ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <ClipboardList size={16} />
          <span>Audit Logs</span>
        </button>
      </div>

      {error && (
        <div className="error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: '20px 24px', margin: 0 }}>
            <h2 className="card-title">User Management Directory</h2>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>User Email</th>
                  <th>Full Name</th>
                  <th>Role Permission</th>
                  <th>Organization ID</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((userItem) => (
                  <tr key={userItem.id}>
                    <td style={{ fontWeight: 600 }}>{userItem.email}</td>
                    <td>{userItem.first_name} {userItem.last_name}</td>
                    <td>
                      <select
                        value={userItem.role}
                        onChange={(e) => handleRoleChange(userItem.id, e.target.value)}
                        style={{ padding: '6px 10px', fontSize: '0.85rem', width: 'auto', borderRadius: '6px' }}
                      >
                        <option value="customer">Customer</option>
                        <option value="support_agent">Support Agent</option>
                        <option value="org_admin">Org Admin</option>
                        <option value="platform_admin">Platform Admin</option>
                      </select>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {userItem.organization_id || 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleImpersonate(userItem.id)}
                        style={{ gap: '4px' }}
                      >
                        <UserCheck size={14} />
                        <span>Impersonate</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Organizations Tab */}
      {activeTab === 'organizations' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: '20px 24px', margin: 0 }}>
            <h2 className="card-title">Registered Organizations</h2>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Organization Name</th>
                  <th>Domain Slug</th>
                  <th>Created Date</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr key={org.id}>
                    <td style={{ fontWeight: 600 }}>{org.name}</td>
                    <td>
                      <span className="status-badge status-open" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {org.slug}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* System Settings Tab */}
      {activeTab === 'settings' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Global System Settings</h2>
          </div>
          {settings && (
            <form onSubmit={handleUpdateSettings}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label htmlFor="siteName">Site Title</label>
                  <input
                    type="text"
                    id="siteName"
                    value={settings.site_name}
                    onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="supportEmail">Support Email Contact</label>
                  <input
                    type="email"
                    id="supportEmail"
                    value={settings.support_email}
                    onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="agentSignature">Default Support Agent Signature (HTML supported)</label>
                <textarea
                  id="agentSignature"
                  value={settings.agent_signature}
                  onChange={(e) => setSettings({ ...settings, agent_signature: e.target.value })}
                  rows={4}
                />
                <div style={{ marginTop: '10px', padding: '14px', background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Eye size={14} />
                    <span>Signature Preview</span>
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: settings.agent_signature }} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="maxUploadSize">Max File Attachment Size (bytes)</label>
                <input
                  type="number"
                  id="maxUploadSize"
                  value={settings.max_upload_size}
                  onChange={(e) => setSettings({ ...settings, max_upload_size: parseInt(e.target.value) })}
                />
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-checkbox">
                  <input
                    type="checkbox"
                    checked={settings.maintenance_mode}
                    onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                  />
                  <span style={{ fontWeight: 600 }}>Enable Maintenance Mode (Restricts user access)</span>
                </label>
              </div>

              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <button type="submit" className="btn btn-primary">
                  <Save size={16} />
                  <span>Save Configuration Changes</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Data Export & Reports</h2>
          </div>
          <p style={{ marginBottom: '20px' }}>
            Export platform datasets in CSV format for audit or compliance reporting.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <FileBarChart size={32} style={{ color: 'var(--primary)', marginBottom: '10px' }} />
              <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>Tickets Report</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>Export all support tickets & statuses</p>
              <button 
                className="btn btn-primary btn-block btn-sm"
                onClick={() => handleExportReport('tickets')}
              >
                <Download size={14} />
                <span>Export Tickets CSV</span>
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <FileBarChart size={32} style={{ color: '#10b981', marginBottom: '10px' }} />
              <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>Orders Report</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>Export complete order transactions</p>
              <button 
                className="btn btn-primary btn-block btn-sm"
                onClick={() => handleExportReport('orders')}
                style={{ background: 'var(--success-gradient)' }}
              >
                <Download size={14} />
                <span>Export Orders CSV</span>
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <FileBarChart size={32} style={{ color: '#8b5cf6', marginBottom: '10px' }} />
              <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>Users Directory</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>Export full user account records</p>
              <button 
                className="btn btn-primary btn-block btn-sm"
                onClick={() => handleExportReport('users')}
                style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}
              >
                <Download size={14} />
                <span>Export Users CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: '20px 24px', margin: 0 }}>
            <h2 className="card-title">Security & Audit Activity Logs</h2>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User Account</th>
                  <th>Action Performed</th>
                  <th>Target Resource</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.user_email || 'N/A'}</td>
                    <td>
                      <span className="status-badge status-open">
                        {log.action}
                      </span>
                    </td>
                    <td>{log.resource_type || 'N/A'}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {log.ip_address || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
