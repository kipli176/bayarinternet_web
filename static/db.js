/* =========================================================
   IndexedDB Setup (BayarInter v1.4r1)
   Stores: users, invoices, profiles
   ========================================================= */

const DB_NAME = 'bayarinter_db';
const DB_VERSION = 2; // ⬅️ Naik versi agar trigger upgrade
let db;

// =========================================================
// Inisialisasi Database
// =========================================================
function initDB() {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = event => {
    db = event.target.result;

    
    // USERS
    if (!db.objectStoreNames.contains('users')) {
      db.createObjectStore('users', { keyPath: 'id' });
    }

    // INVOICES
    if (!db.objectStoreNames.contains('invoices')) {
      db.createObjectStore('invoices', { keyPath: 'id' });
    }

    // PAYMENTS
    if (!db.objectStoreNames.contains('payments')) {
      db.createObjectStore('payments', { keyPath: 'id' });
    }

    // PROFILES
    if (!db.objectStoreNames.contains('profiles')) {
      db.createObjectStore('profiles', { keyPath: 'name' });
    }


    console.log('⚙️ Struktur DB diperbarui ke versi', DB_VERSION);
  };

  request.onsuccess = event => {
    db = event.target.result;
    console.log('📦 IndexedDB siap digunakan:', DB_NAME);
  };

  request.onerror = e => console.error('❌ IndexedDB gagal:', e);
}

// =========================================================
// Helpers Umum
// =========================================================
function saveToDB(storeName, dataArray) {
  if (!db) return console.warn('⚠️ DB belum siap untuk', storeName);
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  dataArray.forEach(item => store.put(item));
  tx.oncomplete = () => console.log(`✅ ${storeName} tersimpan ke IndexedDB`);
}

function getAllFromDB(storeName, callback) {
  if (!db) return console.warn('⚠️ DB belum siap untuk', storeName);
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  const request = store.getAll();
  request.onsuccess = () => callback(request.result);
}

function deleteFromDB(storeName, id) {
  if (!db) return console.warn('⚠️ DB belum siap untuk', storeName);
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).delete(id);
  tx.oncomplete = () => console.log(`🗑️ Data ${id} dihapus dari ${storeName}`);
}

// =========================================================
// Aliases khusus (agar tetap backward-compatible)
// =========================================================
function saveUsersToDB(users) { saveToDB('users', users); }
function saveInvoicesToDB(invoices) { saveToDB('invoices', invoices); }
function saveProfilesToDB(profiles) { saveToDB('profiles', profiles); }
function savePaymentsToDB(payments) { saveToDB('payments', payments); }

function getUsersFromDB(cb) { getAllFromDB('users', cb); }
function getInvoicesFromDB(cb) { getAllFromDB('invoices', cb); }
function getProfilesFromDB(cb) { getAllFromDB('profiles', cb); }
function getPaymentsFromDB(cb) { getAllFromDB('payments', cb); }

// =========================================================
// Auto Initialize
// =========================================================
window.addEventListener('load', initDB);
