import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from './config';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Login failed');
        return;
      }
      login(data.access_token);
      window.location.href = '/';
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', background: '#0D1F3C', padding: 30, borderRadius: 10, border: '1px solid #1E3A5F' }}>
      <h2 style={{ color: '#C8972B' }}>Login to Customs Platform</h2>
      {error && <p style={{ color: '#B03A2E', marginTop: 10 }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
        <div style={{ marginBottom: 15 }}>
          <label style={{ display: 'block', fontSize: 13, color: '#8899AA' }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div style={{ marginBottom: 15 }}>
          <label style={{ display: 'block', fontSize: 13, color: '#8899AA' }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <button type="submit" style={{ width: '100%', background: '#C8972B', color: '#0A1628', padding: 12, fontWeight: 600, borderRadius: 6 }}>Log In</button>
      </form>
      <p style={{ marginTop: 20, fontSize: 13, color: '#8899AA' }}>Don't have an account? <a href="/register" style={{ color: '#C8972B' }}>Register</a></p>
    </div>
  );
}
