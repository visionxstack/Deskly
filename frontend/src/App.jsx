import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LayoutDashboard, Ticket, ShoppingBag, ShieldCheck, LogOut, Layers, Sparkles } from './components/Icons';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Tickets from './components/Tickets';
import Orders from './components/Orders';
import AdminPanel from './components/AdminPanel';
import './index.css';

function NavLinks({ user, handleLogout }) {
  const location = useLocation();
  const getInitials = (firstName, lastName) => {
    if (!firstName) return 'U';
    return `${firstName[0]}${lastName ? lastName[0] : ''}`.toUpperCase();
  };

  return (
    <header className="header">
      <div className="container header-content">
        <Link to="/dashboard" className="logo-container">
          <div className="logo-icon-badge">
            <Layers size={22} />
          </div>
          <span className="logo-text">Deskly</span>
        </Link>
        
        <nav className="nav">
          <Link to="/dashboard" className={location.pathname === '/dashboard' || location.pathname === '/' ? 'active' : ''}>
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </Link>
          <Link to="/tickets" className={location.pathname === '/tickets' ? 'active' : ''}>
            <Ticket size={16} />
            <span>Tickets</span>
          </Link>
          <Link to="/orders" className={location.pathname === '/orders' ? 'active' : ''}>
            <ShoppingBag size={16} />
            <span>Orders</span>
          </Link>
          {user.role === 'platform_admin' && (
            <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>
              <ShieldCheck size={16} />
              <span>Admin</span>
            </Link>
          )}
        </nav>

        <div className="user-profile-badge">
          <div className="user-avatar" title={`${user.first_name} ${user.last_name}`}>
            {getInitials(user.first_name, user.last_name)}
          </div>
          <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ gap: '6px' }}>
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchUserInfo();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    } catch (error) {
      console.error('Failed to fetch user info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData, tokens) => {
    setUser(userData);
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  if (loading) {
    return (
      <div className="loading-spinner-container">
        <div className="spinner"></div>
        <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Loading Deskly platform...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        {user ? (
          <>
            <NavLinks user={user} handleLogout={handleLogout} />
            <main className="container">
              <Routes>
                <Route path="/dashboard" element={<Dashboard user={user} />} />
                <Route path="/tickets" element={<Tickets user={user} />} />
                <Route path="/orders" element={<Orders user={user} />} />
                <Route path="/admin" element={<AdminPanel user={user} />} />
                <Route path="/" element={<Dashboard user={user} />} />
              </Routes>
            </main>
          </>
        ) : (
          <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '90vh' }}>
            <Routes>
              <Route path="/register" element={<Register onLogin={handleLogin} />} />
              <Route path="/" element={<Login onLogin={handleLogin} />} />
            </Routes>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;
