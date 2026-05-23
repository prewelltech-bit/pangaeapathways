import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Globe, Users, UserCheck, UserX, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import './ManageDirectors.css';

export default function ManageDirectors() {
  const { isCEO } = useAuth();
  const [directors, setDirectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const fetchDirectors = async () => {
    try {
      const res = await axios.get('/api/users/directors', { withCredentials: true });
      setDirectors(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDirectors(); }, []);

  const toggleActive = async (userId, isActive) => {
    try {
      const endpoint = isActive ? 'deactivate' : 'activate';
      await axios.patch(`/api/users/${userId}/${endpoint}`, {}, { withCredentials: true });
      setActionMsg(`User ${isActive ? 'deactivated' : 'activated'} successfully`);
      fetchDirectors();
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setActionMsg(err.response?.data?.detail || 'Action failed');
    }
  };

  if (!isCEO) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
        <AlertCircle size={48} style={{ margin: '0 auto 1rem', color: '#ef4444' }} />
        <h2>CEO Access Required</h2>
      </div>
    );
  }

  // Group by country
  const byCountry = directors.reduce((acc, d) => {
    const c = d.country || 'Unassigned';
    if (!acc[c]) acc[c] = [];
    acc[c].push(d);
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <div className="manage-directors-header">
        <div className="manage-directors-icon-wrapper">
          <Globe size={20} color="white" />
        </div>
        <div>
          <h1 className="manage-directors-title">Directors</h1>
          <p className="manage-directors-subtitle">All directors across countries — {directors.length} total</p>
        </div>
      </div>

      {actionMsg && (
        <div className="manage-directors-action-msg">
          {actionMsg}
        </div>
      )}

      {loading ? (
        <div className="manage-directors-loading">Loading...</div>
      ) : directors.length === 0 ? (
        <div className="manage-directors-empty">
          <Users size={40} className="manage-directors-empty-icon" />
          <p>No directors yet. Use "Create Account" to add the first director.</p>
        </div>
      ) : (
        Object.entries(byCountry).map(([country, dirs]) => (
          <div key={country} className="manage-directors-country-group">
            <div className="manage-directors-country-header">
              <span className="manage-directors-country-emoji">🌍</span>
              <h2 className="manage-directors-country-name">{country}</h2>
              <span className="manage-directors-country-count">
                {dirs.length} director{dirs.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="manage-directors-grid">
              {dirs.map(d => (
                <div key={d._id} className={`manage-directors-card ${d.isActive === false ? 'inactive' : ''}`}>
                  <div className="manage-directors-card-left">
                    <div className="manage-directors-avatar">
                      {d.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="manage-directors-info-name">{d.name}</div>
                      <div className="manage-directors-info-email">{d.email}</div>
                      {d.googleId && <div className="manage-directors-info-google">🔐 Google linked</div>}
                    </div>
                  </div>
                  <div className="manage-directors-card-right">
                    <span className={`manage-directors-status-badge ${d.isActive !== false ? 'active' : 'inactive'}`}>
                      {d.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => toggleActive(d._id, d.isActive !== false)}
                      title={d.isActive !== false ? 'Deactivate' : 'Activate'}
                      className="manage-directors-action-btn"
                    >
                      {d.isActive !== false ? <UserX size={16} /> : <UserCheck size={16} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
