import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Tickets from './components/Tickets';
import Orders from './components/Orders';
import AdminPanel from './components/AdminPanel';
import './index.css';

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
    return <div className="loading">Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        {user ? (
          <>
            <header className="header">
              <div className="container header-content">
                <div className="logo">Deskly</div>
                <nav className="nav">
                  <Link to="/dashboard">Dashboard</Link>
                  <Link to="/tickets">Tickets</Link>
                  <Link to="/orders">Orders</Link>
                  {user.role === 'platform_admin' && <Link to="/admin">Admin</Link>}
                  <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
                </nav>
              </div>
            </header>
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
          <div className="container">
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
