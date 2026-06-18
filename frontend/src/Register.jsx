import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from './config';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  // Clean up on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && (token === 'guest' || token === 'null' || token === 'undefined')) {
      localStorage.removeItem('token');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password !== confirm) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email');
      setLoading(false);
      return;
    }

    try {
      // Check if email already exists
      const res = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(8000),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || 'Registration failed');
        setLoading(false);
        return;
      }

      setSuccess(true);

      // Auto-login after successful registration
      try {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        const tokenRes = await fetch(`${API_BASE_URL}/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData,
          signal: AbortSignal.timeout(8000),
        });

        const tokenData = await tokenRes.json();

        if (tokenRes.ok) {
          login(tokenData.access_token);
          window.location.href = '/';
        } else {
          // Registration succeeded but auto-login failed
          setError('Registration successful! Please login manually.');
          setLoading(false);
        }
      } catch (autoLoginErr) {
        setError('Registration successful! Please login manually.');
        setLoading(false);
      }
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        setError('Connection timeout. Please try again.');
      } else {
        setError('Network error. Please check your connection.');
      }
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '1rem',
      background: 'var(--bg, #0A1628)'
    }}>
      <div style={{
        maxWidth: 420,
        width: '100%',
        background: '#0D1F3C',
        padding: '2rem',
        borderRadius: 12,
        border: '1px solid #1E3A5F',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        <h2 style={{ color: '#C8972B', marginBottom: '0.5rem', fontSize: '1.8rem' }}>Create Account</h2>
        <p style={{ color: '#8899AA', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Join the PH Customs Platform</p>

        {success && (
          <div style={{
            background: '#1A7F5A22',
            border: '1px solid #1A7F5A',
            borderRadius: 6,
            padding: '0.75rem',
            marginBottom: '1rem',
            color: '#1A7F5A',
            fontSize: '0.9rem'
          }}>Account created! Logging you in...</div>
        )}

        {error && (
          <div style={{
            background: '#B03A2E22',
            border: '1px solid #B03A2E',
            borderRadius: 6,
            padding: '0.75rem',
            marginBottom: '1rem',
            color: '#B03A2E',
            fontSize: '0.9rem'
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#8899AA', marginBottom: '0.35rem' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                height: 44,
                padding: '0 12px',
                background: '#112240',
                border: '1px solid #1E3A5F',
                borderRadius: 6,
                color: '#F5F7FA',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              placeholder="you@example.com"
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#8899AA', marginBottom: '0.35rem' }}>Password (min 6 chars)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  flex: 1,
                  height: 44,
                  padding: '0 12px',
                  background: '#112240',
                  border: '1px solid #1E3A5F',
                  borderRadius: 6,
                  color: '#F5F7FA',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                placeholder="Min 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  height: 44,
                  padding: '0 12px',
                  background: 'transparent',
                  color: '#8899AA',
                  border: '1px solid #1E3A5F',
                  borderRadius: 6,
                  fontSize: '1.2rem',
                  minWidth: 44
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#8899AA', marginBottom: '0.35rem' }}>Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              style={{
                width: '100%',
                height: 44,
                padding: '0 12px',
                background: '#112240',
                border: '1px solid #1E3A5F',
                borderRadius: 6,
                color: '#F5F7FA',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              placeholder="Re-enter password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            style={{
              width: '100%',
              height: 48,
              background: loading || success ? '#1E3A5F' : '#1B4F9B',
              color: loading || success ? '#8899AA' : '#F5F7FA',
              padding: '0 1rem',
              fontWeight: 600,
              borderRadius: 6,
              fontSize: '1rem',
              cursor: loading || success ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            {loading ? (
              <>
                <span style={{
                  display: 'inline-block',
                  width: 18,
                  height: 18,
                  border: '2px solid #8899AA',
                  borderTop: '2px solid #1B4F9B',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                Creating Account...
              </>
            ) : success ? (
              '✅ Account Created!'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: '#8899AA' }}>
          Already have an account? <a href="/login" style={{ color: '#C8972B', fontWeight: 500 }}>Log In</a>
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
