import React, { useState, useRef } from 'react';
import GlassModal from './GlassModal';
import {
  Upload,
  Image as ImageIcon,
  FileText,
  Check,
  X,
  AlertCircle,
  PlusCircle,
  User,
  Mail,
  Layers,
  Award,
  Link as LinkIcon,
  Sparkles
} from 'lucide-react';

const DEPARTMENTS = [
  'Computer Engineering',
  'Information Technology',
  'AI & Data Science',
  'Automation & Robotics',
  'Electronics & Telecommunication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Other'
];

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const AddNewLogoModal = ({ isOpen, onClose, onSave, isSaving }) => {
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentDepartment, setStudentDepartment] = useState('');
  const [studentRollNumber, setStudentRollNumber] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [driveLink, setDriveLink] = useState('');

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [pdfFile, setPdfFile] = useState(null);

  const [errorMsg, setErrorMsg] = useState('');

  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    setErrorMsg('');
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    const validExts = ['png', 'jpg', 'jpeg', 'webp'];
    const validMime = ALLOWED_IMAGE_TYPES.includes(file.type);

    if (!validExts.includes(ext) && !validMime) {
      setErrorMsg('Invalid logo image format. Allowed formats: PNG, JPG, JPEG, WebP.');
      setImageFile(null);
      setImagePreview('');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setErrorMsg(`Logo image size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds 10 MB limit.`);
      setImageFile(null);
      setImagePreview('');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handlePdfChange = (e) => {
    const file = e.target.files?.[0];
    setErrorMsg('');
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    const isPdf = ext === 'pdf' || file.type.includes('pdf');

    if (!isPdf) {
      setErrorMsg('Invalid document format. Only PDF files are allowed for submission PDF.');
      setPdfFile(null);
      return;
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
      setErrorMsg(`Submission PDF size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds 25 MB limit.`);
      setPdfFile(null);
      return;
    }

    setPdfFile(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!studentName.trim()) {
      setErrorMsg('Student Name is required.');
      return;
    }

    if (!studentEmail.trim()) {
      setErrorMsg('Email Address is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(studentEmail.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!studentDepartment.trim()) {
      setErrorMsg('Department selection is required.');
      return;
    }

    if (!imageFile) {
      setErrorMsg('Please upload a Logo Image.');
      return;
    }

    // Extract Google Drive File ID if link provided
    let driveFileId = '';
    if (driveLink.trim()) {
      const link = driveLink.trim();
      if (link.includes('id=')) {
        const match = link.match(/id=([a-zA-Z0-9_-]+)/);
        if (match) driveFileId = match[1];
      } else if (link.includes('/d/')) {
        const match = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) driveFileId = match[1];
      }
    }

    const formData = new FormData();
    formData.append('studentName', studentName.trim());
    formData.append('studentEmail', studentEmail.trim());
    formData.append('studentDepartment', studentDepartment.trim());
    if (studentRollNumber.trim()) formData.append('studentRollNumber', studentRollNumber.trim());
    if (title.trim()) formData.append('title', title.trim());
    if (description.trim()) formData.append('description', description.trim());
    if (driveFileId) formData.append('driveFileId', driveFileId);

    formData.append('image', imageFile);
    if (pdfFile) formData.append('pdf', pdfFile);

    onSave(formData);
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Logo Entry"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-sans">
        
        {/* Error Validation Banner */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* SECTION 1: PARTICIPANT INFORMATION */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-pink-300 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
            <User className="w-3.5 h-3.5 text-pink-400" /> Participant Information
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Student Name <span className="text-pink-400">*</span>
              </label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Aryan Kale"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Email Address <span className="text-pink-400">*</span>
              </label>
              <input
                type="email"
                required
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="student@jspmrscoe.edu.in"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Department <span className="text-pink-400">*</span>
              </label>
              <select
                required
                value={studentDepartment}
                onChange={(e) => setStudentDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-pink-500"
              >
                <option value="" disabled>Select Department...</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept} className="bg-slate-900 text-white">
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Roll Number <span className="text-slate-500">(Optional)</span>
              </label>
              <input
                type="text"
                value={studentRollNumber}
                onChange={(e) => setStudentRollNumber(e.target.value)}
                placeholder="e.g. 23CO105"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: LOGO SUBMISSION DETAILS */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-cyan-400" /> Logo Submission & Assets
          </h4>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Logo Title <span className="text-slate-500">(Optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. RSCOE Silver Jubilee Emblem"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Logo Image Upload Box (Required) */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                Upload Logo Image <span className="text-pink-400">*</span>
              </label>
              <input
                type="file"
                ref={imageInputRef}
                onChange={handleImageChange}
                accept="image/png, image/jpeg, image/jpg, image/webp"
                className="hidden"
              />
              <div
                onClick={() => imageInputRef.current?.click()}
                className="w-full h-36 border-2 border-dashed border-slate-700 hover:border-pink-500/60 rounded-xl bg-slate-950/70 p-2 flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden relative group"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="max-h-full max-w-full object-contain rounded" />
                ) : (
                  <div className="text-center p-3">
                    <Upload className="w-6 h-6 text-pink-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-300 block">Click to upload image</span>
                    <span className="text-[10px] text-slate-500">PNG, JPG, JPEG, WebP (Max 10 MB)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Submission PDF Upload Box (Optional) */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Upload Submission PDF <span className="text-slate-500">(Optional)</span>
              </label>
              <input
                type="file"
                ref={pdfInputRef}
                onChange={handlePdfChange}
                accept="application/pdf,.pdf"
                className="hidden"
              />
              <div
                onClick={() => pdfInputRef.current?.click()}
                className="w-full h-36 border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-xl bg-slate-950/70 p-2 flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden relative group"
              >
                {pdfFile ? (
                  <div className="text-center p-3 space-y-1">
                    <FileText className="w-8 h-8 text-indigo-400 mx-auto" />
                    <span className="text-xs font-bold text-indigo-300 line-clamp-1 block">{pdfFile.name}</span>
                    <span className="text-[10px] text-slate-400">{(pdfFile.size / (1024 * 1024)).toFixed(2)} MB PDF</span>
                  </div>
                ) : (
                  <div className="text-center p-3">
                    <FileText className="w-6 h-6 text-indigo-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-300 block">Click to attach PDF</span>
                    <span className="text-[10px] text-slate-500">PDF Document (Max 25 MB)</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Google Drive Link <span className="text-slate-500">(Optional)</span>
            </label>
            <input
              type="text"
              value={driveLink}
              onChange={(e) => setDriveLink(e.target.value)}
              placeholder="https://drive.google.com/open?id=..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Description / Tagline <span className="text-slate-500">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the logo design rationale and elements..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            ></textarea>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 rounded-xl btn-gradient-pink text-white text-xs font-semibold shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Adding Logo...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Save Entry</span>
              </>
            )}
          </button>
        </div>

      </form>
    </GlassModal>
  );
};

export default AddNewLogoModal;
