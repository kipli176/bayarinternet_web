/* =========================================================
   INVOICES SECTION (Tagihan)
   Version: v2.0
   API Integrated + Autocomplete + Filter + Offline Cache
   ========================================================= */

let invoices = [];
let invoiceFilter = { status: "", period: "", search: "" };
let invoicePagination = { page: 1, per_page: 10, total: 0 };

// =========================================================
// 🔹 Ambil daftar tagihan (GET /invoices?...)
// =========================================================
async function loadInvoices(page = 1) {
  invoicePagination.page = page;
  const params = new URLSearchParams();

  if (invoiceFilter.status && invoiceFilter.status !== "all")
    params.append("status", invoiceFilter.status);
  if (invoiceFilter.period) params.append("period", invoiceFilter.period);
  if (invoiceFilter.search) params.append("search", invoiceFilter.search);

  params.append("page", page);
  params.append("per_page", invoicePagination.per_page);

  $("invoiceTable").innerHTML = `
    <tr><td colspan="5" class="text-center py-4 text-gray-500 dark:text-gray-400">
      Memuat data tagihan...
    </td></tr>
  `;

  try {
    const res = await Api.get(`/invoices?${params.toString()}`);
    invoices = res?.data || [];
    invoicePagination = {
      page: res.page || 1,
      per_page: res.per_page || 10,
      total: res.total || invoices.length,
    };
    localStorage.setItem("cached_invoices", JSON.stringify({ invoices, invoicePagination }));
  } catch (err) {
    console.warn("⚠️ Offline mode: pakai cache invoices");
    const cache = localStorage.getItem("cached_invoices");
    if (cache) {
      const parsed = JSON.parse(cache);
      invoices = parsed.invoices || [];
      invoicePagination = parsed.invoicePagination || invoicePagination;
    }
  }

  renderInvoices();
}

// =========================================================
// 🔹 Render tabel tagihan
// =========================================================
function renderInvoices() {
  const tbody = $("invoiceTable");
  if (!tbody) return;

  const list = [...invoices];
  tbody.innerHTML =
    list.length > 0
      ? list
          .map(
            (inv, i) => `
      <tr class="border-b hover:bg-gray-50 dark:hover:bg-gray-700 transition">
        <td class="p-2">${inv.meta?.full_name || "-"}</td>
        <td class="p-2">${inv.meta?.profile_name || "-"}</td>
        <td class="p-2 text-right">Rp ${(inv.amount || 0).toLocaleString("id-ID")}</td>
        <td class="p-2 text-center">
          <span class="px-2 py-1 rounded-full text-xs font-medium ${
            inv.status === "paid"
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }">${inv.status}</span>
        </td>
        <td class="p-2 text-center flex items-center justify-center gap-2">
          <button title="Detail" class="text-primary" onclick="viewInvoiceDetail(${i})">🧾</button>
          ${
            inv.status !== "paid"
              ? `<button title="Tandai Lunas" class="text-green-600" onclick="toggleInvoiceStatus(${i})">💰</button>`
              : ""
          }
          <button title="Print" class="text-indigo-600" onclick="printInvoice(${i})">🖨️</button>
          <button title="Hapus" class="text-red-600" onclick="deleteInvoice(${i})">🗑️</button>
        </td>
      </tr>`
          )
          .join("")
      : `<tr><td colspan="5" class="text-center py-4 text-gray-500">Tidak ada tagihan</td></tr>`;

  const totalPages = Math.ceil(invoicePagination.total / invoicePagination.per_page);
  $("invoicePageInfo").textContent = `Halaman ${invoicePagination.page} dari ${totalPages}`;
  $("prevInvoicePage").disabled = invoicePagination.page <= 1;
  $("nextInvoicePage").disabled = invoicePagination.page >= totalPages;
}

// =========================================================
// 🔹 Pagination
// =========================================================
$("prevInvoicePage")?.addEventListener("click", () => {
  if (invoicePagination.page > 1) loadInvoices(invoicePagination.page - 1);
});
$("nextInvoicePage")?.addEventListener("click", () => {
  const max = Math.ceil(invoicePagination.total / invoicePagination.per_page);
  if (invoicePagination.page < max) loadInvoices(invoicePagination.page + 1);
});
$("filterInvoicePerPage")?.addEventListener("change", e => {
  invoicePagination.per_page = parseInt(e.target.value);
  loadInvoices(1);
});

// =========================================================
// 🔹 Filter & Search
// =========================================================
$("filterInvoiceStatus")?.addEventListener("change", e => {
  invoiceFilter.status = e.target.value;
  loadInvoices(1);
});
$("filterInvoicePeriod")?.addEventListener("change", e => {
  invoiceFilter.period = e.target.value;
  loadInvoices(1);
});
$("searchInvoice")?.addEventListener("input", e => {
  invoiceFilter.search = e.target.value.trim();
  clearTimeout(window._invoiceSearchTimer);
  window._invoiceSearchTimer = setTimeout(() => loadInvoices(1), 400);
});

// =========================================================
// 🔹 Tambah Tagihan (POST /invoices)
// =========================================================
$("btnTambahInvoice")?.addEventListener("click", () => {
  openModal({
    title: "Generate Tagihan Baru",
    body: `
      <div class="space-y-2 text-sm">
        <label>Pilih Pelanggan:</label>
        <input id="invUserSearch" placeholder="Cari nama pelanggan..." class="w-full border p-2 rounded">
        <ul id="invUserResults" class="max-h-32 overflow-y-auto border rounded text-sm hidden"></ul>
        <input type="hidden" id="invUserId">
        <label>Jumlah Bulan:</label>
        <input id="invMonths" type="number" value="1" class="w-full border p-2 rounded">
      </div>
    `,
    onSave: async () => {
      const user_id = $("invUserId").value;
      const months = parseInt($("invMonths").value) || 1;
      if (!user_id) return toast("❗ Pilih pelanggan terlebih dahulu");

      try {
        await Api.post("/invoices", { user_id, months });
        toast("✅ Tagihan berhasil dibuat");
        closeModal();
        await loadInvoices();
      } catch (err) {
        toast("⚠️ Gagal membuat tagihan");
      }
    },
  });

  // autocomplete pencarian user
  $("invUserSearch").addEventListener("input", async e => {
    const q = e.target.value.trim();
    const list = $("invUserResults");
    if (q.length < 2) {
      list.classList.add("hidden");
      return;
    }
    try {
      const res = await Api.get(`/users?search=${encodeURIComponent(q)}&per_page=5`);
      const data = res?.data || [];
      if (!data.length) {
        list.innerHTML = "<li class='p-2 text-gray-500'>Tidak ditemukan</li>";
      } else {
        list.innerHTML = data
          .map(
            u => `<li class="p-2 hover:bg-gray-100 cursor-pointer" data-id="${u.id}">
              ${u.full_name} <small class="text-gray-500">(${u.username})</small>
            </li>`
          )
          .join("");
        list.querySelectorAll("li").forEach(li => {
          li.addEventListener("click", () => {
            $("invUserId").value = li.dataset.id;
            $("invUserSearch").value = li.textContent.trim();
            list.classList.add("hidden");
          });
        });
      }
      list.classList.remove("hidden");
    } catch {
      list.innerHTML = "<li class='p-2 text-gray-500'>Offline</li>";
      list.classList.remove("hidden");
    }
  });
});

// =========================================================
// 🔹 Detail Tagihan (GET /invoices/:id)
// =========================================================
window.viewInvoiceDetail = async i => {
  const inv = invoices[i];
  if (!inv) return toast("❗ Data tidak ditemukan");

  try {
    const d = await Api.get(`/invoices/${inv.id}`);
    const m = d.meta || {};
    openModal({
      title: `Detail Tagihan`,
      body: `
        <div class="text-sm space-y-2">
          <p><b>Nama:</b> ${m.full_name}</p>
          <p><b>Paket:</b> ${m.profile_name}</p>
          <p><b>Periode:</b> ${d.period_start} → ${d.period_end}</p>
          <p><b>Total:</b> Rp ${(d.amount || 0).toLocaleString("id-ID")}</p>
          <p><b>Status:</b> ${d.status}</p>
          <p><b>Dibuat:</b> ${new Date(d.created_at).toLocaleString("id-ID")}</p>
        </div>`,
      onSave: () => closeModal(),
    });
    $("modalSave").textContent = "Tutup";
  } catch {
    toast("⚠️ Gagal memuat detail tagihan");
  }
};

// =========================================================
// 🔹 Toggle Lunas (PUT /invoices/:id/pay)
// =========================================================
window.toggleInvoiceStatus = async i => {
  const inv = invoices[i];
  if (!inv) return;
  try {
    await Api.put(`/invoices/${inv.id}/pay`);
    toast("💰 Tagihan ditandai lunas");
    await loadInvoices(invoicePagination.page);
  } catch {
    toast("⚠️ Gagal memperbarui status");
  }
};

// =========================================================
// 🔹 Hapus Tagihan (DELETE /invoices/:id)
// =========================================================
window.deleteInvoice = async i => {
  const inv = invoices[i];
  if (!confirm(`Hapus tagihan ${inv.meta?.full_name}?`)) return;
  try {
    await Api.del(`/invoices/${inv.id}`);
    toast("🗑️ Tagihan dihapus");
    invoices.splice(i, 1);
    renderInvoices();
    setTimeout(() => loadInvoices(invoicePagination.page), 1000);
  } catch {
    toast("⚠️ Gagal menghapus tagihan");
  }
};

// =========================================================
// 🔹 Print Tagihan (GET /invoices/:id/print + reseller cache)
// =========================================================
window.printInvoice = async i => {
  const inv = invoices[i];
  if (!inv) return toast("❗ Data tidak ditemukan");

  try {
    // Ambil data invoice
    const res = await Api.get(`/invoices/${inv.id}/print`);
    const d = res.invoice;
    const m = d.meta || {};

    // Ambil reseller dari localStorage (cache)
    const reseller = JSON.parse(localStorage.getItem("resellerProfile") || "{}");

    // Template HTML thermal printer
    const html = `
      <html>
        <head>
          <title>Nota Tagihan</title>
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
            ${reseller.logo ? `<img src="${reseller.logo}" width="60" height="60"><br>` : ""}
            <h3>${reseller.company_name || "BayarInter"}</h3>
            <small>${reseller.alamat || reseller.address || ""}</small><br>
            <small>Telp: ${reseller.phone || "-"}</small>
          </div>

          <div class="line"></div>
          <h4 class="center bold">NOTA TAGIHAN</h4>
          <p><b>ID Tagihan:</b> ${d.id.slice(0, 8)}</p>
          <p><b>Pelanggan:</b> ${m.full_name || "-"}</p>
          <p><b>Paket:</b> ${m.profile_name || "-"}</p>
          <p><b>Periode:</b> ${d.period_start} s/d ${d.period_end}</p>

          <div class="line"></div>
          <p><b>Jumlah Bulan:</b> ${m.months || 1}</p>
          <p><b>Harga/Bulan:</b> Rp ${(m.unit_price || 0).toLocaleString("id-ID")}</p>
          <p><b>Total Bayar:</b> Rp ${(d.amount || 0).toLocaleString("id-ID")}</p>

          <div class="line"></div>
          <p><b>Status:</b> ${d.status === "paid" ? "LUNAS" : "BELUM BAYAR"}</p>
          ${
            d.paid_at
              ? `<p><b>Dibayar:</b> ${new Date(d.paid_at).toLocaleString("id-ID")}</p>`
              : ""
          }

          <div class="line"></div>
          <p class="center bold">
            ${d.status === "paid" ? "*** LUNAS ***" : "*** BELUM DIBAYAR ***"}
          </p>
          <div class="line"></div>

          <div class="center space">
            <small>Terima kasih telah menggunakan layanan kami.</small><br>
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
    console.error("Gagal print nota:", err);
    toast("⚠️ Gagal mencetak nota");
  }
};

// =========================================================
// 🔹 Init
// =========================================================
window.addEventListener("load", () => {
  // Set default periode ke bulan dan tahun ini
  const periodInput = $("filterInvoicePeriod");
  if (periodInput && !periodInput.value) {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    periodInput.value = `${year}-${month}`;
  }

  // Panggil loadInvoices() atau renderInvoices() awal
  loadInvoices();
});

window.renderInvoices = renderInvoices;
