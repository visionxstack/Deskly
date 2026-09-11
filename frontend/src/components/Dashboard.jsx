import { useState, useEffect } from 'react';

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
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Welcome back, {user.first_name}!</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card">
          <h3>My Tickets</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3498db' }}>{stats?.tickets || 0}</p>
        </div>
        <div className="card">
          <h3>My Orders</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#27ae60' }}>{stats?.orders || 0}</p>
        </div>
        <div className="card">
          <h3>Role</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#9b59b6' }}>{user.role}</p>
        </div>
      </div>

      <div className="card">
        <h2>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <a href="/tickets" className="btn btn-primary">View Tickets</a>
          <a href="/orders" className="btn btn-primary">View Orders</a>
          {user.role === 'platform_admin' && <a href="/admin" className="btn btn-secondary">Admin Panel</a>}
        </div>
      </div>

      <div className="card">
        <h2>Account Information</h2>
        <div style={{ marginTop: '1rem' }}>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Name:</strong> {user.first_name} {user.last_name}</p>
          <p><strong>Role:</strong> {user.role}</p>
          <p><strong>Organization ID:</strong> {user.organization_id}</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
