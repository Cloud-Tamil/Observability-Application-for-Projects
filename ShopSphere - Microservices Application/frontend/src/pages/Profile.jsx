import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => { api.get('/users/me').then(r => setProfile(r.data)).catch(() => {}); }, []);

  const save = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const res = await api.put('/users/me', {
        name: profile.name, bio: profile.bio, phone: profile.phone, address: profile.address
      });
      setProfile(res.data);
      setMsg('Profile updated ✅');
    } catch { setMsg('Update failed ❌'); }
  };

  if (!profile) return <div className="card">Loading profile...</div>;

  return (
    <div className="card form-box">
      <h2>My Profile</h2>
      {msg && <div className="success">{msg}</div>}
      <form onSubmit={save}>
        <label>Name</label>
        <input value={profile.name || ''} onChange={e => setProfile({...profile, name: e.target.value})} />
        <label>Email (read-only)</label>
        <input value={profile.email || ''} readOnly />
        <label>Bio</label>
        <textarea value={profile.bio || ''} onChange={e => setProfile({...profile, bio: e.target.value})} />
        <label>Phone</label>
        <input value={profile.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} />
        <label>Address</label>
        <input value={profile.address || ''} onChange={e => setProfile({...profile, address: e.target.value})} />
        <button className="btn" type="submit">Save</button>
      </form>
    </div>
  );
}