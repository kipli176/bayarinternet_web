/* =========================================================
   BayarInter Billing Reseller
   Version: app.js (v1.1)
   Stage: Base SPA with working register toggle
   ========================================================= */

const $ = id => document.getElementById(id);
const show = el => { if (el) el.classList.remove('hidden'); };
const hide = el => { if (el) el.classList.add('hidden'); };

  const toggle = document.getElementById('darkModeToggle');
  toggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    toggle.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
  });
// Cek token
async function ensureAuth() {
  if (!isLoggedIn()) {
    await refreshToken();
    if (!isLoggedIn()) {
      toast("🔒 Sesi berakhir, silakan login kembali");
      showSection("auth");
      return false;
    }
  }
  return true;
}

// Toast
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.style.opacity = 1;
  setTimeout(() => { t.style.opacity = 0; }, 2000);
}

// Net status
const net = $('netStatus');
function netStatus(msg, color) {
  net.textContent = msg;
  net.style.background = color;
  net.style.opacity = 1;
  if (navigator.onLine) setTimeout(() => { net.style.opacity = 0; }, 2000);
}
window.addEventListener('offline', () => netStatus('⚠️ Anda offline', '#dc2626'));
window.addEventListener('online', () => netStatus('✅ Koneksi aktif', '#16a34a'));
if (!navigator.onLine) netStatus('⚠️ Anda offline', '#dc2626');

// Splash
window.addEventListener('load', async () => {
  const splash = $('splashSection');
  const token = getAccessToken();

  // Coba refresh token jika ada
  if (token) {
    await refreshToken().catch(() => clearTokens());
  }

  setTimeout(() => {
    splash.classList.add('fade-out');
    setTimeout(async () => {
      hide(splash);
      if (isLoggedIn()) {
        showSection('dashboard');
        if (!(await ensureAuth())) return;
        refreshDashboard();
      } else {
        showSection('auth');
      }
    }, 600);
  }, 2000);
});

// =========================================================
// Section Handler (v1.5r3)
// =========================================================
function showSection(name) {
  const all = document.querySelectorAll('.page-section');

  all.forEach(sec => {
    if (sec.id === name + 'Section') return;
    sec.classList.remove('active');
    // beri delay sebelum hidden biar transisi keluar kelihatan
    setTimeout(() => sec.classList.add('hidden'), 350);
  });

  const target = $(name + 'Section');
  if (target) {
    target.classList.remove('hidden');
    // timeout kecil agar CSS transition sempat membaca state awal
    setTimeout(() => target.classList.add('active'), 30);
  }
}




// Toggle register/login
$('toggleRegister').addEventListener('click', () => {
  hide($('loginBox'));
  show($('registerBox'));
});
$('toggleLogin').addEventListener('click', () => {
  hide($('registerBox'));
  show($('loginBox'));
});

// Login
$('btnLogin').addEventListener('click', async () => {
  const email = $('loginEmail').value.trim();
  const pass = $('loginPassword').value.trim();
  if (!email || !pass) return toast('❗ Lengkapi data login');

  try {
    await login(email, pass);
    toast('✅ Login berhasil');
    setTimeout(async () => {
      hide($('authSection'));
      showSection('dashboard');
      if (!(await ensureAuth())) return;
      refreshDashboard();
    }, 800);
  } catch (err) {
    toast('❌ ' + (err.detail || 'Gagal login'));
  }
});


// Register
$('btnRegister').addEventListener('click', async () => {
  const nama = $('regNama').value.trim();
  const email = $('regEmail').value.trim();
  const pass = $('regPassword').value.trim();
  if (!nama || !email || !pass) return toast('❗ Lengkapi semua data');

  try {
    await register(nama, email, pass);
    toast('✅ Akun berhasil dibuat');
    hide($('registerBox'));
    show($('loginBox'));
  } catch (err) {
    toast('❌ ' + (err.detail || 'Registrasi gagal'));
  }
});


// Logout
$('logoutBtn').addEventListener('click', async () => {
  await logout();
  toast('👋 Keluar');
  setTimeout(() => {
    hide($('dashboardSection'));
    showSection('auth');
  }, 800);
});



let deferredPrompt;window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Jika popup sudah ada, jangan buat dua kali
  if (document.getElementById('installPopup')) return;

  // Buat overlay semi-transparan (opsional, klik di luar = tutup)
  const overlay = document.createElement('div');
  overlay.id = 'installOverlay';
  overlay.className = 'fixed inset-0 bg-black/30 backdrop-blur-sm z-40 opacity-0 transition-opacity duration-300';
  document.body.appendChild(overlay);

  // Buat popup (bottom sheet style)
  const popup = document.createElement('div');
  popup.id = 'installPopup';
  popup.className = `
    fixed bottom-0 left-0 right-0 
    bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
    rounded-t-2xl shadow-2xl p-4 pb-6 z-50 
    translate-y-full transition-transform duration-300
  `;
  popup.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-base font-semibold">📱 Instal BayarInternet</h2>
      <button id="btnCloseInstall" class="text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 text-lg">&times;</button>
    </div>
    <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
      Pasang aplikasi ini agar bisa diakses lebih cepat.
    </p>
    <div class="flex justify-end gap-3">
      <button id="btnLaterInstall" class="text-sm px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
        Nanti saja
      </button>
      <button id="btnInstallApp" class="text-sm px-4 py-2 rounded-lg bg-primary text-white hover:bg-teal-700">
        Pasang Sekarang
      </button>
    </div>
  `;
  document.body.appendChild(popup);

  // Sedikit animasi masuk
  requestAnimationFrame(() => {
    overlay.classList.add('opacity-100');
    popup.classList.remove('translate-y-full');
  if (navigator.vibrate) navigator.vibrate(20);
  });

  // Tutup popup fungsi
  function closeInstallPopup() {
    popup.classList.add('translate-y-full');
    overlay.classList.remove('opacity-100');
    setTimeout(() => {
      popup.remove();
      overlay.remove();
    }, 300);
  }

  // Klik tombol Pasang
  $('btnInstallApp').addEventListener('click', async () => {
    closeInstallPopup();
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') toast('✅ Aplikasi terpasang');
    deferredPrompt = null;
  });

  // Klik Nanti / Tutup / Overlay
  $('btnLaterInstall').addEventListener('click', closeInstallPopup);
  $('btnCloseInstall').addEventListener('click', closeInstallPopup);
  overlay.addEventListener('click', closeInstallPopup);
});


window.addEventListener('appinstalled', () => {
  const popup = document.getElementById('installPopup');
  if (popup) popup.remove();
  toast('📲 Aplikasi siap digunakan');
});

// /* =========================================================
//    USERS SECTION - v1.3r1 (Modal + Aksi lengkap)
//    ========================================================= */

// // Dummy data sementara
// let users = [
//   {
//     id: "79a68715-5226-4e87-a1dd-26551f4f0df3",
//     reseller_id: "59ec812b-d43d-4998-9326-3448ce416e20",
//     username: "budi",
//     full_name: "Budi Santoso",
//     phone: "+628123456789",
//     email: "budi@example.com",
//     alamat: "Jl. Merdeka No.1",
//     profile_id: "eab81939-89b4-44bb-8104-1c76b22c3d89",
//     status: "active",
//     active_until: "2025-10-31",
//     is_active: true,
//     created_at: "2025-10-03T00:09:31.983105+00:00",
//     updated_at: "2025-10-03T00:09:31.983105+00:00"
//   }
// ];


// // Render tabel pelanggan
// function renderUsers(filter = 'all', search = '') {
//   const tbody = $('userTable');
//   let filtered = users;

//   if (filter !== 'all') filtered = filtered.filter(u => u.status === filter);
//   if (search)
//     filtered = filtered.filter(u =>
//       u.nama.toLowerCase().includes(search.toLowerCase()) ||
//       u.email.toLowerCase().includes(search.toLowerCase())
//     );

//   tbody.innerHTML = filtered.map((u, i) => `
//   <tr class="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
//     <td class="p-2">${u.full_name}</td>
//     <td class="p-2">${u.email}</td>
//     <td class="p-2 text-center">
//       <span class="px-2 py-1 rounded-full text-xs ${
//         u.status === 'active'
//           ? 'bg-green-100 text-green-700'
//           : 'bg-red-100 text-red-700'
//       }">${u.status}</span>
//     </td>
//     <td class="p-2 text-center flex items-center justify-center gap-2">
//       <button title="Detail" class="text-primary" onclick="viewUserDetail(${i})">🧾</button>
//       <button title="Edit" class="text-blue-600" onclick="editUser(${i})">✏️</button>
//       <button title="Ubah status" class="text-yellow-600" onclick="toggleStatus(${i})">🔄</button>
//       <button title="Hapus" class="text-red-600" onclick="deleteUser(${i})">🗑️</button>
//     </td>
//   </tr>
// `).join('');

// }

// // Filter dan pencarian
// $('filterStatus').addEventListener('change', () => renderUsers($('filterStatus').value, $('searchUser').value));
// $('searchUser').addEventListener('input', () => renderUsers($('filterStatus').value, $('searchUser').value));

// =========================================================
// Modal Helpers
// =========================================================
function openModal({ title, body, onSave }) {
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = body;
  $('modalSave').onclick = onSave;
  $('modalCancel').onclick = () => hide($('modal'));
  show($('modal'));
}
function closeModal() { hide($('modal')); }

// // =========================================================
// // CRUD Pelanggan (local dummy)
// // =========================================================

// // Tambah pelanggan
// // Tambah pelanggan (v1.3r3)
// $('btnAddUser').addEventListener('click', () => {
//   openModal({
//     title: 'Tambah Pelanggan',
//     body: `
//       <div class="space-y-2 text-sm">
//         <input id="usernameUser" placeholder="Username" class="w-full border p-2 rounded">
//         <input id="passwordUser" type="password" placeholder="Kata sandi" class="w-full border p-2 rounded">
//         <input id="fullNameUser" placeholder="Nama lengkap" class="w-full border p-2 rounded">
//         <input id="phoneUser" placeholder="Nomor telepon" class="w-full border p-2 rounded">
//         <input id="emailUser" type="email" placeholder="Email" class="w-full border p-2 rounded">
//         <textarea id="alamatUser" placeholder="Alamat pelanggan" class="w-full border p-2 rounded"></textarea>
//         <input id="profileIdUser" placeholder="Profile ID" class="w-full border p-2 rounded">
//         <label class="block text-gray-600 mt-1">Aktif sampai:</label>
//         <input id="activeUntilUser" type="date" class="w-full border p-2 rounded">
//         <select id="statusUser" class="w-full border p-2 rounded">
//           <option value="active">Aktif</option>
//           <option value="suspended">Suspend</option>
//         </select>
//       </div>
//     `,
//     onSave: () => {
//       const newUser = {
//         id: crypto.randomUUID(),
//         reseller_id: localStorage.getItem('reseller_id') || 'dummy-reseller',
//         username: $('usernameUser').value.trim(),
//         password: $('passwordUser').value.trim(),
//         full_name: $('fullNameUser').value.trim(),
//         phone: $('phoneUser').value.trim(),
//         email: $('emailUser').value.trim(),
//         alamat: $('alamatUser').value.trim(),
//         profile_id: $('profileIdUser').value.trim(),
//         active_until: $('activeUntilUser').value,
//         status: $('statusUser').value,
//         is_active: $('statusUser').value === 'active',
//         created_at: new Date().toISOString(),
//         updated_at: new Date().toISOString()
//       };

//       // Validasi sederhana
//       if (!newUser.username || !newUser.full_name || !newUser.email)
//         return toast('❗ Lengkapi semua data utama');

//       users.push(newUser);
//       renderUsers();
//       refreshDashboard();
//       closeModal();
//       toast('✅ Pelanggan ditambahkan');
//     }
//   });
// });


// // Edit pelanggan
// // Edit pelanggan (v1.3r3)
// window.editUser = i => {
//   const u = users[i];
//   openModal({
//     title: 'Edit Pelanggan',
//     body: `
//       <div class="space-y-2 text-sm">
//         <input id="usernameUserEdit" value="${u.username}" placeholder="Username" class="w-full border p-2 rounded">
//         <input id="fullNameUserEdit" value="${u.full_name}" placeholder="Nama lengkap" class="w-full border p-2 rounded">
//         <input id="phoneUserEdit" value="${u.phone}" placeholder="Nomor telepon" class="w-full border p-2 rounded">
//         <input id="emailUserEdit" value="${u.email}" type="email" placeholder="Email" class="w-full border p-2 rounded">
//         <textarea id="alamatUserEdit" class="w-full border p-2 rounded" placeholder="Alamat">${u.alamat}</textarea>
//         <input id="profileIdUserEdit" value="${u.profile_id}" placeholder="Profile ID" class="w-full border p-2 rounded">
//         <label class="block text-gray-600 mt-1">Aktif sampai:</label>
//         <input id="activeUntilUserEdit" type="date" value="${u.active_until?.split('T')[0] || ''}" class="w-full border p-2 rounded">
//         <select id="statusUserEdit" class="w-full border p-2 rounded">
//           <option value="active" ${u.status === 'active' ? 'selected' : ''}>Aktif</option>
//           <option value="suspended" ${u.status === 'suspended' ? 'selected' : ''}>Suspend</option>
//         </select>
//       </div>
//     `,
//     onSave: () => {
//       users[i] = {
//         ...u,
//         username: $('usernameUserEdit').value.trim(),
//         full_name: $('fullNameUserEdit').value.trim(),
//         phone: $('phoneUserEdit').value.trim(),
//         email: $('emailUserEdit').value.trim(),
//         alamat: $('alamatUserEdit').value.trim(),
//         profile_id: $('profileIdUserEdit').value.trim(),
//         active_until: $('activeUntilUserEdit').value,
//         status: $('statusUserEdit').value,
//         is_active: $('statusUserEdit').value === 'active',
//         updated_at: new Date().toISOString()
//       };
//       renderUsers($('filterStatus').value);
//       closeModal();
//       toast('✏️ Data pelanggan diperbarui');
//     }
//   });
// };


// // Toggle status (active ↔ suspend)
// window.toggleStatus = i => {
//   users[i].status = users[i].status === 'active' ? 'suspend' : 'active';
//   renderUsers($('filterStatus').value);
//   toast(`🔄 Status diubah menjadi ${users[i].status}`);
// };

// // Hapus pelanggan
// window.deleteUser = i => {
//   if (confirm(`Hapus pelanggan ${users[i].nama}?`)) {
//     users.splice(i, 1);
//     renderUsers($('filterStatus').value);
//     toast('🗑️ Pelanggan dihapus');
//   }
// };

// =========================================================
// Detail Pelanggan (v1.3r4 - UI rapi & informatif)
// =========================================================
// window.viewUserDetail = i => {
//   const u = users[i];
//   const active = u.status === 'active' ? '🟢 Aktif' : '🔴 Suspend';
//   const activeClass =
//     u.status === 'active'
//       ? 'bg-green-100 text-green-700'
//       : 'bg-red-100 text-red-700';

//   openModal({
//     title: 'Detail Pelanggan',
//     body: `
//       <div class="text-sm space-y-3">
//         <!-- HEADER -->
//         <div class="flex items-center gap-3 border-b pb-2 mb-2">
//           <div class="w-12 h-12 flex items-center justify-center rounded-full bg-primary text-white font-bold text-lg">
//             ${u.full_name?.charAt(0) || 'U'}
//           </div>
//           <div>
//             <p class="font-semibold text-base">${u.full_name}</p>
//             <p class="text-gray-500 text-xs">${u.username}</p>
//           </div>
//         </div>

//         <!-- INFO UTAMA -->
//         <div class="space-y-1">
//           <p><span class="font-medium">📧 Email:</span> ${u.email || '-'}</p>
//           <p><span class="font-medium">📱 Telepon:</span> ${u.phone || '-'}</p>
//           <p><span class="font-medium">🏠 Alamat:</span> ${u.alamat || '-'}</p>
//           <p><span class="font-medium">📦 Profile ID:</span> ${u.profile_id || '-'}</p>
//           <p><span class="font-medium">🗓️ Aktif sampai:</span> ${u.active_until ? new Date(u.active_until).toLocaleDateString('id-ID') : '-'}</p>
//         </div>

//         <!-- STATUS -->
//         <div class="mt-3">
//           <p><span class="font-medium">Status:</span>
//             <span class="px-2 py-1 rounded-full text-xs ${activeClass} ml-1">${active}</span>
//           </p>
//           <p class="text-gray-500 text-xs mt-1">Diperbarui: ${new Date(u.updated_at).toLocaleString('id-ID')}</p>
//         </div>

//         <!-- META -->
//         <div class="mt-4 border-t pt-2 text-xs text-gray-500">
//           <p><b>ID Pelanggan:</b> ${u.id}</p>
//           <p><b>Dibuat:</b> ${new Date(u.created_at).toLocaleString('id-ID')}</p>
//         </div>
//       </div>
//     `,
//     onSave: () => closeModal()
//   });

//   $('modalSave').textContent = 'Tutup';
// };

// /* =========================================================
//    INVOICES SECTION - v1.5r3 (Konsisten dengan User Section)
//    ========================================================= */

// let invoices = [
//   {
//     id: "b65ca403-7129-4980-a8ae-8d163e8fd5fe",
//     user_id: "79a68715-5226-4e87-a1dd-26551f4f0df3",
//     profile_id: "4404a803-94af-4d94-8dfb-26ec39d62b1e",
//     amount: 100000,
//     status: "paid",
//     period_start: "2025-11-16",
//     period_end: "2026-01-14",
//     created_at: "2025-10-03T00:31:26.436652+00:00",
//     updated_at: "2025-10-03T00:31:26.436652+00:00",
//     paid_at: null,
//     meta: {
//       phone: "628562603077",
//       months: 2,
//       username: "budi",
//       full_name: "Budi S. Updated",
//       unit_price: "50000.00",
//       profile_name: "Paket Shared"
//     }
//   }
// ];

// // =========================================================
// // Helper: Kelas warna status
// // =========================================================
// const statusClass = s =>
//   s === "paid"
//     ? "bg-green-100 text-green-700"
//     : s === "unpaid"
//     ? "bg-yellow-100 text-yellow-700"
//     : s === "overdue"
//     ? "bg-red-100 text-red-700"
//     : "bg-gray-100 text-gray-600";

// /* =========================================================
//    RENDER INVOICES (v1.5r4)
//    Konsisten dengan renderUsers()
//    ========================================================= */
// function renderInvoices(filter = "all", search = "") {
//   const tbody = $("invoiceTable");
//   if (!tbody) return;

//   let filtered = [...invoices];

//   // Filter status
//   if (filter !== "all") filtered = filtered.filter(inv => inv.status === filter);

//   // Pencarian
//   if (search)
//     filtered = filtered.filter(inv =>
//       (inv.meta?.full_name || "")
//         .toLowerCase()
//         .includes(search.toLowerCase()) ||
//       (inv.meta?.profile_name || "")
//         .toLowerCase()
//         .includes(search.toLowerCase()) ||
//       (inv.id || "")
//         .toLowerCase()
//         .includes(search.toLowerCase())
//     );

//   // Render tabel
//   tbody.innerHTML = filtered.length
//     ? filtered
//         .map(
//           (inv, i) => `
//       <tr class="border-b hover:bg-gray-50 dark:hover:bg-gray-700 transition">
//         <td class="p-2">${inv.meta?.full_name || "—"}</td>
//         <td class="p-2">${inv.meta?.profile_name || "—"}</td>
//         <td class="p-2 text-right">Rp ${(inv.amount || 0).toLocaleString("id-ID")}</td>
//         <td class="p-2 text-center">
//           <span class="px-2 py-1 rounded-full text-xs font-medium ${statusClass(
//             inv.status
//           )}">
//             ${inv.status}
//           </span>
//         </td>
//         <td class="p-2 text-center flex items-center justify-center gap-2">
//           <button title="Detail" class="text-primary" onclick="viewInvoiceDetail(${i})">🧾</button>
//           <button title="Toggle Paid" class="text-green-600" onclick="toggleInvoiceStatus(${i})">💰</button>
//           <button title="Print" class="text-indigo-600" onclick="printInvoice(${i})">🖨️</button>
//           <button title="Hapus" class="text-red-600" onclick="deleteInvoice(${i})">🗑️</button>
//         </td>
//       </tr>`
//         )
//         .join("")
//     : `<tr><td colspan="5" class="text-center py-3 text-gray-500">Tidak ada tagihan</td></tr>`;
// }

// // Event filter & search (optional jika sudah ada di HTML)
// $("filterInvoice")?.addEventListener("change", () =>
//   renderInvoices($("filterInvoice").value, $("searchInvoice")?.value || "")
// );
// $("searchInvoice")?.addEventListener("input", () =>
//   renderInvoices($("filterInvoice")?.value || "all", $("searchInvoice").value)
// );
 

// // =========================================================
// // Tambah tagihan (modal)
// // =========================================================
// $("btnTambahInvoice").addEventListener("click", () => {
//   openModal({
//     title: "Tambah Tagihan",
//     body: `
//       <div class="space-y-2 text-sm">
//         <input id="invUserId" placeholder="ID Pelanggan" class="w-full border p-2 rounded">
//         <input id="invMonths" type="number" placeholder="Jumlah Bulan" class="w-full border p-2 rounded">
//       </div>
//     `,
//     onSave: () => {
//       const user_id = $("invUserId").value.trim();
//       const months = parseInt($("invMonths").value) || 1;
//       if (!user_id) return toast("❗ Isi ID Pelanggan");

//       // Dummy data baru
//       const now = new Date();
//       const start = new Date(now.getFullYear(), now.getMonth() + 1, 15);
//       const end = new Date(start.getFullYear(), start.getMonth() + months, 14);
//       const inv = {
//         id: crypto.randomUUID(),
//         user_id,
//         amount: 50000 * months,
//         status: "unpaid",
//         period_start: start.toISOString().split("T")[0],
//         period_end: end.toISOString().split("T")[0],
//         created_at: new Date().toISOString(),
//         updated_at: new Date().toISOString(),
//         paid_at: null,
//         meta: {
//           full_name: "Nama Pelanggan",
//           profile_name: "Paket Shared",
//           months,
//           unit_price: "50000.00"
//         }
//       };

//       invoices.push(inv);
//       renderInvoices($("filterInvoice").value);
//       refreshDashboard();
//       closeModal();
//       toast("✅ Tagihan ditambahkan");
//     }
//   });
// });

// // =========================================================
// // Detail tagihan (modal)
// // =========================================================
// window.viewInvoiceDetail = i => {
//   const inv = invoices[i];
//   if (!inv) return toast("❗ Data tidak ditemukan");
//   const m = inv.meta || {};

//   openModal({
//     title: "Detail Tagihan",
//     body: `
//       <div class="text-sm space-y-3">
//         <div class="flex items-center justify-between border-b pb-2 mb-2">
//           <p class="font-medium">${m.full_name || "-"}</p>
//           <span class="px-2 py-1 rounded-full text-xs ${statusClass(inv.status)}">${inv.status}</span>
//         </div>
//         <p><b>Paket:</b> ${m.profile_name || "-"}</p>
//         <p><b>Periode:</b> ${inv.period_start} → ${inv.period_end}</p>
//         <p><b>Jumlah Bulan:</b> ${m.months || 1}</p>
//         <p><b>Harga Satuan:</b> Rp ${(m.unit_price || 0).toLocaleString("id-ID")}</p>
//         <p><b>Total:</b> Rp ${(inv.amount || 0).toLocaleString("id-ID")}</p>
//         <p><b>Dibayar:</b> ${
//           inv.paid_at
//             ? new Date(inv.paid_at).toLocaleString("id-ID")
//             : "Belum dibayar"
//         }</p>
//         <div class="text-right mt-3">
//           <button class="bg-primary text-white px-4 py-2 rounded-lg hover:bg-teal-700" onclick="printInvoice(${i})">🖨️ Print Tagihan</button>
//         </div>
//       </div>
//     `,
//     onSave: () => closeModal()
//   });
//   $("modalSave").textContent = "Tutup";
// };

// // =========================================================
// // Toggle paid/unpaid
// // =========================================================
// window.toggleInvoiceStatus = i => {
//   const inv = invoices[i];
//   if (!inv) return;
//   inv.status = inv.status === "paid" ? "unpaid" : "paid";
//   inv.paid_at = inv.status === "paid" ? new Date().toISOString() : null;
//   inv.updated_at = new Date().toISOString();
//   renderInvoices($("filterInvoice").value);
//   toast(inv.status === "paid" ? "💰 Ditandai Lunas" : "💸 Ditandai Belum Dibayar");
// };

// // =========================================================
// // Print tagihan
// // =========================================================
// window.printInvoice = i => {
//   const inv = invoices[i];
//   const m = inv.meta || {};
//   const html = `
//     <html>
//       <head><title>Cetak Tagihan</title></head>
//       <body style="font-family:sans-serif;line-height:1.5;margin:30px;">
//         <h2 style="color:#0d9488;">BayarInter Billing</h2>
//         <hr>
//         <p><b>Nama:</b> ${m.full_name || "-"}</p>
//         <p><b>Paket:</b> ${m.profile_name || "-"}</p>
//         <p><b>Periode:</b> ${inv.period_start} → ${inv.period_end}</p>
//         <p><b>Bulan:</b> ${m.months || 1}</p>
//         <p><b>Total:</b> Rp ${(inv.amount || 0).toLocaleString("id-ID")}</p>
//         <p><b>Status:</b> ${inv.status}</p>
//         <hr>
//         <p><small>Dicetak: ${new Date().toLocaleString("id-ID")}</small></p>
//       </body>
//     </html>
//   `;
//   const win = window.open("", "_blank");
//   win.document.write(html);
//   win.document.close();
//   win.print();
// };

// // =========================================================
// // Hapus tagihan
// // =========================================================
// window.deleteInvoice = i => {
//   if (!confirm("Hapus tagihan ini?")) return;
//   invoices.splice(i, 1);
//   renderInvoices($("filterInvoice").value);
//   toast("🗑️ Tagihan dihapus");
// };

// // =========================================================
// // Inisialisasi
// // =========================================================
// window.addEventListener("load", () => {
//   const f = $("filterInvoice");
//   if (f) {
//     f.value = "all";
//     renderInvoices("all");
//   }
// });

// /* =========================================================
//    PROFILES (Paket Internet)
//    Version: v1.6
//    ========================================================= */

// let profiles = [
//   {
//     id: "pkg1",
//     type: "group",
//     name: "Paket Shared",
//     price: 50000,
//     group_name: "coba",
//     is_active: true
//   },
//   {
//     id: "pkg2",
//     type: "custom",
//     name: "Paket 10Mbps",
//     price: 100000,
//     rate_limit_up: "10M",
//     rate_limit_down: "10M",
//     burst_limit_up: "12M",
//     burst_limit_down: "12M",
//     burst_time_up: 30,
//     burst_time_down: 30,
//     priority: 8,
//     min_rate_up: "1MB",
//     min_rate_down: "1MB",
//     is_active: true
//   }
// ];

// // ====================== Render List ======================
// function renderProfiles(filter = "all", search = "") {
//   const tbody = $("profileTable");
//   if (!tbody) return;

//   let list = profiles;
//   if (filter === "group") list = list.filter(p => p.type === "group");
//   if (filter === "custom") list = list.filter(p => p.type === "custom");
//   if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

//   tbody.innerHTML = list.map((p, i) => `
//     <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
//       <td class="p-2">${p.name}</td>
//       <td class="p-2 capitalize">${p.type}</td>
//       <td class="p-2 text-right">Rp ${(p.price || 0).toLocaleString("id-ID")}</td>
//       <td class="p-2 text-center">
//         <span class="px-2 py-1 rounded-full text-xs ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
//           ${p.is_active ? 'Aktif' : 'Nonaktif'}
//         </span>
//       </td>
//       <td class="p-2 text-center flex items-center justify-center gap-2">
//         <button title="Detail" class="text-primary" onclick="viewProfile(${i})">🧾</button>
//         <button title="Edit" class="text-blue-600" onclick="editProfile(${i})">✏️</button>
//         <button title="Ubah Status" class="text-yellow-600" onclick="toggleProfileStatus(${i})">🔄</button>
//         <button title="Hapus" class="text-red-600" onclick="deleteProfile(${i})">🗑️</button>
//       </td>
//     </tr>
//   `).join("") || `<tr><td colspan="5" class="text-center py-3 text-gray-500">Tidak ada paket</td></tr>`;
// }

// // ====================== Filter & Search ======================
// $("filterProfile").addEventListener("change", () =>
//   renderProfiles($("filterProfile").value, $("searchProfile").value)
// );
// $("searchProfile").addEventListener("input", () =>
//   renderProfiles($("filterProfile").value, $("searchProfile").value)
// );

// // ====================== Tambah Paket ======================
// $("btnAddProfile").addEventListener("click", () => {
//   openModal({
//     title: "Tambah Paket",
//     body: `
//       <div class="space-y-2 text-sm">
//         <select id="profileType" class="w-full border p-2 rounded">
//           <option value="group">Group</option>
//           <option value="custom">Custom Speed</option>
//         </select>
//         <input id="profileName" placeholder="Nama Paket" class="w-full border p-2 rounded">
//         <input id="profilePrice" type="number" placeholder="Harga" class="w-full border p-2 rounded">
//         <div id="groupFields" class="space-y-2">
//           <input id="groupName" placeholder="Group Name" class="w-full border p-2 rounded">
//         </div>
//         <div id="customFields" class="hidden space-y-2">
//           <input id="rateUp" placeholder="Rate Limit Up (mis. 10M)" class="w-full border p-2 rounded">
//           <input id="rateDown" placeholder="Rate Limit Down (mis. 10M)" class="w-full border p-2 rounded">
//           <input id="burstUp" placeholder="Burst Limit Up" class="w-full border p-2 rounded">
//           <input id="burstDown" placeholder="Burst Limit Down" class="w-full border p-2 rounded">
//           <input id="burstTimeUp" type="number" placeholder="Burst Time Up (detik)" class="w-full border p-2 rounded">
//           <input id="burstTimeDown" type="number" placeholder="Burst Time Down (detik)" class="w-full border p-2 rounded">
//           <input id="priority" type="number" placeholder="Prioritas" class="w-full border p-2 rounded">
//           <input id="minUp" placeholder="Min Rate Up" class="w-full border p-2 rounded">
//           <input id="minDown" placeholder="Min Rate Down" class="w-full border p-2 rounded">
//         </div>
//       </div>
//     `,
//     onSave: () => {
//       const type = $("profileType").value;
//       const name = $("profileName").value.trim();
//       const price = parseInt($("profilePrice").value);
//       if (!name || !price) return toast("❗ Lengkapi nama dan harga");

//       const newProfile = { id: crypto.randomUUID(), name, price, type, is_active: true };
//       if (type === "group") {
//         newProfile.group_name = $("groupName").value.trim();
//       } else {
//         Object.assign(newProfile, {
//           rate_limit_up: $("rateUp").value.trim(),
//           rate_limit_down: $("rateDown").value.trim(),
//           burst_limit_up: $("burstUp").value.trim(),
//           burst_limit_down: $("burstDown").value.trim(),
//           burst_time_up: Number($("burstTimeUp").value),
//           burst_time_down: Number($("burstTimeDown").value),
//           priority: Number($("priority").value),
//           min_rate_up: $("minUp").value.trim(),
//           min_rate_down: $("minDown").value.trim(),
//         });
//       }

//       profiles.push(newProfile);
//       renderProfiles();
//       closeModal();
//       toast("✅ Paket ditambahkan");
//     },
//   });

//   // Event switch form
//   $("profileType").addEventListener("change", e => {
//     const type = e.target.value;
//     if (type === "custom") {
//       show($("customFields"));
//       hide($("groupFields"));
//     } else {
//       hide($("customFields"));
//       show($("groupFields"));
//     }
//   });
// });

// // ====================== Edit Paket ======================
// window.editProfile = i => {
//   const p = profiles[i];
//   openModal({
//     title: "Edit Paket",
//     body: `
//       <div class="space-y-2 text-sm">
//         <input id="profileNameEdit" value="${p.name}" class="w-full border p-2 rounded">
//         <input id="profilePriceEdit" type="number" value="${p.price}" class="w-full border p-2 rounded">
//       </div>
//     `,
//     onSave: () => {
//       p.name = $("profileNameEdit").value.trim();
//       p.price = parseInt($("profilePriceEdit").value);
//       renderProfiles();
//       closeModal();
//       toast("✏️ Paket diperbarui");
//     }
//   });
// };

// // ====================== Toggle Status ======================
// window.toggleProfileStatus = i => {
//   profiles[i].is_active = !profiles[i].is_active;
//   renderProfiles($("filterProfile").value);
//   toast(`🔄 Status diubah menjadi ${profiles[i].is_active ? "Aktif" : "Nonaktif"}`);
// };

// // ====================== Hapus Paket ======================
// window.deleteProfile = i => {
//   if (!confirm(`Hapus paket ${profiles[i].name}?`)) return;
//   profiles.splice(i, 1);
//   renderProfiles($("filterProfile").value);
//   toast("🗑️ Paket dihapus");
// };

// // ====================== Detail Paket ======================
// window.viewProfile = i => {
//   const p = profiles[i];
//   const type = p.type === "group" ? "Group" : "Custom Speed";
//   const body = p.type === "group"
//     ? `
//       <p><b>Nama Paket:</b> ${p.name}</p>
//       <p><b>Group Name:</b> ${p.group_name || "-"}</p>
//       <p><b>Harga:</b> Rp ${(p.price || 0).toLocaleString("id-ID")}</p>
//     `
//     : `
//       <p><b>Nama Paket:</b> ${p.name}</p>
//       <p><b>Harga:</b> Rp ${(p.price || 0).toLocaleString("id-ID")}</p>
//       <p><b>Rate Limit:</b> ${p.rate_limit_up}/${p.rate_limit_down}</p>
//       <p><b>Burst:</b> ${p.burst_limit_up}/${p.burst_limit_down}</p>
//       <p><b>Burst Time:</b> ${p.burst_time_up}s / ${p.burst_time_down}s</p>
//       <p><b>Priority:</b> ${p.priority}</p>
//       <p><b>Min Rate:</b> ${p.min_rate_up}/${p.min_rate_down}</p>
//     `;

//   openModal({
//     title: `Detail Paket (${type})`,
//     body: `<div class="text-sm space-y-1">${body}</div>`,
//     onSave: () => closeModal()
//   });
//   $("modalSave").textContent = "Tutup";
// };

// /* =========================================================
//    PAYMENTS SECTION (v1.6r1)
//    ========================================================= */

// let payments = [
//   {
//     id: 6,
//     invoice_id: "b65ca403-7129-4980-a8ae-8d163e8fd5fe",
//     amount: 100000,
//     method: "manual",
//     provider_txn_id: null,
//     status: "success",
//     paid_at: "2025-10-03T06:30:32.226772+00:00",
//     created_at: "2025-10-03T06:30:32.547224+00:00"
//   }
// ];

// // Helper status badge
// const getPaymentStatusClass = s =>
//   s === "success" ? "bg-green-100 text-green-700" :
//   s === "failed" ? "bg-red-100 text-red-700" :
//   "bg-gray-100 text-gray-600";

// // Render tabel pembayaran
// function renderPayments(filter = 'all', search = '') {
//   const tbody = $('paymentTable');
//   let list = [...payments];

//   if (filter !== 'all') list = list.filter(p => p.status === filter);
//   if (search)
//     list = list.filter(p =>
//       p.id.toLowerCase().includes(search.toLowerCase()) ||
//       p.method.toLowerCase().includes(search.toLowerCase())
//     );

//   tbody.innerHTML = list.map((p, i) => `
//     <tr class="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
//       <td class="p-2">${p.id}</td>
//       <td class="p-2">${p.method}</td>
//       <td class="p-2 text-right">Rp ${(p.amount || 0).toLocaleString('id-ID')}</td>
//       <td class="p-2 text-center">
//         <span class="px-2 py-1 rounded-full text-xs ${getPaymentStatusClass(p.status)}">${p.status}</span>
//       </td>
//       <td class="p-2 text-center flex items-center justify-center gap-2">
//         <button class="text-primary" title="Detail" onclick="viewPaymentDetail(${i})">🧾</button>
//         <button class="text-red-600" title="Hapus" onclick="deletePayment(${i})">🗑️</button>
//       </td>
//     </tr>
//   `).join('') || `<tr><td colspan="5" class="text-center py-3 text-gray-500">Tidak ada pembayaran</td></tr>`;
// }

// // Filter dan pencarian
// $('filterPayment').addEventListener('change', () =>
//   renderPayments($('filterPayment').value, $('searchPayment').value)
// );
// $('searchPayment').addEventListener('input', () =>
//   renderPayments($('filterPayment').value, $('searchPayment').value)
// );

// // Tambah pembayaran
// $('btnAddPayment').addEventListener('click', () => {
//   openModal({
//     title: 'Tambah Pembayaran',
//     body: `
//       <div class="space-y-2 text-sm">
//         <input id="payInvoiceId" placeholder="ID Invoice" class="w-full border p-2 rounded">
//         <input id="payAmount" type="number" placeholder="Jumlah" class="w-full border p-2 rounded">
//         <input id="payMethod" placeholder="Metode (contoh: bank_transfer)" class="w-full border p-2 rounded">
//         <input id="payProviderTxn" placeholder="Provider TXN ID (opsional)" class="w-full border p-2 rounded">
//       </div>
//     `,
//     onSave: () => {
//       const p = {
//         id: Date.now(),
//         invoice_id: $('payInvoiceId').value.trim(),
//         amount: parseFloat($('payAmount').value) || 0,
//         method: $('payMethod').value.trim(),
//         provider_txn_id: $('payProviderTxn').value.trim() || null,
//         status: "success",
//         paid_at: new Date().toISOString(),
//         created_at: new Date().toISOString()
//       };

//       if (!p.invoice_id || !p.amount || !p.method)
//         return toast("❗ Lengkapi semua data utama");

//       payments.push(p);
//       renderPayments();
//       closeModal();
//       toast("✅ Pembayaran ditambahkan");
//     }
//   });
// });

// // Detail pembayaran
// window.viewPaymentDetail = i => {
//   const p = payments[i];
//   openModal({
//     title: 'Detail Pembayaran',
//     body: `
//       <div class="text-sm space-y-2">
//         <div class="flex justify-between"><span>Invoice ID:</span><span>${p.invoice_id}</span></div>
//         <div class="flex justify-between"><span>Metode:</span><span>${p.method}</span></div>
//         <div class="flex justify-between"><span>Jumlah:</span><span>Rp ${(p.amount || 0).toLocaleString('id-ID')}</span></div>
//         <div class="flex justify-between"><span>Status:</span>
//           <span class="px-2 py-1 rounded-full text-xs ${getPaymentStatusClass(p.status)}">${p.status}</span>
//         </div>
//         <div class="flex justify-between"><span>Dibayar:</span><span>${new Date(p.paid_at).toLocaleString('id-ID')}</span></div>
//         <div class="flex justify-between"><span>Provider TXN:</span><span>${p.provider_txn_id || '—'}</span></div>
//         <div class="flex justify-between"><span>Dibuat:</span><span>${new Date(p.created_at).toLocaleString('id-ID')}</span></div>
//       </div>
//     `,
//     onSave: () => closeModal()
//   });
//   $('modalSave').textContent = 'Tutup';
// };

// // Hapus pembayaran
// window.deletePayment = i => {
//   if (!confirm("Hapus pembayaran ini?")) return;
//   payments.splice(i, 1);
//   renderPayments($('filterPayment').value);
//   toast("🗑️ Pembayaran dihapus");
// };
// /* =========================================================
//    DASHBOARD - v1.6r4
//    ========================================================= */

// let resellerProfile = {
//   company_name: "PT Internet Cepat",
//   address: "Jl. Merdeka No. 45, Bandung",
//   logo: "static/logo.png"
// };

// // Update info reseller
// function renderResellerInfo() {
//   $("companyName").textContent = resellerProfile.company_name;
//   $("companyAddress").textContent = resellerProfile.address;
//   $("resellerLogo").src = resellerProfile.logo;
// }

// // Hitung pendapatan bulan ini
// function updateMonthlyIncome() {
//   const now = new Date();
//   const month = now.getMonth();
//   const year = now.getFullYear();

//   const paidInvoices = invoices.filter(i => {
//     if (i.status !== "paid" || !i.paid_at) return false;
//     const paidDate = new Date(i.paid_at);
//     return paidDate.getMonth() === month && paidDate.getFullYear() === year;
//   });

//   const total = paidInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
//   $("monthlyIncomeHeader").textContent = `Rp ${total.toLocaleString("id-ID")}`;
// }
// // Hitung total pelanggan & tagihan aktif
// function updateDashboardStats() {
//   const totalUsers = users.length;
//   const activeInvoices = invoices.filter(i => i.status === "unpaid").length;
//   $("totalUsers").textContent = totalUsers;
//   $("totalInvoices").textContent = activeInvoices;
// }

// // Render ulang dashboard
// function refreshDashboard() {
//   renderResellerInfo();
//   updateMonthlyIncome();
//   updateDashboardStats();
// }
// // Edit profil reseller
// $("editResellerBtn")?.addEventListener("click", () => {
//   openModal({
//     title: "Edit Profil Reseller",
//     body: `
//       <div class="space-y-2 text-sm">
//         <input id="companyNameInput" value="${resellerProfile.company_name}" placeholder="Nama Perusahaan" class="w-full border p-2 rounded">
//         <textarea id="companyAddressInput" class="w-full border p-2 rounded" placeholder="Alamat">${resellerProfile.address}</textarea>
//         <input id="companyLogoInput" value="${resellerProfile.logo}" placeholder="URL Logo" class="w-full border p-2 rounded">
//       </div>
//     `,
//     onSave: () => {
//       resellerProfile.company_name = $("companyNameInput").value.trim();
//       resellerProfile.address = $("companyAddressInput").value.trim();
//       resellerProfile.logo = $("companyLogoInput").value.trim();
//       renderResellerInfo();
//       closeModal();
//       toast("🏢 Profil reseller diperbarui");
//     }
//   });
// });

// // Jalankan otomatis saat dashboard tampil
// window.addEventListener("load", () => {
//   renderResellerInfo();
//   updateMonthlyIncome();
//   setInterval(refreshDashboard, 10000);

// });
 


// Navigasi antar halaman
document.querySelectorAll('[data-nav]').forEach(btn => {
  btn.addEventListener('click', e => {
    const target = e.currentTarget.dataset.nav;
    const sections = ['dashboard', 'users', 'invoices', 'invoices', 'profiles', 'settings', 'auth', 'payments'];
    sections.forEach(id => hide($(id + 'Section')));
    // show($(target + 'Section'));
    showSection(target);
    if (target === 'users') renderUsers();
    if (target === 'invoices') renderInvoices(); 
    if (target === 'profiles') renderProfiles();
    if (target === 'payments') renderPayments();
  });
});
