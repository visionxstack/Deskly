import { useState, useEffect } from 'react';
import { Ticket, ShoppingBag, ShieldCheck, ArrowRight, UserCheck, Mail, Building, Sparkles } from './Icons';

function Dashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, [user]);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      // Fetch tickets count
      const ticketsResponse = await fetch('/api/tickets', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const ticketsData = await ticketsResponse.json();
      
      // Fetch orders count
      const ordersResponse = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const ordersData = await ordersResponse.json();

      setStats({
        tickets: ticketsData.tickets?.length || 0,
        orders: ordersData.orders?.length || 0,
        role: user.role,
        organization: user.organization_id,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner-container">
        <div className="spinner"></div>
        <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Loading workspace metrics...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome Hero Banner */}
      <div 
        className="card" 
        style={{ 
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
          color: 'white', 
          padding: '32px 28px',
          border: 'none',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '28px'
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.4)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, color: '#a5b4fc', marginBottom: '12px' }}>
            <Sparkles size={14} />
            <span>Workspace Overview</span>
          </div>
          <h1 style={{ color: 'white', fontSize: '2.1rem', marginBottom: '8px' }}>
            Welcome back, {user.first_name}! 👋
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '600px' }}>
            Here is an overview of your active tickets, recent orders, and platform permissions.
          </p>
        </div>
      </div>
      
      {/* Metrics Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Ticket size={24} />
          </div>
          <div className="stat-content">
            <h3>Support Tickets</h3>
            <div className="stat-value" style={{ color: '#2563eb' }}>{stats?.tickets || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#ecfdf5', color: '#059669' }}>
            <ShoppingBag size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Orders</h3>
            <div className="stat-value" style={{ color: '#059669' }}>{stats?.orders || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#f3e8ff', color: '#7c3aed' }}>
            <ShieldCheck size={24} />
          </div>
          <div className="stat-content">
            <h3>Current Role</h3>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: '#7c3aed', textTransform: 'capitalize' }}>
              {user.role ? user.role.replace('_', ' ') : 'User'}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Profile Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Quick Actions</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <a 
              href="/tickets" 
              className="btn btn-secondary" 
              style={{ justifyContent: 'space-between', padding: '14px 18px', borderRadius: '12px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Ticket size={18} style={{ color: 'var(--primary)' }} />
                <span>Manage Support Tickets</span>
              </div>
              <ArrowRight size={16} />
            </a>

            <a 
              href="/orders" 
              className="btn btn-secondary" 
              style={{ justifyContent: 'space-between', padding: '14px 18px', borderRadius: '12px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShoppingBag size={18} style={{ color: '#10b981' }} />
                <span>Browse & View Orders</span>
              </div>
              <ArrowRight size={16} />
            </a>

            {user.role === 'platform_admin' && (
              <a 
                href="/admin" 
                className="btn btn-secondary" 
                style={{ justifyContent: 'space-between', padding: '14px 18px', borderRadius: '12px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={18} style={{ color: '#8b5cf6' }} />
                  <span>Platform Admin Control Panel</span>
                </div>
                <ArrowRight size={16} />
              </a>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Account Details</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px' }}>
              <Mail size={18} style={{ color: 'var(--text-muted)' }} />
              <div>
                <p style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email</p>
                <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>{user.email}</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px' }}>
              <UserCheck size={18} style={{ color: 'var(--text-muted)' }} />
              <div>
                <p style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Full Name</p>
                <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>{user.first_name} {user.last_name}</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#f8fafc', borderRadius: '10px' }}>
              <Building size={18} style={{ color: 'var(--text-muted)' }} />
              <div>
                <p style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Organization ID</p>
                <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>{user.organization_id || 'Personal Account'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
