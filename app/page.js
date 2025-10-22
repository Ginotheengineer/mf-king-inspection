'use client';

import React, { useState, useEffect } from 'react';
import { Camera, CheckCircle2, XCircle, Send, ChevronRight, AlertTriangle, History, Trash2 } from 'lucide-react';

// NOTE: Place your MF King JPG in the public folder as '/mfking-logo.jpg' so the <img> below can load it.

export default function TruckInspectionApp() {
  const [currentStep, setCurrentStep] = useState('driver-info');

  // drivers are persisted to localStorage so new drivers persist between sessions
  const [drivers, setDrivers] = useState(() => {
    try {
      const raw = localStorage.getItem('mf_drivers');
      return raw ? JSON.parse(raw) : ['Gino Esposito', 'Harry Wheelans'];
    } catch (e) { return ['Gino Esposito', 'Harry Wheelans']; }
  });
  const [newDriverName, setNewDriverName] = useState('');

  // Set NZ date automatically and remove date input from first page per request
  const getNZDateISO = () => {
    // New Zealand time zone (Pacific/Auckland). Use Intl to get local time in NZ and format to yyyy-mm-dd
    try {
      const nzNow = new Date(new Date().toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland' }));
      return nzNow.toISOString().split('T')[0];
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  };

  const [driverInfo, setDriverInfo] = useState({ name: '', truckNumber: '', date: getNZDateISO() });

  // photos now stores arrays of base64 strings per item id (allow multiple photos per damage)
  const [photos, setPhotos] = useState({});
  const [inspectionData, setInspectionData] = useState({});
  const [notes, setNotes] = useState({});
  const [selectedWorkshops, setSelectedWorkshops] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [savedInspections, setSavedInspections] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [viewingInspection, setViewingInspection] = useState(null);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [workshops, setWorkshops] = useState([]);
  const [showAddWorkshop, setShowAddWorkshop] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState(null);
  const [workshopToDelete, setWorkshopToDelete] = useState(null);
  const [newWorkshop, setNewWorkshop] = useState({ name: '', email: '' });
  const [db, setDb] = useState(null);

  // added fleet manager constant
  const FLEET_MANAGER_EMAIL = 'esposito.gino11@gmail.com';

  const inspectionItems = [
    { id: 'tires', category: 'Tires & Wheels', question: 'Are all tires properly inflated and free from damage?', critical: true },
    { id: 'lights', category: 'Lighting', question: 'Are all lights (headlights, taillights, indicators) working?', critical: true },
    { id: 'brakes', category: 'Brakes', question: 'Do brakes respond properly with no unusual sounds?', critical: true },
    { id: 'mirrors', category: 'Mirrors', question: 'Are all mirrors intact and properly adjusted?', critical: false },
    { id: 'fluid-leaks', category: 'Fluids', question: 'Are there any fluid leaks under the vehicle?', critical: true },
    { id: 'engine', category: 'Engine', question: 'Does the engine start smoothly without warning lights?', critical: true },
    { id: 'body', category: 'Body & Frame', question: 'Is the truck body free from new dents, scratches, or damage?', critical: false },
    { id: 'cargo', category: 'Cargo Area', question: 'Is the cargo area clean and secure?', critical: false },
    { id: 'horn', category: 'Safety Equipment', question: 'Is the horn functioning properly?', critical: true },
    { id: 'wipers', category: 'Wipers & Washers', question: 'Are wipers and washers working effectively?', critical: false }
  ];

  useEffect(() => {
    const initDB = () => {
      const request = indexedDB.open('TruckInspectionDB', 2);

      request.onerror = () => { console.error('Database failed to open'); };

      request.onsuccess = () => {
        const database = request.result;
        setDb(database);
        loadInspections(database);
        loadWorkshops(database);
      };

      request.onupgradeneeded = (e) => {
        const database = e.target.result;

        if (!database.objectStoreNames.contains('inspections')) {
          const objectStore = database.createObjectStore('inspections', { keyPath: 'id', autoIncrement: true });
          objectStore.createIndex('date', 'date', { unique: false });
          objectStore.createIndex('truckNumber', 'truckNumber', { unique: false });
        }

        if (!database.objectStoreNames.contains('workshops')) {
          const workshopStore = database.createObjectStore('workshops', { keyPath: 'id', autoIncrement: true });
          workshopStore.createIndex('name', 'name', { unique: false });

          // Add default workshop
          const defaultWorkshop = { name: 'MF King Engineering Ltd', email: 'gino@mfking.co.nz' };
          workshopStore.add(defaultWorkshop);
        }
      };
    };

    initDB();
  }, []);

  useEffect(() => {
    localStorage.setItem('mf_drivers', JSON.stringify(drivers));
  }, [drivers]);

  const loadInspections = (database) => {
    const transaction = database.transaction(['inspections'], 'readonly');
    const objectStore = transaction.objectStore('inspections');
    const request = objectStore.getAll();

    request.onsuccess = () => {
      setSavedInspections(request.result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    };
  };

  const loadWorkshops = (database) => {
    const transaction = database.transaction(['workshops'], 'readonly');
    const objectStore = transaction.objectStore('workshops');
    const request = objectStore.getAll();

    request.onsuccess = () => {
      setWorkshops(request.result);
    };
  };

  const saveWorkshop = (workshop) => {
    if (!db) return;

    const transaction = db.transaction(['workshops'], 'readwrite');
    const objectStore = transaction.objectStore('workshops');
    const request = objectStore.add(workshop);

    request.onsuccess = () => {
      loadWorkshops(db);
      setShowAddWorkshop(false);
      setNewWorkshop({ name: '', email: '' });
      alert('✅ Workshop added successfully!');
    };

    request.onerror = () => { alert('❌ Failed to add workshop. Please try again.'); };
  };

  const deleteWorkshop = (workshopToDelete) => {
    if (!db) { alert('❌ Database not ready. Please try again.'); return; }

    if (workshops.length === 1) { alert('❌ Cannot delete the last workshop. At least one workshop must remain.'); setEditingWorkshop(null); return; }

    try {
      const transaction = db.transaction(['workshops'], 'readwrite');
      const objectStore = transaction.objectStore('workshops');
      const request = objectStore.delete(workshopToDelete.id);

      request.onsuccess = () => {
        setSelectedWorkshops(prev => prev.filter(id => id !== workshopToDelete.id));
        setEditingWorkshop(null);
        setWorkshopToDelete(null);
        loadWorkshops(db);
        alert('✅ Workshop deleted successfully!');
      };

      request.onerror = (error) => { console.error('Delete failed:', error); alert('❌ Failed to delete workshop. Please try again.'); };
    } catch (error) { console.error('Delete error:', error); alert('❌ Failed to delete workshop. Please try again.'); }
  };

  const updateWorkshop = (id, updatedData) => {
    if (!db) return;

    const transaction = db.transaction(['workshops'], 'readwrite');
    const objectStore = transaction.objectStore('workshops');

    const getRequest = objectStore.get(id);

    getRequest.onsuccess = () => {
      const workshop = getRequest.result;
      workshop.name = updatedData.name;
      workshop.email = updatedData.email;

      const updateRequest = objectStore.put(workshop);

      updateRequest.onsuccess = () => { loadWorkshops(db); setEditingWorkshop(null); alert('✅ Workshop updated successfully!'); };
    };
  };

  const toggleWorkshopSelection = (workshopId) => {
    setSelectedWorkshops(prev => {
      if (prev.includes(workshopId)) return prev.filter(id => id !== workshopId);
      else return [...prev, workshopId];
    });
  };

  const saveInspection = (inspectionRecord) => {
    if (!db) return;

    const transaction = db.transaction(['inspections'], 'readwrite');
    const objectStore = transaction.objectStore('inspections');
    const request = objectStore.add(inspectionRecord);

    request.onsuccess = () => { loadInspections(db); };
  };

  const deleteInspection = (id) => {
    if (!db) return;

    const transaction = db.transaction(['inspections'], 'readwrite');
    const objectStore = transaction.objectStore('inspections');
    const request = objectStore.delete(id);

    request.onsuccess = () => { loadInspections(db); };
  };

  const handleInspectionAnswer = (itemId, value) => {
    setInspectionData(prev => ({ ...prev, [itemId]: value }));
    if (value === 'pass') {
      setNotes(prev => { const n = { ...prev }; delete n[itemId]; return n; });
      setPhotos(prev => { const p = { ...prev }; delete p[itemId]; return p; });
    }
  };

  const handleNoteChange = (itemId, note) => { setNotes(prev => ({ ...prev, [itemId]: note })); };

  // Resize image before uploading to reduce size and speed up sending
  const resizeBase64Image = (base64Str, maxWidth = 1200, quality = 0.7) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const resized = canvas.toDataURL('image/jpeg', quality);
        resolve(resized);
      };
      img.src = base64Str;
    });
  };

  // Handle multiple files (upload or camera). Store as array of base64 strings per item id
  const handlePhotoCapture = async (itemId, event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const readPromises = files.map(file => new Promise((res) => {
      const reader = new FileReader();
      reader.onloadend = () => res(reader.result);
      reader.readAsDataURL(file);
    }));

    const base64s = await Promise.all(readPromises);

    // resize each image (to keep email smaller and faster)
    const resized = await Promise.all(base64s.map(b => resizeBase64Image(b, 1200, 0.7)));

    setPhotos(prev => ({ ...prev, [itemId]: [...(prev[itemId] || []), ...resized] }));
  };

  const hasDamages = () => Object.values(inspectionData).some(value => value === 'fail');

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const generateEmailSummary = (uploadedPhotoUrls=[]) => {
    const failedItems = inspectionItems.filter(item => inspectionData[item.id] === 'fail');
    const selectedWorkshopsList = workshops.filter(w => selectedWorkshops.includes(w.id));
    const workshopNames = selectedWorkshopsList.map(w => w.name).join(', ');
    const workshopEmails = selectedWorkshopsList.map(w => w.email).join(', ');

    // include fleet manager in recipients
    const toRecipients = [ ...selectedWorkshopsList.map(w => w.email), FLEET_MANAGER_EMAIL ].filter(Boolean).join(',');

    return {
      to: toRecipients,
      subject: `Vehicle Inspection Report - REGO: ${driverInfo.truckNumber}`,
      body: `VEHICLE INSPECTION DAMAGE REPORT\n\nDriver: ${driverInfo.name}\nVehicle Registration: ${driverInfo.truckNumber}\nInspection Date: ${formatDate(driverInfo.date)}\nWorkshop(s): ${workshopNames || 'Not selected'}\n\nITEMS REQUIRING ATTENTION:\n${failedItems.map((item, i) => `\n${i + 1}. ${item.category} - ${item.question}\n   Status: FAILED ${item.critical ? '⚠️ CRITICAL' : ''}\n   Notes: ${notes[item.id] || 'No notes provided'}\n   Photo: ${photos[item.id] ? 'Attached' : 'No photo provided'}`).join('\n')}\n\nTotal Issues: ${failedItems.length}\nCritical Issues: ${failedItems.filter(i => i.critical).length}\n\nPlease contact the driver to arrange inspection and repairs.\n\n---\nThis is an automated report from the MF King Vehicle Inspection System.`
    };
  };

  // Upload to Imgur (same approach) but we upload resized images which greatly reduces upload time
  const uploadImageToImgur = async (base64Image) => {
    try {
      const base64Data = base64Image.split(',')[1];
      const response = await fetch('https://api.imgur.com/3/image', {
        method: 'POST',
        headers: { 'Authorization': 'Client-ID 546c25a59c58ad7', 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Data, type: 'base64' })
      });
      const data = await response.json();
      if (data.success) return data.data.link;
      return null;
    } catch (error) { console.error('Image upload failed:', error); return null; }
  };

  // sendEmail now handles multiple photos per item, compresses client-side and uploads resized images
  const sendEmail = async () => {
    const failedItems = inspectionItems.filter(item => inspectionData[item.id] === 'fail');
    const selectedWorkshopsList = workshops.filter(w => selectedWorkshops.includes(w.id));

    try {
      alert('⏳ Uploading photos and sending email... (images are resized to reduce upload time)');

      // For each failed item, upload ALL photos for that item (if any)
      const failedItemsWithPhotos = await Promise.all(failedItems.map(async (item) => {
        let photoUrls = [];
        const itemPhotos = photos[item.id] || [];
        if (itemPhotos.length > 0) {
          // upload in parallel
          const uploadPromises = itemPhotos.map(p => uploadImageToImgur(p));
          const urls = await Promise.all(uploadPromises);
          photoUrls = urls.filter(Boolean);
        }
        return { ...item, photoUrls };
      }));

      const formattedItems = failedItemsWithPhotos.map((item, i) => {
        const photoText = item.photoUrls && item.photoUrls.length > 0 ? item.photoUrls.join('\n') : 'No photos';
        return `${i + 1}. ${item.category} - ${item.question} ${item.critical ? '⚠️ CRITICAL' : ''}\n   Notes: ${notes[item.id] || 'No notes'}\n   Photo(s): ${photoText}`;
      }).join('\n\n');

      // Build photo gallery HTML with constrained widths so email clients show manageable sizes
      const photoGalleryHTML = failedItemsWithPhotos
        .flatMap(item => (item.photoUrls || []).map(url => ({ category: item.category, question: item.question, url })))
        .map(p => `
          <div style="margin-bottom:12px;padding:10px;border-radius:6px;border:1px solid #e5e7eb;background:#fafafa;">
            <p style="margin:0 0 6px 0;font-size:13px;color:#374151;">${p.category} - ${p.question}</p>
            <img src="${p.url}" alt="${p.category} damage" style="max-width:400px;width:100%;height:auto;border-radius:4px;border:1px solid #ddd;" />
          </div>
        `).join('');

      const emailData = generateEmailSummary();

      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: 'service_2kg7kuq',
          template_id: 'template_6g7rug8',
          user_id: 'nHeIEyrRMqXKXV_-e',
          template_params: {
            to_email: emailData.to,
            subject: emailData.subject,
            driver_name: driverInfo.name,
            truck_number: driverInfo.truckNumber,
            inspection_date: formatDate(driverInfo.date),
            workshop_name: selectedWorkshopsList.map(w => w.name).join(', '),
            failed_items: formattedItems,
            photo_gallery: photoGalleryHTML,
            total_issues: failedItems.length,
            critical_issues: failedItems.filter(i => i.critical).length,
            fleet_manager_email: FLEET_MANAGER_EMAIL
          }
        })
      });

      if (response.ok) alert('✅ Email sent successfully to ' + emailData.to + '\nPhotos uploaded and inserted into the email.');
      else throw new Error('Email sending failed');
    } catch (error) { alert('❌ Failed to send email. Please check your internet connection or contact support.'); console.error('Email error:', error); }
  };

  const completeInspection = () => {
    const failedItems = inspectionItems.filter(item => inspectionData[item.id] === 'fail');
    const selectedWorkshopsList = workshops.filter(w => selectedWorkshops.includes(w.id));

    const inspectionRecord = {
      driverInfo,
      inspectionData,
      photos,
      notes,
      selectedWorkshops,
      hasDamages: hasDamages(),
      timestamp: new Date().toISOString(),
      date: driverInfo.date,
      truckNumber: driverInfo.truckNumber,
      reportSummary: {
        failedItems: failedItems.map(item => ({ id: item.id, category: item.category, question: item.question, critical: item.critical, note: notes[item.id] || 'No notes', photos: photos[item.id] || [] })),
        workshopNames: selectedWorkshopsList.map(w => w.name).join(', '),
        workshopEmails: selectedWorkshopsList.map(w => w.email).join(', ')
      }
    };

    saveInspection(inspectionRecord);
    setShowSummary(true);
  };

  // --- Rendering functions ---
  const renderDriverInfo = () => (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">Driver Information</h2>

      <div className="flex items-center gap-4 mb-2">
        {/* Logo: user should place mfking-logo.jpg in the public folder */}
        <img src="/mfking-logo.jpg" alt="MF King Engineering" className="h-16 object-contain" onError={(e)=>{e.currentTarget.style.display='none'}} />
        <div>
          <div className="font-bold text-3xl text-red-600">MF-KING</div>
          <div className="text-xs tracking-[0.3em] text-gray-700 font-light">ENGINEERING LTD.</div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-base font-medium text-gray-700 mb-2">Driver Name</label>
          <div className="flex gap-2">
            <select
              value={driverInfo.name}
              onChange={(e) => setDriverInfo(prev => ({ ...prev, name: e.target.value }))}
              className="flex-1 px-4 py-4 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
            >
              <option value="">Select driver</option>
              {drivers.map((driver) => (<option key={driver} value={driver}>{driver}</option>))}
            </select>
            <input
              type="text"
              placeholder="Add new driver"
              value={newDriverName}
              onChange={(e) => setNewDriverName(e.target.value)}
              className="px-3 py-3 border-2 border-gray-300 rounded-lg"
            />
            <button
              onClick={() => {
                const name = newDriverName.trim();
                if (!name) return alert('Enter a name');
                if (drivers.includes(name)) { alert('Driver already exists'); return; }
                setDrivers(prev => [...prev, name]);
                setNewDriverName('');
                setDriverInfo(prev => ({ ...prev, name }));
                alert('✅ Driver added');
              }}
              className="bg-green-600 text-white px-4 rounded-lg"
            >Add</button>
          </div>
        </div>

        <div>
          <label className="block text-base font-medium text-gray-700 mb-2">Vehicle Registration Number</label>
          <input
            type="text"
            value={driverInfo.truckNumber}
            onChange={(e) => setDriverInfo(prev => ({ ...prev, truckNumber: e.target.value.toUpperCase() }))}
            className="w-full px-4 py-4 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 uppercase"
            placeholder="e.g., ABC123"
          />
        </div>

        {/* Date removed from first page per request. It still exists in data (auto-set to NZ today). */}

      </div>

      <button
        onClick={() => setCurrentStep('inspection')}
        disabled={!driverInfo.name || !driverInfo.truckNumber}
        className="w-full mt-6 bg-red-600 text-white py-4 text-lg rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-red-700 active:bg-red-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        Start Inspection <ChevronRight size={24} />
      </button>

      {savedInspections.length > 0 && (
        <button onClick={() => setShowHistory(true)} className="w-full mt-3 bg-gray-600 text-white py-4 text-lg rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-gray-700 active:bg-gray-800 transition-colors">
          <History size={22} /> View History ({savedInspections.length})
        </button>
      )}
    </div>
  );

  const renderInspection = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4 sticky top-0 bg-white py-3 -mx-4 px-4 sm:-mx-6 sm:px-6 z-10 border-b-2 border-gray-100 shadow-sm">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Vehicle Inspection</h2>
        <span className="text-base sm:text-lg font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">{Object.keys(inspectionData).length}/{inspectionItems.length}</span>
      </div>

      <div className="space-y-4">
        {inspectionItems.map((item) => (
          <div key={item.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2 mb-2">{item.category}{item.critical && <AlertTriangle size={20} className="text-red-600" />}</h3>
                <p className="text-base text-gray-600 leading-relaxed">{item.question}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => handleInspectionAnswer(item.id, 'pass')} className={`flex-1 py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-base transition-all ${inspectionData[item.id] === 'pass' ? 'bg-green-600 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'}`}><CheckCircle2 size={24} /> Pass</button>
              <button onClick={() => handleInspectionAnswer(item.id, 'fail')} className={`flex-1 py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-base transition-all ${inspectionData[item.id] === 'fail' ? 'bg-red-600 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'}`}><XCircle size={24} /> Fail</button>
            </div>

            {inspectionData[item.id] === 'fail' && (
              <div className="mt-4 border-t-2 pt-4 bg-red-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-xl">
                <label className="block text-base font-bold text-gray-700 mb-2">Describe the problem</label>
                <textarea value={notes[item.id] || ''} onChange={(e) => handleNoteChange(item.id, e.target.value)} placeholder="Enter details about the damage or issue..." className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[100px] mb-4" />

                <label className="block text-base font-bold text-gray-700 mb-3 flex items-center gap-2"><Camera size={20} /> Add Photo(s) of Damage</label>

                <div className="flex gap-2 mb-3">
                  {/* Upload (multiple) */}
                  <label className="flex-1 bg-gray-100 text-gray-800 py-3 px-4 rounded-lg font-bold text-center flex items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-gray-300">
                    Upload Photos
                    <input type="file" accept="image/*" multiple onChange={(e) => handlePhotoCapture(item.id, e)} className="hidden" />
                  </label>

                  {/* Take Photo (mobile camera) */}
                  <label className="bg-red-600 text-white py-3 px-4 rounded-lg font-bold text-center flex items-center justify-center gap-2 cursor-pointer">
                    Take Photo
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => handlePhotoCapture(item.id, e)} className="hidden" />
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  {(photos[item.id] || []).map((p, idx) => (
                    <div key={idx} className="w-24 h-24 rounded-lg overflow-hidden border-2 border-red-200 relative cursor-pointer" onClick={() => setViewingPhoto(p)}>
                      <img src={p} alt={`damage-${idx}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={() => hasDamages() ? setCurrentStep('workshop') : completeInspection()} disabled={Object.keys(inspectionData).length !== inspectionItems.length} className="w-full mt-6 bg-red-600 text-white py-4 text-lg rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 active:bg-red-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg">{hasDamages() ? 'Select Workshop' : 'Complete Inspection'} <ChevronRight size={24} /></button>
    </div>
  );

  const renderWorkshopSelection = () => (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">Select Workshop(s)</h2>
      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4"><p className="text-red-700 font-bold text-base">⚠️ Damages detected - Select one or more workshops</p></div>

      <div className="space-y-3">
        {workshops.map((workshop) => (
          <div key={workshop.id} className="relative">
            {editingWorkshop?.id === workshop.id ? (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-gray-800">Edit Workshop</h3>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Workshop Name</label><input type="text" value={editingWorkshop.name} onChange={(e) => setEditingWorkshop(prev => ({ ...prev, name: e.target.value }))} className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label><input type="email" value={editingWorkshop.email} onChange={(e) => setEditingWorkshop(prev => ({ ...prev, email: e.target.value }))} className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" /></div>
                <div className="flex gap-2">
                  <button onClick={() => { if (editingWorkshop.name && editingWorkshop.email) updateWorkshop(editingWorkshop.id, { name: editingWorkshop.name, email: editingWorkshop.email }); else alert('Please fill in both workshop name and email'); }} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 active:bg-blue-800">Save Changes</button>
                  <button onClick={() => setWorkshopToDelete(editingWorkshop)} className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 active:bg-red-800">Delete</button>
                  <button onClick={() => setEditingWorkshop(null)} className="px-4 bg-gray-600 text-white py-2 rounded-lg font-semibold hover:bg-gray-700 active:bg-gray-800">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <button onClick={() => toggleWorkshopSelection(workshop.id)} className={`w-full p-5 pr-20 rounded-xl border-2 text-left transition-all ${selectedWorkshops.includes(workshop.id) ? 'border-green-600 bg-green-50 shadow-lg' : 'border-gray-300 hover:border-gray-400 active:bg-gray-50'}`}>
                  <h3 className="font-bold text-lg text-gray-800">{workshop.name}</h3>
                  {/* removed email from visible button as requested */}
                </button>
                {!editingWorkshop && (
                  <button onClick={(e) => { e.stopPropagation(); setEditingWorkshop({ id: workshop.id, name: workshop.name, email: workshop.email }); }} className="absolute top-3 right-3 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-blue-700 active:bg-blue-800">Edit</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {!showAddWorkshop && !editingWorkshop ? (
        <button onClick={() => setShowAddWorkshop(true)} className="w-full py-3 border-2 border-dashed border-gray-400 rounded-xl text-gray-600 font-semibold hover:border-gray-600 hover:text-gray-800 transition-colors">+ Add Workshop</button>
      ) : showAddWorkshop ? (
        <div className="bg-gray-50 border-2 border-gray-300 rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-gray-800">Add New Workshop</h3>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Workshop Name</label><input type="text" value={newWorkshop.name} onChange={(e) => setNewWorkshop(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Auckland Workshop" className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label><input type="email" value={newWorkshop.email} onChange={(e) => setNewWorkshop(prev => ({ ...prev, email: e.target.value }))} placeholder="e.g., workshop@example.com" className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" /></div>
          <div className="flex gap-2">
            <button onClick={() => { if (newWorkshop.name && newWorkshop.email) { saveWorkshop(newWorkshop); } else { alert('Please fill in both workshop name and email'); } }} disabled={!newWorkshop.name || !newWorkshop.email} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 active:bg-green-800 disabled:bg-gray-400 disabled:cursor-not-allowed">Save Workshop</button>
            <button onClick={() => { setShowAddWorkshop(false); setNewWorkshop({ name: '', email: '' }); }} className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 active:bg-gray-800">Cancel</button>
          </div>
        </div>
      ) : null}

      {selectedWorkshops.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3"><p className="text-blue-800 font-semibold text-sm">✓ {selectedWorkshops.length} workshop{selectedWorkshops.length > 1 ? 's' : ''} selected</p></div>
      )}

      <button onClick={completeInspection} disabled={selectedWorkshops.length === 0} className="w-full mt-6 bg-red-600 text-white py-4 text-lg rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 active:bg-red-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg">Generate Report <ChevronRight size={24} /></button>
    </div>
  );

  const renderSummary = () => {
    const failedItems = inspectionItems.filter(item => inspectionData[item.id] === 'fail');

    return (
      <div className="space-y-5">
        <h2 className="text-2xl font-bold text-gray-800">Inspection Summary</h2>

        {hasDamages() ? (
          <div className="space-y-4">
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4"><h3 className="font-bold text-red-800 text-xl mb-2">Damages Detected</h3><p className="text-red-700 text-base">{failedItems.length} issue(s) found • {failedItems.filter(i => i.critical).length} critical</p></div>

            <div className="bg-white border-2 border-gray-300 rounded-xl p-4">
              <h4 className="font-bold text-gray-800 text-lg mb-3">Report Summary</h4>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm"><span className="text-gray-600 font-medium">Driver:</span><span className="text-gray-800 font-bold">{driverInfo.name}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600 font-medium">Vehicle Registration:</span><span className="text-gray-800 font-bold">{driverInfo.truckNumber}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600 font-medium">Date:</span><span className="text-gray-800 font-bold">{formatDate(driverInfo.date)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600 font-medium">Workshop(s):</span><span className="text-gray-800 font-bold">{workshops.filter(w => selectedWorkshops.includes(w.id)).map(w => w.name).join(', ')}</span></div>
              </div>

              <div className="border-t-2 border-gray-200 pt-3">
                <h5 className="font-bold text-gray-800 mb-2">Failed Items:</h5>
                <ul className="space-y-2">
                  {failedItems.map((item, index) => (
                    <li key={item.id} className="text-sm bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-red-600">{index + 1}.</span>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{item.category}</p>
                          <p className="text-gray-600 text-xs mt-1">{item.question}</p>
                          {notes[item.id] && (<p className="text-gray-700 text-sm mt-2 bg-white p-2 rounded border border-gray-300"><span className="font-semibold">Notes:</span> {notes[item.id]}</p>)}
                          {item.critical && (<span className="inline-block mt-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">⚠️ CRITICAL</span>)}
                          {(photos[item.id] || []).length > 0 && (
                            <button onClick={() => setViewingPhoto((photos[item.id] || [])[0])} className="inline-block mt-2 ml-2 text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 active:bg-blue-800 font-semibold">📷 View Photo</button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button onClick={sendEmail} className="w-full bg-red-600 text-white py-4 text-lg rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 active:bg-red-800 transition-colors shadow-lg"><Send size={24} /> Send Report</button>
          </div>
        ) : (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5"><h3 className="font-bold text-green-800 text-xl mb-2">✓ All Clear!</h3><p className="text-green-700 text-base">No damages detected. Vehicle is ready for operation.</p></div>
        )}

        <button onClick={() => { setCurrentStep('driver-info'); setInspectionData({}); setPhotos({}); setNotes({}); setSelectedWorkshops([]); setShowSummary(false); }} className="w-full bg-gray-600 text-white py-4 text-lg rounded-xl font-bold hover:bg-gray-700 active:bg-gray-800 transition-colors">Start New Inspection</button>
      </div>
    );
  };

  const renderHistory = () => {
    if (viewingInspection) {
      const inspection = viewingInspection;
      const failedItems = inspection.reportSummary?.failedItems || [];

      return (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold text-gray-800">Inspection Report</h2><button onClick={() => setViewingInspection(null)} className="text-red-600 hover:text-red-800 font-bold">✕ Close</button></div>

          <div className="bg-white border-2 border-gray-300 rounded-xl p-4">
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm"><span className="text-gray-600 font-medium">Driver:</span><span className="text-gray-800 font-bold">{inspection.driverInfo.name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600 font-medium">Vehicle Registration:</span><span className="text-gray-800 font-bold">{inspection.truckNumber}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600 font-medium">Date:</span><span className="text-gray-800 font-bold">{formatDate(inspection.date)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600 font-medium">Workshop(s):</span><span className="text-gray-800 font-bold">{inspection.reportSummary?.workshopNames}</span></div>
            </div>

            {inspection.hasDamages ? (
              <>
                <div className="border-t-2 border-gray-200 pt-3"><h5 className="font-bold text-gray-800 mb-2">Failed Items ({failedItems.length}):</h5>
                  <ul className="space-y-2">
                    {failedItems.map((item, index) => (
                      <li key={item.id} className="text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                        <div className="flex items-start gap-2">
                          <span className="font-bold text-red-600">{index + 1}.</span>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800">{item.category}</p>
                            <p className="text-gray-600 text-xs mt-1">{item.question}</p>
                            {item.note && item.note !== 'No notes' && (<p className="text-gray-700 text-sm mt-2 bg-white p-2 rounded border border-gray-300"><span className="font-semibold">Notes:</span> {item.note}</p>)}
                            {item.critical && (<span className="inline-block mt-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">⚠️ CRITICAL</span>)}
                            {item.photos && item.photos.length > 0 && (<span className="inline-block mt-2 ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">📷 Photo attached</span>)}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-3"><p className="text-green-800 font-semibold">✓ All Clear - No issues detected</p></div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-gray-800">Inspection History</h2><button onClick={() => setShowHistory(false)} className="text-gray-600 hover:text-gray-800 font-medium">Close</button></div>

        {savedInspections.length === 0 ? (<p className="text-gray-600 text-center py-8">No inspections saved yet.</p>) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {savedInspections.map((inspection) => {
              const failedCount = Object.values(inspection.inspectionData).filter(v => v === 'fail').length;

              return (
                <div key={inspection.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">Vehicle #{inspection.truckNumber}</h3>
                      <p className="text-sm text-gray-600">{inspection.driverInfo.name}</p>
                      <p className="text-xs text-gray-500">{formatDate(inspection.date)} • {new Date(inspection.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <button onClick={() => deleteInspection(inspection.id)} className="text-red-600 hover:text-red-800 p-2"><Trash2 size={18} /></button>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    {inspection.hasDamages ? (<span className="inline-block bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded">⚠️ {failedCount} Issue(s) Reported</span>) : (<span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">✓ All Clear</span>)}
                    <button onClick={() => setViewingInspection(inspection)} className="ml-auto text-blue-600 hover:text-blue-800 text-sm font-semibold">View Report →</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-6">
      <div className="max-w-3xl mx-auto px-3 sm:px-4">
        <div className="bg-white shadow-lg mb-4">
          <div className="flex flex-col items-center py-4 px-3">
            <h1 className="text-xl sm:text-2xl font-bold text-center text-gray-800">Vehicle Pre-Start Inspection</h1>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
          {showHistory ? renderHistory() : (
            <>
              {!showSummary && currentStep === 'driver-info' && renderDriverInfo()}
              {!showSummary && currentStep === 'inspection' && renderInspection()}
              {!showSummary && currentStep === 'workshop' && renderWorkshopSelection()}
              {showSummary && renderSummary()}
            </>
          )}
        </div>
      </div>

      {/* Photo Viewer Modal */}
      {viewingPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4" onClick={() => setViewingPhoto(null)}>
          <div className="relative max-w-4xl max-h-full">
            <button onClick={() => setViewingPhoto(null)} className="absolute top-4 right-4 bg-white text-gray-800 rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl hover:bg-gray-200 z-10">✕</button>
            <img src={viewingPhoto} alt="Damage photo" className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {workshopToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setWorkshopToDelete(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 mb-3">Delete Workshop?</h3>
            <p className="text-gray-700 mb-2">Are you sure you want to delete:</p>
            <p className="font-semibold text-gray-900 mb-6">"{workshopToDelete.name}"</p>
            <div className="flex gap-3">
              <button onClick={() => { deleteWorkshop(workshopToDelete); }} className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 active:bg-red-800">Delete</button>
              <button onClick={() => setWorkshopToDelete(null)} className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 active:bg-gray-800">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
