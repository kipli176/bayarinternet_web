/* =========================================================
   BayarInter Billing Reseller
   File: dashboard.js (v2 API Integrated)
   Stage: Replace old dashboard block in app.js
   ========================================================= */

// Data cache dasar (agar tampil cepat sebelum API load)
var resellerProfile = {
  company_name: "Memuat...",
  alamat: "-",
  logo: "static/logo.png"
};

let dashboardCache = {
  users: [],
  invoices: []
};

// =========================================================
// Render Info Reseller ke UI
// =========================================================
function renderResellerInfo(reseller = resellerProfile) {
  $("companyName").textContent = reseller.company_name || reseller.name || "-";
  $("companyAddress").textContent = reseller.alamat || reseller.address || "-";
  $("resellerLogo").src = reseller.logo || "static/logo.png";
}

// =========================================================
// Update Statistik Pelanggan & Tagihan
// =========================================================
function updateDashboardStats(users = [], invoices = []) {
  $("totalUsers").textContent = users.length;
  const activeInvoices = invoices.filter(i => i.status === "unpaid").length;
  $("totalInvoices").textContent = activeInvoices;
}
 
// =========================================================
// Hitung pendapatan bulan ini (ambil dari API + fallback lokal)
// =========================================================
async function updateMonthlyIncome() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  let invoicesData = [];

  try {
    // Coba ambil langsung dari server
    const res = await Api.get("/invoices");
    invoicesData = res?.data || [];

    // Simpan cache lokal untuk offline mode
    localStorage.setItem("cached_invoices", JSON.stringify(invoicesData));
  } catch (err) {
    console.warn("⚠️ Tidak bisa ambil data invoice, gunakan cache lokal:", err);
    const cache = localStorage.getItem("cached_invoices");
    if (cache) invoicesData = JSON.parse(cache);
  }

  // Filter yang paid & bulan ini
  const paidThisMonth = invoicesData.filter(inv => {
    if (inv.status !== "paid" || !inv.paid_at) return false;
    const paidDate = new Date(inv.paid_at);
    return paidDate.getMonth() === month && paidDate.getFullYear() === year;
  });

  const total = paidThisMonth.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  $("monthlyIncomeHeader").textContent = `Rp ${total.toLocaleString("id-ID")}`;
}


// =========================================================
// Ambil Data dari API
// =========================================================
async function fetchResellerInfo() {
  try {
    const data = await Api.get("/resellers/me");
    resellerProfile = data;

    // ✅ Simpan ke localStorage agar bisa diakses oleh modul lain (invoices, payments, dsb)
    localStorage.setItem("resellerProfile", JSON.stringify(data));

    return data;
  } catch (err) {
    console.error("Gagal ambil reseller info:", err);
    toast("⚠️ Gagal ambil data reseller");

    // 🔁 Jika gagal, coba gunakan cache sebelumnya
    const cache = localStorage.getItem("resellerProfile");
    if (cache) {
      resellerProfile = JSON.parse(cache);
      return resellerProfile;
    }

    return resellerProfile;
  }
}


async function fetchUsers() {
  try {
    const res = await Api.get("/users");
    return res.data || [];
  } catch (err) {
    console.error("Gagal ambil users:", err);
    toast("⚠️ Gagal memuat pelanggan");
    return [];
  }
}

async function fetchInvoices() {
  try {
    const res = await Api.get("/invoices");
    return res.data || [];
  } catch (err) {
    console.error("Gagal ambil invoices:", err);
    toast("⚠️ Gagal memuat tagihan");
    return [];
  }
}

// =========================================================
// Refresh Dashboard (utama)
// =========================================================
async function refreshDashboard() {
  try {
    if (!navigator.onLine) {
      toast("⚠️ Offline mode — menampilkan data lokal");
      // tampilkan cache terakhir
      renderResellerInfo(resellerProfile);
      updateDashboardStats(dashboardCache.users, dashboardCache.invoices);
      updateMonthlyIncome(dashboardCache.invoices);
      return;
    }

    const [reseller, users, invoices] = await Promise.all([
      fetchResellerInfo(),
      fetchUsers(),
      fetchInvoices()
    ]);

    dashboardCache = { users, invoices };
    renderResellerInfo(reseller);
    updateDashboardStats(users, invoices);
    updateMonthlyIncome(invoices);

    // toast("✅ Dashboard diperbarui");
  } catch (err) {
    console.error("Gagal refresh dashboard:", err);
    toast("❌ Tidak dapat memuat dashboard");
  }
}

// =========================================================
// Edit Profil Reseller (terhubung ke API PUT /resellers/me)
// =========================================================
$("editResellerBtn")?.addEventListener("click", async () => {
  // Ambil data terbaru dari cache/resellerProfile
  const current = resellerProfile || {};

  openModal({
    title: "Edit Profil Reseller",
    body: `
      <div class="space-y-2 text-sm">
        <input id="resellerNameInput" value="${current.name || ""}" placeholder="Nama Reseller" class="w-full border p-2 rounded">
        <input id="companyNameInput" value="${current.company_name || ""}" placeholder="Nama Perusahaan" class="w-full border p-2 rounded">
        <input id="resellerEmailInput" value="${current.email || ""}" type="email" placeholder="Email" class="w-full border p-2 rounded">
        <input id="resellerPhoneInput" value="${current.phone || ""}" placeholder="Nomor Telepon" class="w-full border p-2 rounded">
        <textarea id="resellerAddressInput" placeholder="Alamat" class="w-full border p-2 rounded">${current.alamat || ""}</textarea>
        <input id="resellerLogoInput" value="${current.logo || ""}" placeholder="URL Logo" class="w-full border p-2 rounded">
      </div>
    `,
    onSave: async () => {
      const payload = {
        name: $("resellerNameInput").value.trim(),
        company_name: $("companyNameInput").value.trim(),
        email: $("resellerEmailInput").value.trim(),
        phone: $("resellerPhoneInput").value.trim(),
        alamat: $("resellerAddressInput").value.trim(),
        logo: $("resellerLogoInput").value.trim(),
      };

      // Validasi sederhana
      if (!payload.name || !payload.email)
        return toast("❗ Nama dan email wajib diisi");

      try {
        const updated = await Api.put("/resellers/me", payload);
        resellerProfile = updated;
        renderResellerInfo(updated);
        closeModal();
        toast("✅ Profil reseller diperbarui");
      } catch (err) {
        console.error("Gagal update reseller:", err);
        toast("❌ Gagal memperbarui profil");
      }
    }
  });
});


// =========================================================
// Jalankan otomatis saat halaman load (atau splash token aktif)
// =========================================================
window.addEventListener("load", () => {
  if (isLoggedIn()) {
    renderResellerInfo(); // tampilkan default dulu
    refreshDashboard();   // lalu load dari API
    setInterval(refreshDashboard, 1000 * 60 * 5); // auto refresh tiap 5 menit
  }
});
window.refreshDashboard = refreshDashboard;