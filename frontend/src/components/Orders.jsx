import { useState, useEffect } from 'react';
import { ShoppingBag, Plus, ArrowLeft, Trash2, Tag, CheckCircle2, DollarSign, Download, AlertCircle, ShoppingCart } from './Icons';

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
            unit_price: item.price
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
    return (
      <div className="loading-spinner-container">
        <div className="spinner"></div>
        <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Loading workspace orders...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <ShoppingBag size={28} style={{ color: '#10b981' }} />
            Orders & Catalog
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Place hardware/software orders and manage billing history
          </p>
        </div>
        <button 
          className={showCreateForm ? "btn btn-secondary" : "btn btn-primary"}
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : (
            <>
              <Plus size={18} />
              <span>Create New Order</span>
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
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h2 className="card-title">
              <ShoppingCart size={20} style={{ color: 'var(--primary)' }} />
              Product Catalog & Cart
            </h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '24px' }}>
            <div>
              <h4 style={{ marginBottom: '14px' }}>Available Products ({products.length})</h4>
              <div className="product-grid">
                {products.map((product) => (
                  <div key={product.id} className="product-card">
                    <div>
                      <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>{product.name}</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{product.description}</p>
                    </div>
                    <div>
                      <div className="product-price">${Number(product.price).toFixed(2)}</div>
                      <button 
                        className="btn btn-secondary btn-block btn-sm"
                        onClick={() => handleAddToCart(product)}
                        style={{ gap: '6px' }}
                      >
                        <Plus size={14} />
                        <span>Add to Cart</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cart Panel */}
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', height: 'fit-content' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingCart size={18} />
                  Shopping Cart
                </h3>
                <span className="status-badge status-open" style={{ padding: '2px 8px' }}>
                  {cart.reduce((a, c) => a + c.quantity, 0)} items
                </span>
              </div>

              {cart.length > 0 ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', maxHeight: '280px', overflowY: 'auto' }}>
                    {cart.map((item) => {
                      const product = products.find(p => p.id === item.product_id);
                      return (
                        <div key={item.product_id} style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{product?.name}</span>
                            <button 
                              className="btn btn-danger btn-sm" 
                              style={{ padding: '2px 6px', borderRadius: '4px' }}
                              onClick={() => handleRemoveFromCart(item.product_id)}
                              title="Remove item"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <span>Qty: {item.quantity} × ${Number(item.price).toFixed(2)}</span>
                            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label htmlFor="discountCode" style={{ fontSize: '0.8rem' }}>Discount Code</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        id="discountCode"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value)}
                        placeholder="e.g., WELCOME10"
                        style={{ paddingLeft: '34px', fontSize: '0.85rem' }}
                      />
                      <Tag size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800 }}>
                      <span>Total:</span>
                      <span style={{ color: 'var(--primary)' }}>${cartTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <button className="btn btn-primary btn-block" onClick={handleCreateOrder}>
                    <CheckCircle2 size={16} />
                    <span>Place Order</span>
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 12px' }}>
                  <ShoppingCart size={32} style={{ color: 'var(--text-light)', marginBottom: '8px' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Your cart is empty.</p>
                  <p style={{ color: 'var(--text-light)', fontSize: '0.775rem' }}>Select products to add items.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedOrder ? (
        <div className="card">
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => setSelectedOrder(null)}
            style={{ marginBottom: '20px', gap: '6px' }}
          >
            <ArrowLeft size={16} />
            <span>Back to Orders</span>
          </button>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span className={`status-badge ${getStatusClass(selectedOrder.order.status)}`}>
                  {selectedOrder.order.status}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Placed on {new Date(selectedOrder.order.created_at).toLocaleString()}
                </span>
              </div>
              <h2 style={{ fontSize: '1.6rem' }}>Order #{selectedOrder.order.id.slice(0, 8)}</h2>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Paid</p>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>
                ${Number(selectedOrder.order.final_amount).toFixed(2)}
              </div>
            </div>
          </div>

          {selectedOrder.order.discount_code && (
            <div style={{ background: '#ecfdf5', padding: '10px 14px', borderRadius: '8px', border: '1px solid #a7f3d0', marginBottom: '20px', fontSize: '0.875rem', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag size={16} />
              <span>Applied Discount Code <strong>{selectedOrder.order.discount_code}</strong> (-${selectedOrder.order.discount_amount})</span>
            </div>
          )}

          <h3 style={{ fontSize: '1.1rem', marginBottom: '14px' }}>Itemized Breakdown</h3>
          <div className="table-responsive" style={{ marginBottom: '20px' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th style={{ textAlign: 'right' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                    <td>{item.quantity}</td>
                    <td>${Number(item.unit_price).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>${Number(item.total_price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedOrder.order.status === 'delivered' && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-danger" 
                onClick={() => handleRequestRefund(selectedOrder.order.id)}
              >
                Request Refund
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {orders.length > 0 ? (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order Reference</th>
                    <th>Status</th>
                    <th>Total Amount</th>
                    <th>Created Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: 'var(--primary)' }}>
                        #{order.id.slice(0, 8)}
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusClass(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                        ${Number(order.final_amount).toFixed(2)}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => fetchOrderDetails(order.id)}
                        >
                          View Order
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <ShoppingBag size={40} style={{ color: 'var(--text-light)', marginBottom: '12px' }} />
              <h3 style={{ marginBottom: '4px' }}>No Orders Recorded</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                You have not placed any orders yet. Browse our catalog to get started.
              </p>
              <button 
                className="btn btn-primary" 
                onClick={() => setShowCreateForm(true)}
              >
                <Plus size={16} />
                <span>Browse Products</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Orders;
