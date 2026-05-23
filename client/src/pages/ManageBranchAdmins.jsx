import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Building2, Users, UserCheck, UserX, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import './ManageBranchAdmins.css';

export default function ManageBranchAdmins() {
  const { isCEO, isDirector, user } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const fetchAdmins = async () => {
    try {
      const res = await axios.get('/api/users/branch-admins', { withCredentials: true });
      setAdmins(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const toggleActive = async (userId, isActive) => {
    try {
      const endpoint = isActive ? 'deactivate' : 'activate';
      await axios.patch(`/api/users/${userId}/${endpoint}`, {}, { withCredentials: true });
      setActionMsg(`User ${isActive ? 'deactivated' : 'activated'} successfully`);
      fetchAdmins();
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setActionMsg(err.response?.data?.detail || 'Action failed');
    }
  };

  if (!isCEO && !isDirector) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
        <AlertCircle size={48} style={{ margin: '0 auto 1rem', color: '#ef4444' }} />
        <h2>Access Denied</h2>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="manage-admins-header">
        <div className="manage-admins-icon-wrapper">
          <Building2 size={20} color="white" />
        </div>
        <div>
          <h1 className="manage-admins-title">Branch Admins</h1>
          <p className="manage-admins-subtitle">
            {isDirector ? `Branch admins in ${user?.country}` : 'All branch admins globally'} — {admins.length} total
          </p>
        </div>
      </div>

      {actionMsg && (
        <div className="manage-admins-action-msg">
          {actionMsg}
        </div>
      )}

      {loading ? (
        <div className="manage-admins-loading">Loading...</div>
      ) : admins.length === 0 ? (
        <div className="manage-admins-empty">
          <Users size={40} className="manage-admins-empty-icon" />
          <p>No branch admins yet. Use "Create Account" to add one.</p>
        </div>
      ) : (
        <div className="manage-admins-grid">
          {admins.map(admin => (
            <div key={admin._id} className={`manage-admins-card ${admin.isActive === false ? 'inactive' : ''}`}>
              <div className="manage-admins-card-left">
                <div className="manage-admins-avatar">
                  {admin.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="manage-admins-info-name">{admin.name}</div>
                  <div className="manage-admins-info-email">{admin.email}</div>
                  <div className="manage-admins-info-badges">
                    {admin.branchName && (
                      <span className="manage-admins-badge-branch">
                        🏢 {admin.branchName}
                      </span>
                    )}
                    {admin.country && (
                      <span className="manage-admins-badge-country">
                        🌍 {admin.country}
                      </span>
                    )}
                    {admin.googleId && (
                      <span className="manage-admins-info-google">🔐 Google</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="manage-admins-card-right">
                <span className={`manage-admins-status-badge ${admin.isActive !== false ? 'active' : 'inactive'}`}>
                  {admin.isActive !== false ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => toggleActive(admin._id, admin.isActive !== false)}
                  title={admin.isActive !== false ? 'Deactivate' : 'Activate'}
                  className="manage-admins-action-btn"
                >
                  {admin.isActive !== false ? <UserX size={16} /> : <UserCheck size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
