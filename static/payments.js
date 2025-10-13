/* =========================================================
   PAYMENTS SECTION (v2.2)
   API Integrated + Offline Cache + Modal Support
   ========================================================= */
 
let payments = [];
let paymentFilter = { status: "", method: "", search: "" };

// =========================================================
// 🔹 Ambil daftar pembayaran (GET /payments?status&method&search)
// =========================================================
async function loadPayments() {
  const params = new URLSearchParams();
  if (paymentFilter.status) params.append("status", paymentFilter.status);
  if (paymentFilter.method) params.append("method", paymentFilter.method);
  if (paymentFilter.search) params.append("search", paymentFilter.search);

  $("paymentTable").innerHTML = `
    <tr><td colspan="5" class="text-center py-4 text-gray-500 dark:text-gray-400">
      Memuat data pembayaran...
    </td></tr>
  `;

  try {
    showLoading("Tunggu sebentar...");
    const res = await Api.get(`/payments?${params.toString()}`);
    hideLoading();
    // ✅ Pastikan hasilnya benar-benar array data
    if (Array.isArray(res)) {
      payments = res;
    } else if (Array.isArray(res.data)) {
      payments = res.data;
    } else if (res.data && Array.isArray(res.data.data)) {
      payments = res.data.data;
    } else {
      payments = [];
    }

    localStorage.setItem("cached_payments", JSON.stringify(payments));
  } catch (err) {
    hideLoading();
    console.warn("⚠️ Offline mode: pakai cache payments");
    const cache = localStorage.getItem("cached_payments");
    if (cache) payments = JSON.parse(cache);
  }

  renderPayments();
}


/* =========================================================
   🔹 Render tabel pembayaran
   ========================================================= */
function renderPayments() {
  const tbody = $("paymentTable");
  if (!tbody) return;

  if (!payments || payments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3 text-gray-500">Tidak ada pembayaran</td></tr>`;
    return;
  }

  tbody.innerHTML = payments
    .map(
      (p, i) => `
    <tr class="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
      <td class="p-2">${p.full_name || "-"}</td>
      <td class="p-2">${p.method || "-"}</td> 
      <td class="p-2 text-right">Rp ${(p.amount || 0).toLocaleString("id-ID")}</td>
      <td class="p-2 text-center">
        <span class="px-2 py-1 rounded-full text-xs ${
          p.status === "success"
            ? "bg-green-100 text-green-700"
            : p.status === "failed"
            ? "bg-red-100 text-red-700"
            : "bg-gray-100 text-gray-600"
        }">${p.status}</span>
      </td>
      <td class="p-2 text-center flex items-center justify-center gap-2">
        <button class="text-primary text-lg" title="Detail" onclick="viewPaymentDetail(${i})">🧾</button>
        <button class="text-indigo-600 text-lg" title="Print" onclick="printPayment(${i})">🖨️</button>
      </td>
    </tr>`
    )
    .join("");
}

/* =========================================================
   🔹 Filter dan Pencarian
   ========================================================= */
$("filterPaymentStatus")?.addEventListener("change", e => {
  paymentFilter.status = e.target.value || "";
  loadPayments();
});

$("filterPaymentMethod")?.addEventListener("change", e => {
  paymentFilter.method = e.target.value || "";
  loadPayments();
});

$("searchPayment")?.addEventListener("input", e => {
  paymentFilter.search = e.target.value.trim();
  clearTimeout(window._paymentSearchTimer);
  window._paymentSearchTimer = setTimeout(() => loadPayments(), 400);
});

/* =========================================================
   🔹 Tambah Pembayaran (POST /payments)
   ========================================================= */
$("btnAddPayment")?.addEventListener("click", () => {
  openModal({
    title: "Tambah Pembayaran Manual",
    body: `
      <div class="space-y-2 text-sm">
        <label class="block text-gray-600">Cari Invoice:</label>
        <input id="payInvoiceSearch" placeholder="Ketik nama atau ID invoice..." class="w-full border p-2 rounded">
        <ul id="payInvoiceResults" class="border rounded p-2 max-h-40 overflow-y-auto text-sm hidden"></ul>

        <input id="payAmount" type="number" placeholder="Jumlah Bayar" class="w-full border p-2 rounded">
        <select id="payMethod" class="w-full border p-2 rounded">
          <option value="manual">Manual</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cash">Cash</option>
        </select>
        <input id="payTxnId" placeholder="Provider TXN ID (opsional)" class="w-full border p-2 rounded">
      </div>
    `,
    onSave: async () => {
      const invoice_id = $("payInvoiceSearch").dataset.selectedId;
      const amount = parseFloat($("payAmount").value);
      const method = $("payMethod").value;
      const provider_txn_id = $("payTxnId").value.trim() || null;

      if (!invoice_id || !amount || !method)
        return toast("❗ Lengkapi semua data pembayaran");

      const data = {
        invoice_id,
        amount,
        method,
        provider_txn_id,
        status: "success",
      };

      try {
        showLoading("Tunggu sebentar...");
        const res = await Api.post("/payments", data);
        hideLoading();
        toast("✅ Pembayaran berhasil ditambahkan");
        closeModal();
        payments.unshift(res?.data || data);
        renderPayments();
      } catch (err) {
        hideLoading();
        toast("⚠️ Offline: data pembayaran disimpan lokal");
        addPendingPaymentOp("add", data);
        closeModal();
        payments.unshift(data);
        renderPayments();
      }
    },
  });

  // Autocomplete invoice
  $("payInvoiceSearch").addEventListener("input", async e => {
    const q = e.target.value.trim();
    const listEl = $("payInvoiceResults");
    if (!q) {
      listEl.innerHTML = "";
      listEl.classList.add("hidden");
      return;
    }

    try {
        showLoading("Tunggu sebentar...");
      const res = await Api.get(`/invoices?status=unpaid&search=${encodeURIComponent(q)}`);
      hideLoading();
      const list = res?.data || [];
      listEl.innerHTML = list
        .map(
          inv => `
          <li class="p-2 hover:bg-gray-100 cursor-pointer" data-id="${inv.id}">
            ${inv.meta?.full_name || "-"} - ${inv.meta?.profile_name || "-"}<br>
            <small>${inv.id}</small>
          </li>`
        )
        .join("");
      listEl.classList.remove("hidden");

      listEl.querySelectorAll("li").forEach(li =>
        li.addEventListener("click", () => {
          $("payInvoiceSearch").value = li.textContent.trim();
          $("payInvoiceSearch").dataset.selectedId = li.dataset.id;
          listEl.classList.add("hidden");
        })
      );
    } catch {
        hideLoading();
      listEl.innerHTML = `<li class="p-2 text-gray-500">Tidak ada hasil</li>`;
      listEl.classList.remove("hidden");
    }
  });
});

/* =========================================================
   🔹 Detail Pembayaran
   ========================================================= */
window.viewPaymentDetail = i => {
  const p = payments[i];
  if (!p) return toast("❗ Pembayaran tidak ditemukan");

  openModal({
    title: "Detail Pembayaran",
    body: `
      <div class="text-sm space-y-2">
        <p><b>ID Pembayaran:</b> ${p.id}</p>
        <p><b>Invoice ID:</b> ${p.invoice_id}</p>
        <p><b>Metode:</b> ${p.method}</p>
        <p><b>Jumlah:</b> Rp ${(p.amount || 0).toLocaleString("id-ID")}</p>
        <p><b>Status:</b>
          <span class="px-2 py-1 rounded-full text-xs ${
            p.status === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }">${p.status}</span>
        </p>
        <p><b>Dibayar pada:</b> ${
          p.paid_at ? new Date(p.paid_at).toLocaleString("id-ID") : "-"
        }</p>
        <p><b>Provider TXN:</b> ${p.provider_txn_id || "-"}</p>
        <div class="text-right mt-3">
          <button class="bg-primary text-white px-4 py-2 rounded-lg hover:bg-teal-700" onclick="printPayment(${i})">🖨️ Print Nota</button>
        </div>
      </div>
    `,
    onSave: () => closeModal(),
  });
  $("modalSave").textContent = "Tutup";
};

/* =========================================================
   🔹 Print Nota Pembayaran (Gaya Termal Konsisten)
   ========================================================= */
window.printPayment = async i => {
  const p = payments[i];
  if (!p) return toast("❗ Pembayaran tidak ditemukan");

  try {
    showLoading("Tunggu sebentar...");
    const d = await Api.get(`/invoices/${p.invoice_id}/print`);
    hideLoading();
    const inv = d.invoice;
    const meta = inv.meta || {};

    // Ambil data reseller (cache dari /resellers/me)
    const reseller = JSON.parse(localStorage.getItem("resellerProfile") || "{}");

    const html = `
      <html>
        <head>
          <title>Nota Pembayaran</title>
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
            <small>${reseller.alamat || ""}</small><br>
            <small>Telp: ${reseller.phone || "-"}</small>
          </div>

          <div class="line"></div>
          <p><b>ID Invoice:</b> ${inv.id.slice(0, 8)}</p>
          <p><b>Tanggal Bayar:</b> ${new Date(p.paid_at || p.created_at).toLocaleString("id-ID")}</p>
          <p><b>Pelanggan:</b> ${meta.full_name || "-"}</p>
          <p><b>Paket:</b> ${meta.profile_name || "-"}</p>
          <p><b>Periode:</b> ${inv.period_start} s/d ${inv.period_end}</p>

          <div class="line"></div>
          <p><b>Jumlah Bulan:</b> ${meta.months || 1}</p>
          <p><b>Harga/Bulan:</b> Rp ${(meta.unit_price || 0).toLocaleString("id-ID")}</p>
          <p><b>Total Bayar:</b> Rp ${(p.amount || 0).toLocaleString("id-ID")}</p>
          <p><b>Metode:</b> ${p.method}</p>

          <div class="line"></div>
          <p class="center bold">${p.status === "success" ? "*** LUNAS ***" : "*** BELUM LUNAS ***"}</p>
          <div class="line"></div>

          <div class="center space">
            <small>Terima kasih telah melakukan pembayaran.</small><br>
            <small>${d.note || ""}</small><br>
            <small>${new Date().toLocaleString("id-ID")}</small>
          </div>
        </body>
      </html>
    `;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  } catch {
    hideLoading();
    toast("⚠️ Gagal memuat data nota pembayaran");
  }
};


/* =========================================================
   🔹 Offline Queue Handler
   ========================================================= */
function addPendingPaymentOp(type, payload) {
  const q = JSON.parse(localStorage.getItem("pending_payments_ops") || "[]");
  q.push({ type, payload });
  localStorage.setItem("pending_payments_ops", JSON.stringify(q));
}

async function syncPendingPayments() {
  const q = JSON.parse(localStorage.getItem("pending_payments_ops") || "[]");
  if (!q.length) return;
  for (const op of q) {
    try {
        showLoading("Tunggu sebentar...");
      if (op.type === "add") await Api.post("/payments", op.payload);
      hideLoading();
      toast("✅ Data pembayaran offline berhasil disinkronisasi");
    } catch (err) {
        hideLoading();
      console.warn("Gagal sync op:", op, err);
    }
  }
  localStorage.removeItem("pending_payments_ops");
  await loadPayments();
}

window.addEventListener("online", syncPendingPayments);

/* =========================================================
   🔹 Init
   ========================================================= */
window.addEventListener("load", () => loadPayments());
window.renderPayments = renderPayments;
