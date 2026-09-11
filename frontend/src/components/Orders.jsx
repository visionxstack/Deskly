import { useState, useEffect } from 'react';

function Orders({ user }) {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [discountCode, setDiscountCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, [user]);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/orders/products/catalog', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchOrderDetails = async (orderId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setSelectedOrder(data);
    } catch (error) {
      console.error('Failed to fetch order details:', error);
    }
  };

  const handleAddToCart = (product) => {
    const existingItem = cart.find(item => item.product_id === product.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product_id: product.id, quantity: 1, price: product.price }]);
    }
  };

  const handleRemoveFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setError('');

    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          items: cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.price // VULNERABILITY: Client-modifiable price
          })),
          discount_code: discountCode || undefined
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCart([]);
        setDiscountCode('');
        setShowCreateForm(false);
        fetchOrders();
      } else {
        setError(data.error || 'Failed to create order');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const handleRequestRefund = async (orderId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/orders/${orderId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert('Refund requested successfully');
        fetchOrders();
        if (selectedOrder) {
          fetchOrderDetails(orderId);
        }
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to request refund');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/admin/invoices/${invoiceId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'invoice.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download invoice');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const getStatusClass = (status) => {
    const classes = {
      pending: 'status-open',
      processing: 'status-in_progress',
      shipped: 'status-in_progress',
      delivered: 'status-resolved',
      cancelled: 'status-closed',
      refunded: 'status-closed',
    };
    return classes[status] || 'status-open';
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (loading) {
    return <div className="loading">Loading orders...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Orders</h1>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : 'New Order'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {showCreateForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3>Create New Order</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div>
              <h4>Products</h4>
              {products.map((product) => (
                <div key={product.id} className="card" style={{ padding: '1rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{product.name}</strong>
                      <p style={{ fontSize: '0.875rem', color: '#666' }}>{product.description}</p>
                      <p style={{ fontWeight: 'bold', color: '#27ae60' }}>${product.price}</p>
                    </div>
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleAddToCart(product)}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <h4>Cart ({cart.length} items)</h4>
              {cart.length > 0 ? (
                <>
                  {cart.map((item) => {
                    const product = products.find(p => p.id === item.product_id);
                    return (
                      <div key={item.product_id} className="card" style={{ padding: '0.5rem', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{product?.name}</span>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                            onClick={() => handleRemoveFromCart(item.product_id)}
                          >
                            Remove
                          </button>
                        </div>
                        <p>Quantity: {item.quantity} × ${item.price}</p>
                      </div>
                    );
                  })}
                  <div className="form-group">
                    <label htmlFor="discountCode">Discount Code</label>
                    <input
                      type="text"
                      id="discountCode"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      placeholder="e.g., WELCOME10"
                    />
                  </div>
                  <p style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>Total: ${cartTotal.toFixed(2)}</p>
                  <button className="btn btn-primary" onClick={handleCreateOrder} style={{ width: '100%' }}>
                    Place Order
                  </button>
                </>
              ) : (
                <p style={{ color: '#666' }}>Cart is empty</p>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedOrder ? (
        <div className="card">
          <button 
            className="btn btn-secondary" 
            onClick={() => setSelectedOrder(null)}
            style={{ marginBottom: '1rem' }}
          >
            ← Back to Orders
          </button>
          <h2>Order #{selectedOrder.order.id.slice(0, 8)}</h2>
          <div style={{ marginBottom: '1rem' }}>
            <span className={`status-badge ${getStatusClass(selectedOrder.order.status)}`}>
              {selectedOrder.order.status}
            </span>
          </div>
          <p><strong>Total:</strong> ${selectedOrder.order.final_amount}</p>
          {selectedOrder.order.discount_code && (
            <p><strong>Discount Code:</strong> {selectedOrder.order.discount_code} (-${selectedOrder.order.discount_amount})</p>
          )}
          <p><strong>Created:</strong> {new Date(selectedOrder.order.created_at).toLocaleString()}</p>
          
          <h3 style={{ marginTop: '1.5rem' }}>Items</h3>
          {selectedOrder.items.map((item) => (
            <div key={item.id} className="card" style={{ padding: '1rem', marginBottom: '0.5rem' }}>
              <p><strong>{item.product_name}</strong></p>
              <p>Quantity: {item.quantity} × ${item.unit_price} = ${item.total_price}</p>
            </div>
          ))}

          {selectedOrder.order.status === 'delivered' && (
            <button 
              className="btn btn-danger" 
              onClick={() => handleRequestRefund(selectedOrder.order.id)}
              style={{ marginTop: '1rem' }}
            >
              Request Refund
            </button>
          )}
        </div>
      ) : (
        <div className="card">
          {orders.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id.slice(0, 8)}</td>
                    <td><span className={`status-badge ${getStatusClass(order.status)}`}>{order.status}</span></td>
                    <td>${order.final_amount}</td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                    <td>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => fetchOrderDetails(order.id)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ textAlign: 'center', color: '#666' }}>No orders found.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default Orders;
