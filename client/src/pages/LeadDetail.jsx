import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../lib/AuthContext';
import {
  Mail, Phone, Briefcase, FileText, Activity, MapPin,
  Edit2, Check, X, Search, Plus, Calendar, User, Users,
  Info, HelpCircle, DollarSign, Calculator, Lock, Trash2,
  ArrowLeft, ArrowUpRight, Share2, UploadCloud, FileDown,
  Download, Award, GraduationCap, Folder, MessageSquare, Clock
} from 'lucide-react';
import FollowUpModal from '../components/FollowUpModal';

const documentCategories = [
  'Identity',
  'Academic',
  'English Test',
  'Financial',
  'Application',
  'Visa',
  'Other'
];

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, canEditLeads } = useAuth();

  const [lead, setLead] = useState(null);
  const [cases, setCases] = useState([]);
  const [activities, setActivities] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState('client-info');

  // Inline editing state
  const [editingField, setEditingField] = useState(null); // name of field being edited
  const [tempValue, setTempValue] = useState('');

  // Secondary Applicant editing block
  const [editingSecondary, setEditingSecondary] = useState(false);
  const [secondaryFormData, setSecondaryFormData] = useState({
    secondaryRelationship: '',
    secondaryFirstName: '',
    secondaryLastName: '',
    secondaryDob: '',
    secondaryPassport: '',
    secondaryContactCode: '+91',
    secondaryContactNumber: '',
    secondaryEmail: '',
    secondaryAddress: ''
  });

  // Notes Search and Add Modals
  const [notesSearchQuery, setNotesSearchQuery] = useState('');
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);

  // Add Note Form states
  const [noteBody, setNoteBody] = useState('');
  const [sendToClient, setSendToClient] = useState(false);
  const [sendToAssigned, setSendToAssigned] = useState(false);
  const [sendToStaff, setSendToStaff] = useState(false);
  const [sendToOthers, setSendToOthers] = useState(false);
  const [othersEmails, setOthersEmails] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Calculator Modals State
  const [activeCalculator, setActiveCalculator] = useState(null); // 'points' | 'funds' | 'visa' | null

  // Interactive points calculator inputs
  const [crsAge, setCrsAge] = useState('21-29');
  const [crsEducation, setCrsEducation] = useState('Bachelors');
  const [crsLanguage, setCrsLanguage] = useState('CLB9');
  const [crsExperience, setCrsExperience] = useState('3years');
  const [calculatedPoints, setCalculatedPoints] = useState(436);

  // Interactive fund summary inputs
  const [fundTuition, setFundTuition] = useState(15000);
  const [fundLiving, setFundLiving] = useState(10000);
  const [fundTravel, setFundTravel] = useState(2000);
  const [calculatedFunds, setCalculatedFunds] = useState(27000);

  // Interactive visa fee inputs
  const [visaCategory, setVisaCategory] = useState('Student');
  const [visaApplicantsCount, setVisaApplicantsCount] = useState(1);
  const [calculatedVisaFee, setCalculatedVisaFee] = useState(235); // government + biometrics

  const fileInputRef = useRef(null);

  // Invoices & ledger state
  const [invoices, setInvoices] = useState([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeInvoiceForPayment, setActiveInvoiceForPayment] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Create Case Form States
  const [isCreateCaseModalOpen, setIsCreateCaseModalOpen] = useState(false);
  const [createCaseLoading, setCreateCaseLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [caseVisaType, setCaseVisaType] = useState('Student');
  const [caseTargetCountry, setCaseTargetCountry] = useState('Canada');
  const [caseProductLine, setCaseProductLine] = useState('CANADA');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // New Invoice Form State
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [invoiceCurrency, setInvoiceCurrency] = useState('INR');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [invoiceLines, setInvoiceLines] = useState([
    { description: '', quantity: 1, unitExGst: 0, gstRatePct: 18 }
  ]);

  // New Payment Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const handleAddInvoiceLine = () => {
    setInvoiceLines(prev => [...prev, { description: '', quantity: 1, unitExGst: 0, gstRatePct: 18 }]);
  };

  const handleRemoveInvoiceLine = (index) => {
    if (invoiceLines.length === 1) return;
    setInvoiceLines(prev => prev.filter((_, i) => i !== index));
  };

  const handleLineChange = (index, field, value) => {
    setInvoiceLines(prev => prev.map((line, i) => {
      if (i === index) {
        return {
          ...line,
          [field]: field === 'description' ? value : Number(value)
        };
      }
      return line;
    }));
  };

  const calculateInvoiceTotals = () => {
    let subtotal = 0;
    let gstTotal = 0;
    invoiceLines.forEach(line => {
      const net = (line.quantity || 0) * (line.unitExGst || 0);
      const gst = net * ((line.gstRatePct || 0) / 100);
      subtotal += net;
      gstTotal += gst;
    });
    return {
      subtotal,
      gstTotal,
      grandTotal: subtotal + gstTotal
    };
  };

  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    if (invoiceLines.some(l => !l.description.trim() || l.quantity <= 0 || l.unitExGst < 0)) {
      alert('Please fill all line items with valid details.');
      return;
    }
    if (!invoiceDueDate) {
      alert('Please select a due date.');
      return;
    }

    setIsSavingInvoice(true);
    try {
      const payload = {
        leadId: id,
        dueDate: invoiceDueDate,
        currency: invoiceCurrency,
        notes: invoiceNotes,
        lines: invoiceLines
      };
      await axios.post('/api/finance/invoices', payload);
      alert('Invoice created successfully!');

      // Reset form
      setInvoiceDueDate('');
      setInvoiceCurrency('INR');
      setInvoiceNotes('');
      setInvoiceLines([{ description: '', quantity: 1, unitExGst: 0, gstRatePct: 18 }]);
      setShowInvoiceModal(false);

      // Refresh invoices
      const invoicesRes = await axios.get(`/api/finance/invoices/lead/${id}`);
      setInvoices(invoicesRes.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to create invoice');
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const openPaymentModal = (invoice) => {
    setActiveInvoiceForPayment(invoice);
    const remaining = invoice.totalAmount - (invoice.paidAmount || 0);
    setPaymentAmount(remaining.toFixed(2));
    setPaymentMethod('Bank Transfer');
    setPaymentReference('');
    setShowPaymentModal(true);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    const remaining = activeInvoiceForPayment.totalAmount - (activeInvoiceForPayment.paidAmount || 0);
    if (amount > remaining + 0.01) {
      alert(`Payment amount cannot exceed outstanding balance of ${activeInvoiceForPayment.currency} ${remaining.toFixed(2)}`);
      return;
    }

    setIsSavingPayment(true);
    try {
      const payload = {
        invoiceId: activeInvoiceForPayment._id,
        amount,
        method: paymentMethod,
        reference: paymentReference
      };
      await axios.post(`/api/finance/invoices/${activeInvoiceForPayment._id}/payments`, payload);
      alert('Payment recorded successfully!');
      setShowPaymentModal(false);

      // Refresh invoices
      const invoicesRes = await axios.get(`/api/finance/invoices/lead/${id}`);
      setInvoices(invoicesRes.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to record payment');
    } finally {
      setIsSavingPayment(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    calculateCRSPoints();
  }, [crsAge, crsEducation, crsLanguage, crsExperience]);

  useEffect(() => {
    setCalculatedFunds(Number(fundTuition) + Number(fundLiving) + Number(fundTravel));
  }, [fundTuition, fundLiving, fundTravel]);

  useEffect(() => {
    let baseFee = 150; // default Student
    if (visaCategory === 'Visitor') baseFee = 100;
    if (visaCategory === 'Work') baseFee = 155;
    if (visaCategory === 'PR') baseFee = 850;

    const govtFee = baseFee * Number(visaApplicantsCount);
    const biometricsFee = 85;
    setCalculatedVisaFee(govtFee + biometricsFee);
  }, [visaCategory, visaApplicantsCount]);

  const fetchData = async () => {
    try {
      const [leadRes, casesRes, actRes, docsRes, notesRes, usersRes, invoicesRes] = await Promise.all([
        axios.get(`/api/leads/${id}`),
        axios.get(`/api/cases/lead/${id}`),
        axios.get(`/api/activities/lead/${id}`),
        axios.get(`/api/documents/lead/${id}`),
        axios.get(`/api/leads/${id}/notes`),
        axios.get(`/api/users`),
        axios.get(`/api/finance/invoices/lead/${id}`)
      ]);
      setLead(leadRes.data);
      setCases(casesRes.data);
      setActivities(actRes.data);
      setDocuments(docsRes.data);
      setNotes(notesRes.data);
      setUsersList(usersRes.data);
      setInvoices(invoicesRes.data);

      if (leadRes.data) {
        setCaseVisaType(leadRes.data.visaCategory || 'Student');
        setCaseTargetCountry(leadRes.data.targetCountryPrimary || 'Canada');
        setCaseProductLine(leadRes.data.productLine || 'CANADA');
      }

      // Fetch visa templates safely
      try {
        const templatesRes = await axios.get('/api/immigration/templates');
        setTemplates(templatesRes.data);
      } catch (err) {
        console.error('Failed to fetch visa templates', err);
      }

      // Prepopulate secondary applicant edit state
      setSecondaryFormData({
        secondaryRelationship: leadRes.data.secondaryRelationship || '',
        secondaryFirstName: leadRes.data.secondaryFirstName || '',
        secondaryLastName: leadRes.data.secondaryLastName || '',
        secondaryDob: leadRes.data.secondaryDob || '',
        secondaryPassport: leadRes.data.secondaryPassport || '',
        secondaryContactCode: leadRes.data.secondaryContactCode || '+91',
        secondaryContactNumber: leadRes.data.secondaryContactNumber || '',
        secondaryEmail: leadRes.data.secondaryEmail || '',
        secondaryAddress: leadRes.data.secondaryAddress || ''
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async (e) => {
    e.preventDefault();
    setCreateCaseLoading(true);
    try {
      const payload = {
        clientId: id,
        visaTemplateId: selectedTemplateId || undefined,
        visaType: caseVisaType,
        targetCountry: caseTargetCountry,
        productLine: caseProductLine
      };

      await axios.post('/api/immigration/cases', payload);
      alert('Case created successfully!');

      // Reload cases list
      const casesRes = await axios.get(`/api/cases/lead/${id}`);
      setCases(casesRes.data);

      setIsCreateCaseModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to create case');
    } finally {
      setCreateCaseLoading(false);
    }
  };

  const handleServiceChange = async (newProductLine) => {
    try {
      await axios.patch(`/api/leads/${id}`, { productLine: newProductLine });
      setLead(prev => ({ ...prev, productLine: newProductLine }));
      alert('Service updated successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to update service');
    }
  };

  // Inline editing handler
  const startEditField = (fieldName, currentValue) => {
    setEditingField(fieldName);
    setTempValue(currentValue || '');
  };

  const saveEditField = async (fieldName) => {
    try {
      let patchPayload = { [fieldName]: tempValue };

      // Keep fullName synced if editing firstName or lastName
      if (fieldName === 'firstName') {
        patchPayload.fullName = `${tempValue} ${lead.lastName || ''}`.trim();
      } else if (fieldName === 'lastName') {
        patchPayload.fullName = `${lead.firstName || ''} ${tempValue}`.trim();
      }

      await axios.patch(`/api/leads/${id}`, patchPayload);
      setLead(prev => ({
        ...prev,
        ...patchPayload
      }));
      setEditingField(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save update');
    }
  };

  const saveSecondaryApplicant = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(`/api/leads/${id}`, secondaryFormData);
      setLead(prev => ({
        ...prev,
        ...secondaryFormData
      }));
      setEditingSecondary(false);
      alert('Secondary Applicant saved successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to save Secondary Applicant details');
    }
  };

  // Document management inside Document tab
  const handleUploadLeadDoc = async (e, category) => {
    if (!e.target.files[0]) return;
    const file = e.target.files[0];
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', file.name);
    fd.append('category', category);

    try {
      await axios.post(`/api/documents/lead/${id}`, fd);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await axios.delete(`/api/documents/${docId}`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Delete failed');
    }
  };

  // Note file attachment handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.docx', '.doc', '.pdf'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowed.includes(ext)) {
      setFileError('Unsupported file format. Supported: png, jpg, jpeg, gif, docx, doc, pdf');
      setSelectedFile(null);
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFileError('File exceeds size limit of 2MB');
      setSelectedFile(null);
      return;
    }

    setFileError('');
    setSelectedFile(file);
  };

  // Rich text insertion helper
  const insertHtmlTag = (tagOpen, tagClose = '') => {
    const textarea = document.getElementById('note-textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = tagOpen + selected + (tagClose || tagOpen.replace('<', '</'));
    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setNoteBody(newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagOpen.length, start + tagOpen.length + selected.length);
    }, 0);
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!noteBody.trim()) return;

    setIsSavingNote(true);
    const fd = new FormData();
    fd.append('body', noteBody);
    fd.append('sendToClient', sendToClient);
    fd.append('sendToAssigned', sendToAssigned);
    fd.append('sendToStaff', sendToStaff);
    fd.append('sendToOthers', sendToOthers);
    if (sendToOthers && othersEmails) {
      fd.append('othersEmails', othersEmails);
    }
    if (selectedFile) {
      fd.append('file', selectedFile);
    }

    try {
      await axios.post(`/api/leads/${id}/notes`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNoteBody('');
      setSendToClient(false);
      setSendToAssigned(false);
      setSendToStaff(false);
      setSendToOthers(false);
      setOthersEmails('');
      setSelectedFile(null);
      setShowAddNoteModal(false);
      // Refresh
      const notesRes = await axios.get(`/api/leads/${id}/notes`);
      setNotes(notesRes.data);
      alert('Note saved successfully!');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to save note');
    } finally {
      setIsSavingNote(false);
    }
  };

  // CRS point calculator algorithm
  const calculateCRSPoints = () => {
    let agePts = 110;
    if (crsAge === '18-20') agePts = 99;
    else if (crsAge === '30') agePts = 105;
    else if (crsAge === '35') agePts = 77;
    else if (crsAge === '40') agePts = 50;
    else if (crsAge === '45+') agePts = 0;

    let eduPts = 120; // Bachelors
    if (crsEducation === 'Secondary') eduPts = 30;
    else if (crsEducation === 'Masters') eduPts = 135;
    else if (crsEducation === 'PhD') eduPts = 150;
    else if (crsEducation === 'Double') eduPts = 128;

    let langPts = 116; // CLB 9
    if (crsLanguage === 'CLB10') langPts = 136;
    else if (crsLanguage === 'CLB8') langPts = 88;
    else if (crsLanguage === 'CLB7') langPts = 68;

    let expPts = 30; // 3+ years
    if (crsExperience === 'None') expPts = 0;
    else if (crsExperience === '1year') expPts = 15;
    else if (crsExperience === '2years') expPts = 25;

    setCalculatedPoints(agePts + eduPts + langPts + expPts);
  };

  if (loading) return <div className="p-8 text-center text-sky-800">Loading Lead Profiles...</div>;
  if (!lead) return <div className="p-8 text-red-500 text-center font-bold">Lead profile not found</div>;

  const filteredNotes = notes.filter(n =>
    n.body?.toLowerCase().includes(notesSearchQuery.toLowerCase()) ||
    n.creatorName?.toLowerCase().includes(notesSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">

      {/* ─── Breadcrumb & Top Controls ────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b pb-4 border-slate-200">
        <button onClick={() => navigate('/leads')} className="flex items-center text-sm font-semibold text-slate-500 hover:text-sky-800 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Lead / LEAD LIST
        </button>
        <span className="text-xs text-slate-400 font-medium bg-slate-100 py-1 px-3 rounded-full">
          Assigned Owner: <strong className="text-slate-700">{lead.ownerName || 'Unassigned'}</strong>
        </span>
      </div>

      {/* ─── Top CRM Information Header (Pic 2 style) ──────────────────────────────── */}
      <div className="bg-[#FAF8F5] rounded-2xl border border-[#F2ECE4] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start space-x-4">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-indigo-200 text-indigo-700 font-bold text-xl uppercase shadow-inner">
            {lead.firstName ? lead.firstName[0] : (lead.fullName ? lead.fullName[0] : 'L')}
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                {lead.firstName && lead.lastName ? `${lead.firstName} ${lead.lastName}` : lead.fullName}
              </h2>
              <span className="text-xs font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 py-0.5 px-2 rounded uppercase">
                {lead.preferredVisa || lead.productLine || 'Visa'}
              </span>
            </div>

            <div className="text-xs text-slate-500 font-bold mt-1 text-indigo-700/80">
              LEAD ID: {id.substring(id.length - 8).toUpperCase()}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1.5 mt-4 text-xs font-semibold text-slate-600">
              <div className="flex items-center text-slate-700">
                <Phone className="w-3.5 h-3.5 mr-2 text-indigo-500" /> {lead.phone || 'No phone'}
              </div>
              <div className="flex items-center text-slate-700">
                <Mail className="w-3.5 h-3.5 mr-2 text-indigo-500" /> {lead.email || 'No email'}
              </div>
              <div className="flex items-center text-slate-700">
                <Calendar className="w-3.5 h-3.5 mr-2 text-indigo-500" /> DOB: {lead.dateOfBirth || 'N/A'}
              </div>
              <div className="flex items-center text-slate-700 font-bold">
                <User className="w-3.5 h-3.5 mr-2 text-indigo-500" /> Gender: {lead.gender || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Top Right Action & Service Selector */}
        <div className="flex items-center space-x-3 self-end md:self-center">
          <select
            value={lead.productLine || 'CANADA'}
            onChange={(e) => handleServiceChange(e.target.value)}
            className="text-xs font-bold py-2 px-3 bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="CANADA">Canada Student Visa</option>
            <option value="USA">USA Student Visa</option>
            <option value="UK">UK Student Visa</option>
            <option value="EUROPE">Europe Work Permit</option>
            <option value="AUSTRALIA">Australia Student Visa</option>
            <option value="OTHER">Other Visa Service</option>
          </select>

          <button
            onClick={() => setShowAddNoteModal(true)}
            className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 shadow-sm transition-all"
            title="Create File Note"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigate('/leads')}
            className="w-8 h-8 rounded-lg border border-slate-300 bg-white text-slate-600 flex items-center justify-center hover:bg-slate-50 shadow-sm transition-all"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Horizontal Tabs Navigation (Pic 2 style) ────────────────────────────── */}
      <div className="border-b border-slate-200 overflow-x-auto flex space-x-1">
        {[
          { id: 'client-info', label: 'Client Info', icon: User },
          // { id: 'assessment-info', label: 'Assessment Info', icon: GraduationCap },
          { id: 'process', label: 'Case Pipeline', icon: Activity },
          { id: 'file-notes', label: 'File Notes', icon: FileText },
          // { id: 'documents', label: 'Documents', icon: Folder },
          { id: 'accounts', label: 'Accounts', icon: DollarSign },
          // { id: 'communication', label: 'Communication', icon: MessageSquare },
          // { id: 'summary', label: 'Summary', icon: Info },
          { id: 'follow-up', label: 'Follow up', icon: Clock },
          // { id: 'visits', label: 'Visits', icon: MapPin }
        ].map(tab => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center space-x-1.5 ${isActive
                ? 'border-purple-600 text-purple-700 bg-purple-50/20'
                : 'border-transparent text-slate-550 hover:text-slate-800'
                }`}
            >
              <IconComp className={`w-4 h-4 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── TAB CONTENT PANELS ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">

        {/* ================= TAB 1: CLIENT INFO ================= */}
        {activeTab === 'client-info' && (
          <div className="space-y-8 animate-fade-in">

            {/* Section A: Personal Information */}
            <div>
              <div className="flex items-center space-x-2 border-b pb-2 mb-4">
                <User className="w-5 h-5 text-indigo-600" />
                <h3 className="text-md font-extrabold text-slate-800 tracking-tight">Personal Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { key: 'firstName', label: 'First Name', type: 'text', val: lead.firstName },
                  { key: 'lastName', label: 'Last Name', type: 'text', val: lead.lastName },
                  { key: 'dateOfBirth', label: 'Date of Birth', type: 'date', val: lead.dateOfBirth },
                  {
                    key: 'gender',
                    label: 'Gender',
                    type: 'select',
                    options: ['Male', 'Female', 'Other'],
                    val: lead.gender
                  },
                  {
                    key: 'maritalStatus',
                    label: 'Marital Status',
                    type: 'select',
                    options: ['Never Married', 'Married', 'Divorced', 'Widowed'],
                    val: lead.maritalStatus
                  },
                  // { kxey: 'visaExpiryDate', label: 'Visa Expiry Date', type: 'date', val: lead.visaExpiryDate },
                  { key: 'passportNumber', label: 'Passport Number', type: 'text', val: lead.passportNumber }
                ].map(field => {
                  const isEditing = editingField === field.key;
                  return (
                    <div key={field.key} className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 flex flex-col justify-between">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">{field.label}</label>
                      <div className="mt-1 flex items-center justify-between min-h-[36px]">
                        {isEditing ? (
                          <div className="flex items-center w-full space-x-2">
                            {field.type === 'select' ? (
                              <select
                                value={tempValue}
                                onChange={e => setTempValue(e.target.value)}
                                className="text-sm bg-white border border-slate-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="">Select</option>
                                {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : (
                              <input
                                type={field.type}
                                value={tempValue}
                                onChange={e => setTempValue(e.target.value)}
                                className="text-sm bg-white border border-slate-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            )}
                            <button onClick={() => saveEditField(field.key)} className="p-1 bg-green-50 text-green-700 rounded hover:bg-green-100 border border-green-200">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingField(null)} className="p-1 bg-red-50 text-red-700 rounded hover:bg-red-100 border border-red-200">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm font-semibold text-slate-800">
                              {field.val || <em className="text-slate-400 font-normal">Not provided</em>}
                            </span>
                            {canEditLeads && (
                              <button
                                onClick={() => startEditField(field.key, field.val)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section B: Contact Information */}
            <div>
              <div className="flex items-center space-x-2 border-b pb-2 mb-4">
                <Phone className="w-5 h-5 text-indigo-600" />
                <h3 className="text-md font-extrabold text-slate-800 tracking-tight">Contact Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { key: 'phone', label: 'Contact No', type: 'text', val: lead.phone },
                  { key: 'email', label: 'Email Address', type: 'text', val: lead.email },
                  { key: 'addressLine1', label: 'Address Line 1', type: 'text', val: lead.addressLine1 },
                  { key: 'addressLine2', label: 'Address Line 2', type: 'text', val: lead.addressLine2 },
                  { key: 'city', label: 'City', type: 'text', val: lead.city },
                  { key: 'state', label: 'State', type: 'text', val: lead.state },
                  { key: 'country', label: 'Country', type: 'text', val: lead.country },
                  { key: 'zipcode', label: 'Zipcode', type: 'text', val: lead.zipcode },
                  { key: 'facebookLink', label: 'Facebook Link', type: 'text', val: lead.facebookLink },
                  { key: 'linkedinLink', label: 'LinkedIn Link', type: 'text', val: lead.linkedinLink },
                  { key: 'instagramLink', label: 'Instagram Link', type: 'text', val: lead.instagramLink },
                  { key: 'travelledCountries', label: 'Sub Agent / Partner Source', type: 'text', val: lead.travelledCountries }
                ].map(field => {
                  const isEditing = editingField === field.key;
                  return (
                    <div key={field.key} className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 flex flex-col justify-between">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">{field.label}</label>
                      <div className="mt-1 flex items-center justify-between min-h-[36px]">
                        {isEditing ? (
                          <div className="flex items-center w-full space-x-2">
                            <input
                              type="text"
                              value={tempValue}
                              onChange={e => setTempValue(e.target.value)}
                              className="text-sm bg-white border border-slate-300 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button onClick={() => saveEditField(field.key)} className="p-1 bg-green-50 text-green-700 rounded hover:bg-green-100 border border-green-200">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingField(null)} className="p-1 bg-red-50 text-red-700 rounded hover:bg-red-100 border border-red-200">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm font-semibold text-slate-800 truncate max-w-[200px]" title={field.val}>
                              {field.val || <em className="text-slate-400 font-normal">Not provided</em>}
                            </span>
                            {canEditLeads && (
                              <button
                                onClick={() => startEditField(field.key, field.val)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section C: Secondary Applicant */}
            <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/20">
              <div className="flex items-center justify-between border-b pb-2 mb-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-md font-extrabold text-slate-800 tracking-tight">Secondary Applicant</h3>
                </div>
                {!editingSecondary && canEditLeads && (
                  <button
                    onClick={() => setEditingSecondary(true)}
                    className="flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-slate-200 hover:bg-slate-50 py-1.5 px-3 rounded-lg shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add/Edit Details
                  </button>
                )}
              </div>

              {editingSecondary ? (
                <form onSubmit={saveSecondaryApplicant} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Relationship</label>
                    <select
                      value={secondaryFormData.secondaryRelationship}
                      onChange={e => setSecondaryFormData({ ...secondaryFormData, secondaryRelationship: e.target.value })}
                      className="text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Child">Child</option>
                      <option value="Parent">Parent</option>
                      <option value="Sibling">Sibling</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">First Name</label>
                    <input
                      type="text"
                      value={secondaryFormData.secondaryFirstName}
                      onChange={e => setSecondaryFormData({ ...secondaryFormData, secondaryFirstName: e.target.value })}
                      className="text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={secondaryFormData.secondaryLastName}
                      onChange={e => setSecondaryFormData({ ...secondaryFormData, secondaryLastName: e.target.value })}
                      className="text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={secondaryFormData.secondaryDob}
                      onChange={e => setSecondaryFormData({ ...secondaryFormData, secondaryDob: e.target.value })}
                      className="text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Passport Number</label>
                    <input
                      type="text"
                      value={secondaryFormData.secondaryPassport}
                      onChange={e => setSecondaryFormData({ ...secondaryFormData, secondaryPassport: e.target.value })}
                      className="text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Phone Number</label>
                    <div className="flex space-x-2">
                      <select
                        value={secondaryFormData.secondaryContactCode}
                        onChange={e => setSecondaryFormData({ ...secondaryFormData, secondaryContactCode: e.target.value })}
                        className="text-sm bg-white border border-slate-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-20"
                      >
                        <option value="+91">+91</option>
                        <option value="+61">+61</option>
                        <option value="+1">+1</option>
                      </select>
                      <input
                        type="text"
                        value={secondaryFormData.secondaryContactNumber}
                        onChange={e => setSecondaryFormData({ ...secondaryFormData, secondaryContactNumber: e.target.value })}
                        className="text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={secondaryFormData.secondaryEmail}
                      onChange={e => setSecondaryFormData({ ...secondaryFormData, secondaryEmail: e.target.value })}
                      className="text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Permanent Address</label>
                    <input
                      type="text"
                      value={secondaryFormData.secondaryAddress}
                      onChange={e => setSecondaryFormData({ ...secondaryFormData, secondaryAddress: e.target.value })}
                      className="text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end space-x-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setEditingSecondary(false)}
                      className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white text-xs font-bold shadow-sm"
                    >
                      Save Applicant
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {lead.secondaryRelationship ? (
                    <>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400">Relationship</span>
                        <span className="text-sm font-semibold text-slate-700">{lead.secondaryRelationship}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400">Name</span>
                        <span className="text-sm font-semibold text-slate-700">{lead.secondaryFirstName} {lead.secondaryLastName}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400">Date of Birth</span>
                        <span className="text-sm font-semibold text-slate-700">{lead.secondaryDob || 'N/A'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400">Passport</span>
                        <span className="text-sm font-semibold text-slate-700">{lead.secondaryPassport || 'N/A'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400">Contact Number</span>
                        <span className="text-sm font-semibold text-slate-700">
                          {lead.secondaryContactNumber ? `${lead.secondaryContactCode || ''} ${lead.secondaryContactNumber}` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400">Email Address</span>
                        <span className="text-sm font-semibold text-slate-700">{lead.secondaryEmail || 'N/A'}</span>
                      </div>
                      <div className="flex flex-col md:col-span-2">
                        <span className="text-xs font-bold text-slate-400">Address</span>
                        <span className="text-sm font-semibold text-slate-700">{lead.secondaryAddress || 'N/A'}</span>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-full py-6 text-center text-slate-400 text-sm">
                      No secondary applicant details added.
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ================= TAB 2: ASSESSMENT INFO ================= */}
        {/* {activeTab === 'assessment-info' && (
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b pb-2 mb-4">
              <Award className="w-5 h-5 text-indigo-600" />
              <h3 className="text-md font-extrabold text-slate-800 tracking-tight">Academic & Language Assessment</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-xl border border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">Academic Qualifications</h4>
                <div className="space-y-3">
                  <div className="flex justify-between border-b pb-1 text-sm">
                    <span className="text-slate-500">Highest Education</span>
                    <span className="font-semibold text-slate-700">{lead.highestEducation || 'Bachelors Degree'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1 text-sm">
                    <span className="text-slate-500">Passing Year</span>
                    <span className="font-semibold text-slate-700">{lead.passingYear || '2023'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1 text-sm">
                    <span className="text-slate-500">Percentage/CGPA</span>
                    <span className="font-semibold text-slate-700">{lead.cgpa || '8.2 CGPA'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">Language Test Scores</h4>
                <div className="space-y-3">
                  <div className="flex justify-between border-b pb-1 text-sm">
                    <span className="text-slate-500">Test Type</span>
                    <span className="font-semibold text-slate-700">{lead.languageTestType || 'IELTS Academic'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1 text-sm">
                    <span className="text-slate-500">Overall Score</span>
                    <span className="font-semibold text-slate-700">{lead.languageScore || '7.5 band'}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1 text-sm">
                    <span className="text-slate-500">Listening / Speaking</span>
                    <span className="font-semibold text-slate-700">7.0 / 8.0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )} */}

        {/* ================= TAB 3: PROCESS ================= */}
        {activeTab === 'process' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-2 mb-4">
              <div className="flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                <h3 className="text-md font-extrabold text-slate-800 tracking-tight">Process & Cases pipeline</h3>
              </div>
              <button
                onClick={() => setIsCreateCaseModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                + Create Case
              </button>
            </div>

            {cases.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No active immigration cases found for this lead.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cases.map(c => (
                  <div key={c._id} className="border border-indigo-100 rounded-xl p-5 bg-indigo-50/10 hover:bg-indigo-50/20 transition-all shadow-sm">
                    <div className="flex justify-between items-start">
                      <h4 className="font-extrabold text-slate-800 text-md">{c.visaType} - {c.targetCountry}</h4>
                      <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{c.stage}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-bold mt-2 uppercase">Product Line: {c.productLine}</p>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">Created: {new Date(c.createdAt || Date.now()).toLocaleDateString()}</span>
                      <a href={`/immigration`} className="text-xs font-bold text-indigo-600 hover:underline flex items-center">
                        Go to cases portal <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: FILE NOTES (Pic 3 & 4 style) ================= */}
        {activeTab === 'file-notes' && (
          <div className="space-y-6 animate-fade-in">

            {/* Header controls (search & + note) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">FILE NOTES</h3>
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search File Notes..."
                    value={notesSearchQuery}
                    onChange={e => setNotesSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-2 w-full text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={() => setShowAddNoteModal(true)}
                  className="flex items-center justify-center p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all"
                  title="Add Note"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* List notes */}
            {filteredNotes.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">

                {/* Visual empty illustration (Pic 3 style) */}
                <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                  <FileText className="w-12 h-12 text-slate-400" />
                </div>
                <div>
                  <h4 className="text-md font-bold text-slate-700">No File Note has been Created.</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    To create a Note, click on the <strong className="text-indigo-600 font-bold">+</strong> button at the top right. You can also share the note with your Client by checking "Send Notes to Client".
                  </p>
                </div>

                {/* Card links (Calculators) (Pic 3 style) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl pt-8">
                  {[
                    { id: 'points', label: 'Point Calculator', color: 'bg-orange-50 border-orange-200 text-orange-800' },
                    { id: 'funds', label: 'Fund Summary', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
                    { id: 'visa', label: 'VISA Fee Calculator', color: 'bg-blue-50 border-blue-200 text-blue-800' }
                  ].map(calc => (
                    <button
                      key={calc.id}
                      onClick={() => setActiveCalculator(calc.id)}
                      className={`p-4 rounded-xl border font-bold text-sm text-center shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer ${calc.color}`}
                    >
                      + {calc.label}
                    </button>
                  ))}
                </div>

              </div>
            ) : (
              <div className="space-y-6">

                {/* Notes List */}
                {filteredNotes.map(note => (
                  <div key={note._id} className="border border-slate-200 rounded-xl p-5 bg-slate-50/20 shadow-sm relative hover:border-slate-300 transition-all">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-sm uppercase">
                        {note.creatorName ? note.creatorName[0] : 'U'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">{note.creatorName}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{new Date(note.createdAt).toLocaleString()}</div>
                      </div>
                    </div>

                    <div
                      className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: note.body }}
                    />

                    {/* Attachment rendering */}
                    {note.attachment && (
                      <div className="mt-4 p-2 bg-indigo-50/50 rounded-lg border border-indigo-100 inline-flex items-center space-x-3">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-indigo-900 truncate max-w-[200px]" title={note.attachment.filename}>
                          {note.attachment.filename}
                        </span>
                        <a
                          href={`/api/leads/notes/download/${note._id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 hover:bg-indigo-100 rounded text-indigo-700 transition-colors"
                          title="Download attachment"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}

                    {/* Email Recipient badges */}
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {note.sendToClient && <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded uppercase">Sent to Client</span>}
                      {note.sendToAssigned && <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase">Sent to Agent</span>}
                      {note.sendToStaff && <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase">Sent to Staff</span>}
                      {note.sendToOthers && (
                        <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase max-w-[200px] truncate" title={note.othersEmails}>
                          Sent to Others ({note.othersEmails})
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Mini Calculator deck always visible under note list */}
                <div className="border-t pt-6">
                  <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Immigration Calculators</h4>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => setActiveCalculator('points')} className="px-4 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-600 hover:bg-slate-50 cursor-pointer shadow-sm">
                      Point Calculator
                    </button>
                    <button onClick={() => setActiveCalculator('funds')} className="px-4 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-600 hover:bg-slate-50 cursor-pointer shadow-sm">
                      Fund Summary
                    </button>
                    <button onClick={() => setActiveCalculator('visa')} className="px-4 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-white text-slate-600 hover:bg-slate-50 cursor-pointer shadow-sm">
                      VISA Fee Calculator
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ================= TAB 5: DOCUMENTS ================= */}
        {/* {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b pb-2 mb-4">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h3 className="text-md font-extrabold text-slate-800 tracking-tight">Documents Checklist</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {documentCategories.map(cat => {
                const catDocs = documents.filter(d => d.category === cat);
                return (
                  <div key={cat} className="border border-slate-200 rounded-xl p-4 bg-slate-50/30">
                    <div className="flex justify-between items-center border-b pb-2 mb-3">
                      <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">{cat} Documents</span>
                      <label className="cursor-pointer text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-slate-200 hover:bg-slate-50 px-2.5 py-1 rounded shadow-sm">
                        + Upload
                        <input type="file" className="hidden" onChange={(e) => handleUploadLeadDoc(e, cat)} />
                      </label>
                    </div>

                    {catDocs.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">No documents uploaded for this category</p>
                    ) : (
                      <ul className="space-y-2">
                        {catDocs.map(doc => (
                          <li key={doc._id} className="flex items-center justify-between group p-1.5 hover:bg-white rounded border border-transparent hover:border-slate-100">
                            <div className="flex items-center overflow-hidden mr-2">
                              <FileText className="w-3.5 h-3.5 text-indigo-500 mr-2 flex-shrink-0" />
                              <a
                                href={`/api/documents/download/${doc._id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-semibold text-indigo-700 hover:underline truncate max-w-[200px]"
                                title={doc.originalFileName}
                              >
                                {doc.name || doc.originalFileName}
                              </a>
                            </div>
                            <button
                              onClick={() => handleDeleteDoc(doc._id)}
                              className="text-red-400 hover:text-red-600 p-0.5 hover:bg-red-50 rounded"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )} */}

        {/* ================= TAB 6: ACCOUNTS ================= */}
        {activeTab === 'accounts' && (
          <div className="space-y-6 animate-fade-in">
            {/* Kondesk Sub-Header Bar */}
            <div className="flex items-center justify-between bg-purple-50/70 border border-purple-100 rounded-lg p-3.5 mb-6">
              <span className="text-sm font-bold text-purple-800 flex items-center">
                <DollarSign className="w-4 h-4 mr-1.5 text-purple-650" /> Invoice
              </span>
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="w-8 h-8 flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow transition-all font-bold text-lg"
                title="Create Invoice"
              >
                +
              </button>
            </div>

            {/* Financial Summary Cards */}
            {(() => {
              const activeInvoices = invoices.filter(inv => inv.status !== 'VOID');

              // Group totals by currency
              const currencyTotals = {};
              activeInvoices.forEach(inv => {
                const cur = inv.currency || 'INR';
                if (!currencyTotals[cur]) {
                  currencyTotals[cur] = { invoiced: 0, paid: 0 };
                }
                currencyTotals[cur].invoiced += (inv.totalAmount || 0);
                currencyTotals[cur].paid += (inv.paidAmount || 0);
              });

              const curList = Object.keys(currencyTotals);
              if (curList.length === 0) return null;

              return (
                <div className="space-y-4 mb-6">
                  {curList.map(cur => {
                    const totals = currencyTotals[cur];
                    const outstanding = totals.invoiced - totals.paid;
                    const curSymbol = cur === 'INR' ? '₹' : cur;
                    return (
                      <div key={cur} className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-purple-100 rounded-xl p-4 bg-purple-50/30">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Invoiced ({cur})</span>
                          <span className="text-xl font-extrabold text-slate-800 mt-1">
                            {curSymbol} {totals.invoiced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-emerald-800/60 uppercase tracking-wider">Total Paid ({cur})</span>
                          <span className="text-xl font-extrabold text-emerald-700 mt-1">
                            {curSymbol} {totals.paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-rose-800/60 uppercase tracking-wider">Balance Due ({cur})</span>
                          <span className="text-xl font-extrabold text-rose-600 mt-1">
                            {curSymbol} {outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            <div className="mb-4">
              <h4 className="text-xs font-bold text-purple-750 uppercase tracking-wider">DRAFT / PENDING INVOICE</h4>
            </div>

            {invoices.length === 0 ? (
              <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-100 flex flex-col items-center justify-center py-12">
                <p className="text-sm font-semibold text-slate-500">No account ledger records or invoices exist for this lead.</p>
                <button
                  onClick={() => setShowInvoiceModal(true)}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs font-bold shadow-sm"
                >
                  + Create First Invoice
                </button>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-[#F8F6FC]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">INVOICE INFO</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">LEAD NAME</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">INVOICE TYPE</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">AMOUNT</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">DESCRIPTION</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {invoices.map(inv => {
                        const statusColor =
                          inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            inv.status === 'PARTIAL' ? 'bg-amber-50 text-amber-705 border border-amber-200' :
                              inv.status === 'VOID' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                'bg-[#F1EEF9] text-[#7154B5] border border-[#E4DCF5]';

                        const currencySymbol = inv.currency === 'INR' ? '₹' : (inv.currency || '$');

                        return (
                          <tr key={inv._id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs mr-3 shadow-sm select-none">
                                  PP
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-slate-800">{inv.number}</span>
                                  <span className="text-xs text-slate-400 font-medium">{new Date(inv.createdAt).toLocaleDateString('en-GB')}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-medium capitalize">
                              {lead?.fullName?.toLowerCase()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center rounded px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase ${statusColor}`}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">
                              {currencySymbol} {inv.totalAmount.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-550 max-w-xs truncate font-medium" title={inv.description}>
                              {inv.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                              <button
                                onClick={() => setOpenDropdownId(openDropdownId === inv._id ? null : inv._id)}
                                className="text-slate-450 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-all focus:outline-none"
                              >
                                <span className="text-lg font-bold select-none">⋮</span>
                              </button>

                              {openDropdownId === inv._id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setOpenDropdownId(null)}></div>
                                  <div className="absolute right-6 mt-1 w-44 rounded-lg bg-white shadow-lg border border-slate-200 py-1 z-20 text-left">
                                    <a
                                      href={`/api/finance/invoices/${inv._id}/pdf`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                      onClick={() => setOpenDropdownId(null)}
                                    >
                                      <Download className="w-3.5 h-3.5 mr-2 text-slate-500" /> Download PDF
                                    </a>
                                    {inv.status !== 'PAID' && inv.status !== 'VOID' && (
                                      <button
                                        onClick={() => {
                                          openPaymentModal(inv);
                                          setOpenDropdownId(null);
                                        }}
                                        className="w-full flex items-center px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-left"
                                      >
                                        <DollarSign className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Record Payment
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Create Invoice Modal nested directly in Accounts Tab */}
            {showInvoiceModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-in-up">
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-[#FAF8F5]">
                    <h3 className="text-lg font-black text-slate-805 uppercase tracking-tight flex items-center">
                      <DollarSign className="w-5 h-5 mr-2 text-indigo-600" /> Create New Invoice
                    </h3>
                    <button
                      onClick={() => setShowInvoiceModal(false)}
                      className="p-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSaveInvoice} className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Due Date</label>
                        <input
                          type="date"
                          required
                          value={invoiceDueDate}
                          onChange={e => setInvoiceDueDate(e.target.value)}
                          className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-505"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Currency</label>
                        <select
                          value={invoiceCurrency}
                          onChange={e => setInvoiceCurrency(e.target.value)}
                          className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-805 focus:outline-none focus:ring-2 focus:ring-indigo-505"
                        >
                          <option value="INR">INR (₹)</option>
                          <option value="USD">USD ($)</option>
                          <option value="CAD">CAD (C$)</option>
                          <option value="AUD">AUD (A$)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="EUR">EUR (€)</option>
                        </select>
                      </div>
                    </div>

                    {/* Line items list */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Line Items</span>
                        <button
                          type="button"
                          onClick={handleAddInvoiceLine}
                          className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors shadow-sm"
                        >
                          + Add Line Item
                        </button>
                      </div>

                      <div className="space-y-3">
                        {invoiceLines.map((line, idx) => (
                          <div key={idx} className="flex flex-col md:flex-row md:items-end gap-3 p-3 bg-slate-50 rounded-xl border border-slate-205 relative">
                            <div className="flex-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Description</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Consultation Fees, Application Processing"
                                value={line.description}
                                onChange={e => handleLineChange(idx, 'description', e.target.value)}
                                className="w-full text-xs border border-slate-300 rounded p-2 bg-white text-slate-805 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                            <div className="w-20">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Qty</label>
                              <input
                                type="number"
                                required
                                min="1"
                                value={line.quantity}
                                onChange={e => handleLineChange(idx, 'quantity', e.target.value)}
                                className="w-full text-xs border border-slate-300 rounded p-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                            <div className="w-32">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Rate (Ex GST)</label>
                              <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={line.unitExGst}
                                onChange={e => handleLineChange(idx, 'unitExGst', e.target.value)}
                                className="w-full text-xs border border-slate-305 rounded p-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                            <div className="w-24">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">GST Rate %</label>
                              <select
                                value={line.gstRatePct}
                                onChange={e => handleLineChange(idx, 'gstRatePct', e.target.value)}
                                className="w-full text-xs border border-slate-305 rounded p-2 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value={0}>0%</option>
                                <option value={5}>5%</option>
                                <option value={12}>12%</option>
                                <option value={18}>18%</option>
                              </select>
                            </div>
                            <div className="w-28 text-right pr-2 pb-2 text-xs font-bold text-slate-700">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5 text-right">Total (Inc GST)</span>
                              {invoiceCurrency} {((line.quantity * line.unitExGst) * (1 + line.gstRatePct / 100)).toFixed(2)}
                            </div>
                            {invoiceLines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveInvoiceLine(idx)}
                                className="absolute md:relative md:top-auto right-2 top-2 text-red-500 hover:text-red-750 font-bold text-xs p-1 bg-white hover:bg-red-50 border border-slate-205 rounded"
                                title="Remove line item"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Notes / Terms</label>
                      <textarea
                        rows={2}
                        placeholder="Optional payment notes, bank details, or terms..."
                        value={invoiceNotes}
                        onChange={e => setInvoiceNotes(e.target.value)}
                        className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Live calculation totals section */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-205 flex flex-col md:flex-row justify-between items-center text-sm">
                      <div className="flex flex-wrap gap-4 text-slate-505 font-semibold">
                        <div>Subtotal (Ex GST): <strong className="text-slate-800">{invoiceCurrency} {calculateInvoiceTotals().subtotal.toFixed(2)}</strong></div>
                        <div>Total GST: <strong className="text-slate-800">{invoiceCurrency} {calculateInvoiceTotals().gstTotal.toFixed(2)}</strong></div>
                      </div>
                      <div className="text-lg font-black text-indigo-700 mt-2 md:mt-0">
                        Grand Total: {invoiceCurrency} {calculateInvoiceTotals().grandTotal.toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 pt-4 border-t">
                      <button
                        type="submit"
                        disabled={isSavingInvoice}
                        className="w-1/2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm shadow-sm transition-all"
                      >
                        {isSavingInvoice ? 'Creating Invoice...' : 'Create Invoice'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowInvoiceModal(false)}
                        className="w-1/2 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-sm shadow-sm transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Record Payment Modal */}
            {showPaymentModal && activeInvoiceForPayment && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl border border-slate-205 max-w-md w-full shadow-2xl p-6 relative animate-slide-in-up">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="absolute right-4 top-4 p-1 rounded-lg border hover:bg-slate-50 text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="flex items-center space-x-2 border-b pb-2 mb-4">
                    <DollarSign className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-extrabold text-slate-800 text-md uppercase">Record Payment</h3>
                  </div>

                  <form onSubmit={handleSavePayment} className="space-y-4">
                    <div className="text-xs font-semibold text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 mb-2">
                      <div className="flex justify-between">
                        <span>Invoice Number:</span>
                        <strong className="text-slate-800">{activeInvoiceForPayment.number}</strong>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Total Gross Amount:</span>
                        <strong className="text-slate-800">{activeInvoiceForPayment.currency} {activeInvoiceForPayment.totalAmount.toFixed(2)}</strong>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Outstanding Balance:</span>
                        <strong className="text-indigo-700">{activeInvoiceForPayment.currency} {(activeInvoiceForPayment.totalAmount - (activeInvoiceForPayment.paidAmount || 0)).toFixed(2)}</strong>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount to Pay ({activeInvoiceForPayment.currency})</label>
                      <input
                        type="number"
                        required
                        min="0.01"
                        step="0.01"
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value)}
                        className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={e => setPaymentMethod(e.target.value)}
                        className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card Payment</option>
                        <option value="UPI">UPI / QR Scan</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Transaction Reference</label>
                      <input
                        type="text"
                        placeholder="e.g. Txn ID, Receipt number, Bank Ref"
                        value={paymentReference}
                        onChange={e => setPaymentReference(e.target.value)}
                        className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex items-center space-x-3 pt-4 border-t">
                      <button
                        type="submit"
                        disabled={isSavingPayment}
                        className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
                      >
                        {isSavingPayment ? 'Recording...' : 'Record Payment'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPaymentModal(false)}
                        className="w-1/2 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-xs shadow-sm transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 7: COMMUNICATION ================= */}
        {/* {activeTab === 'communication' && (
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b pb-2 mb-4">
              <Share2 className="w-5 h-5 text-indigo-600" />
              <h3 className="text-md font-extrabold text-slate-800 tracking-tight">Communications Log</h3>
            </div>
            <div className="py-8 text-center text-slate-400 text-sm">
              No communication records (emails/sms) logged yet.
            </div>
          </div>
        )} */}

        {/* ================= TAB 8: SUMMARY ================= */}
        {/* {activeTab === 'summary' && (
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b pb-2 mb-4">
              <Info className="w-5 h-5 text-indigo-600" />
              <h3 className="text-md font-extrabold text-slate-800 tracking-tight">Lead Activity Summary</h3>
            </div>

            <div className="space-y-3 max-w-xl text-sm">
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500 font-medium">Creation Date</span>
                <span className="font-semibold text-slate-700">{new Date(lead.createdAt || Date.now()).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500 font-medium">Created By</span>
                <span className="font-semibold text-slate-700">{lead.creatorName || 'System Seeder'}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500 font-medium">Current Status</span>
                <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs">{lead.leadStatus || 'NEW'}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500 font-medium">Lead Branch</span>
                <span className="font-semibold text-slate-700">{lead.branchName || 'HQ Branch'}</span>
              </div>
            </div>
          </div>
        )} */}

        {/* ================= TAB 9: FOLLOW UP ================= */}
        {activeTab === 'follow-up' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center border-b pb-2 mb-6">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                <h3 className="text-md font-extrabold text-slate-800 tracking-tight">Timeline & Follow-ups</h3>
              </div>
              <button
                onClick={() => setFollowUpModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-xs shadow-sm transition-all"
              >
                + Add Follow-up
              </button>
            </div>

            <div className="space-y-4">
              {activities.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-6">No updates logged.</p>
              ) : (
                activities.map(act => (
                  <div key={act._id} className="flex space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-8 w-8 rounded-full bg-slate-100 border flex items-center justify-center text-indigo-600 text-xs font-black">
                        {act.userName ? act.userName[0].toUpperCase() : 'U'}
                      </div>
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-150 shadow-sm">
                      <div className="flex justify-between text-xs text-slate-400 mb-1 font-bold">
                        <span className="text-slate-600">{act.userName || 'System'}</span>
                        <span>{new Date(act.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{act.body}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 10: VISITS ================= */}
        {/* {activeTab === 'visits' && (
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b pb-2 mb-4">
              <MapPin className="w-5 h-5 text-indigo-600" />
              <h3 className="text-md font-extrabold text-slate-800 tracking-tight">Office Visits Log</h3>
            </div>
            <div className="py-8 text-center text-slate-400 text-sm">
              No walk-in office visits logged for this client.
            </div>
          </div>
        )} */}

      </div>

      {/* ─── ADD FILE NOTE SLIDING DRAWER / MODAL (Pic 4 style) ─────────────────────── */}
      {showAddNoteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end animate-fade-in">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl overflow-y-auto flex flex-col animate-slide-in-right">

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-[#FAF8F5]">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Add File Note</h3>
              <button
                onClick={() => setShowAddNoteModal(false)}
                className="p-1 rounded-lg border border-slate-350 bg-white hover:bg-slate-50 text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveNote} className="flex-1 p-6 space-y-6 flex flex-col justify-between">
              <div className="space-y-6">

                {/* Rich Formatting Helper Toolbar */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Note Details</label>
                  <div className="border border-slate-300 rounded-lg overflow-hidden flex flex-col">

                    {/* Toolbar buttons */}
                    <div className="bg-slate-100 px-3 py-2 border-b border-slate-300 flex flex-wrap gap-1.5 items-center">
                      <button
                        type="button"
                        onClick={() => insertHtmlTag('<b>', '</b>')}
                        className="w-7 h-7 bg-white hover:bg-slate-200 border rounded flex items-center justify-center font-bold text-xs transition-colors"
                        title="Bold"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHtmlTag('<i>', '</i>')}
                        className="w-7 h-7 bg-white hover:bg-slate-200 border rounded flex items-center justify-center italic text-xs transition-colors"
                        title="Italic"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHtmlTag('<u>', '</u>')}
                        className="w-7 h-7 bg-white hover:bg-slate-200 border rounded flex items-center justify-center underline text-xs transition-colors"
                        title="Underline"
                      >
                        U
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHtmlTag('<span style="color:#ef4444">', '</span>')}
                        className="w-7 h-7 bg-white hover:bg-slate-200 border rounded flex items-center justify-center text-red-500 font-bold text-xs transition-colors"
                        title="Red Text"
                      >
                        A
                      </button>
                      <button
                        type="button"
                        onClick={() => insertHtmlTag('<ul>\n  <li>', '\n</ul>')}
                        className="w-7 h-7 bg-white hover:bg-slate-200 border rounded flex items-center justify-center text-[10px] font-bold transition-colors"
                        title="Unordered List"
                      >
                        •≡
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const url = prompt('Enter link URL (e.g. https://google.com):');
                          if (url) {
                            insertHtmlTag(`<a href="${url}" target="_blank" class="text-indigo-600 hover:underline">`, '</a>');
                          }
                        }}
                        className="w-7 h-7 bg-white hover:bg-slate-200 border rounded flex items-center justify-center text-xs transition-colors"
                        title="Link"
                      >
                        🔗
                      </button>
                      <button
                        type="button"
                        onClick={() => setNoteBody('')}
                        className="w-7 h-7 bg-white hover:bg-slate-200 border rounded flex items-center justify-center text-[10px] font-bold text-red-600 transition-colors"
                        title="Clear all"
                      >
                        C
                      </button>
                    </div>

                    {/* Text area */}
                    <textarea
                      id="note-textarea"
                      rows={5}
                      required
                      placeholder="Enter your notes details here..."
                      value={noteBody}
                      onChange={e => setNoteBody(e.target.value)}
                      className="p-3 text-sm focus:outline-none w-full bg-white text-slate-800 resize-y min-h-[120px]"
                    />
                  </div>
                </div>

                {/* Send checklists */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notification Options</h4>

                  <label className="flex items-center space-x-3 cursor-pointer text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={sendToClient}
                      onChange={e => setSendToClient(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                    />
                    <span>Send Notes to Client</span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={sendToAssigned}
                      onChange={e => setSendToAssigned(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                    />
                    <span>Send Notes to Lead Assigned User <strong className="text-slate-900">[{lead.ownerName || 'Unassigned'}]</strong></span>
                  </label>

                  <label className="flex items-center space-x-3 cursor-pointer text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={sendToStaff}
                      onChange={e => setSendToStaff(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                    />
                    <span>Send Notes to Staff Members</span>
                  </label>

                  <div className="space-y-2">
                    <label className="flex items-center space-x-3 cursor-pointer text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={sendToOthers}
                        onChange={e => setSendToOthers(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                      />
                      <span>Send Notes to Others / Custom Emails</span>
                    </label>

                    {sendToOthers && (
                      <input
                        type="text"
                        placeholder="recipient1@email.com, recipient2@email.com"
                        value={othersEmails}
                        onChange={e => setOthersEmails(e.target.value)}
                        className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      />
                    )}
                  </div>
                </div>

                {/* Attachment upload dropzone */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Include Attachment</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col items-center justify-center space-y-2"
                  >
                    <UploadCloud className="w-8 h-8 text-slate-400" />
                    <div>
                      <p className="text-xs font-bold text-slate-600">Drop File Here</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Maximum size: 2MB</p>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 text-indigo-600 px-3 py-1.5 rounded-lg shadow-sm"
                    >
                      Choose file
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>

                  {fileError && <p className="text-xs text-red-500 font-semibold">{fileError}</p>}
                  {selectedFile && (
                    <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 truncate max-w-[400px]">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                        className="text-red-500 text-xs font-bold hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-3 pt-6 border-t">
                <button
                  type="submit"
                  disabled={isSavingNote || !noteBody.trim()}
                  className="w-1/2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold text-sm shadow-sm transition-all"
                >
                  {isSavingNote ? 'Saving note...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddNoteModal(false)}
                  className="w-1/2 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold text-sm shadow-sm transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ─── CALCULATOR INTERACTIVE MODALS ────────────────────────────────────────── */}
      {activeCalculator && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6 relative animate-fade-in">
            <button
              onClick={() => setActiveCalculator(null)}
              className="absolute right-4 top-4 p-1 rounded-lg border hover:bg-slate-50 text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Calculator 1: Points Calculator */}
            {activeCalculator === 'points' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b pb-2">
                  <Calculator className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-slate-800 text-md uppercase">CRS Point Calculator</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Age of Principal Applicant</label>
                    <select value={crsAge} onChange={e => setCrsAge(e.target.value)} className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white">
                      <option value="18-20">18-20 years</option>
                      <option value="21-29">21-29 years (Max points)</option>
                      <option value="30">30 years</option>
                      <option value="35">35 years</option>
                      <option value="40">40 years</option>
                      <option value="45+">45+ years</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Level of Education</label>
                    <select value={crsEducation} onChange={e => setCrsEducation(e.target.value)} className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white">
                      <option value="Secondary">Secondary School Diploma</option>
                      <option value="Bachelors">Bachelors Degree (3 years+)</option>
                      <option value="Double">Two or more credentials</option>
                      <option value="Masters">Masters Degree</option>
                      <option value="PhD">Doctoral / Ph.D.</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Language Proficiency (IELTS/PTE CLB)</label>
                    <select value={crsLanguage} onChange={e => setCrsLanguage(e.target.value)} className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white">
                      <option value="CLB7">CLB 7 (IELTS 6.0 each)</option>
                      <option value="CLB8">CLB 8 (IELTS 6.5 each)</option>
                      <option value="CLB9">CLB 9 (IELTS 8,7,7,7)</option>
                      <option value="CLB10">CLB 10 (IELTS 8.5+)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Foreign Work Experience</label>
                    <select value={crsExperience} onChange={e => setCrsExperience(e.target.value)} className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white">
                      <option value="None">None / Less than 1 year</option>
                      <option value="1year">1 year</option>
                      <option value="2years">2 years</option>
                      <option value="3years">3+ years</option>
                    </select>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center mt-4">
                  <span className="block text-xs font-bold text-slate-500 uppercase">Estimated CRS Score</span>
                  <strong className="text-3xl font-black text-indigo-700">{calculatedPoints}</strong>
                  <span className="block text-[10px] text-slate-400 font-semibold mt-1">Based on Express Entry standard scoring matrix.</span>
                </div>
              </div>
            )}

            {/* Calculator 2: Fund Summary */}
            {activeCalculator === 'funds' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b pb-2">
                  <DollarSign className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-slate-800 text-md uppercase">Funds Requirement Calculator</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Tuition Fees ($ / Year)</label>
                    <input
                      type="number"
                      value={fundTuition}
                      onChange={e => setFundTuition(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Living Expenses ($ / Year)</label>
                    <input
                      type="number"
                      value={fundLiving}
                      onChange={e => setFundLiving(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Travel & Miscellaneous ($)</label>
                    <input
                      type="number"
                      value={fundTravel}
                      onChange={e => setFundTravel(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    />
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center mt-4">
                  <span className="block text-xs font-bold text-slate-500 uppercase">Total Funds Required</span>
                  <strong className="text-3xl font-black text-emerald-700">${calculatedFunds.toLocaleString()}</strong>
                  <span className="block text-[10px] text-slate-400 font-semibold mt-1">Estimations based on typical student visa requirements.</span>
                </div>
              </div>
            )}

            {/* Calculator 3: Visa Fee Calculator */}
            {activeCalculator === 'visa' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b pb-2">
                  <Calculator className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-slate-800 text-md uppercase">VISA Fee Calculator</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Visa Category</label>
                    <select value={visaCategory} onChange={e => setVisaCategory(e.target.value)} className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white">
                      <option value="Student">Student Visa ($150)</option>
                      <option value="Visitor">Visitor Visa ($100)</option>
                      <option value="Work">Work Permit ($155)</option>
                      <option value="PR">PR Express Entry ($850)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Number of Applicants</label>
                    <input
                      type="number"
                      min="1"
                      value={visaApplicantsCount}
                      onChange={e => setVisaApplicantsCount(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center mt-4">
                  <span className="block text-xs font-bold text-slate-500 uppercase">Estimated Total Fee</span>
                  <strong className="text-3xl font-black text-blue-700">${calculatedVisaFee}</strong>
                  <span className="block text-[10px] text-slate-400 font-semibold mt-1">Includes Govt visa processing fees + standard biometrics fee ($85).</span>
                </div>
              </div>
            )}

            <button
              onClick={() => setActiveCalculator(null)}
              className="w-full mt-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-bold text-xs shadow-sm transition-all"
            >
              Close Calculator
            </button>
          </div>
        </div>
      )}

      {/* ─── CREATE CASE MODAL ────────────────────────────────────────── */}
      {isCreateCaseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col animate-scale-up">

            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-[#FAF8F5]">
              <div className="flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Create Immigration Case</h3>
              </div>
              <button
                onClick={() => setIsCreateCaseModalOpen(false)}
                className="p-1 rounded-lg border border-slate-350 bg-white hover:bg-slate-50 text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateCase} className="p-6 space-y-6">
              {/* Visa Type */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Visa Type</label>
                <select
                  value={caseVisaType}
                  onChange={(e) => setCaseVisaType(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="Student">Student Visa</option>
                  <option value="Visitor">Visitor Visa</option>
                  <option value="Work">Work Visa</option>
                  <option value="PR">PR / Express Entry</option>
                </select>
              </div>

              {/* Target Country */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Target Country</label>
                <select
                  value={caseTargetCountry}
                  onChange={(e) => setCaseTargetCountry(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                >
                  <option value="Canada">Canada</option>
                  <option value="UK">United Kingdom</option>
                  <option value="Australia">Australia</option>
                  <option value="USA">United States</option>
                  <option value="New Zealand">New Zealand</option>
                  <option value="Germany">Germany</option>
                </select>
              </div>

              {/* Product Line */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Product Line (Code)</label>
                <input
                  type="text"
                  value={caseProductLine}
                  onChange={(e) => setCaseProductLine(e.target.value)}
                  placeholder="e.g. CANADA, UK, AUS"
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Visa Template */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Document Checklist Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Default Checklist (Auto-generated based on Visa Type)</option>
                  {templates.map(t => (
                    <option key={t._id} value={t._id}>
                      {t.name || `Template ${t._id.substring(0, 8)}`} ({t.documentRequirements?.length || 0} docs)
                    </option>
                  ))}
                </select>
              </div>

              {/* Footer Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateCaseModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 bg-white hover:bg-slate-50 transition-all text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCaseLoading}
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center"
                >
                  {createCaseLoading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    'Create Case'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── FOLLOW UP / ACTIVITY MODAL ────────────────────────────────────────── */}
      <FollowUpModal
        isOpen={followUpModalOpen}
        onClose={() => setFollowUpModalOpen(false)}
        leadId={id}
        onSuccess={() => fetchData()}
      />

    </div>
  );
}