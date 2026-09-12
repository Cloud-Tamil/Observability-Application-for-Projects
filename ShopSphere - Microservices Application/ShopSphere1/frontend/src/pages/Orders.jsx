import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ product: '', qty: 1, price: 10, address: '' });
  const [error, setError] = useState('');

  const load = () => api.get('/orders/my').then(r => setOrders(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const createOrder = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const total = Number(form.qty) * Number(form.price);
      await api.post('/orders', {
        items: [{ product: form.product, qty: Number(form.qty), price: Number(form.price) }],
        total, address: form.address
      });
      setForm({ product: '', qty: 1, price: 10, address: '' });
      load();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
  };

  const cancel = async (id) => {
    if (!confirm('Cancel this order?')) return;
    await api.delete(`/orders/${id}`);
    load();
  };

  return (
    <div>
      <div className="card">
        <h2>Create Order</h2>
        {error && <div className="error">{error}</div>}
        <form onSubmit={createOrder}>
          <label>Product</label>
          <input required value={form.product} onChange={e => setForm({...form, product: e.target.value})} />
          <label>Quantity</label>
          <input type="number" min="1" required value={form.qty} onChange={e => setForm({...form, qty: e.target.value})} />
          <label>Price</label>
          <input type="number" min="0" step="0.01" required value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
          <label>Shipping Address</label>
          <input required value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
          <button className="btn" type="submit">Place Order</button>
        </form>
      </div>

      <div className="card">
        <h2>My Orders</h2>
        {orders.length === 0 ? <p>No orders yet.</p> : (
          <table>
            <thead><tr><th>Product</th><th>Qty</th><th>Total</th><th>Status</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o._id}>
                  <td>{o.items.map(i => i.product).join(', ')}</td>
                  <td>{o.items.reduce((s, i) => s + i.qty, 0)}</td>
                  <td>${o.total.toFixed(2)}</td>
                  <td><span className="badge">{o.status}</span></td>
                  <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td><button className="btn btn-danger" onClick={() => cancel(o._id)}>Cancel</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}