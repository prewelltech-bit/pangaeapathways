import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, MoreVertical, Users, User, Download, Phone, Mail, Calendar, ChevronLeft, ChevronRight, Edit, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../lib/AuthContext';
import FollowUpModal from '../components/FollowUpModal';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const perPage = 25;
  const { user, isCEO } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeads(activeTab);
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchLeads = async (scope) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/leads?scope=${scope}`);
      setLeads(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lead? This action cannot be undone.')) return;
    try {
      await axios.delete(`/api/leads/${id}`);
      setOpenMenuId(null);
      fetchLeads();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to delete lead');
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchQuery ||
      lead.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone?.includes(searchQuery);
    const matchesStatus = !statusFilter || lead.leadStatus === statusFilter;
    const matchesSource = !sourceFilter || lead.source === sourceFilter;
    const matchesService = !serviceFilter || lead.productLine === serviceFilter;
    return matchesSearch && matchesStatus && matchesSource && matchesService;
  });

  const totalPages = Math.ceil(filteredLeads.length / perPage) || 1;
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * perPage, currentPage * perPage);

  const getStatusColor = (status) => {
    const colors = {
      NEW: 'bg-blue-100 text-blue-800 border-blue-200',
      CONTACTED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      QUALIFIED: 'bg-green-100 text-green-800 border-green-200',
      LOST: 'bg-red-100 text-red-800 border-red-200',
      ON_HOLD: 'bg-orange-100 text-orange-800 border-orange-200',
      CONVERTED: 'bg-purple-100 text-purple-800 border-purple-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="text-sm text-slate-500">
        <span>🏠</span> / <span>Lead</span> / <span className="font-semibold text-slate-800">LEAD LIST</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-6">
          <button
            onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
            className={`flex items-center space-x-2 pb-1 border-b-2 transition-colors ${activeTab === 'all' ? 'border-sky-600 text-sky-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Users className="w-5 h-5" />
            <span className="text-sm font-semibold">All Leads</span>
          </button>
          <button
            onClick={() => { setActiveTab('my'); setCurrentPage(1); }}
            className={`flex items-center space-x-2 pb-1 border-b-2 transition-colors ${activeTab === 'my' ? 'border-sky-600 text-sky-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <User className="w-5 h-5" />
            <span className="text-sm font-semibold">My Leads</span>
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50" title="Export">
            <Download className="w-4 h-4" />
          </button>
          <Link to="/leads/new" className="flex items-center justify-center w-9 h-9 bg-sky-700 text-white rounded-lg hover:bg-sky-800 transition-colors" title="Add New Lead">
            <Plus className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Lead Status</label>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="w-full text-sm border border-slate-200 rounded-lg py-2 px-3 focus:ring-sky-500 focus:border-sky-500">
              <option value="">View All Lead</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="LOST">Lost</option>
              <option value="CONVERTED">Converted</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Lead Source</label>
            <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setCurrentPage(1); }} className="w-full text-sm border border-slate-200 rounded-lg py-2 px-3 focus:ring-sky-500 focus:border-sky-500">
              <option value="">View All Source</option>
              <option value="WEBSITE">Website</option>
              <option value="WALK_IN">Walk-in</option>
              <option value="REFERRAL">Referral</option>
              <option value="PARTNER">Partner</option>
              <option value="SOCIAL">Social Media</option>
              <option value="EVENT">Event</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">All Services</label>
            <select value={serviceFilter} onChange={e => { setServiceFilter(e.target.value); setCurrentPage(1); }} className="w-full text-sm border border-slate-200 rounded-lg py-2 px-3 focus:ring-sky-500 focus:border-sky-500">
              <option value="">All Services</option>
              <option value="CANADA">Canada Visa</option>
              <option value="USA">USA Visa</option>
              <option value="UK">UK Visa</option>
              <option value="EUROPE">Europe Visa</option>
              <option value="AUSTRALIA">Australia Visa</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search by name, email or phone..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-9 w-full text-sm border border-slate-200 rounded-lg py-2 pr-8 focus:ring-sky-500 focus:border-sky-500" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">×</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-sky-100">
        <div className="hidden md:grid grid-cols-12 bg-amber-50 border-b border-amber-200 px-4 py-3 rounded-t-xl">
          <div className="col-span-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Lead</div>
          <div className="col-span-3 text-xs font-bold text-slate-700 uppercase tracking-wider">Client</div>
          <div className="col-span-2 text-xs font-bold text-slate-700 uppercase tracking-wider">Services</div>
          <div className="col-span-2 text-xs font-bold text-slate-700 uppercase tracking-wider">Status</div>
          <div className="col-span-2 text-xs font-bold text-slate-700 uppercase tracking-wider text-right">Actions</div>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="px-6 py-12 text-center text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto mb-3"></div>
              Loading leads...
            </div>
          ) : paginatedLeads.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">No leads found</p>
              <p className="text-sm mt-1">Try adjusting your filters or <Link to="/leads/new" className="text-sky-600 hover:underline">create a new lead</Link></p>
            </div>
          ) : (
            paginatedLeads.map((lead, idx) => (
              <div
                key={lead._id}
                onClick={() => navigate(`/leads/${lead._id}`)}
                className="grid grid-cols-1 md:grid-cols-12 px-4 py-4 hover:bg-sky-50/50 transition-colors items-start gap-2 md:gap-0 cursor-pointer"
                style={{ borderLeft: '3px solid #38bdf8' }}
              >
                {/* LEAD */}
                <div className="col-span-3">
                  <Link to={`/leads/${lead._id}`} className="text-sm font-semibold text-sky-700 hover:text-sky-900 hover:underline">
                    LEAD-{String(idx + 1 + (currentPage - 1) * perPage).padStart(4, '0')}
                  </Link>
                  <div className="text-xs text-slate-500 mt-1 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {format(new Date(lead.createdAt), 'dd-MM-yyyy')}
                    <span className="ml-2">{format(new Date(lead.createdAt), 'HH:mm')}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{lead.source?.replace('_', '-') || 'N/A'}</div>
                </div>

                {/* CLIENT */}
                <div className="col-span-3">
                  <div className="flex items-center">
                    <span className="text-yellow-500 mr-1.5">★</span>
                    <Link to={`/leads/${lead._id}`} className="text-sm font-semibold text-slate-800 hover:text-sky-700">
                      {lead.fullName}
                    </Link>
                  </div>
                  {lead.phone && (
                    <div className="flex items-center text-xs text-slate-500 mt-1.5">
                      <Phone className="w-3 h-3 mr-1.5 text-slate-400" />
                      <span>{lead.phone}</span>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center text-xs text-slate-500 mt-1">
                      <Mail className="w-3 h-3 mr-1.5 text-slate-400" />
                      <span className="truncate max-w-[160px]">{lead.email}</span>
                    </div>
                  )}
                </div>

                {/* SERVICES */}
                <div className="col-span-2">
                  <div className="text-sm text-slate-700">{lead.preferredVisa || lead.productLine?.replace('_', ' ') || 'N/A'}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{lead.targetCountryPrimary || lead.productLine || ''}</div>
                </div>

                {/* STATUS */}
                <div className="col-span-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${getStatusColor(lead.leadStatus)}`}>
                    {lead.leadStatus?.replace('_', ' ')}
                  </span>
                </div>

                {/* ACTIONS */}
                <div className="col-span-2 flex items-center justify-end space-x-2 relative">
                  <button onClick={() => navigate(`/leads/${lead._id}`)} className="text-xs text-sky-600 hover:text-sky-800 font-medium">
                    + View
                  </button>
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === lead._id ? null : lead._id); }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {openMenuId === lead._id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { navigate(`/leads/${lead._id}/edit`); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-sky-50 flex items-center">
                          <Edit className="w-3.5 h-3.5 mr-2 text-sky-600" /> Edit Lead
                        </button>
                        <button onClick={() => { navigate(`/leads/${lead._id}`); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-sky-50 flex items-center">
                          <FileText className="w-3.5 h-3.5 mr-2 text-sky-600" /> View Details
                        </button>
                        <button onClick={() => { navigate(`/leads/${lead._id}`); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-sky-50 flex items-center">
                          <Mail className="w-3.5 h-3.5 mr-2 text-sky-600" /> Send Email
                        </button>
                        <button onClick={() => { setSelectedLeadId(lead._id); setFollowUpModalOpen(true); setOpenMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-sky-50 flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-2 text-sky-600" /> Add Follow-up
                        </button>
                        {isCEO && (
                          <>
                            <div className="border-t border-slate-100 my-1"></div>
                            <button onClick={() => handleDelete(lead._id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center">
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Lead
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {!loading && filteredLeads.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 gap-3 rounded-b-xl">
            <span className="text-sm text-slate-600">
              Showing {(currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, filteredLeads.length)} of {filteredLeads.length} Entries
            </span>
            <div className="flex items-center space-x-1">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1.5 rounded border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(page => (
                <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded text-sm font-medium ${currentPage === page ? 'bg-sky-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-white'}`}>
                  {page}
                </button>
              ))}
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1.5 rounded border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      <FollowUpModal
        isOpen={followUpModalOpen}
        onClose={() => { setFollowUpModalOpen(false); setSelectedLeadId(null); }}
        leadId={selectedLeadId}
        onSuccess={fetchLeads}
      />
    </div>
  );
}
