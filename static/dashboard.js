/* =========================================================
   BayarInter Billing Reseller
   File: dashboard.js (v2 API Integrated)
   Stage: Replace old dashboard block in app.js
   ========================================================= */

// Data cache dasar (agar tampil cepat sebelum API load)
var resellerProfile = {
  company_name: "Memuat...",
  alamat: "-",
  logo: "static/icons/icon-512x512.png"
};

let dashboardCache = {
  users: [],
  invoices: []
};
window.resellerInvoices = [];
// =========================================================
// Render Info Reseller ke UI
// =========================================================
function renderResellerInfo(reseller = resellerProfile) {
  $("companyName").textContent = reseller.company_name || reseller.name || "-";
  $("companyAddress").textContent = reseller.alamat || reseller.address || "-";
  $("resellerLogo").src = reseller.logo || "static/icons/icon-512x512.png";
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
// Tampilkan Tabel Invoice Reseller (dari /reseller-invoices/me)
// =========================================================
async function renderResellerInvoicesTable() {
  const tableBody = $("resellerInvoiceTable");
  const section = $("resellerInvoiceSection");
  const nav = document.querySelector("nav");

  // Set tampilan awal
  tableBody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center py-4 text-gray-500 dark:text-gray-400">
        Memuat data...
      </td>
    </tr>`;

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Ambil data invoice reseller bulan ini
    const res = await Api.get(`/reseller-invoices/me?year=${year}&month=${month}`);
    const invoices = res?.data || [];
    window.resellerInvoices = invoices;

    if (!invoices.length) {
      // ❌ Tidak ada invoice — sembunyikan tabel, tampilkan navigasi
      section.classList.add("hidden");
      nav.classList.remove("hidden");
      return;
    }

    // ✅ Ada invoice — tampilkan tabel, sembunyikan navigasi
    section.classList.remove("hidden");
    nav.classList.add("hidden");

    tableBody.innerHTML = invoices.map((inv, i) => `
    <tr>
        <td class="p-2 text-left">
        ${formatDate(inv.period_start)} - ${formatDate(inv.period_end)}
        </td>
        <td class="p-2 text-center">${inv.users_count}</td>
        <td class="p-2 text-right">Rp ${Number(inv.total).toLocaleString("id-ID")}</td>
        <td class="p-2 text-center">
        <span class="px-2 py-1 rounded text-xs ${
            inv.status === "paid"
            ? "bg-green-100 text-green-700"
            : "bg-yellow-100 text-yellow-700"
        }">${inv.status}</span>
        </td>
        <td class="p-2 text-center">
          <button title="Detail" class="text-primary" onclick="viewResellerInvoiceDetail(${i})">🧾</button> 
          <button title="Print" class="text-indigo-600" onclick="printResellerInvoice(${i})">🖨️</button> 
        </td>
    </tr>
    `).join(""); 
  } catch (err) {
    console.error("Gagal ambil reseller invoices:", err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4 text-gray-500 dark:text-gray-400">
          Gagal memuat data
        </td>
      </tr>`;
  }
}

// Helper tanggal pendek
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

// =========================================================
// 🔹 Detail Invoice Reseller (GET /reseller-invoices/:id)
// =========================================================
window.viewResellerInvoiceDetail = async i => {
  const inv = window.resellerInvoices?.[i];
  if (!inv) return toast("❗ Data tidak ditemukan");

  try {
    const d = await Api.get(`/reseller-invoices/${inv.id}`);
    const m = d.meta || {};

    openModal({
      title: `Detail Invoice Reseller`,
      body: `
        <div class="text-sm space-y-2">
          <p><b>Periode:</b> ${formatDate(inv.period_start)} → ${formatDate(inv.period_end)}</p>
          <p><b>Jumlah Pelanggan:</b> ${d.users_count}</p>
          <p><b>Harga/User:</b> Rp ${(d.unit_price || 0).toLocaleString("id-ID")}</p>
          <p><b>Subtotal:</b> Rp ${(d.subtotal || 0).toLocaleString("id-ID")}</p>
          <p><b>Diskon:</b> Rp ${(d.discount || 0).toLocaleString("id-ID")}</p>
          <p><b>Pajak:</b> Rp ${(d.tax || 0).toLocaleString("id-ID")}</p>
          <p><b>Total:</b> Rp ${(d.total || 0).toLocaleString("id-ID")}</p>
          <p><b>Status:</b> ${d.status}</p>
          ${
            d.meta?.paid_at
              ? `<p><b>Dibayar:</b> ${new Date(d.meta.paid_at).toLocaleString("id-ID")}</p>`
              : ""
          }
          <p><b>Dibuat:</b> ${new Date(d.created_at).toLocaleString("id-ID")}</p>
        </div>`,
      onSave: () => closeModal(),
    });

    $("modalSave").textContent = "Tutup";
  } catch (err) {
    console.error("Gagal ambil detail invoice reseller:", err);
    toast("⚠️ Gagal memuat detail invoice reseller");
  }
};


// =========================================================
// 🔹 Print Invoice Reseller (GET /reseller-invoices/:id/print)
// =========================================================
window.printResellerInvoice = async i => {
  const inv = window.resellerInvoices?.[i];
  if (!inv) return toast("❗ Data tidak ditemukan");

  try {
    const res = await Api.get(`/reseller-invoices/${inv.id}/print`);
    const d = res.invoice;
    const m = d.meta || {};
    const reseller = JSON.parse(localStorage.getItem("resellerProfile") || "{}");

    const html = `
      <html>
        <head>
          <title>Nota Invoice Reseller</title>
          <style>
            body {
              font-family: monospace;
              font-size: 13px;
              width: 280px;
              margin: 0 auto;
              line-height: 1.4;
            }
            h2, h3, p, div { margin: 0; padding: 0; }
            .center { text-align: center; }
            .line { border-top: 1px dashed #000; margin: 6px 0; }
            .bold { font-weight: bold; }
            .space { margin-top: 6px; }
          </style>
        </head>
        <body onload="window.print(); setTimeout(()=>window.close(), 500)">
          <div class="center">
            <img src="/static/icons/icon-72x72.png" width="60" height="60"><br>
            <h3>Billing Internet</h3> 
            <small>Telp: +62 856 260 77</small>
          </div>

          <div class="line"></div>
          <h4 class="center bold">INVOICE RESELLER</h4>
          <p><b>ID Invoice:</b> ${d.id.slice(0, 8)}</p>
          <p><b>Periode:</b> ${formatDate(d.period_start)} s/d ${formatDate(d.period_end)}</p>

          <div class="line"></div>
          <p><b>Jumlah Pelanggan:</b> ${d.users_count}</p>
          <p><b>Harga/User:</b> Rp ${(d.unit_price || 0).toLocaleString("id-ID")}</p>
          <p><b>Subtotal:</b> Rp ${(d.subtotal || 0).toLocaleString("id-ID")}</p>
          <p><b>Diskon:</b> Rp ${(d.discount || 0).toLocaleString("id-ID")}</p>
          <p><b>Pajak:</b> Rp ${(d.tax || 0).toLocaleString("id-ID")}</p>
          <p><b>Total Bayar:</b> Rp ${(d.total || 0).toLocaleString("id-ID")}</p>

          <div class="line"></div>
          <p><b>Status:</b> ${d.status === "paid" ? "LUNAS" : "BELUM BAYAR"}</p>
          ${
            d.meta?.paid_at
              ? `<p><b>Dibayar:</b> ${new Date(d.meta.paid_at).toLocaleString("id-ID")}</p>`
              : ""
          }

          <div class="line"></div>
          <p class="center bold">
            ${d.status === "paid" ? "*** LUNAS ***" : "*** BELUM DIBAYAR ***"}
          </p>
          <div class="line"></div>

          <div class="center space">
            <small>Terima kasih telah menjadi mitra kami.</small><br>
            <small>${res.note || ""}</small><br>
            <small>${new Date().toLocaleString("id-ID")}</small>
          </div>
        </body>
      </html>
    `;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  } catch (err) {
    console.error("Gagal print invoice reseller:", err);
    toast("⚠️ Gagal mencetak invoice reseller");
  }
};

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
    await renderResellerInvoicesTable();

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