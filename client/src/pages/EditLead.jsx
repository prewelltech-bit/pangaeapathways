import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../lib/AuthContext';
import { User, Phone, Briefcase, Users, X, Plus, Trash2 } from 'lucide-react';

export default function EditLead() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [globalError, setGlobalError] = useState('');
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState(0);
  const [leadCode, setLeadCode] = useState('');

  const defaultService = {
    productLine: '',
    assignTo: '',
    leadStatus: '',
    leadQuality: '',
    source: '',
    comments: '',
  };

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    visaExpiryDate: '',
    maritalStatus: '',
    passportNumber: '',
    tags: '',
    countryOfPassport: '',
    passportIssueDate: '',
    passportExpiryDate: '',
    passportIssuePlace: '',
    placeOfBirth: '',
    preferredVisa: '',
    currentVisaType: '',
    travelledCountries: '',
    visaRejected: 'No',

    contactType: 'Personal',
    contactCode: '+91',
    phone: '',
    emailType: 'Personal',
    email: '',
    addressType: 'Permanent',
    addressLine1: '',
    addressLine2: '',
    country: '',
    state: '',
    city: '',
    zipcode: '',
    facebookLink: '',
    twitterLink: '',
    instagramLink: '',
    youtubeLink: '',
    linkedinLink: '',

    branchId: '',
    services: [defaultService],

    secondaryRelationship: '',
    secondaryFirstName: '',
    secondaryLastName: '',
    secondaryDob: '',
    secondaryPassport: '',
    secondaryContactCode: '+91',
    secondaryContactNumber: '',
    secondaryEmail: '',
    secondaryAddress: '',
    consentContact: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leadRes, branchRes, usersRes] = await Promise.all([
          axios.get(`/api/leads/${id}`),
          axios.get('/api/meta/branches'),
          axios.get('/api/users')
        ]);
        setBranches(branchRes.data);
        setUsersList(usersRes.data);
        
        const lead = leadRes.data;
        setLeadCode(lead._id?.substring(lead._id.length - 4) || '0001');

        // Parse fullName into first/last
        const nameParts = (lead.fullName || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Parse phone code
        let phoneCode = '+91';
        let phoneNumber = lead.phone || '';
        if (phoneNumber.startsWith('+')) {
          const spaceIdx = phoneNumber.indexOf(' ');
          if (spaceIdx > 0) {
            phoneCode = phoneNumber.substring(0, spaceIdx);
            phoneNumber = phoneNumber.substring(spaceIdx + 1);
          }
        }

        // Parse services array, or fallback to root properties
        let loadedServices = lead.services;
        if (!loadedServices || !Array.isArray(loadedServices) || loadedServices.length === 0) {
          loadedServices = [{
            productLine: lead.productLine || '',
            assignTo: lead.assignTo || lead.ownerId || '',
            leadStatus: lead.leadStatus || '',
            leadQuality: lead.leadQuality || '',
            source: lead.source || '',
            comments: lead.notes || lead.comments || '',
          }];
        }

        setFormData(prev => ({
          ...prev,
          ...lead,
          firstName,
          lastName,
          contactCode: phoneCode,
          phone: phoneNumber,
          tags: Array.isArray(lead.tags) ? lead.tags.join(', ') : (lead.tags || ''),
          branchId: lead.branchId || '',
          services: loadedServices,
        }));
      } catch (err) {
        console.error(err);
        setGlobalError('Failed to load lead data');
      } finally {
        setPageLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData({ ...formData, [name]: val });
    if (errors[name]) setErrors({ ...errors, [name]: null });
  };

  const handleServiceChange = (index, field, value) => {
    const newServices = [...formData.services];
    newServices[index][field] = value;
    setFormData({ ...formData, services: newServices });
    if (errors[`service_${index}_${field}`]) {
      setErrors({ ...errors, [`service_${index}_${field}`]: null });
    }
  };

  const addService = () => {
    setFormData({ ...formData, services: [...formData.services, { ...defaultService, assignTo: user?._id || '' }] });
  };

  const removeService = (index) => {
    if (formData.services.length > 1) {
      const newServices = formData.services.filter((_, i) => i !== index);
      setFormData({ ...formData, services: newServices });
    }
  };

  const validateTab = (tabIndex) => {
    const newErrors = {};
    if (tabIndex === 0) {
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'First Name is required';
      } else if (!/^[A-Za-z\s]+$/.test(formData.firstName.trim())) {
        newErrors.firstName = 'First Name must contain only letters';
      }
      if (!formData.gender) newErrors.gender = 'Gender is required';

      if (formData.passportNumber) {
        if (!/^[A-Z0-9]{3,15}$/i.test(formData.passportNumber.trim())) {
          newErrors.passportNumber = 'Passport must be 3-15 alphanumeric characters';
        }
        if (formData.passportExpiryDate) {
          if (new Date(formData.passportExpiryDate) <= new Date()) {
            newErrors.passportExpiryDate = 'Expiry date must be in the future';
          }
        }
      }
    } else if (tabIndex === 1) {
      if (!formData.phone.trim()) newErrors.phone = 'Contact Number is required';
      else if (formData.phone.trim().length < 5 || formData.phone.trim().length > 15) {
        newErrors.phone = 'Invalid phone number length';
      }
      if (!formData.email.trim()) newErrors.email = 'Email Address is required';
      if (formData.email && !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
    } else if (tabIndex === 2) {
      if (!formData.branchId) newErrors.branchId = 'Branch is required';
      formData.services.forEach((srv, idx) => {
        if (!srv.productLine) newErrors[`service_${idx}_productLine`] = 'Required';
        if (!srv.assignTo) newErrors[`service_${idx}_assignTo`] = 'Required';
        if (!srv.leadStatus) newErrors[`service_${idx}_leadStatus`] = 'Required';
        if (!srv.leadQuality) newErrors[`service_${idx}_leadQuality`] = 'Required';
        if (!srv.source) newErrors[`service_${idx}_source`] = 'Required';
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateAndNext = () => {
    if (validateTab(activeTab)) {
      setGlobalError('');
      setActiveTab(activeTab + 1);
    } else {
      setGlobalError('Please fill all required fields correctly.');
    }
  };

  const handleSave = async () => {
    for (let i = 0; i <= activeTab; i++) {
      if (!validateTab(i)) {
        setActiveTab(i);
        setGlobalError('Please fill all required fields correctly.');
        return;
      }
    }

    setLoading(true);
    setGlobalError('');

    const primaryService = formData.services[0];

    const payload = {
      ...formData,
      fullName: `${formData.firstName} ${formData.lastName}`.trim(),
      phone: formData.phone ? `${formData.contactCode} ${formData.phone}` : '',
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
      productLine: primaryService.productLine,
      assignTo: primaryService.assignTo,
      ownerId: primaryService.assignTo,
      leadStatus: primaryService.leadStatus,
      leadQuality: primaryService.leadQuality,
      source: primaryService.source,
      notes: primaryService.comments,
    };

    // Remove non-schema fields
    delete payload._id;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.createdBy;
    delete payload.firstName;
    delete payload.lastName;
    delete payload.contactCode;
    delete payload.comments;

    try {
      await axios.patch(`/api/leads/${id}`, payload);
      navigate(`/leads/${id}`);
    } catch (err) {
      setGlobalError(err.response?.data?.detail || 'Failed to update lead');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { name: 'Personal Info', icon: User },
    { name: 'Contact Info', icon: Phone },
    { name: 'Service Info', icon: Briefcase },
    { name: 'Secondary Applicant', icon: Users },
  ];

  const getInputClass = (errorKey) => 
    `mt-1 block w-full rounded-lg border py-2.5 px-3 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white ${
      errors[errorKey] ? 'border-red-500 bg-red-50' : 'border-slate-300'
    }`;
  const labelClass = "block text-xs font-semibold text-slate-500 mb-0.5";

  if (pageLoading) return <div className="p-8 text-center text-slate-500">Loading lead data...</div>;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-sky-900">LEAD-{leadCode.toUpperCase()}</h2>
        <button onClick={() => navigate(`/leads/${id}`)} className="text-red-400 hover:text-red-600">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex items-center space-x-1 mb-6 border-b border-slate-200 overflow-x-auto">
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeTab === idx;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (idx < activeTab || validateTab(activeTab)) {
                  setGlobalError('');
                  setActiveTab(idx);
                } else {
                  setGlobalError('Please fill all required fields correctly before switching tabs.');
                }
              }}
              className={`flex items-center px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                isActive ? 'border-sky-600 text-sky-800' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {globalError && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">
          {globalError}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-sky-100 p-6 md:p-8">
        {/* TAB 0: Personal Info */}
        {activeTab === 0 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>*First Name</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className={getInputClass('firstName')} />
                {errors.firstName && <span className="text-xs text-red-500 mt-1">{errors.firstName}</span>}
              </div>
              <div>
                <label className={labelClass}>Last Name</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={getInputClass('lastName')} />
              </div>
            </div>

            <div>
              <label className={labelClass}>*Gender</label>
              <div className="flex space-x-6 mt-2">
                {['Male', 'Female', 'Other'].map(g => (
                  <label key={g} className="flex items-center text-sm text-slate-700 cursor-pointer">
                    <input type="radio" name="gender" value={g} checked={formData.gender === g} onChange={handleChange} className="mr-2 text-sky-600" />
                    {g}
                  </label>
                ))}
              </div>
              {errors.gender && <span className="text-xs text-red-500 mt-1 block">{errors.gender}</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Date of Birth</label>
                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className={getInputClass('dateOfBirth')} />
              </div>
              <div>
                <label className={labelClass}>Visa Expiry Date</label>
                <input type="date" name="visaExpiryDate" value={formData.visaExpiryDate} onChange={handleChange} className={getInputClass('visaExpiryDate')} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Marital Status</label>
              <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} className={getInputClass('maritalStatus')}>
                <option value="">Select Marital Status</option>
                <option value="Never Married">Never Married</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Passport Number</label>
                <input type="text" name="passportNumber" value={formData.passportNumber} onChange={handleChange} className={getInputClass('passportNumber')} />
                {errors.passportNumber && <span className="text-xs text-red-500 mt-1">{errors.passportNumber}</span>}
              </div>
              <div>
                <label className={labelClass}>Tags/Label</label>
                <input type="text" name="tags" placeholder="e.g. VIP, Urgent" value={formData.tags} onChange={handleChange} className={getInputClass('tags')} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className={labelClass}>Country of Passport</label>
                <select name="countryOfPassport" value={formData.countryOfPassport} onChange={handleChange} className={getInputClass('countryOfPassport')}>
                  <option value="">Select Country</option>
                  <option value="India">India</option>
                  <option value="Australia">Australia</option>
                  <option value="Canada">Canada</option>
                  <option value="UK">UK</option>
                  <option value="USA">USA</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Passport Issue Date</label>
                <input type="date" name="passportIssueDate" value={formData.passportIssueDate} onChange={handleChange} className={getInputClass('passportIssueDate')} />
              </div>
              <div>
                <label className={labelClass}>Passport Expiry Date</label>
                <input type="date" name="passportExpiryDate" value={formData.passportExpiryDate} onChange={handleChange} className={getInputClass('passportExpiryDate')} />
                {errors.passportExpiryDate && <span className="text-xs text-red-500 mt-1">{errors.passportExpiryDate}</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Passport Issue Place</label>
                <input type="text" name="passportIssuePlace" value={formData.passportIssuePlace} onChange={handleChange} className={getInputClass('passportIssuePlace')} />
              </div>
              <div>
                <label className={labelClass}>Place of Birth</label>
                <input type="text" name="placeOfBirth" value={formData.placeOfBirth} onChange={handleChange} className={getInputClass('placeOfBirth')} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Preferred Visa</label>
                <select name="preferredVisa" value={formData.preferredVisa} onChange={handleChange} className={getInputClass('preferredVisa')}>
                  <option value="">Select Preferred Visa(s)</option>
                  <option value="Student">Student</option>
                  <option value="Visitor">Visitor</option>
                  <option value="Work Permit">Work Permit</option>
                  <option value="PR">PR</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Visa type you currently hold</label>
                <input type="text" name="currentVisaType" value={formData.currentVisaType} onChange={handleChange} className={getInputClass('currentVisaType')} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Which country have you moved/travelled to?</label>
              <select name="travelledCountries" value={formData.travelledCountries} onChange={handleChange} className={getInputClass('travelledCountries')}>
                <option value="">Select Country(s)</option>
                <option value="Australia">Australia</option>
                <option value="Canada">Canada</option>
                <option value="UK">UK</option>
                <option value="USA">USA</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Have your visa been rejected by any country previously?</label>
              <div className="flex space-x-6 mt-2">
                {['Yes', 'No', 'Not Sure'].map(v => (
                  <label key={v} className="flex items-center text-sm text-slate-700 cursor-pointer">
                    <input type="radio" name="visaRejected" value={v} checked={formData.visaRejected === v} onChange={handleChange} className="mr-2" />
                    {v}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: Contact Info */}
        {activeTab === 1 && (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>* Contact Type</label>
              <select name="contactType" value={formData.contactType} onChange={handleChange} className={getInputClass('contactType')}>
                <option value="Personal">Personal</option>
                <option value="Work">Work</option>
              </select>
            </div>

            <div className="flex gap-3">
              <div className="w-24 shrink-0">
                <label className={labelClass}>*Code</label>
                <select name="contactCode" value={formData.contactCode} onChange={handleChange} className={getInputClass('contactCode')}>
                  <option value="+91">+91</option>
                  <option value="+61">+61</option>
                  <option value="+1">+1</option>
                  <option value="+44">+44</option>
                </select>
              </div>
              <div className="flex-1">
                <label className={labelClass}>*Contact Number</label>
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} className={getInputClass('phone')} />
                {errors.phone && <span className="text-xs text-red-500 mt-1">{errors.phone}</span>}
              </div>
            </div>

            <div>
              <label className={labelClass}>* Email Type</label>
              <select name="emailType" value={formData.emailType} onChange={handleChange} className={getInputClass('emailType')}>
                <option value="Personal">Personal</option>
                <option value="Work">Work</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>*Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className={getInputClass('email')} />
              {errors.email && <span className="text-xs text-red-500 mt-1">{errors.email}</span>}
            </div>

            <hr className="border-slate-200" />

            <div>
              <label className={labelClass}>Address Type</label>
              <select name="addressType" value={formData.addressType} onChange={handleChange} className={getInputClass('addressType')}>
                <option value="Permanent">Permanent</option>
                <option value="Current">Current</option>
              </select>
            </div>
            <div>
              <input type="text" name="addressLine1" placeholder="Address Line 1" value={formData.addressLine1} onChange={handleChange} className={getInputClass('addressLine1')} />
            </div>
            <div>
              <input type="text" name="addressLine2" placeholder="Address Line 2" value={formData.addressLine2} onChange={handleChange} className={getInputClass('addressLine2')} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <select name="country" value={formData.country} onChange={handleChange} className={getInputClass('country')}>
                <option value="">Select Country</option>
                <option value="India">India</option>
                <option value="Australia">Australia</option>
              </select>
              <select name="state" value={formData.state} onChange={handleChange} className={getInputClass('state')}>
                <option value="">Select State</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Victoria">Victoria</option>
                <option value="NSW">NSW</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <input type="text" name="city" placeholder="City/Suburb" value={formData.city} onChange={handleChange} className={getInputClass('city')} />
              <input type="text" name="zipcode" placeholder="Zipcode/Pincode" value={formData.zipcode} onChange={handleChange} className={getInputClass('zipcode')} />
            </div>

            <hr className="border-slate-200" />

            <h4 className="text-sm font-semibold text-slate-600">Social Media Links</h4>
            <div className="space-y-3">
              <input type="text" name="facebookLink" placeholder="Facebook Link" value={formData.facebookLink} onChange={handleChange} className={getInputClass('facebookLink')} />
              <input type="text" name="twitterLink" placeholder="Twitter Link" value={formData.twitterLink} onChange={handleChange} className={getInputClass('twitterLink')} />
              <input type="text" name="instagramLink" placeholder="Instagram Link" value={formData.instagramLink} onChange={handleChange} className={getInputClass('instagramLink')} />
              <input type="text" name="youtubeLink" placeholder="Youtube Link" value={formData.youtubeLink} onChange={handleChange} className={getInputClass('youtubeLink')} />
              <input type="text" name="linkedinLink" placeholder="LinkedIn Link" value={formData.linkedinLink} onChange={handleChange} className={getInputClass('linkedinLink')} />
            </div>
          </div>
        )}

        {/* TAB 2: Service Info */}
        {activeTab === 2 && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
              <label className={labelClass}>*Branch</label>
              <select name="branchId" value={formData.branchId} onChange={handleChange} className={getInputClass('branchId')}>
                <option value="" disabled>Select a branch</option>
                {branches.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
              {errors.branchId && <span className="text-xs text-red-500 mt-1">{errors.branchId}</span>}
            </div>

            {formData.services.map((srv, idx) => (
              <div key={idx} className="relative bg-white border border-slate-200 rounded-xl p-5 mb-4 shadow-sm">
                <div className="absolute top-4 right-4 flex space-x-2">
                  {formData.services.length > 1 && (
                    <button type="button" onClick={() => removeService(idx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {idx === formData.services.length - 1 && (
                    <button type="button" onClick={addService} className="p-1.5 text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg flex items-center shadow-sm">
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="pr-16 space-y-4">
                  <div>
                    <label className={labelClass}>*Service</label>
                    <select value={srv.productLine} onChange={(e) => handleServiceChange(idx, 'productLine', e.target.value)} className={getInputClass(`service_${idx}_productLine`)}>
                      <option value="">Select Service</option>
                      <option value="CANADA">Application + Student Visa - (Canada)</option>
                      <option value="USA">Application + Student Visa - (USA)</option>
                      <option value="UK">Application + Student Visa - (UK)</option>
                      <option value="EUROPE">Application + Student Visa - (Europe)</option>
                      <option value="AUSTRALIA">Application + Student Visa - (Australia)</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>*Assign To</label>
                    <select value={srv.assignTo} onChange={(e) => handleServiceChange(idx, 'assignTo', e.target.value)} className={getInputClass(`service_${idx}_assignTo`)}>
                      <option value="">Select User</option>
                      {usersList.map(u => (
                        <option key={u._id} value={u._id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>*Status</label>
                    <select value={srv.leadStatus} onChange={(e) => handleServiceChange(idx, 'leadStatus', e.target.value)} className={getInputClass(`service_${idx}_leadStatus`)}>
                      <option value="">Select Status</option>
                      <option value="NEW">New</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="QUALIFIED">Qualified</option>
                      <option value="ON_HOLD">On Hold</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>*Lead Quality</label>
                    <select value={srv.leadQuality} onChange={(e) => handleServiceChange(idx, 'leadQuality', e.target.value)} className={getInputClass(`service_${idx}_leadQuality`)}>
                      <option value="">Select Quality</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="Hot">Hot</option>
                      <option value="Warm">Warm</option>
                      <option value="Cold">Cold</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>*Lead Source</label>
                    <select value={srv.source} onChange={(e) => handleServiceChange(idx, 'source', e.target.value)} className={getInputClass(`service_${idx}_source`)}>
                      <option value="">Select Source</option>
                      <option value="WEBSITE">Website</option>
                      <option value="WALK_IN">Walk-in</option>
                      <option value="REFERRAL">Referral</option>
                      <option value="PARTNER">Partner</option>
                      <option value="SOCIAL">Social Media</option>
                      <option value="EVENT">Event</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Comments / Notes</label>
                    <textarea value={srv.comments} onChange={(e) => handleServiceChange(idx, 'comments', e.target.value)} rows={3} className={getInputClass(`service_${idx}_comments`)}></textarea>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: Secondary Applicant */}
        {activeTab === 3 && (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Relationship</label>
              <select name="secondaryRelationship" value={formData.secondaryRelationship} onChange={handleChange} className={getInputClass('secondaryRelationship')}>
                <option value="">Select Relationship</option>
                <option value="Spouse">Spouse</option>
                <option value="Child">Child</option>
                <option value="Parent">Parent</option>
                <option value="Sibling">Sibling</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>First Name</label>
                <input type="text" name="secondaryFirstName" value={formData.secondaryFirstName} onChange={handleChange} className={getInputClass('secondaryFirstName')} />
              </div>
              <div>
                <label className={labelClass}>Last Name</label>
                <input type="text" name="secondaryLastName" value={formData.secondaryLastName} onChange={handleChange} className={getInputClass('secondaryLastName')} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Date of Birth</label>
                <input type="date" name="secondaryDob" value={formData.secondaryDob} onChange={handleChange} className={getInputClass('secondaryDob')} />
              </div>
              <div>
                <label className={labelClass}>Passport Number</label>
                <input type="text" name="secondaryPassport" value={formData.secondaryPassport} onChange={handleChange} className={getInputClass('secondaryPassport')} />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-24 shrink-0">
                <label className={labelClass}>Code</label>
                <select name="secondaryContactCode" value={formData.secondaryContactCode} onChange={handleChange} className={getInputClass('secondaryContactCode')}>
                  <option value="+91">+91</option>
                  <option value="+61">+61</option>
                  <option value="+1">+1</option>
                </select>
              </div>
              <div className="flex-1">
                <label className={labelClass}>Contact Number</label>
                <input type="text" name="secondaryContactNumber" value={formData.secondaryContactNumber} onChange={handleChange} className={getInputClass('secondaryContactNumber')} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Email Address</label>
              <input type="email" name="secondaryEmail" value={formData.secondaryEmail} onChange={handleChange} className={getInputClass('secondaryEmail')} />
            </div>
            <div>
              <label className={labelClass}>Residential Address</label>
              <textarea name="secondaryAddress" value={formData.secondaryAddress} onChange={handleChange} rows={2} className={getInputClass('secondaryAddress')}></textarea>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center mt-6 space-x-3">
        {activeTab > 0 && (
          <button type="button" onClick={() => { setGlobalError(''); setActiveTab(activeTab - 1); }} className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-sm">
            Previous
          </button>
        )}
        {activeTab < tabs.length - 1 && (
          <button type="button" onClick={validateAndNext} className="px-5 py-2.5 bg-sky-700 text-white rounded-lg hover:bg-sky-800 font-medium text-sm">
            Save & Next
          </button>
        )}
        <button type="button" onClick={handleSave} disabled={loading} className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-sm disabled:opacity-50">
          {loading ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={() => navigate(`/leads/${id}`)} className="px-5 py-2.5 border border-red-300 rounded-lg text-red-600 hover:bg-red-50 font-medium text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}
