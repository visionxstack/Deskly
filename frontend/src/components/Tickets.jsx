import { useState, useEffect } from 'react';

function Tickets({ user }) {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newTicket, setNewTicket] = useState({ title: '', description: '', priority: 'medium' });
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/tickets', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async (ticketId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/tickets/${ticketId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setSelectedTicket(data);
    } catch (error) {
      console.error('Failed to fetch ticket details:', error);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newTicket),
      });

      const data = await response.json();

      if (response.ok) {
        setNewTicket({ title: '', description: '', priority: 'medium' });
        setShowCreateForm(false);
        fetchTickets();
      } else {
        setError(data.error || 'Failed to create ticket');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/tickets/${selectedTicket.ticket.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment, is_internal: false }),
      });

      if (response.ok) {
        setNewComment('');
        fetchTicketDetails(selectedTicket.ticket.id);
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const getPriorityClass = (priority) => {
    const classes = {
      low: 'priority-low',
      medium: 'priority-medium',
      high: 'priority-high',
      critical: 'priority-critical',
    };
    return classes[priority] || 'priority-medium';
  };

  const getStatusClass = (status) => {
    const classes = {
      open: 'status-open',
      in_progress: 'status-in_progress',
      resolved: 'status-resolved',
      closed: 'status-closed',
    };
    return classes[status] || 'status-open';
  };

  if (loading) {
    return <div className="loading">Loading tickets...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Support Tickets</h1>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : 'Create Ticket'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {showCreateForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3>Create New Ticket</h3>
          <form onSubmit={handleCreateTicket}>
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                type="text"
                id="title"
                value={newTicket.title}
                onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                required
                rows={4}
              />
            </div>
            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                value={newTicket.priority}
                onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">Create Ticket</button>
          </form>
        </div>
      )}

      {selectedTicket ? (
        <div className="card">
          <button 
            className="btn btn-secondary" 
            onClick={() => setSelectedTicket(null)}
            style={{ marginBottom: '1rem' }}
          >
            ← Back to Tickets
          </button>
          <h2>{selectedTicket.ticket.title}</h2>
          <div style={{ marginBottom: '1rem' }}>
            <span className={`status-badge ${getStatusClass(selectedTicket.ticket.status)}`}>
              {selectedTicket.ticket.status}
            </span>
            <span className={`status-badge ${getPriorityClass(selectedTicket.ticket.priority)}`} style={{ marginLeft: '0.5rem' }}>
              {selectedTicket.ticket.priority}
            </span>
          </div>
          <p style={{ marginBottom: '1.5rem' }}>{selectedTicket.ticket.description}</p>
          
          <h3>Comments</h3>
          <div style={{ marginBottom: '1rem' }}>
            {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
              selectedTicket.comments.map((comment) => (
                <div key={comment.id} className="card" style={{ marginBottom: '0.5rem', padding: '1rem' }}>
                  <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                    <strong>{comment.author_name}</strong> • {new Date(comment.created_at).toLocaleString()}
                    {comment.is_internal && <span style={{ marginLeft: '0.5rem', color: '#e74c3c' }}>(Internal)</span>}
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: comment.content }} />
                </div>
              ))
            ) : (
              <p style={{ color: '#666' }}>No comments yet.</p>
            )}
          </div>
          
          <form onSubmit={handleAddComment}>
            <div className="form-group">
              <label htmlFor="comment">Add a comment</label>
              <textarea
                id="comment"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
            </div>
            <button type="submit" className="btn btn-primary">Add Comment</button>
          </form>
        </div>
      ) : (
        <div className="card">
          {tickets.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>{ticket.title}</td>
                    <td><span className={`status-badge ${getStatusClass(ticket.status)}`}>{ticket.status}</span></td>
                    <td><span className={`status-badge ${getPriorityClass(ticket.priority)}`}>{ticket.priority}</span></td>
                    <td>{new Date(ticket.created_at).toLocaleDateString()}</td>
                    <td>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => fetchTicketDetails(ticket.id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ textAlign: 'center', color: '#666' }}>No tickets found.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default Tickets;
