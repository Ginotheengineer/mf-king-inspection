'use client';

import React, { useState, useEffect } from 'react';
import { Camera, CheckCircle2, XCircle, Send, ChevronRight, AlertTriangle, History, Trash2, Truck, User } from 'lucide-react';
import {
  saveInspectionToFirebase,
  loadInspectionsFromFirebase,
  deleteInspectionFromFirebase,
  subscribeToInspections,
  saveDriverToFirebase,
  loadDriversFromFirebase,
  deleteDriverFromFirebase,
  subscribeToDrivers,
  saveWorkshopToFirebase,
  updateWorkshopInFirebase,
  loadWorkshopsFromFirebase,
  deleteWorkshopFromFirebase,
  subscribeToWorkshops,
  initializeDefaultWorkshop,
  initializeDefaultDrivers
} from './firebaseHelpers';

export default function TruckInspectionApp() {
  const [currentStep, setCurrentStep] = useState('driver-info');
  
  // Get New Zealand date in YYYY-MM-DD format for storage
  const getNZDate = () => {
    const nzDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Pacific/Auckland" }));
    const year = nzDate.getFullYear();
    const month = String(nzDate.getMonth() + 1).padStart(2, '0');
    const day = String(nzDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [driverInfo, setDriverInfo] = useState({ name: '', truckNumber: '', date: getNZDate() });
  const [inspectionData, setInspectionData] = useState({});
  const [photos, setPhotos] = useState({}); // Changed to store arrays of photos
  const [notes, setNotes] = useState({});
  const [selectedWorkshops, setSelectedWorkshops] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [savedInspections, setSavedInspections] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [viewingInspection, setViewingInspection] = useState(null);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [viewingPhotoIndex, setViewingPhotoIndex] = useState(0);
  const [viewingPhotoArray, setViewingPhotoArray] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [showAddWorkshop, setShowAddWorkshop] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState(null);
  const [workshopToDelete, setWorkshopToDelete] = useState(null);
  const [newWorkshop, setNewWorkshop] = useState({ name: '', email: '' });
  const [logoError, setLogoError] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showManageDrivers, setShowManageDrivers] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [driverToDelete, setDriverToDelete] = useState(null);
  const [isCompletingInspection, setIsCompletingInspection] = useState(false);
  const [historySearchTruck, setHistorySearchTruck] = useState('');
  const [historySearchDriver, setHistorySearchDriver] = useState('');


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
    // Initialize Firebase data on component mount
    const initializeFirebase = async () => {
      try {
        console.log('🔥 Initializing Firebase...');
        
        // Initialize default data if collections are empty
        await initializeDefaultWorkshop();
        await initializeDefaultDrivers();
        
        // Load initial data from Firebase
        const loadedInspections = await loadInspectionsFromFirebase();
        setSavedInspections(loadedInspections);
        
        const loadedWorkshops = await loadWorkshopsFromFirebase();
        setWorkshops(loadedWorkshops);
        
        const loadedDrivers = await loadDriversFromFirebase();
        setDrivers(loadedDrivers);
        
        console.log('✅ Firebase initialized successfully!');
        console.log(`   📋 Loaded ${loadedInspections.length} inspections`);
        console.log(`   👤 Loaded ${loadedDrivers.length} drivers`);
        console.log(`   🔧 Loaded ${loadedWorkshops.length} workshops`);
      } catch (error) {
        console.error('❌ Error initializing Firebase:', error);
        alert('Failed to connect to database. Please check your internet connection and Firebase configuration.');
      }
    };
    
    initializeFirebase();
    
    // Set up real-time listeners for automatic data synchronization
    const unsubscribeInspections = subscribeToInspections((inspections) => {
      console.log('🔄 Real-time update: Inspections changed');
      setSavedInspections(inspections);
    });
    
    const unsubscribeDrivers = subscribeToDrivers((drivers) => {
      console.log('🔄 Real-time update: Drivers changed');
      setDrivers(drivers);
    });
    
    const unsubscribeWorkshops = subscribeToWorkshops((workshops) => {
      console.log('🔄 Real-time update: Workshops changed');
      setWorkshops(workshops);
    });
    
    // Cleanup function - unsubscribe from listeners when component unmounts
    return () => {
      console.log('🧹 Cleaning up Firebase listeners');
      unsubscribeInspections();
      unsubscribeDrivers();
      unsubscribeWorkshops();
    };
  }, []);

  // Auto-redirect after 5 seconds when inspection is complete
  useEffect(() => {
    if (showSummary) {
      // Redirect if no damages (All Clear) or if email has been sent
      if (!hasDamages() || emailSent) {
        setRedirectCountdown(5);
        
        const countdownInterval = setInterval(() => {
          setRedirectCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        const timer = setTimeout(() => {
          // Reset to start page
          setCurrentStep('driver-info');
          setDriverInfo({ name: '', truckNumber: '', date: getNZDate() });
          setInspectionData({});
          setPhotos({});
          setNotes({});
          setSelectedWorkshops([]);
          setShowSummary(false);
          setEmailSent(false);
          setIsSendingEmail(false);
          setRedirectCountdown(null);
        }, 5000);

        return () => {
          clearTimeout(timer);
          clearInterval(countdownInterval);
        };
      }
    } else {
      setRedirectCountdown(null);
    }
  }, [showSummary, emailSent]);

  const saveDriver = async (driverName) => {
    try {
      await saveDriverToFirebase(driverName);
      console.log('✅ Driver saved successfully:', driverName);
    } catch (error) {
      console.error('❌ Error saving driver:', error);
      alert('❌ Failed to add driver. Please try again.');
    }
  };

  const deleteDriver = async (driverId) => {
    console.log('Attempting to delete driver:', driverId);
    
    if (drivers.length === 1) {
      alert('❌ Cannot delete the last driver. At least one driver must remain.');
      return;
    }

    try {
      await deleteDriverFromFirebase(driverId);
      console.log('✅ Driver deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting driver:', error);
      alert('❌ Failed to delete driver. Please try again.');
    }
  };

  const saveWorkshop = async () => {
    if (!newWorkshop.name || !newWorkshop.email) {
      alert('Please enter both name and email');
      return;
    }
    
    try {
      if (editingWorkshop) {
        await updateWorkshopInFirebase(editingWorkshop.id, newWorkshop);
        setEditingWorkshop(null);
        console.log('✅ Workshop updated successfully');
      } else {
        await saveWorkshopToFirebase(newWorkshop);
        console.log('✅ Workshop added successfully');
      }
      
      setNewWorkshop({ name: '', email: '' });
      setShowAddWorkshop(false);
    } catch (error) {
      console.error('❌ Error saving workshop:', error);
      alert('❌ Failed to save workshop. Please try again.');
    }
  };

  const deleteWorkshop = async (workshopId) => {
    if (workshops.length === 1) {
      alert('❌ Cannot delete the last workshop. At least one workshop must remain.');
      return;
    }
    
    try {
      await deleteWorkshopFromFirebase(workshopId);
      // Remove from selected workshops if it was selected
      setSelectedWorkshops(prev => prev.filter(id => id !== workshopId));
      setWorkshopToDelete(null);
      console.log('✅ Workshop deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting workshop:', error);
      alert('❌ Failed to delete workshop. Please try again.');
    }
  };

  const toggleWorkshopSelection = (workshopId) => {
    setSelectedWorkshops(prev => {
      if (prev.includes(workshopId)) {
        return prev.filter(id => id !== workshopId);
      } else {
        return [...prev, workshopId];
      }
    });
  };

  const saveInspection = async (inspectionRecord) => {
    try {
      await saveInspectionToFirebase(inspectionRecord);
      console.log('✅ Inspection saved successfully');
    } catch (error) {
      console.error('❌ Error saving inspection:', error);
      alert('Failed to save inspection. Please try again.');
    }
  };

  const deleteInspection = async (id) => {
    if (window.confirm('Are you sure you want to delete this inspection?')) {
      try {
        await deleteInspectionFromFirebase(id);
        console.log('✅ Inspection deleted successfully');
      } catch (error) {
        console.error('❌ Error deleting inspection:', error);
        alert('Failed to delete inspection. Please try again.');
      }
    }
  };

  const handleInspectionAnswer = (itemId, value) => {
    setInspectionData(prev => ({ ...prev, [itemId]: value }));
    // Clear note and photo if switching to pass
    if (value === 'pass') {
      setNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[itemId];
        return newNotes;
      });
      setPhotos(prev => {
        const newPhotos = { ...prev };
        delete newPhotos[itemId];
        return newPhotos;
      });
    }
  };

  const handleNoteChange = (itemId, note) => {
    setNotes(prev => ({ ...prev, [itemId]: note }));
  };

  const handlePhotoCapture = (itemId, event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      Promise.all(
        files.map(file => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              // Compress image
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Set max dimensions
                const maxWidth = 800;
                const maxHeight = 800;
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                  if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                  }
                } else {
                  if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                  }
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Compress to JPEG with 0.7 quality
                resolve(canvas.toDataURL('image/jpeg', 0.7));
              };
              img.src = reader.result;
            };
            reader.readAsDataURL(file);
          });
        })
      ).then(compressedImages => {
        setPhotos(prev => ({
          ...prev,
          [itemId]: [...(prev[itemId] || []), ...compressedImages]
        }));
      });
    }
  };

  const removePhoto = (itemId, photoIndex) => {
    setPhotos(prev => ({
      ...prev,
      [itemId]: prev[itemId].filter((_, index) => index !== photoIndex)
    }));
  };

  const hasDamages = () => {
    return Object.values(inspectionData).some(value => value === 'fail');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const generateEmailSummary = () => {
    const failedItems = inspectionItems.filter(item => inspectionData[item.id] === 'fail');
    const selectedWorkshopsList = workshops.filter(w => selectedWorkshops.includes(w.id));
    const workshopNames = selectedWorkshopsList.map(w => w.name).join(', ');
    
    return {
      to: selectedWorkshopsList.map(w => w.email).join(', '),
      subject: `Vehicle Inspection Report - Rego: ${driverInfo.truckNumber}`,
      body: `
VEHICLE INSPECTION DAMAGE REPORT

Driver: ${driverInfo.name}
Vehicle Registration: ${driverInfo.truckNumber}
Inspection Date: ${formatDate(driverInfo.date)}
Workshop(s): ${workshopNames || 'Not selected'}

ITEMS REQUIRING ATTENTION:
${failedItems.map((item, i) => `
${i + 1}. ${item.category} - ${item.question}
   Status: FAILED ${item.critical ? '⚠️ CRITICAL' : ''}
   Notes: ${notes[item.id] || 'No notes provided'}
   Photos: ${photos[item.id]?.length || 0} attached
`).join('\n')}

Total Issues: ${failedItems.length}
Critical Issues: ${failedItems.filter(i => i.critical).length}

Please contact the driver to arrange inspection and repairs.

---
This is an automated report from the MF King Vehicle Inspection System.
      `
    };
  };

  const uploadImageToImgur = async (base64Image) => {
    try {
      const base64Data = base64Image.split(',')[1];
      
      const response = await fetch('https://api.imgur.com/3/image', {
        method: 'POST',
        headers: {
          'Authorization': 'Client-ID 546c25a59c58ad7',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: base64Data,
          type: 'base64'
        })
      });

      const data = await response.json();
      if (data.success) {
        return data.data.link;
      }
      return null;
    } catch (error) {
      console.error('Image upload failed:', error);
      return null;
    }
  };

  const sendEmail = async () => {
    const emailData = generateEmailSummary();
    const failedItems = inspectionItems.filter(item => inspectionData[item.id] === 'fail');
    const selectedWorkshopsList = workshops.filter(w => selectedWorkshops.includes(w.id));
    
    setIsSendingEmail(true);
    
    try {
      const failedItemsWithPhotos = await Promise.all(
        failedItems.map(async (item) => {
          const photoUrls = [];
          if (photos[item.id] && photos[item.id].length > 0) {
            for (const photo of photos[item.id]) {
              const uploadedUrl = await uploadImageToImgur(photo);
              if (uploadedUrl) photoUrls.push(uploadedUrl);
            }
          }
          return {
            ...item,
            photoUrls
          };
        })
      );

      const formattedItems = failedItemsWithPhotos.map((item, i) => 
        `${i + 1}. ${item.category} - ${item.question} ${item.critical ? '⚠️ CRITICAL' : ''}\n   Notes: ${notes[item.id] || 'No notes'}\n   Photos: ${item.photoUrls.length > 0 ? item.photoUrls.join(', ') : 'No photos'}`
      ).join('\n\n');

      const photoGalleryHTML = failedItemsWithPhotos
        .map(item => {
          if (item.photoUrls.length === 0) return '';
          
          // Create table rows with 2 images per row for better Outlook compatibility
          let photoRows = '';
          for (let i = 0; i < item.photoUrls.length; i += 2) {
            const img1 = item.photoUrls[i];
            const img2 = item.photoUrls[i + 1];
            
            photoRows += `
              <tr>
                <td style="padding: 5px; width: 50%;">
                  <img src="${img1}" alt="${item.category} damage" style="width: 100%; max-width: 300px; height: auto; border-radius: 5px; border: 2px solid #dc2626; display: block;" />
                </td>
                ${img2 ? `
                <td style="padding: 5px; width: 50%;">
                  <img src="${img2}" alt="${item.category} damage" style="width: 100%; max-width: 300px; height: auto; border-radius: 5px; border: 2px solid #dc2626; display: block;" />
                </td>` : '<td style="padding: 5px; width: 50%;"></td>'}
              </tr>`;
          }
          
          return `
          <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-bottom: 20px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
            <tr>
              <td style="padding: 15px;">
                <h4 style="color: #374151; margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">${item.category}</h4>
                <p style="color: #6b7280; font-size: 13px; margin: 0 0 10px 0;">${item.question}</p>
                ${item.critical ? '<p style="color: #dc2626; font-size: 12px; font-weight: bold; margin: 0 0 10px 0;">⚠️ CRITICAL SAFETY ITEM</p>' : ''}
                ${notes[item.id] ? `<p style="color: #374151; font-size: 13px; margin: 0 0 10px 0;"><strong>Notes:</strong> ${notes[item.id]}</p>` : ''}
                <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                  ${photoRows}
                </table>
              </td>
            </tr>
          </table>`;
        }).join('');

      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: 'service_2kg7kuq',
          template_id: 'template_6g7rug8',
          user_id: 'nHeIEyrRMqXKXV_-e',
          template_params: {
            to_email: emailData.to,
            subject: emailData.subject,
            driver_name: driverInfo.name,
            truck_number: driverInfo.truckNumber,
            inspection_date: driverInfo.date,
            workshop_name: selectedWorkshopsList.map(w => w.name).join(', '),
            failed_items: formattedItems,
            photo_gallery: photoGalleryHTML,
            total_issues: failedItems.length,
            critical_issues: failedItems.filter(i => i.critical).length
          }
        })
      });

      if (response.ok) {
        // Save to inspection history after successful email send
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
            failedItems: failedItems.map(item => ({
              id: item.id,
              category: item.category,
              question: item.question,
              critical: item.critical,
              note: notes[item.id] || 'No notes',
              photoCount: photos[item.id]?.length || 0
            })),
            workshopNames: selectedWorkshopsList.map(w => w.name).join(', '),
            workshopEmails: selectedWorkshopsList.map(w => w.email).join(', ')
          }
        };
        
        saveInspection(inspectionRecord);
        setEmailSent(true);
        setIsSendingEmail(false);
      } else {
        throw new Error('Email sending failed');
      }
    } catch (error) {
      setIsSendingEmail(false);
      alert('❌ Failed to send email. Please check your internet connection or contact support.');
      console.error('Email error:', error);
    }
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
        failedItems: failedItems.map(item => ({
          id: item.id,
          category: item.category,
          question: item.question,
          critical: item.critical,
          note: notes[item.id] || 'No notes',
          photoCount: photos[item.id]?.length || 0
        })),
        workshopNames: selectedWorkshopsList.map(w => w.name).join(', '),
        workshopEmails: selectedWorkshopsList.map(w => w.email).join(', ')
      }
    };

    // If no damages, save immediately to history with loading state
    if (!hasDamages()) {
      setIsCompletingInspection(true);
      // Simulate a brief delay for better UX
      setTimeout(() => {
        saveInspection(inspectionRecord);
        setIsCompletingInspection(false);
        setShowSummary(true);
      }, 800);
    } else {
      // If damages, will save when Send Report is clicked
      setShowSummary(true);
    }
  };

  const renderDriverInfo = () => (
    <div className="space-y-4">
      <h2 className="text-lg sm:text-xl font-bold text-gray-800">Driver Information</h2>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm sm:text-base font-medium text-gray-700">Driver Name</label>
            <button
              onClick={() => setShowManageDrivers(true)}
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-semibold"
            >
              Manage Drivers
            </button>
          </div>
          <select
            value={driverInfo.name}
            onChange={(e) => setDriverInfo(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
          >
            <option value="">Select driver</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.name}>{driver.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">Vehicle Registration Number</label>
          <input
            type="text"
            value={driverInfo.truckNumber}
            onChange={(e) => setDriverInfo(prev => ({ ...prev, truckNumber: e.target.value.toUpperCase() }))}
            className="w-full px-3 py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 uppercase"
            placeholder="e.g., ABC123"
          />
        </div>
      </div>
      <button
        onClick={() => setCurrentStep('inspection')}
        disabled={!driverInfo.name || !driverInfo.truckNumber}
        className="w-full mt-4 bg-red-600 text-white py-3 text-base sm:text-lg rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-red-700 active:bg-red-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        Start Inspection <ChevronRight size={20} className="sm:hidden" /><ChevronRight size={24} className="hidden sm:block" />
      </button>
      
      {savedInspections.length > 0 && (
        <button
          onClick={() => setShowHistory(true)}
          className="w-full mt-3 bg-gray-600 text-white py-3 text-base sm:text-lg rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-gray-700 active:bg-gray-800 transition-colors"
        >
          <History size={20} className="sm:hidden" /><History size={22} className="hidden sm:block" /> Inspection History ({savedInspections.length})
        </button>
      )}
    </div>
  );

  const renderInspection = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4 sticky top-0 bg-white py-3 -mx-4 px-4 sm:-mx-6 sm:px-6 z-10 border-b-2 border-gray-100 shadow-sm">
        <button
          onClick={() => setCurrentStep('driver-info')}
          className="text-blue-600 hover:text-blue-800 font-semibold"
        >
          ← Back
        </button>
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">Vehicle Inspection</h2>
        <span className="text-base sm:text-lg font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
          {Object.keys(inspectionData).length}/{inspectionItems.length}
        </span>
      </div>
      
      <div className="space-y-4">
        {inspectionItems.map((item) => (
          <div key={item.id} className="bg-white border-2 border-gray-200 rounded-xl p-3 sm:p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-bold text-base sm:text-lg text-gray-800 flex items-center gap-2 mb-2">
                  {item.category}
                  {item.critical && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const tooltip = e.currentTarget.querySelector('.tooltip-text');
                        tooltip.classList.toggle('opacity-0');
                        tooltip.classList.toggle('invisible');
                        tooltip.classList.toggle('opacity-100');
                        tooltip.classList.toggle('visible');
                        // Auto-hide after 3 seconds
                        setTimeout(() => {
                          tooltip.classList.add('opacity-0', 'invisible');
                          tooltip.classList.remove('opacity-100', 'visible');
                        }, 3000);
                      }}
                      className="relative inline-block"
                    >
                      <AlertTriangle size={20} className="text-red-600" />
                      <span className="tooltip-text absolute left-0 sm:left-1/2 sm:-translate-x-1/2 bottom-full mb-2 px-3 py-2 text-xs font-normal text-white bg-gray-900 rounded-lg whitespace-nowrap opacity-0 invisible transition-all duration-200 pointer-events-none shadow-lg" style={{zIndex: 50}}>
                        Critical safety item - must be functional
                        <span className="absolute top-full left-4 sm:left-1/2 sm:-translate-x-1/2 border-4 border-transparent border-t-gray-900" style={{marginTop: '-4px'}}></span>
                      </span>
                    </button>
                  )}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{item.question}</p>
              </div>
            </div>
            
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => handleInspectionAnswer(item.id, 'pass')}
                className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-1 sm:gap-2 font-bold text-sm sm:text-base transition-colors duration-100 touch-manipulation ${
                  inspectionData[item.id] === 'pass'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 active:bg-gray-300'
                }`}
              >
                <CheckCircle2 size={20} className="sm:hidden" /><CheckCircle2 size={24} className="hidden sm:block" /> Pass
              </button>
              <button
                onClick={() => handleInspectionAnswer(item.id, 'fail')}
                className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-1 sm:gap-2 font-bold text-sm sm:text-base transition-colors duration-100 touch-manipulation ${
                  inspectionData[item.id] === 'fail'
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 active:bg-gray-300'
                }`}
              >
                <XCircle size={20} className="sm:hidden" /><XCircle size={24} className="hidden sm:block" /> Fail
              </button>
            </div>

            {inspectionData[item.id] === 'fail' && (
              <div className="mt-3 border-t-2 pt-3 bg-red-50 -mx-3 sm:-mx-4 -mb-3 sm:-mb-4 px-3 sm:px-4 pb-3 sm:pb-4 rounded-b-xl">
                <label className="block text-sm sm:text-base font-bold text-gray-700 mb-2">
                  Describe the problem
                </label>
                <textarea
                  value={notes[item.id] || ''}
                  onChange={(e) => handleNoteChange(item.id, e.target.value)}
                  placeholder="Enter details about the damage or issue..."
                  className="w-full px-3 py-2 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[80px] sm:min-h-[100px] mb-3"
                />
                
                <label className="block text-sm sm:text-base font-bold text-gray-700 mb-2 flex items-center gap-2">
                  <Camera size={18} className="sm:hidden" /><Camera size={20} className="hidden sm:block" /> Add Photos of Damage
                </label>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <label className="bg-red-600 text-white py-2 px-2 rounded-lg font-bold text-center flex items-center justify-center gap-1 hover:bg-red-700 active:bg-red-800 cursor-pointer text-xs sm:text-sm whitespace-nowrap">
                    <Camera size={18} />
                    Take Photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={(e) => handlePhotoCapture(item.id, e)}
                      className="hidden"
                    />
                  </label>
                  <label className="bg-blue-600 text-white py-2 px-2 rounded-lg font-bold text-center flex items-center justify-center gap-1 hover:bg-blue-700 active:bg-blue-800 cursor-pointer text-xs sm:text-sm whitespace-nowrap">
                    📁 Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handlePhotoCapture(item.id, e)}
                      className="hidden"
                    />
                  </label>
                </div>
                {photos[item.id] && photos[item.id].length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {photos[item.id].map((photo, index) => (
                      <div key={index} className="relative">
                        <img src={photo} alt={`Damage ${index + 1}`} className="w-full rounded-lg object-cover border-4 border-red-300" />
                        <button
                          onClick={() => removePhoto(item.id, index)}
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold hover:bg-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => hasDamages() ? setCurrentStep('workshop') : completeInspection()}
        disabled={Object.keys(inspectionData).length !== inspectionItems.length || isCompletingInspection}
        className={`w-full mt-6 py-4 text-lg rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg ${
          isCompletingInspection
            ? 'bg-orange-500 text-white cursor-wait'
            : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-gray-400 disabled:cursor-not-allowed'
        }`}
      >
        {isCompletingInspection ? (
          <>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            Completing Inspection...
          </>
        ) : (
          <>
            {hasDamages() ? 'Select Workshop' : 'Complete Inspection'} <ChevronRight size={24} />
          </>
        )}
      </button>
    </div>
  );

  const renderWorkshopSelection = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setCurrentStep('inspection')}
          className="text-blue-600 hover:text-blue-800 font-semibold text-sm sm:text-base whitespace-nowrap"
        >
          ← Back
        </button>
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 text-center">Select Workshop(s)</h2>
        <div className="w-12 sm:w-16"></div>
      </div>
      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
        <p className="text-red-700 font-bold text-base">⚠️ Damages detected - Select one or more workshops</p>
      </div>
      
      <div className="space-y-3">
        {workshops.map((workshop) => (
          <div key={workshop.id} className="relative">
            {editingWorkshop?.id === workshop.id ? (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-gray-800">Edit Workshop</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Workshop Name</label>
                  <input
                    type="text"
                    value={editingWorkshop.name}
                    onChange={(e) => setEditingWorkshop(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editingWorkshop.email}
                    onChange={(e) => setEditingWorkshop(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (editingWorkshop.name && editingWorkshop.email) {
                        updateWorkshop(editingWorkshop.id, { name: editingWorkshop.name, email: editingWorkshop.email });
                      } else {
                        alert('Please fill in both workshop name and email');
                      }
                    }}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 active:bg-blue-800"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setWorkshopToDelete(editingWorkshop)}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 active:bg-red-800"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setEditingWorkshop(null)}
                    className="px-4 bg-gray-600 text-white py-2 rounded-lg font-semibold hover:bg-gray-700 active:bg-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => toggleWorkshopSelection(workshop.id)}
                  className={`w-full p-5 pr-20 rounded-xl border-2 text-left transition-all ${
                    selectedWorkshops.includes(workshop.id)
                      ? 'border-green-600 bg-green-50 shadow-lg'
                      : 'border-gray-300 hover:border-gray-400 active:bg-gray-50'
                  }`}
                >
                  <h3 className="font-bold text-lg text-gray-800">{workshop.name}</h3>
                </button>
                {!editingWorkshop && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingWorkshop({ id: workshop.id, name: workshop.name, email: workshop.email });
                    }}
                    className="absolute top-3 right-3 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-blue-700 active:bg-blue-800"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {!showAddWorkshop && !editingWorkshop ? (
        <button
          onClick={() => setShowAddWorkshop(true)}
          className="w-full py-3 border-2 border-dashed border-gray-400 rounded-xl text-gray-600 font-semibold hover:border-gray-600 hover:text-gray-800 transition-colors"
        >
          + Add Workshop
        </button>
      ) : showAddWorkshop ? (
        <div className="bg-gray-50 border-2 border-gray-300 rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-gray-800">Add New Workshop</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Workshop Name</label>
            <input
              type="text"
              value={newWorkshop.name}
              onChange={(e) => setNewWorkshop(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Auckland Workshop"
              className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={newWorkshop.email}
              onChange={(e) => setNewWorkshop(prev => ({ ...prev, email: e.target.value }))}
              placeholder="e.g., workshop@example.com"
              className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (newWorkshop.name && newWorkshop.email) {
                  saveWorkshop(newWorkshop);
                } else {
                  alert('Please fill in both workshop name and email');
                }
              }}
              disabled={!newWorkshop.name || !newWorkshop.email}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 active:bg-green-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Save Workshop
            </button>
            <button
              onClick={() => {
                setShowAddWorkshop(false);
                setNewWorkshop({ name: '', email: '' });
              }}
              className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 active:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {selectedWorkshops.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
          <p className="text-blue-800 font-semibold text-sm">
            ✓ {selectedWorkshops.length} workshop{selectedWorkshops.length > 1 ? 's' : ''} selected
          </p>
        </div>
      )}

      <button
        onClick={completeInspection}
        disabled={selectedWorkshops.length === 0}
        className="w-full mt-6 bg-red-600 text-white py-4 text-lg rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 active:bg-red-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg"
      >
        Generate Report <ChevronRight size={24} />
      </button>
    </div>
  );

  const renderSummary = () => {
    const emailData = hasDamages() ? generateEmailSummary() : null;
    const failedItems = inspectionItems.filter(item => inspectionData[item.id] === 'fail');

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-2">
          {hasDamages() ? (
            <button
              onClick={() => {
                setShowSummary(false);
                setCurrentStep('workshop');
              }}
              className="text-blue-600 hover:text-blue-800 font-semibold text-sm sm:text-base whitespace-nowrap"
            >
              ← Back
            </button>
          ) : (
            <div className="w-12 sm:w-16"></div>
          )}
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 text-center">Inspection Summary</h2>
          <div className="w-12 sm:w-16"></div>
        </div>
        
        {hasDamages() ? (
          <div className="space-y-4">
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
              <h3 className="font-bold text-red-800 text-xl mb-2">Damages Detected</h3>
              <p className="text-red-700 text-base">
                {failedItems.length} issue(s) found • {failedItems.filter(i => i.critical).length} critical
              </p>
            </div>

            <div className="bg-white border-2 border-gray-300 rounded-xl p-4">
              <h4 className="font-bold text-gray-800 text-lg mb-3">Report Summary</h4>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Driver:</span>
                  <span className="text-gray-800 font-bold">{driverInfo.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Vehicle Registration:</span>
                  <span className="text-gray-800 font-bold">{driverInfo.truckNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Date:</span>
                  <span className="text-gray-800 font-bold">{formatDate(driverInfo.date)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">Workshop(s):</span>
                  <span className="text-gray-800 font-bold">{workshops.filter(w => selectedWorkshops.includes(w.id)).map(w => w.name).join(', ')}</span>
                </div>
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
                          {notes[item.id] && (
                            <p className="text-gray-700 text-sm mt-2 bg-white p-2 rounded border border-gray-300">
                              <span className="font-semibold">Notes:</span> {notes[item.id]}
                            </p>
                          )}
                          {item.critical && (
                            <span className="inline-block mt-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold relative group cursor-help">
                              ⚠️ CRITICAL
                              <span className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 text-xs font-normal text-white bg-gray-900 rounded-lg whitespace-nowrap z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                Critical safety item - must be functional
                                <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></span>
                              </span>
                            </span>
                          )}
                          {photos[item.id] && photos[item.id].length > 0 && (
                            <button
                              onClick={() => {
                                setViewingPhotoArray(photos[item.id]);
                                setViewingPhotoIndex(0);
                                setViewingPhoto(photos[item.id][0]);
                              }}
                              className="inline-block mt-2 ml-2 text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 active:bg-blue-800 font-semibold"
                            >
                              📷 View Photos ({photos[item.id].length})
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={sendEmail}
              disabled={isSendingEmail || emailSent}
              className={`w-full py-4 text-lg rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg ${
                emailSent 
                  ? 'bg-green-600 text-white cursor-default'
                  : isSendingEmail
                  ? 'bg-orange-500 text-white cursor-wait'
                  : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
              }`}
            >
              {emailSent ? (
                <>
                  <CheckCircle2 size={24} /> Report Sent
                  {redirectCountdown !== null && (
                    <span className="ml-2">({redirectCountdown}s)</span>
                  )}
                </>
              ) : isSendingEmail ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  Sending Report...
                </>
              ) : (
                <>
                  <Send size={24} /> Send Report
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5">
            <h3 className="font-bold text-green-800 text-xl mb-2">✓ All Clear!</h3>
            <p className="text-green-700 text-base">No damages detected. Vehicle is ready for operation.</p>
            {redirectCountdown !== null && (
              <p className="text-green-600 text-sm mt-3 font-semibold">
                Redirecting to start page in {redirectCountdown} second{redirectCountdown !== 1 ? 's' : ''}...
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderHistory = () => {
    if (viewingInspection) {
      const inspection = viewingInspection;
      const failedItems = inspection.reportSummary?.failedItems || [];
      
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">Inspection Report</h2>
            <button
              onClick={() => setViewingInspection(null)}
              className="text-red-600 hover:text-red-800 font-bold"
            >
              ✕ Close
            </button>
          </div>

          <div className="bg-white border-2 border-gray-300 rounded-xl p-4">
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">Driver:</span>
                <span className="text-gray-800 font-bold">{inspection.driverInfo.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">Vehicle Registration:</span>
                <span className="text-gray-800 font-bold">{inspection.truckNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">Date:</span>
                <span className="text-gray-800 font-bold">{formatDate(inspection.date)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">Workshop(s):</span>
                <span className="text-gray-800 font-bold">{inspection.reportSummary?.workshopNames}</span>
              </div>
            </div>

            {inspection.hasDamages ? (
              <>
                <div className="border-t-2 border-gray-200 pt-3">
                  <h5 className="font-bold text-gray-800 mb-2">Failed Items ({failedItems.length}):</h5>
                  <ul className="space-y-2">
                    {failedItems.map((item, index) => (
                      <li key={item.id} className="text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                        <div className="flex items-start gap-2">
                          <span className="font-bold text-red-600">{index + 1}.</span>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800">{item.category}</p>
                            <p className="text-gray-600 text-xs mt-1">{item.question}</p>
                            {item.note && item.note !== 'No notes' && (
                              <p className="text-gray-700 text-sm mt-2 bg-white p-2 rounded border border-gray-300">
                                <span className="font-semibold">Notes:</span> {item.note}
                              </p>
                            )}
                            {item.critical && (
                              <span className="inline-block mt-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">
                                ⚠️ CRITICAL
                              </span>
                            )}
                            {inspection.photos[item.id] && inspection.photos[item.id].length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {inspection.photos[item.id].map((photo, photoIndex) => (
                                  <img
                                    key={photoIndex}
                                    src={photo}
                                    alt={`Issue ${photoIndex + 1}`}
                                    className="w-20 h-20 object-cover rounded border-2 border-gray-300 cursor-pointer hover:border-blue-500"
                                    onClick={() => {
                                      setViewingPhoto(photo);
                                      setViewingPhotoArray(inspection.photos[item.id]);
                                      setViewingPhotoIndex(photoIndex);
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-3">
                <p className="text-green-800 font-semibold">✓ All Clear - No issues detected</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">Inspection History</h2>
          <button
            onClick={() => {
              setShowHistory(false);
              setHistorySearchTruck('');
              setHistorySearchDriver('');
            }}
            className="text-gray-600 hover:text-gray-800 font-medium"
          >
            Close
          </button>
        </div>

        {/* Search Filters */}
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-3 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Truck size={16} className="text-gray-600" />
              Filter by Vehicle Registration Number
            </label>
            <input
              type="text"
              value={historySearchTruck}
              onChange={(e) => setHistorySearchTruck(e.target.value.toUpperCase())}
              placeholder="enter registration number (e.g., ABC123)"
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <User size={16} className="text-gray-600" />
              Filter by Driver Name
            </label>
            <input
              type="text"
              value={historySearchDriver}
              onChange={(e) => setHistorySearchDriver(e.target.value)}
              placeholder="enter or select driver name"
              list="driver-suggestions"
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
            <datalist id="driver-suggestions">
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.name} />
              ))}
            </datalist>
          </div>
          
          {(historySearchTruck || historySearchDriver) && (
            <button
              onClick={() => {
                setHistorySearchTruck('');
                setHistorySearchDriver('');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              Clear All Filters
            </button>
          )}
        </div>

        {savedInspections.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No inspections saved yet.</p>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {savedInspections
              .filter(inspection => {
                // Filter by registration number
                const matchesTruck = !historySearchTruck || 
                  inspection.truckNumber.toUpperCase().includes(historySearchTruck);
                
                // Filter by driver name (partial match, case-insensitive)
                const matchesDriver = !historySearchDriver || 
                  inspection.driverInfo.name.toLowerCase().includes(historySearchDriver.toLowerCase());
                
                // Both filters must match
                return matchesTruck && matchesDriver;
              })
              .map((inspection) => {
              const failedCount = Object.values(inspection.inspectionData).filter(v => v === 'fail').length;
              
              return (
                <div key={inspection.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">
                        Vehicle #{inspection.truckNumber}
                      </h3>
                      <p className="text-sm text-gray-600">{inspection.driverInfo.name}</p>
                      <p className="text-xs text-gray-500">{formatDate(inspection.date)} • {new Date(inspection.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <button
                      onClick={() => deleteInspection(inspection.id)}
                      className="text-red-600 hover:text-red-800 p-2"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="mt-2 flex items-center gap-2">
                    {inspection.hasDamages ? (
                      <span className="inline-block bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded">
                        ⚠️ {failedCount} Issue(s) Reported
                      </span>
                    ) : (
                      <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                        ✓ All Clear
                      </span>
                    )}
                    <button
                      onClick={() => setViewingInspection(inspection)}
                      className="ml-auto text-blue-600 hover:text-blue-800 text-sm font-semibold"
                    >
                      View Report →
                    </button>
                  </div>
                </div>
              );
            })}
            {savedInspections.filter(inspection => {
              const matchesTruck = !historySearchTruck || 
                inspection.truckNumber.toUpperCase().includes(historySearchTruck);
              const matchesDriver = !historySearchDriver || 
                inspection.driverInfo.name.toLowerCase().includes(historySearchDriver.toLowerCase());
              return matchesTruck && matchesDriver;
            }).length === 0 && (historySearchTruck || historySearchDriver) && (
              <div className="text-center py-8 text-gray-600">
                <p className="font-semibold mb-1">No inspections found</p>
                <p className="text-sm">
                  No inspections match your filters
                  {historySearchTruck && ` (Registration: "${historySearchTruck}")`}
                  {historySearchDriver && ` (Driver: "${historySearchDriver}")`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-4">
      <div className="max-w-3xl mx-auto px-2 sm:px-4">
        <div className="bg-white shadow-lg mb-3">
          <div className="flex flex-col items-center py-3 px-2">
            <div className="mb-2">
              {!logoError ? (
                <img 
                  src="/mf-king-logo.jpg" 
                  alt="MF King Engineering Ltd" 
                  className="h-16 sm:h-20 w-auto object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="text-center">
                  <div className="font-bold text-2xl sm:text-3xl md:text-4xl mb-1">
                    <span className="text-red-600">MF</span>
                    <span className="text-gray-900">-KING</span>
                  </div>
                  <div className="text-xs tracking-[0.3em] text-gray-700 font-light">
                    ENGINEERING LTD.
                  </div>
                  <div className="h-1 bg-red-600 w-full mt-2"></div>
                </div>
              )}
            </div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-center text-gray-800">
              Vehicle Pre-Start Inspection
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 text-center mt-1 px-2">
              Use this checklist to make a quick visual assessment of vehicle condition and generate a report of any issues
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4 md:p-6">
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
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setViewingPhoto(null);
            setViewingPhotoArray([]);
            setViewingPhotoIndex(0);
          }}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => {
                setViewingPhoto(null);
                setViewingPhotoArray([]);
                setViewingPhotoIndex(0);
              }}
              className="absolute top-4 right-4 bg-white text-gray-800 rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl hover:bg-gray-200 z-10"
            >
              ✕
            </button>
            
            {viewingPhotoArray.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newIndex = viewingPhotoIndex > 0 ? viewingPhotoIndex - 1 : viewingPhotoArray.length - 1;
                    setViewingPhotoIndex(newIndex);
                    setViewingPhoto(viewingPhotoArray[newIndex]);
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white text-gray-800 rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl hover:bg-gray-200 z-10"
                >
                  ‹
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newIndex = viewingPhotoIndex < viewingPhotoArray.length - 1 ? viewingPhotoIndex + 1 : 0;
                    setViewingPhotoIndex(newIndex);
                    setViewingPhoto(viewingPhotoArray[newIndex]);
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white text-gray-800 rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl hover:bg-gray-200 z-10"
                >
                  ›
                </button>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-semibold">
                  {viewingPhotoIndex + 1} / {viewingPhotoArray.length}
                </div>
              </>
            )}
            
            <img 
              src={viewingPhoto} 
              alt="Damage photo" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {workshopToDelete && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setWorkshopToDelete(null)}
        >
          <div 
            className="bg-white rounded-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-800 mb-3">Delete Workshop?</h3>
            <p className="text-gray-700 mb-2">
              Are you sure you want to delete:
            </p>
            <p className="font-semibold text-gray-900 mb-6">
              "{workshopToDelete.name}"
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  deleteWorkshop(workshopToDelete);
                }}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 active:bg-red-800"
              >
                Delete
              </button>
              <button
                onClick={() => setWorkshopToDelete(null)}
                className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 active:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Drivers Modal */}
      {showManageDrivers && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowManageDrivers(false)}
        >
          <div 
            className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Manage Drivers</h3>
              <button
                onClick={() => setShowManageDrivers(false)}
                className="text-gray-600 hover:text-gray-800 font-bold text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 mb-4">
              {drivers.map((driver) => (
                <div key={driver.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <span className="font-semibold text-gray-800">{driver.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDriverToDelete(driver);
                    }}
                    className="text-red-600 hover:text-red-800 font-semibold text-sm px-3 py-1 bg-red-100 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>

            {!showAddDriver ? (
              <button
                onClick={() => setShowAddDriver(true)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
              >
                + Add Driver
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                  placeholder="Enter driver name..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (newDriverName.trim()) {
                        saveDriver(newDriverName.trim());
                        setNewDriverName('');
                        setShowAddDriver(false);
                      } else {
                        alert('Please enter a driver name');
                      }
                    }}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setNewDriverName('');
                      setShowAddDriver(false);
                    }}
                    className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Driver Delete Confirmation Modal */}
      {driverToDelete && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          style={{zIndex: 9999}}
          onClick={() => setDriverToDelete(null)}
        >
          <div 
            className="bg-white rounded-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-800 mb-3">Delete Driver?</h3>
            <p className="text-gray-700 mb-2">
              Are you sure you want to delete:
            </p>
            <p className="font-semibold text-gray-900 mb-6">
              "{driverToDelete.name}"
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  deleteDriver(driverToDelete.id);
                  setDriverToDelete(null);
                }}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 active:bg-red-800"
              >
                Delete
              </button>
              <button
                onClick={() => setDriverToDelete(null)}
                className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 active:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}