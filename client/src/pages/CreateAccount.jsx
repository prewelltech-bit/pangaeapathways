import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { UserPlus, Mail, Lock, User, Globe, Building2, CheckCircle, AlertCircle } from 'lucide-react';
import './CreateAccount.css';

const COUNTRIES = [
  'Australia', 'India', 'Canada', 'United Kingdom', 'United States',
  'New Zealand', 'Germany', 'France', 'UAE', 'Singapore', 'Other'
];

export default function CreateAccount() {
  const { user, isCEO, isDirector, createUserByAdmin } = useAuth();
  const [branches, setBranches] = useState([]);
  const [role, setRole] = useState(isCEO ? 'DIRECTOR' : 'BRANCH_ADMIN');
  const [mode, setMode] = useState('email'); // 'email' | 'google'
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    country: isCEO ? '' : (user?.country || ''),
    branchId: '',
  });

  useEffect(() => {
    if (isCEO || isDirector) {
      axios.get('/api/meta/branches', { withCredentials: true }).then(res => {
        setBranches(res.data);
      }).catch(console.error);
    }
  }, [isCEO, isDirector]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const isFormValidForSignup = () => {
    if (isCEO) {
      if (role === 'DIRECTOR') return !!form.country;
      return true;
    } else {
      if (role === 'HR') return true;
      return !!form.branchId;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: role,
        country: role === 'DIRECTOR' ? form.country : (isCEO ? (form.country || undefined) : user?.country),
        branchId: role !== 'DIRECTOR' && form.branchId ? form.branchId : undefined,
      };
      await createUserByAdmin(payload);
      setSuccess(`✅ ${role === 'DIRECTOR' ? 'Director' : role === 'HR' ? 'HR Manager' : 'Branch Admin'} account created! They can now log in with email/password or Google.`);
      setForm({ name: '', email: '', password: '', country: isCEO ? '' : (user?.country || ''), branchId: '' });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await axios.post('/api/auth/google/create-account', {
        credential: credentialResponse.credential,
        role: role,
        country: role === 'DIRECTOR' ? form.country : (isCEO ? (form.country || undefined) : user?.country),
        branchId: role !== 'DIRECTOR' && form.branchId ? form.branchId : undefined,
      }, { withCredentials: true });
      setSuccess(`✅ ${role === 'DIRECTOR' ? 'Director' : role === 'HR' ? 'HR Manager' : 'Branch Admin'} Google account linked and created!`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create account via Google');
    } finally {
      setLoading(false);
    }
  };

  if (!isCEO && !isDirector) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
        <AlertCircle size={48} style={{ margin: '0 auto 1rem', color: '#ef4444' }} />
        <h2>Access Denied</h2>
        <p>You don't have permission to create accounts.</p>
      </div>
    );
  }

  return (
    <div className="create-account-container">
      <div className="create-account-header">
        <div className="create-account-title-wrapper">
          <div className="create-account-icon-wrapper">
            <UserPlus size={20} color="white" />
          </div>
          <h1 className="create-account-title">
            Create {role === 'DIRECTOR' ? 'Director' : role === 'HR' ? 'HR Manager' : 'Branch Admin'} Account
          </h1>
        </div>
        <p className="create-account-subtitle">
          {isCEO
            ? 'Create a new Director or HR Manager account and assign their scope.'
            : `Create a new Branch Admin, Admin or HR account for ${user?.country}.`}
        </p>
      </div>

      {success && (
        <div className="create-account-success">
          <CheckCircle size={18} />
          {success}
        </div>
      )}
      {error && (
        <div className="create-account-error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="create-account-mode-toggle">
        {['email', 'google'].map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`create-account-mode-btn ${mode === m ? 'active' : 'inactive'}`}
          >
            {m === 'email' ? '📧 Email & Password' : '🔐 Google Account'}
          </button>
        ))}
      </div>

      <div className="create-account-card">

        {/* Role Selection */}
        <div className="create-account-field">
          <label className="create-account-label">
            <User size={14} /> Account Role
          </label>
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setForm(prev => ({ ...prev, branchId: '', country: isCEO ? '' : (user?.country || '') }));
            }}
            className="create-account-input"
          >
            {isCEO ? (
              <>
                <option value="DIRECTOR">Director</option>
                <option value="HR">HR Manager</option>
              </>
            ) : (
              <>
                <option value="BRANCH_ADMIN">Branch Admin</option>
                <option value="ADMIN">Branch Admin (Alternate)</option>
                <option value="HR">HR Manager</option>
              </>
            )}
          </select>
        </div>

        {isCEO && (
          <div className="create-account-field">
            <label className="create-account-label">
              <Globe size={14} /> Assign Country {role === 'DIRECTOR' && <span style={{ color: 'red' }}>*</span>}
            </label>
            <select name="country" value={form.country} onChange={handleChange} required={role === 'DIRECTOR'} className="create-account-input">
              <option value="">— {role === 'HR' ? 'Global (No Country Scope)' : 'Select country'} —</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {isDirector && (
          <div className="create-account-field create-account-auto-assigned">
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Your Country (auto-assigned)</span>
            <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>🌍 {user?.country}</div>
          </div>
        )}

        {role !== 'DIRECTOR' && (
          <div className="create-account-field">
            <label className="create-account-label">
              <Building2 size={14} /> Assign Branch {role !== 'HR' && <span style={{ color: 'red' }}>*</span>}
            </label>
            <select name="branchId" value={form.branchId} onChange={handleChange} required={role !== 'HR'} className="create-account-input">
              <option value="">— {role === 'HR' ? 'Country-wide (No Branch Scope)' : 'Select branch'} —</option>
              {branches
                .filter(b => !isCEO || !form.country || b.country === form.country)
                .map(b => <option key={b._id} value={b._id}>{b.name} ({b.city})</option>)}
            </select>
          </div>
        )}

        {mode === 'email' && (
          <form onSubmit={handleSubmit} className="create-account-form">
            <div>
              <label className="create-account-label"><User size={14} /> Full Name</label>
              <input type="text" name="name" required value={form.name} onChange={handleChange} placeholder="e.g. Sarah Johnson" className="create-account-input" />
            </div>
            <div>
              <label className="create-account-label"><Mail size={14} /> Email Address</label>
              <input type="email" name="email" required value={form.email} onChange={handleChange} placeholder="user@example.com" className="create-account-input" />
            </div>
            <div>
              <label className="create-account-label"><Lock size={14} /> Temporary Password</label>
              <input type="password" name="password" required value={form.password} onChange={handleChange} placeholder="Min 8 characters" className="create-account-input" />
              <p className="create-account-hint">
                Share this password with the new user. They can change it later.
              </p>
            </div>
            <button type="submit" disabled={loading} className="create-account-submit">
              {loading ? 'Creating...' : `Create ${role === 'DIRECTOR' ? 'Director' : role === 'HR' ? 'HR' : 'Branch Admin'} Account`}
            </button>
          </form>
        )}

        {mode === 'google' && (
          <div>
            <p className="create-account-google-hint">
              Ask the new user to open this page on their device and click the Google button below.
              They will use their Google account to register.
            </p>
            {isFormValidForSignup() ? (
              <div className="create-account-google-wrapper">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google sign-in failed or was cancelled')}
                  theme="outline"
                  shape="rectangular"
                  size="large"
                  width="340"
                  text="signup_with"
                />
              </div>
            ) : (
              <div className="create-account-google-warning">
                ⚠️ Please {isCEO ? 'select a country' : 'select a branch'} first.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
