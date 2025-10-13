/* =========================================================
   PROFILES SECTION (Paket Internet)
   Version: v2.2
   API Integrated + Offline Cache + Modal Support
   ========================================================= */

let profiles = []; 
let profilePagination = { page: 1, per_page: 10, total: 0 };


// =========================================================
// 🔹 Ambil daftar paket (GET /profiles?is_active&page&per_page)
// =========================================================
async function loadProfiles(page = 1) {
  profilePagination.page = page;
  const params = new URLSearchParams({
    page,
    per_page: profilePagination.per_page,
  });

  $("profileTable").innerHTML = `
    <tr><td colspan="5" class="text-center py-4 text-gray-500 dark:text-gray-400">
      Memuat data paket...
    </td></tr>
  `;

  try {
    showLoading("Tunggu sebentar...");
    const res = await Api.get(`/profiles?${params.toString()}`);
    hideLoading();
    profiles = res?.data || [];
    profilePagination = {
      page: res.page || 1,
      per_page: res.per_page || 10,
      total: res.total || profiles.length,
    };
    localStorage.setItem("cached_profiles", JSON.stringify({ profiles, profilePagination }));
  } catch (err) {
    hideLoading();
    console.warn("⚠️ Offline mode: pakai cache profiles");
    const cache = localStorage.getItem("cached_profiles");
    if (cache) {
      const parsed = JSON.parse(cache);
      profiles = parsed.profiles || [];
      profilePagination = parsed.profilePagination || profilePagination;
    }
  }

  renderProfiles();
}


// =========================================================
// 🔹 Render tabel paket
// =========================================================
function renderProfiles(search = "") {
  const tbody = $("profileTable");
  if (!tbody) return;

  let list = [...profiles]; 

  tbody.innerHTML =
    list.length > 0
      ? list
          .map(
            (p, i) => `
      <tr class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
        <td class="p-2">${p.name}</td>
        <td class="p-2 capitalize">${p.group_name ? "Group" : "Custom"}</td>
        <td class="p-2 text-right">Rp ${(p.price || 0).toLocaleString("id-ID")}</td>
        <td class="p-2 text-center">
          <span class="px-2 py-1 rounded-full text-xs ${
            p.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }">${p.is_active ? "Aktif" : "Nonaktif"}</span>
        </td>
        <td class="p-2 text-center flex items-center justify-center gap-2">
          <button title="Detail" class="text-primary text-lg" onclick="viewProfile(${i})">🧾</button>
          <button title="Edit" class="text-blue-600 text-lg" onclick="editProfile(${i})">✏️</button>
          <button title="Hapus" class="text-red-600 text-lg" onclick="deleteProfile(${i})">🗑️</button>
        </td>
      </tr>`
          )
          .join("")
      : `<tr><td colspan="5" class="text-center py-4 text-gray-500">Tidak ada paket</td></tr>`;

  const totalPages = Math.ceil(profilePagination.total / profilePagination.per_page);
  $("profilePageInfo").textContent = `Halaman ${profilePagination.page} dari ${totalPages}`;
  $("prevProfilePage").disabled = profilePagination.page <= 1;
  $("nextProfilePage").disabled = profilePagination.page >= totalPages;
}

// =========================================================
// 🔹 Pagination
// =========================================================
$("prevProfilePage")?.addEventListener("click", () => {
  if (profilePagination.page > 1) loadProfiles(profilePagination.page - 1);
});
$("nextProfilePage")?.addEventListener("click", () => {
  const max = Math.ceil(profilePagination.total / profilePagination.per_page);
  if (profilePagination.page < max) loadProfiles(profilePagination.page + 1);
});
$("filterProfilePerPage")?.addEventListener("change", e => {
  profilePagination.per_page = parseInt(e.target.value);
  loadProfiles(1);
});
 


// =========================================================
// 🔹 Tambah Paket (POST /profiles)
// =========================================================
// =========================================================
// 🔹 Tambah Paket (POST /profiles) + tipe baru "calculator"
// =========================================================
$("btnAddProfile")?.addEventListener("click", () => {
  openModal({
    title: "Tambah Paket Internet",
    body: `
      <div class="space-y-2 text-sm">
        <select id="profileType" class="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary bg-white/70 text-gray-800 dark:bg-transparent dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-400">
          <option value="group">Group</option>
          <option value="custom">Custom Speed</option>
          <option value="calculator">Calculator</option>
        </select>
        <input id="profileName" placeholder="Nama Paket" class="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary bg-white/70 text-gray-800 dark:bg-transparent dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-400">
        <input id="profilePrice" type="number" placeholder="Harga" class="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary bg-white/70 text-gray-800 dark:bg-transparent dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-400">
        
        <!-- Group Fields -->
        <div id="groupFields" class="space-y-2">
          <input id="groupName" placeholder="Nama Group" class="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary bg-white/70 text-gray-800 dark:bg-transparent dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-400">
        </div>

        <!-- Custom Fields -->
        <div id="customFields" class="hidden space-y-2">
          <input id="rateUp" placeholder="Rate Limit Up (10M)" class="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary bg-white/70 text-gray-800 dark:bg-transparent dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-400">
          <input id="rateDown" placeholder="Rate Limit Down (10M)" class="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary bg-white/70 text-gray-800 dark:bg-transparent dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-400">
          <input id="burstUp" placeholder="Burst Limit Up" class="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary bg-white/70 text-gray-800 dark:bg-transparent dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-400">
          <input id="burstDown" placeholder="Burst Limit Down" class="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary bg-white/70 text-gray-800 dark:bg-transparent dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-400">
          <input id="burstTimeUp" type="number" placeholder="Burst Time Up (detik)" class="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary bg-white/70 text-gray-800 dark:bg-transparent dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-400">
          <input id="burstTimeDown" type="number" placeholder="Burst Time Down (detik)" class="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary bg-white/70 text-gray-800 dark:bg-transparent dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-400">
          <input id="priority" type="number" placeholder="Prioritas" class="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary bg-white/70 text-gray-800 dark:bg-transparent dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-400">
          <input id="minUp" placeholder="Min Rate Up" class="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary bg-white/70 text-gray-800 dark:bg-transparent dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-400">
          <input id="minDown" placeholder="Min Rate Down" class="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary bg-white/70 text-gray-800 dark:bg-transparent dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-400">
        </div>

        <!-- Calculator Fields -->
        <div id="calculatorFields" class="hidden space-y-2">
          <select id="calcUp" class="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary bg-white/70 text-gray-800 dark:bg-transparent dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-400"></select>
          <select id="calcDown" class="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary bg-white/70 text-gray-800 dark:bg-transparent dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-400"></select>
          <textarea id="calcOut" readonly class="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary bg-white/70 text-gray-800 dark:bg-transparent dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-400"></textarea>
          <p class="text-xs text-gray-500">
            Rumus: <b>Burst</b> = 3×Rate, <b>Threshold</b> = 70%×Rate, 
            <b>Min Rate</b> = 60%×Rate, <b>Priority</b> = 8, <b>Burst Time</b> = 12/12.
          </p>
        </div>
      </div>`,

    onSave: async () => {
      const type = $("profileType").value;
      const name = $("profileName").value.trim();
      const price = parseInt($("profilePrice").value);
      if (!name || !price) return toast("❗ Lengkapi nama dan harga");

      const data = { name, price, is_active: true };

      if (type === "group") {
        data.group_name = $("groupName").value.trim();
      } else {
        // custom dan calculator menggunakan field yang sama
        Object.assign(data, {
          rate_limit_up: $("rateUp").value.trim(),
          rate_limit_down: $("rateDown").value.trim(),
          burst_limit_up: $("burstUp").value.trim(),
          burst_limit_down: $("burstDown").value.trim(),
          burst_time_up: Number($("burstTimeUp").value),
          burst_time_down: Number($("burstTimeDown").value),
          priority: Number($("priority").value),
          min_rate_up: $("minUp").value.trim(),
          min_rate_down: $("minDown").value.trim(),
        });
      }

      try {
        showLoading("Tunggu sebentar...");
        const res = await Api.post("/profiles", data);
        hideLoading();
        toast("✅ Paket ditambahkan");
        closeModal();

        // Tambah langsung ke tabel agar UI cepat responsif
        const newProfile = res?.data || data;
        profiles.unshift(newProfile);
        renderProfiles();

        // Efek highlight hijau pada baris pertama
        setTimeout(() => {
          const firstRow = $("profileTable")?.querySelector("tr");
          if (firstRow) {
            firstRow.classList.add("added");
            setTimeout(() => firstRow.classList.remove("added"), 800);
          }
        }, 100);

        // Sinkronisasi ke server penuh
        setTimeout(() => loadProfiles(), 1000);
      } catch {
        hideLoading();
        toast("⚠️ Offline: data disimpan lokal");
        addPendingProfileOp("add", data);
        closeModal();
        profiles.unshift(data);
        renderProfiles();
      }
    },
  });

  // =========================================================
  // 🔸 Event: Switch tipe profile (group/custom/calculator)
  // =========================================================
  $("profileType").addEventListener("change", e => {
    const type = e.target.value;
    hide($("groupFields"));
    hide($("customFields"));
    hide($("calculatorFields"));

    if (type === "group") show($("groupFields"));
    else if (type === "custom") show($("customFields"));
    else if (type === "calculator") show($("calculatorFields"));
  });

  // =========================================================
  // 🔸 Calculator logic (auto isi custom fields)
  // =========================================================
  const calcUp = $("calcUp");
  const calcDown = $("calcDown");
  const calcOut = $("calcOut");

  if (calcUp && calcDown) {
    // isi select 1–30 Mbps
    for (let v = 1; v <= 30; v++) {
      calcUp.appendChild(new Option(`${v} Mbps`, v));
      calcDown.appendChild(new Option(`${v} Mbps`, v));
    }

    const burstFactor = 3.0;
    const thresholdPct = 0.7;
    const minRatePct = 0.6;
    const burstTime = 12;
    const priority = 8;

    function fmt(bps) {
      const Mbps = bps / 1_000_000;
      return Mbps >= 1 ? Math.round(Mbps) + "M" : Math.round(bps / 1_000) + "K";
    }

    function updateCalc() {
      const upMbps = +calcUp.value || 3;
      const downMbps = +calcDown.value || 3;
      const upBps = upMbps * 1_000_000;
      const downBps = downMbps * 1_000_000;

      const rateU = fmt(upBps), rateD = fmt(downBps);
      const burstU = fmt(upBps * burstFactor), burstD = fmt(downBps * burstFactor);
      const thU = fmt(upBps * thresholdPct), thD = fmt(downBps * thresholdPct);
      const minU = fmt(upBps * minRatePct), minD = fmt(downBps * minRatePct);

      const result = `${rateU}/${rateD} ${burstU}/${burstD} ${thU}/${thD} ${burstTime}/${burstTime} ${priority} ${minU}/${minD}`;
      calcOut.value = result;

      // otomatis isi input custom
      $("rateUp").value = rateU;
      $("rateDown").value = rateD;
      $("burstUp").value = burstU;
      $("burstDown").value = burstD;
      $("burstTimeUp").value = burstTime;
      $("burstTimeDown").value = burstTime;
      $("priority").value = priority;
      $("minUp").value = minU;
      $("minDown").value = minD;
    }

    calcUp.addEventListener("change", updateCalc);
    calcDown.addEventListener("change", updateCalc);

    // nilai awal
    calcUp.value = "5";
    calcDown.value = "5";
    updateCalc();
  }
});


// =========================================================
// 🔹 Edit Paket (PUT /profiles/:id)
// =========================================================
window.editProfile = i => {
  const p = profiles[i];
  const isGroup = !!p.group_name;

  openModal({
    title: "Edit Paket Internet",
    body: `
      <div class="space-y-2 text-sm">
        <input id="profileNameEdit" value="${p.name}" class="w-full border p-2 rounded">
        <input id="profilePriceEdit" type="number" value="${p.price}" class="w-full border p-2 rounded">
        ${
          isGroup
            ? `<input id="groupNameEdit" value="${p.group_name || ""}" placeholder="Nama Group" class="w-full border p-2 rounded">`
            : `
          <input id="rateUpEdit" value="${p.rate_limit_up || ""}" placeholder="Rate Limit Up" class="w-full border p-2 rounded">
          <input id="rateDownEdit" value="${p.rate_limit_down || ""}" placeholder="Rate Limit Down" class="w-full border p-2 rounded">
          <input id="burstUpEdit" value="${p.burst_limit_up || ""}" placeholder="Burst Limit Up" class="w-full border p-2 rounded">
          <input id="burstDownEdit" value="${p.burst_limit_down || ""}" placeholder="Burst Limit Down" class="w-full border p-2 rounded">
          <input id="burstTimeUpEdit" type="number" value="${p.burst_time_up || ""}" placeholder="Burst Time Up (detik)" class="w-full border p-2 rounded">
          <input id="burstTimeDownEdit" type="number" value="${p.burst_time_down || ""}" placeholder="Burst Time Down (detik)" class="w-full border p-2 rounded">
          <input id="priorityEdit" type="number" value="${p.priority || 8}" class="w-full border p-2 rounded">
          <input id="minUpEdit" value="${p.min_rate_up || ""}" placeholder="Min Rate Up" class="w-full border p-2 rounded">
          <input id="minDownEdit" value="${p.min_rate_down || ""}" placeholder="Min Rate Down" class="w-full border p-2 rounded">`
        }
      </div>`,
    onSave: async () => {
      const data = {
        name: $("profileNameEdit").value.trim(),
        price: parseInt($("profilePriceEdit").value),
        is_active: p.is_active,
      };

      if (isGroup) {
        data.group_name = $("groupNameEdit").value.trim();
      } else {
        Object.assign(data, {
          rate_limit_up: $("rateUpEdit").value.trim(),
          rate_limit_down: $("rateDownEdit").value.trim(),
          burst_limit_up: $("burstUpEdit").value.trim(),
          burst_limit_down: $("burstDownEdit").value.trim(),
          burst_time_up: Number($("burstTimeUpEdit").value),
          burst_time_down: Number($("burstTimeDownEdit").value),
          priority: Number($("priorityEdit").value),
          min_rate_up: $("minUpEdit").value.trim(),
          min_rate_down: $("minDownEdit").value.trim(),
        });
      }

      try {
        showLoading("Tunggu sebentar...");
        await Api.put(`/profiles/${p.id}`, data);
        hideLoading();
        toast("✏️ Paket diperbarui");
        closeModal();

        // Update lokal agar tabel langsung berubah tanpa reload server
        profiles[i] = { ...p, ...data, updated_at: new Date().toISOString() };
        renderProfiles();
        // Efek highlight kuning baris yang diedit
        setTimeout(() => {
        const row = $("profileTable")?.querySelectorAll("tr")[i];
        if (row) {
            row.classList.add("edited");
            setTimeout(() => row.classList.remove("edited"), 800);
        }
        }, 100);

        // Sinkronisasi penuh dari server 1 detik kemudian
        setTimeout(() => loadProfiles(), 1000);
        } catch {
            hideLoading();
            toast("⚠️ Offline: perubahan disimpan lokal");
            addPendingProfileOp("edit", { id: p.id, data });
            closeModal();
            profiles[i] = { ...p, ...data };
            renderProfiles();
        }

    },
  });
};

// =========================================================
// 🔹 Hapus Paket (DELETE /profiles/:id)
// =========================================================
window.deleteProfile = async i => {
  const p = profiles[i];
  if (!confirm(`Hapus paket ${p.name}?`)) return;

  // Temukan elemen baris yang dihapus
  const row = $("profileTable")?.querySelectorAll("tr")[i];
  if (row) {
    row.style.transition = "opacity 0.4s ease";
    row.style.opacity = "0.3";
    row.classList.add("fade-out");
  }

  try {
    showLoading("Tunggu sebentar...");
    await Api.del(`/profiles/${p.id}`);
    hideLoading();
    toast("🗑️ Paket dihapus");

    // Delay sedikit sebelum hapus dari array dan render ulang
    setTimeout(() => {
      profiles.splice(i, 1);
      renderProfiles();
      setTimeout(() => loadProfiles(), 1000); // sinkron server
    }, 400);
  } catch {
    hideLoading();
    toast("⚠️ Offline: penghapusan disimpan lokal");
    addPendingProfileOp("delete", { id: p.id });

    setTimeout(() => {
      profiles.splice(i, 1);
      renderProfiles();
    }, 400);
  }
};



// =========================================================
// 🔹 Detail Paket (GET /profiles/:id)
// =========================================================
window.viewProfile = async i => {
  const p = profiles[i];
  try {
    showLoading("Tunggu sebentar...");
    const d = await Api.get(`/profiles/${p.id}`);
    hideLoading();
    const body = d.group_name
      ? `
        <p><b>Nama Paket:</b> ${d.name}</p>
        <p><b>Group:</b> ${d.group_name}</p>
        <p><b>Harga:</b> Rp ${(d.price || 0).toLocaleString("id-ID")}</p>`
      : `
        <p><b>Nama Paket:</b> ${d.name}</p>
        <p><b>Harga:</b> Rp ${(d.price || 0).toLocaleString("id-ID")}</p>
        <p><b>Rate Limit:</b> ${d.rate_limit_up}/${d.rate_limit_down}</p>
        <p><b>Burst:</b> ${d.burst_limit_up}/${d.burst_limit_down}</p>
        <p><b>Priority:</b> ${d.priority}</p>
        <p><b>Min Rate:</b> ${d.min_rate_up}/${d.min_rate_down}</p>`;
    openModal({
      title: "Detail Paket Internet",
      body: `<div class="text-sm space-y-1">${body}</div>`,
      onSave: () => closeModal(),
    });
    $("modalSave").textContent = "Tutup";
  } catch {
    hideLoading();
    toast("⚠️ Gagal memuat detail paket");
  }
};

// =========================================================
// 🔹 Offline Queue Handler
// =========================================================
function addPendingProfileOp(type, payload) {
  const q = JSON.parse(localStorage.getItem("pending_profiles_ops") || "[]");
  q.push({ type, payload });
  localStorage.setItem("pending_profiles_ops", JSON.stringify(q));
}

async function syncPendingProfiles() {
  const q = JSON.parse(localStorage.getItem("pending_profiles_ops") || "[]");
  if (!q.length) return;
  for (const op of q) {
    try {
      if (op.type === "add") await Api.post("/profiles", op.payload);
      if (op.type === "edit") await Api.put(`/profiles/${op.payload.id}`, op.payload.data);
      if (op.type === "delete") await Api.del(`/profiles/${op.payload.id}`);
    } catch (err) {
      console.warn("Gagal sync op:", op, err);
    }
  }
  localStorage.removeItem("pending_profiles_ops");
  await loadProfiles();
}

window.addEventListener("online", syncPendingProfiles);

// =========================================================
// 🔹 Init
// =========================================================
window.addEventListener("load", () => loadProfiles());


window.renderProfiles = renderProfiles;