/* =========================================================
   USERS SECTION - v2.1
   API Integrated + Server Filter + Offline Cache + Modal Support
   ========================================================= */

// State utama
let users = [];
// let profiles = [];
let userFilters = { status: "all", profile_id: "", search: "" };
let userPagination = { page: 1, per_page: 20, total: 0 };

// =========================================================
// 🔹 Ambil data Profiles
// =========================================================
async function loadProfiles() {
  try {
    const res = await Api.get("/profiles");
    profiles = res?.data || [];
    localStorage.setItem("cached_profiles", JSON.stringify(profiles));
  } catch (err) {
    console.warn("⚠️ Offline mode: pakai cache profiles");
    const cache = localStorage.getItem("cached_profiles");
    if (cache) profiles = JSON.parse(cache);
  }
}

// =========================================================
// 🔹 Isi dropdown filter Paket Internet (profile_id)
// =========================================================
async function initProfileFilter() {
  await loadProfiles();
  const select = $("filterProfile");
  if (!select) return;
  select.innerHTML = `
    <option value="">Semua Paket</option>
    ${profiles.map(p => `<option value="${p.id}">${p.name}</option>`).join("")}
  `;
  select.addEventListener("change", () => {
    userFilters.profile_id = select.value;
    loadUsers(1);
  });
}

// =========================================================
// 🔹 Filter jumlah per halaman (per_page)
// =========================================================
$("filterPerPage").addEventListener("change", e => {
  userPagination.per_page = parseInt(e.target.value);
  loadUsers(1);
});


// =========================================================
// 🔹 Ambil data Users dengan filter & pagination
// =========================================================
async function loadUsers(page = 1) {
  const params = new URLSearchParams();
  if (userFilters.status && userFilters.status !== "all")
    params.append("status", userFilters.status);
  if (userFilters.profile_id)
    params.append("profile_id", userFilters.profile_id);
  if (userFilters.search)
    params.append("search", userFilters.search);
  params.append("page", page);
  params.append("per_page", userPagination.per_page);

  try {
    const res = await Api.get(`/users?${params.toString()}`);
    users = res?.data || [];
    userPagination = {
      page: res.page || 1,
      per_page: res.per_page || 20,
      total: res.total || users.length,
    };
    localStorage.setItem(
      "cached_users",
      JSON.stringify({ users, userPagination })
    );
  } catch (err) {
    console.warn("⚠️ Offline mode: pakai cache users");
    const cache = localStorage.getItem("cached_users");
    if (cache) {
      const parsed = JSON.parse(cache);
      users = parsed.users || [];
      userPagination = parsed.userPagination || userPagination;
    }
  }
  renderUsers();
}

// =========================================================
// 🔹 Render tabel pengguna (server data + local fallback)
// =========================================================
function renderUsers() {
  const tbody = $("userTable");
  if (!tbody) return;

  tbody.innerHTML = users.length
    ? users
        .map(
          (u, i) => `
      <tr class="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
        <td class="p-2">${u.full_name}</td>
        <td class="p-2">${u.email}</td>
        <td class="p-2 text-center">
          <span class="px-2 py-1 rounded-full text-xs ${
            u.status === "active"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }">${u.status}</span>
        </td>
        <td class="p-2 text-center flex items-center justify-center gap-2">
          <button title="Detail" class="text-primary" onclick="viewUserDetail(${i})">🧾</button>
          <button title="Edit" class="text-blue-600" onclick="editUser(${i})">✏️</button>
          <button title="Ubah status" class="text-yellow-600" onclick="toggleStatus(${i})">🔄</button>
          <button title="Hapus" class="text-red-600" onclick="deleteUser(${i})">🗑️</button>
        </td>
      </tr>
    `
        )
        .join("")
    : `<tr><td colspan="5" class="text-center py-4 text-gray-500">Tidak ada pelanggan</td></tr>`;

  // Render info halaman (jika pagination diaktifkan)
  const info = $("userPageInfo");
  if (info)
    info.textContent = `Halaman ${userPagination.page} dari ${Math.ceil(
      userPagination.total / userPagination.per_page
    )}`;
  $("prevPage")?.classList.toggle("opacity-50", userPagination.page <= 1);
  $("nextPage")?.classList.toggle(
    "opacity-50",
    userPagination.page >= Math.ceil(userPagination.total / userPagination.per_page)
  );
}

// =========================================================
// 🔹 Filter dan pencarian langsung ke API
// =========================================================
$("filterStatus").addEventListener("change", () => {
  userFilters.status = $("filterStatus").value;
  loadUsers(1);
});

$("searchUser").addEventListener("input", e => {
  userFilters.search = e.target.value.trim();
  clearTimeout(window._userSearchTimer);
  window._userSearchTimer = setTimeout(() => loadUsers(1), 400);
});

// =========================================================
// 🔹 Pagination Navigasi
// =========================================================
$("prevPage")?.addEventListener("click", () => {
  if (userPagination.page > 1) loadUsers(userPagination.page - 1);
});

$("nextPage")?.addEventListener("click", () => {
  const max = Math.ceil(userPagination.total / userPagination.per_page);
  if (userPagination.page < max) loadUsers(userPagination.page + 1);
});

// =========================================================
// 🔹 Tambah User (POST /users)
// =========================================================
$("btnAddUser").addEventListener("click", async () => {
  await loadProfiles();
  const options = profiles
    .map(p => `<option value="${p.id}">${p.name}</option>`)
    .join("");

  openModal({
    title: "Tambah Pelanggan",
    body: `
      <div class="space-y-2 text-sm">
        <input id="usernameUser" placeholder="Username" class="w-full border p-2 rounded">
        <input id="passwordUser" type="password" placeholder="Kata sandi" class="w-full border p-2 rounded">
        <input id="fullNameUser" placeholder="Nama lengkap" class="w-full border p-2 rounded">
        <input id="phoneUser" placeholder="Nomor telepon" class="w-full border p-2 rounded">
        <input id="emailUser" type="email" placeholder="Email" class="w-full border p-2 rounded">
        <textarea id="alamatUser" placeholder="Alamat pelanggan" class="w-full border p-2 rounded"></textarea>
        <label class="block text-gray-600">Pilih Paket Internet:</label>
        <select id="profileIdUser" class="w-full border p-2 rounded">${options}</select>
        <label class="block text-gray-600">Aktif sampai:</label>
        <input id="activeUntilUser" type="date" class="w-full border p-2 rounded">
        <select id="statusUser" class="w-full border p-2 rounded">
          <option value="active">Aktif</option>
          <option value="suspended">Suspend</option>
        </select>
      </div>
    `,
    onSave: async () => {
      const data = {
        username: $("usernameUser").value.trim(),
        password: $("passwordUser").value.trim(),
        full_name: $("fullNameUser").value.trim(),
        phone: $("phoneUser").value.trim(),
        email: $("emailUser").value.trim(),
        alamat: $("alamatUser").value.trim(),
        profile_id: $("profileIdUser").value,
        active_until: $("activeUntilUser").value,
        status: $("statusUser").value,
        is_active: $("statusUser").value === "active",
      };
      if (!data.username || !data.email || !data.full_name)
        return toast("❗ Lengkapi semua data utama");

      try {
        await Api.post("/users", data);
        toast("✅ Pelanggan ditambahkan");
        closeModal();

        // Tambahkan langsung ke list lokal agar tabel langsung berubah
        users.unshift(data);
        renderUsers();

        // Efek hijau pada baris pertama
        setTimeout(() => {
        const firstRow = $("userTable")?.querySelector("tr");
        if (firstRow) {
            firstRow.classList.add("added");
            setTimeout(() => firstRow.classList.remove("added"), 800);
        }
        }, 100);

        // Sinkronisasi ke server
        setTimeout(() => loadUsers(), 1000);

      } catch (err) {
        toast("⚠️ Offline: data disimpan lokal");
        addPendingOp("add", data);
        closeModal();
      }
    },
  });
});

// =========================================================
// 🔹 Edit User (PUT /users/:id)
// =========================================================
window.editUser = async i => {
  const u = users[i];
  await loadProfiles();
  const options = profiles
    .map(
      p => `<option value="${p.id}" ${p.id === u.profile_id ? "selected" : ""}>${p.name}</option>`
    )
    .join("");

  openModal({
    title: "Edit Pelanggan",
    body: `
      <div class="space-y-2 text-sm">
        <input id="fullNameUserEdit" value="${u.full_name}" class="w-full border p-2 rounded">
        <input id="phoneUserEdit" value="${u.phone}" class="w-full border p-2 rounded">
        <input id="emailUserEdit" value="${u.email}" type="email" class="w-full border p-2 rounded">
        <textarea id="alamatUserEdit" class="w-full border p-2 rounded">${u.alamat}</textarea>
        <label class="block text-gray-600">Pilih Paket:</label>
        <select id="profileIdUserEdit" class="w-full border p-2 rounded">${options}</select>
        <label class="block text-gray-600">Aktif sampai:</label>
        <input id="activeUntilUserEdit" type="date" value="${u.active_until?.split("T")[0] || ""}" class="w-full border p-2 rounded">
        <select id="statusUserEdit" class="w-full border p-2 rounded">
          <option value="active" ${u.status === "active" ? "selected" : ""}>Aktif</option>
          <option value="suspended" ${u.status === "suspended" ? "selected" : ""}>Suspend</option>
        </select>
      </div>
    `,
    onSave: async () => {
      const data = {
        full_name: $("fullNameUserEdit").value.trim(),
        phone: $("phoneUserEdit").value.trim(),
        email: $("emailUserEdit").value.trim(),
        alamat: $("alamatUserEdit").value.trim(),
        profile_id: $("profileIdUserEdit").value,
        active_until: $("activeUntilUserEdit").value,
        status: $("statusUserEdit").value,
        is_active: $("statusUserEdit").value === "active",
      };

      try {
        await Api.put(`/users/${u.id}`, data);
        toast("✏️ Data pelanggan diperbarui");
        closeModal();

        // Update lokal dulu agar UI langsung berubah
        users[i] = { ...u, ...data, updated_at: new Date().toISOString() };
        renderUsers();

        // Efek highlight kuning
        setTimeout(() => {
        const row = $("userTable")?.querySelectorAll("tr")[i];
        if (row) {
            row.classList.add("edited");
            setTimeout(() => row.classList.remove("edited"), 800);
        }
        }, 100);

        // Sinkronisasi server 1 detik kemudian
        setTimeout(() => loadUsers(), 1000);

      } catch {
        toast("⚠️ Offline: perubahan disimpan lokal");
        addPendingOp("edit", { id: u.id, data });
        closeModal();
      }
    },
  });
};

// =========================================================
// 🔹 Toggle Status (PATCH /users/:id/status?status=active|suspended)
// =========================================================
window.toggleStatus = async i => {
  const u = users[i];
  const newStatus = u.status === "active" ? "suspended" : "active";

  try {
    await Api.patch(`/users/${u.id}/status?status=${newStatus}`);
    toast(`🔄 Status diubah menjadi ${newStatus}`);
    await loadUsers(userPagination.page);
  } catch (err) {
    addPendingOp("status", { id: u.id, status: newStatus });
    toast("⚠️ Offline: status disimpan lokal");
  }
};

// =========================================================
// 🔹 Hapus User (DELETE /users/:id)
// =========================================================
window.deleteUser = async i => {
  const u = users[i];
  if (!confirm(`Hapus pelanggan ${u.full_name}?`)) return;

  // Tambahkan efek fade-out pada baris yang dihapus
  const row = $("userTable")?.querySelectorAll("tr")[i];
  if (row) row.classList.add("fade-out");

  setTimeout(async () => {
    try {
      await Api.del(`/users/${u.id}`);
      toast("🗑️ Pelanggan dihapus");

      // Hapus langsung dari array lokal agar tabel update instan
      users.splice(i, 1);
      renderUsers();

      // Sinkron ulang dari server agar data tetap akurat
      setTimeout(() => loadUsers(userPagination?.page || 1), 800);
    } catch {
      addPendingOp("delete", { id: u.id });
      toast("⚠️ Offline: penghapusan disimpan lokal");

      // Hapus dari UI lokal juga agar terasa responsif
      users.splice(i, 1);
      renderUsers();
    }
  }, 300); // beri jeda agar efek fade-out terlihat
};


// =========================================================
// 🔹 Detail Pelanggan (UI rapi & konsisten)
// =========================================================
window.viewUserDetail = i => {
  const u = users[i];
  const paket =
    profiles.find(p => p.id === u.profile_id)?.name || "(Tidak diketahui)";
  openModal({
    title: `Detail Pelanggan`,
    body: `
      <div class="text-sm space-y-2">
        <p><b>👤 Nama Lengkap:</b> ${u.full_name || "-"}</p>
        <p><b>📧 Email:</b> ${u.email || "-"}</p>
        <p><b>📞 Telepon:</b> ${u.phone || "-"}</p>
        <p><b>🏠 Alamat:</b> ${u.alamat || "-"}</p>
        <p><b>📦 Paket:</b> ${paket}</p>
        <p><b>📅 Aktif hingga:</b> ${u.active_until ? new Date(u.active_until).toLocaleDateString("id-ID") : "-"}</p>
        <p><b>Status:</b> <span class="px-2 py-1 rounded-full text-xs ${
          u.status === "active"
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }">${u.status}</span></p>
        <hr class="my-2">
        <p class="text-xs text-gray-500">Dibuat: ${new Date(u.created_at).toLocaleString("id-ID")}<br>Diperbarui: ${new Date(u.updated_at).toLocaleString("id-ID")}</p>
      </div>
    `,
    onSave: () => closeModal(),
  });
  $("modalSave").textContent = "Tutup";
};

// =========================================================
// 🔹 Offline Queue Handler
// =========================================================
function addPendingOp(type, payload) {
  const q = JSON.parse(localStorage.getItem("pending_users_ops") || "[]");
  q.push({ type, payload });
  localStorage.setItem("pending_users_ops", JSON.stringify(q));
}

async function syncPendingOps() {
  const q = JSON.parse(localStorage.getItem("pending_users_ops") || "[]");
  if (!q.length) return;
  for (const op of q) {
    try {
      if (op.type === "add") await Api.post("/users", op.payload);
      if (op.type === "edit") await Api.put(`/users/${op.payload.id}`, op.payload.data);
      if (op.type === "status") await Api.patch(`/users/${op.payload.id}/status?status=${op.payload.status}`);
      if (op.type === "delete") await Api.del(`/users/${op.payload.id}`);
    } catch (err) {
      console.warn("Gagal sync op:", op, err);
    }
  }
  localStorage.removeItem("pending_users_ops");
  await loadUsers();
}

window.addEventListener("online", syncPendingOps);

// =========================================================
// 🔹 Inisialisasi saat halaman load
// =========================================================
window.addEventListener("load", async () => {
  await loadProfiles();
  await initProfileFilter();
  await loadUsers();

  $("filterStatus").addEventListener("change", () => {
    userFilters.status = $("filterStatus").value;
    loadUsers(1);
  });

  $("searchUser").addEventListener("input", e => {
    userFilters.search = e.target.value.trim();
    clearTimeout(window._userSearchTimer);
    window._userSearchTimer = setTimeout(() => loadUsers(1), 400);
  });
});


window.renderUsers = renderUsers;
