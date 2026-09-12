import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try { await register(form.name, form.email, form.password, form.role); navigate('/dashboard'); }
    catch (err) { setError(err.response?.data?.error || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="card form-box">
      <h2>Create Account</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit}>
        <label>Name</label>
        <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <label>Email</label>
        <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
        <label>Password</label>
        <input type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
        <label>Role</label>
        <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button className="btn" disabled={loading} type="submit">{loading ? 'Creating...' : 'Register'}</button>
      </form>
      <p style={{ marginTop: 12 }}>Already registered? <Link to="/login">Login</Link></p>
    </div>
  );
}