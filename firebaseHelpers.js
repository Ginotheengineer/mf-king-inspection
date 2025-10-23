// Firebase Helper Functions for MF King Truck Inspection App
// Import this into your TruckInspectionApp.jsx

import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  onSnapshot 
} from 'firebase/firestore';
import { db } from './firebase';

// ============================================
// INSPECTIONS
// ============================================

/**
 * Save a new inspection to Firebase
 * @param {Object} inspectionData - The inspection data to save
 * @returns {Promise<string>} The ID of the saved inspection
 */
export const saveInspectionToFirebase = async (inspectionData) => {
  try {
    const docRef = await addDoc(collection(db, 'inspections'), {
      ...inspectionData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log('Inspection saved with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving inspection:', error);
    throw error;
  }
};

/**
 * Load all inspections from Firebase
 * @returns {Promise<Array>} Array of inspection objects
 */
export const loadInspectionsFromFirebase = async () => {
  try {
    const q = query(collection(db, 'inspections'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const inspections = [];
    
    querySnapshot.forEach((doc) => {
      inspections.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('Loaded inspections:', inspections.length);
    return inspections;
  } catch (error) {
    console.error('Error loading inspections:', error);
    return [];
  }
};

/**
 * Delete an inspection from Firebase
 * @param {string} inspectionId - The ID of the inspection to delete
 */
export const deleteInspectionFromFirebase = async (inspectionId) => {
  try {
    await deleteDoc(doc(db, 'inspections', inspectionId));
    console.log('Inspection deleted:', inspectionId);
  } catch (error) {
    console.error('Error deleting inspection:', error);
    throw error;
  }
};

/**
 * Listen to real-time inspection updates
 * @param {Function} callback - Function to call when inspections change
 * @returns {Function} Unsubscribe function
 */
export const subscribeToInspections = (callback) => {
  const q = query(collection(db, 'inspections'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (querySnapshot) => {
    const inspections = [];
    querySnapshot.forEach((doc) => {
      inspections.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(inspections);
  });
};

// ============================================
// DRIVERS
// ============================================

/**
 * Save a new driver to Firebase
 * @param {string} driverName - The name of the driver
 * @returns {Promise<string>} The ID of the saved driver
 */
export const saveDriverToFirebase = async (driverName) => {
  try {
    const docRef = await addDoc(collection(db, 'drivers'), {
      name: driverName,
      createdAt: new Date().toISOString()
    });
    console.log('Driver saved with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving driver:', error);
    throw error;
  }
};

/**
 * Load all drivers from Firebase
 * @returns {Promise<Array>} Array of driver objects
 */
export const loadDriversFromFirebase = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'drivers'));
    const drivers = [];
    
    querySnapshot.forEach((doc) => {
      drivers.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('Loaded drivers:', drivers.length);
    return drivers;
  } catch (error) {
    console.error('Error loading drivers:', error);
    return [];
  }
};

/**
 * Delete a driver from Firebase
 * @param {string} driverId - The ID of the driver to delete
 */
export const deleteDriverFromFirebase = async (driverId) => {
  try {
    await deleteDoc(doc(db, 'drivers', driverId));
    console.log('Driver deleted:', driverId);
  } catch (error) {
    console.error('Error deleting driver:', error);
    throw error;
  }
};

/**
 * Listen to real-time driver updates
 * @param {Function} callback - Function to call when drivers change
 * @returns {Function} Unsubscribe function
 */
export const subscribeToDrivers = (callback) => {
  return onSnapshot(collection(db, 'drivers'), (querySnapshot) => {
    const drivers = [];
    querySnapshot.forEach((doc) => {
      drivers.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(drivers);
  });
};

// ============================================
// WORKSHOPS
// ============================================

/**
 * Save a new workshop to Firebase
 * @param {Object} workshopData - Object with name and email
 * @returns {Promise<string>} The ID of the saved workshop
 */
export const saveWorkshopToFirebase = async (workshopData) => {
  try {
    const docRef = await addDoc(collection(db, 'workshops'), {
      ...workshopData,
      createdAt: new Date().toISOString()
    });
    console.log('Workshop saved with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving workshop:', error);
    throw error;
  }
};

/**
 * Update an existing workshop in Firebase
 * @param {string} workshopId - The ID of the workshop to update
 * @param {Object} workshopData - Object with name and email
 */
export const updateWorkshopInFirebase = async (workshopId, workshopData) => {
  try {
    const workshopRef = doc(db, 'workshops', workshopId);
    await updateDoc(workshopRef, {
      ...workshopData,
      updatedAt: new Date().toISOString()
    });
    console.log('Workshop updated:', workshopId);
  } catch (error) {
    console.error('Error updating workshop:', error);
    throw error;
  }
};

/**
 * Load all workshops from Firebase
 * @returns {Promise<Array>} Array of workshop objects
 */
export const loadWorkshopsFromFirebase = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'workshops'));
    const workshops = [];
    
    querySnapshot.forEach((doc) => {
      workshops.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('Loaded workshops:', workshops.length);
    return workshops;
  } catch (error) {
    console.error('Error loading workshops:', error);
    return [];
  }
};

/**
 * Delete a workshop from Firebase
 * @param {string} workshopId - The ID of the workshop to delete
 */
export const deleteWorkshopFromFirebase = async (workshopId) => {
  try {
    await deleteDoc(doc(db, 'workshops', workshopId));
    console.log('Workshop deleted:', workshopId);
  } catch (error) {
    console.error('Error deleting workshop:', error);
    throw error;
  }
};

/**
 * Listen to real-time workshop updates
 * @param {Function} callback - Function to call when workshops change
 * @returns {Function} Unsubscribe function
 */
export const subscribeToWorkshops = (callback) => {
  return onSnapshot(collection(db, 'workshops'), (querySnapshot) => {
    const workshops = [];
    querySnapshot.forEach((doc) => {
      workshops.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(workshops);
  });
};

// ============================================
// INITIALIZE DEFAULT DATA
// ============================================

/**
 * Initialize default workshop if none exist
 */
export const initializeDefaultWorkshop = async () => {
  try {
    const workshops = await loadWorkshopsFromFirebase();
    if (workshops.length === 0) {
      await saveWorkshopToFirebase({
        name: 'MF King Engineering Ltd',
        email: 'gino@mfking.co.nz'
      });
      console.log('Default workshop created');
    }
  } catch (error) {
    console.error('Error initializing default workshop:', error);
  }
};

/**
 * Initialize default drivers if none exist
 */
export const initializeDefaultDrivers = async () => {
  try {
    const drivers = await loadDriversFromFirebase();
    if (drivers.length === 0) {
      await saveDriverToFirebase('Gino Esposito');
      console.log('Default driver created');
    }
  } catch (error) {
    console.error('Error initializing default drivers:', error);
  }
};
