import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from './config';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Registration failed');
        return;
      }
      setSuccess(true);
      // Auto-login after registration
      const tokenRes = await fetch(`${API_BASE_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: email, password }),
      });
      const tokenData = await tokenRes.json();
      if (tokenRes.ok) {
        login(tokenData.access_token);
        window.location.href = '/';
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', background: '#0D1F3C', padding: 30, borderRadius: 10, border: '1px solid #1E3A5F' }}>
      <h2 style={{ color: '#C8972B' }}>Create Account</h2>
      {success && <p style={{ color: '#1A7F5A' }}>Registration successful! Logging in...</p>}
      {error && <p style={{ color: '#B03A2E', marginTop: 10 }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
        <div style={{ marginBottom: 15 }}>
          <label style={{ display: 'block', fontSize: 13, color: '#8899AA' }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div style={{ marginBottom: 15 }}>
          <label style={{ display: 'block', fontSize: 13, color: '#8899AA' }}>Password (min 6 chars)</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <div style={{ marginBottom: 15 }}>
          <label style={{ display: 'block', fontSize: 13, color: '#8899AA' }}>Confirm Password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
        </div>
        <button type="submit" style={{ width: '100%', background: '#1B4F9B', color: '#F5F7FA', padding: 12, fontWeight: 600, borderRadius: 6 }}>Register</button>
      </form>
      <p style={{ marginTop: 20, fontSize: 13, color: '#8899AA' }}>Already have an account? <a href="/login" style={{ color: '#C8972B' }}>Login</a></p>
    </div>
  );
}
