import React, { useState, useEffect, useRef } from 'react';
import GlassModal from './GlassModal';
import {
  Upload,
  Image as ImageIcon,
  Check,
  X,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Move,
  Lock,
  Sparkles,
  User,
  Mail,
  Layers,
  FileText,
  ExternalLink
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

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const EditLogoModal = ({ isOpen, onClose, logo, onSave, isSaving }) => {
  // Form State
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentDepartment, setStudentDepartment] = useState('');
  const [studentRollNumber, setStudentRollNumber] = useState('');
  const [editLogoCode, setEditLogoCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [driveLink, setDriveLink] = useState('');

  // File Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewSrc, setPreviewSrc] = useState('');
  const [pdfFile, setPdfFile] = useState(null);

  const [errorMsg, setErrorMsg] = useState('');
  
  // Cropping & Resizing Canvas state
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [aspectRatio, setAspectRatio] = useState('1:1'); // '1:1', '4:3', '16:9'
  
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  useEffect(() => {
    if (logo) {
      setStudentName(logo.studentName || '');
      setStudentEmail(logo.studentEmail || '');
      setStudentDepartment(logo.studentDepartment || '');
      setStudentRollNumber(logo.studentRollNumber || logo.rollNumber || '');
      setEditLogoCode(logo.anonymousCode || '');
      setTitle(logo.title || '');
      setDescription(logo.description || '');
      setDriveLink(logo.driveFileId ? `https://drive.google.com/file/d/${logo.driveFileId}/preview` : '');

      setSelectedFile(null);
      setPreviewSrc('');
      setPdfFile(null);
      setErrorMsg('');
      setZoom(1);
      setRotation(0);
      setOffsetX(0);
      setOffsetY(0);
      setAspectRatio('1:1');
    }
  }, [logo]);

  // Load selected image file and generate preview
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setErrorMsg('');

    if (!file) return;

    // Validate File Extension & Type
    const ext = file.name.split('.').pop().toLowerCase();
    const validExts = ['png', 'jpg', 'jpeg', 'webp'];
    const validMime = ALLOWED_TYPES.includes(file.type);

    if (!validExts.includes(ext) && !validMime) {
      setErrorMsg('Invalid file format. Allowed formats: PNG, JPG, JPEG, WebP.');
      setSelectedFile(null);
      setPreviewSrc('');
      return;
    }

    // Validate File Size (Max 10 MB)
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setErrorMsg(`File size exceeds limit (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 10 MB.`);
      setSelectedFile(null);
      setPreviewSrc('');
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setPreviewSrc(event.target.result);
        setZoom(1);
        setRotation(0);
        setOffsetX(0);
        setOffsetY(0);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Handle PDF file selection
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

  // Render crop/resize to Canvas
  useEffect(() => {
    if (!previewSrc || !imageRef.current || !canvasRef.current) return;

    const img = imageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Output dimension based on aspect ratio
    let canvasWidth = 600;
    let canvasHeight = 600;
    if (aspectRatio === '4:3') {
      canvasHeight = 450;
    } else if (aspectRatio === '16:9') {
      canvasHeight = 337.5;
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.save();

    // Move to canvas center for rotation & scaling
    ctx.translate(canvasWidth / 2 + offsetX, canvasHeight / 2 + offsetY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Calculate image render dimensions preserving original aspect ratio
    const imgAspect = img.width / img.height;
    let drawW = canvasWidth;
    let drawH = canvasWidth / imgAspect;

    if (drawH < canvasHeight) {
      drawH = canvasHeight;
      drawW = canvasHeight * imgAspect;
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }, [previewSrc, zoom, rotation, offsetX, offsetY, aspectRatio]);

  const handleResetCrop = () => {
    setZoom(1);
    setRotation(0);
    setOffsetX(0);
    setOffsetY(0);
    setAspectRatio('1:1');
  };

  const processAndSave = (finalImageFile) => {
    const formData = new FormData();
    formData.append('studentName', studentName.trim());
    formData.append('studentEmail', studentEmail.trim());
    formData.append('studentDepartment', studentDepartment.trim());
    formData.append('studentRollNumber', studentRollNumber.trim());
    formData.append('anonymousCode', editLogoCode.trim());
    formData.append('title', title.trim());
    formData.append('description', description.trim());

    if (finalImageFile) {
      formData.append('image', finalImageFile);
    }

    if (pdfFile) {
      formData.append('pdf', pdfFile);
    }

    // Extract Google Drive File ID if link provided
    if (driveLink.trim()) {
      const link = driveLink.trim();
      let driveFileId = '';
      if (link.includes('id=')) {
        const match = link.match(/id=([a-zA-Z0-9_-]+)/);
        if (match) driveFileId = match[1];
      } else if (link.includes('/d/')) {
        const match = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) driveFileId = match[1];
      }
      if (driveFileId) formData.append('driveFileId', driveFileId);
    }

    onSave(logo.id, formData);
  };

  const handleSaveSubmit = (e) => {
    e.preventDefault();
    if (!logo) return;
    setErrorMsg('');

    if (!studentName.trim()) {
      setErrorMsg('Student Name cannot be empty.');
      return;
    }

    if (!studentEmail.trim()) {
      setErrorMsg('Email Address cannot be empty.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(studentEmail.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!studentDepartment.trim()) {
      setErrorMsg('Department selection cannot be empty.');
      return;
    }

    const cleanCode = editLogoCode.trim();
    if (!cleanCode) {
      setErrorMsg('Logo Code cannot be empty.');
      return;
    }

    if (cleanCode.length > 30) {
      setErrorMsg('Logo Code cannot exceed 30 characters.');
      return;
    }

    if (canvasRef.current && previewSrc) {
      // Export cropped canvas image as PNG Blob
      canvasRef.current.toBlob(
        (blob) => {
          if (blob) {
            const fileExt = selectedFile ? selectedFile.name.split('.').pop() : 'png';
            const fileName = `edited-logo-${Date.now()}.${fileExt}`;
            const croppedFile = new File([blob], fileName, { type: blob.type || 'image/png' });
            processAndSave(croppedFile);
          } else {
            processAndSave(selectedFile);
          }
        },
        'image/png',
        0.95
      );
    } else {
      processAndSave(selectedFile);
    }
  };

  if (!logo) return null;

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Entry & Participant Information"
    >
      <form onSubmit={handleSaveSubmit} className="space-y-5 text-sans">
        
        {/* Error Validation Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* SECTION 1: PARTICIPANT INFORMATION */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-pink-300 flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
            <User className="w-3.5 h-3.5 text-pink-400" /> Participant Details
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
                placeholder="Student full name"
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

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-pink-300 mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-pink-400" /> Logo Code <span className="text-pink-400">*</span>
              </label>
              <input
                type="text"
                required
                value={editLogoCode}
                onChange={(e) => {
                  setErrorMsg('');
                  setEditLogoCode(e.target.value);
                }}
                maxLength={30}
                placeholder="e.g. LOGO-1, LOGO-001"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-pink-300 font-mono font-bold focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Logo Title <span className="text-slate-500">(Optional)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. RSCOE Silver Jubilee Emblem"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Description / Tagline <span className="text-slate-500">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the logo design rationale..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            ></textarea>
          </div>
        </div>

        {/* SECTION 2: SUBMISSION ASSETS & FILES */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-cyan-400" /> Submission Files & Links
            </span>
            {logo.pdfUrl && (
              <a
                href={logo.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-indigo-300 hover:text-white flex items-center gap-1 font-semibold underline"
              >
                <FileText className="w-3 h-3 text-indigo-400" /> View Submission PDF
              </a>
            )}
          </h4>

          {/* Current Logo vs New Preview display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Box 1: Current Logo Preview */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Current Logo Preview
              </span>
              <div className="w-full h-44 bg-slate-950 border border-slate-800 rounded-xl p-2 flex items-center justify-center overflow-hidden relative">
                {logo.image ? (
                  <img
                    src={
                      logo.image
                        ? logo.image.startsWith('/api/public/logo-image/')
                          ? `${logo.image}${logo.image.includes('?') ? '&' : '?'}v=${logo.updatedAt ? new Date(logo.updatedAt).getTime() : Date.now()}`
                          : logo.image
                        : ''
                    }
                    alt={logo.title || 'Current Logo'}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 24 24" fill="none" stroke="%2364748b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
                    }}
                    className="max-h-full max-w-full object-contain rounded"
                  />
                ) : (
                  <div className="text-slate-500 text-xs flex flex-col items-center">
                    <ImageIcon className="w-8 h-8 mb-1" />
                    <span>No preview available</span>
                  </div>
                )}
              </div>
            </div>

            {/* Box 2: New Image Crop & Resize Live Canvas */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block flex items-center justify-between">
                <span>New Image Preview</span>
                {previewSrc && <span className="text-emerald-400 text-[10px]">Cropped / Resized</span>}
              </span>
              <div className="w-full h-44 bg-slate-950 border border-slate-800 rounded-xl p-2 flex items-center justify-center overflow-hidden relative">
                {previewSrc ? (
                  <div className="w-full h-full flex items-center justify-center overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      className="max-h-full max-w-full object-contain rounded shadow-lg border border-slate-800"
                    />
                  </div>
                ) : (
                  <div className="text-slate-500 text-xs flex flex-col items-center justify-center p-4 text-center">
                    <Upload className="w-8 h-8 mb-2 text-slate-600 animate-bounce" />
                    <span>No new image selected</span>
                    <span className="text-[10px] text-slate-600 mt-1">PNG, JPG, JPEG, WebP (Max 10 MB)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* File Pickers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Image File Picker Button */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/jpg, image/webp"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-3.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <Upload className="w-4 h-4 text-indigo-400" />
                <span>{selectedFile ? 'Change Selected Image' : 'Choose New Logo Image'}</span>
              </button>
            </div>

            {/* Replacement PDF File Picker Button */}
            <div>
              <input
                type="file"
                ref={pdfInputRef}
                onChange={handlePdfChange}
                accept="application/pdf,.pdf"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                className="w-full py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="line-clamp-1">
                  {pdfFile ? pdfFile.name : 'Replace Submission PDF'}
                </span>
              </button>
            </div>

          </div>

          {/* Interactive Crop & Resize Tools */}
          {previewSrc && (
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Crop & Resize Adjustments
                </span>
                <button
                  type="button"
                  onClick={handleResetCrop}
                  className="text-[10px] text-slate-400 hover:text-white underline"
                >
                  Reset Controls
                </button>
              </div>

              {/* Zoom Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1"><ZoomIn className="w-3 h-3" /> Zoom Scale:</span>
                  <span className="font-mono text-cyan-400">{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Rotation Controls */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1"><RotateCw className="w-3 h-3" /> Rotation:</span>
                  <span className="font-mono text-cyan-400">{rotation}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="90"
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Offset Adjustments */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[10px] text-slate-400 mb-1">Offset X: {offsetX}px</span>
                  <input
                    type="range"
                    min="-150"
                    max="150"
                    step="5"
                    value={offsetX}
                    onChange={(e) => setOffsetX(parseInt(e.target.value, 10))}
                    className="w-full h-1 bg-slate-800 rounded appearance-none accent-indigo-400"
                  />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 mb-1">Offset Y: {offsetY}px</span>
                  <input
                    type="range"
                    min="-150"
                    max="150"
                    step="5"
                    value={offsetY}
                    onChange={(e) => setOffsetY(parseInt(e.target.value, 10))}
                    className="w-full h-1 bg-slate-800 rounded appearance-none accent-indigo-400"
                  />
                </div>
              </div>

              {/* Aspect Ratio Selector */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Crop Ratio:</span>
                {['1:1', '4:3', '16:9'].map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${
                      aspectRatio === ratio
                        ? 'bg-pink-500/20 text-pink-300 border-pink-500'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
          )}

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
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>

      </form>
    </GlassModal>
  );
};

export default EditLogoModal;
