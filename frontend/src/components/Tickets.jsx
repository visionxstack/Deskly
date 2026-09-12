import { useState, useEffect } from 'react';
import { Ticket, Plus, ArrowLeft, MessageSquare, Send, AlertCircle, Clock, ShieldAlert } from './Icons';

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
    return (
      <div className="loading-spinner-container">
        <div className="spinner"></div>
        <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Loading support tickets...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Ticket size={28} style={{ color: 'var(--primary)' }} />
            Support Tickets
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Submit, track, and manage technical support issues
          </p>
        </div>
        <button 
          className={showCreateForm ? "btn btn-secondary" : "btn btn-primary"}
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : (
            <>
              <Plus size={18} />
              <span>Create Ticket</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {showCreateForm && (
        <div className="card" style={{ marginBottom: '24px', borderColor: 'var(--primary-light)' }}>
          <div className="card-header">
            <h2 className="card-title">
              <Plus size={20} style={{ color: 'var(--primary)' }} />
              Create New Support Ticket
            </h2>
          </div>
          <form onSubmit={handleCreateTicket}>
            <div className="form-group">
              <label htmlFor="title">Issue Summary / Title</label>
              <input
                type="text"
                id="title"
                placeholder="e.g., Unable to sync database backup"
                value={newTicket.title}
                onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="description">Detailed Description</label>
              <textarea
                id="description"
                placeholder="Provide steps to reproduce or context about the issue..."
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                required
                rows={4}
              />
            </div>
            <div className="form-group">
              <label htmlFor="priority">Priority Level</label>
              <select
                id="priority"
                value={newTicket.priority}
                onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical Emergency</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Submit Ticket
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedTicket ? (
        <div className="card">
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => setSelectedTicket(null)}
            style={{ marginBottom: '20px', gap: '6px' }}
          >
            <ArrowLeft size={16} />
            <span>Back to All Tickets</span>
          </button>
          
          <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
              <span className={`status-badge ${getStatusClass(selectedTicket.ticket.status)}`}>
                {selectedTicket.ticket.status ? selectedTicket.ticket.status.replace('_', ' ') : 'Open'}
              </span>
              <span className={`status-badge ${getPriorityClass(selectedTicket.ticket.priority)}`}>
                {selectedTicket.ticket.priority} priority
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                <Clock size={14} />
                Created {new Date(selectedTicket.ticket.created_at).toLocaleString()}
              </span>
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>{selectedTicket.ticket.title}</h2>
            <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', whiteSpace: 'pre-line', background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              {selectedTicket.ticket.description}
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} style={{ color: 'var(--primary)' }} />
              Activity & Comments ({selectedTicket.comments ? selectedTicket.comments.length : 0})
            </h3>
            
            <div className="comment-timeline">
              {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
                selectedTicket.comments.map((comment) => (
                  <div key={comment.id} className={`comment-card ${comment.is_internal ? 'internal' : ''}`}>
                    <div className="comment-meta">
                      <div 
                        className="user-avatar" 
                        style={{ width: '26px', height: '26px', fontSize: '0.75rem' }}
                      >
                        {comment.author_name ? comment.author_name[0] : 'U'}
                      </div>
                      <span className="comment-author">{comment.author_name}</span>
                      <span>•</span>
                      <span>{new Date(comment.created_at).toLocaleString()}</span>
                      {comment.is_internal && (
                        <span className="status-badge priority-critical" style={{ padding: '2px 8px', fontSize: '0.7rem', marginLeft: 'auto' }}>
                          <ShieldAlert size={12} />
                          Internal Note
                        </span>
                      )}
                    </div>
                    <div 
                      style={{ fontSize: '0.925rem', color: 'var(--text-main)', marginTop: '6px' }}
                      dangerouslySetInnerHTML={{ __html: comment.content }} 
                    />
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed var(--border-color)' }}>
                  <MessageSquare size={32} style={{ color: 'var(--text-light)', marginBottom: '8px' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No comments recorded on this ticket yet.</p>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleAddComment} style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <div className="form-group">
              <label htmlFor="comment">Add Comment or Response</label>
              <textarea
                id="comment"
                placeholder="Write a clear update or reply..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ gap: '8px' }}>
              <Send size={16} />
              <span>Post Comment</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {tickets.length > 0 ? (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ticket Title</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Created Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{ticket.title}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(ticket.status)}`}>
                          {ticket.status ? ticket.status.replace('_', ' ') : 'Open'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${getPriorityClass(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => fetchTicketDetails(ticket.id)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <Ticket size={40} style={{ color: 'var(--text-light)', marginBottom: '12px' }} />
              <h3 style={{ marginBottom: '4px' }}>No Support Tickets Found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                You have no open tickets. Click below to submit your first issue.
              </p>
              <button 
                className="btn btn-primary" 
                onClick={() => setShowCreateForm(true)}
              >
                <Plus size={16} />
                <span>Create New Ticket</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Tickets;
