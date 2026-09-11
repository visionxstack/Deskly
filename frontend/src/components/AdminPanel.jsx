import { useState, useEffect } from 'react';

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
      <div className="card">
        <h2>Access Denied</h2>
        <p>You don't have permission to access the admin panel.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading admin panel...</div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Admin Panel</h1>
      
      <div style={{ marginBottom: '1.5rem' }}>
        <button 
          className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('users')}
          style={{ marginRight: '0.5rem' }}
        >
          Users
        </button>
        <button 
          className={`btn ${activeTab === 'organizations' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('organizations')}
          style={{ marginRight: '0.5rem' }}
        >
          Organizations
        </button>
        <button 
          className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('settings')}
          style={{ marginRight: '0.5rem' }}
        >
          Settings
        </button>
        <button 
          className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('reports')}
          style={{ marginRight: '0.5rem' }}
        >
          Reports
        </button>
        <button 
          className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('audit')}
        >
          Audit Logs
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {activeTab === 'users' && (
        <div className="card">
          <h2>User Management</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Organization</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((userItem) => (
                <tr key={userItem.id}>
                  <td>{userItem.email}</td>
                  <td>{userItem.first_name} {userItem.last_name}</td>
                  <td>
                    <select
                      value={userItem.role}
                      onChange={(e) => handleRoleChange(userItem.id, e.target.value)}
                      style={{ padding: '0.25rem' }}
                    >
                      <option value="customer">Customer</option>
                      <option value="support_agent">Support Agent</option>
                      <option value="org_admin">Org Admin</option>
                      <option value="platform_admin">Platform Admin</option>
                    </select>
                  </td>
                  <td>{userItem.organization_id || 'N/A'}</td>
                  <td>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => handleImpersonate(userItem.id)}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                    >
                      Impersonate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'organizations' && (
        <div className="card">
          <h2>Organizations</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id}>
                  <td>{org.name}</td>
                  <td>{org.slug}</td>
                  <td>{new Date(org.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="card">
          <h2>System Settings</h2>
          {settings && (
            <form onSubmit={handleUpdateSettings}>
              <div className="form-group">
                <label htmlFor="siteName">Site Name</label>
                <input
                  type="text"
                  id="siteName"
                  value={settings.site_name}
                  onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="supportEmail">Support Email</label>
                <input
                  type="email"
                  id="supportEmail"
                  value={settings.support_email}
                  onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="agentSignature">Agent Signature (HTML allowed)</label>
                <textarea
                  id="agentSignature"
                  value={settings.agent_signature}
                  onChange={(e) => setSettings({ ...settings, agent_signature: e.target.value })}
                  rows={4}
                />
                {/* VULNERABILITY: XSS - Signature rendered with dangerouslySetInnerHTML */}
                <div style={{ marginTop: '0.5rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}>
                  <strong>Preview:</strong>
                  <div dangerouslySetInnerHTML={{ __html: settings.agent_signature }} />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="maxUploadSize">Max Upload Size (bytes)</label>
                <input
                  type="number"
                  id="maxUploadSize"
                  value={settings.max_upload_size}
                  onChange={(e) => setSettings({ ...settings, max_upload_size: parseInt(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.maintenance_mode}
                    onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                  />
                  Maintenance Mode
                </label>
              </div>
              <button type="submit" className="btn btn-primary">Save Settings</button>
            </form>
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="card">
          <h2>Export Reports</h2>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button 
              className="btn btn-primary"
              onClick={() => handleExportReport('tickets')}
            >
              Export Tickets
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => handleExportReport('orders')}
            >
              Export Orders
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => handleExportReport('users')}
            >
              Export Users
            </button>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="card">
          <h2>Audit Logs</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Resource</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                  <td>{log.user_email || 'N/A'}</td>
                  <td>{log.action}</td>
                  <td>{log.resource_type || 'N/A'}</td>
                  <td>{log.ip_address || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
