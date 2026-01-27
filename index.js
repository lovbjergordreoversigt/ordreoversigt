window.onerror = function () {
    alert("Der er en JavaScript-fejl i systemet. Kontakt Alexander.");
};

/* ===== ELEMENTER ===== */
const currentDate = document.getElementById("currentDate");

/* ORDRE MODAL */
const addModal = document.getElementById("addModal");
const addCustomer = document.getElementById("addCustomer");
const addProductInput = document.getElementById("addProductInput");
const productList = document.getElementById("productList");
const addDate = document.getElementById("addDate");
const addTime = document.getElementById("addTime");
const addRepeat = document.getElementById("addRepeat");

/* KLARGJORT MODAL */
const readyModal = document.getElementById("readyModal");
const readyNoteInput = document.getElementById("readyNoteInput");

/* GAVEKURV MODAL */
const giftModal = document.getElementById("giftModal");
const giftDate = document.getElementById("giftDate");
const giftBudget = document.getElementById("giftBudget");
const giftTarget = document.getElementById("giftTarget");
const giftContact = document.getElementById("giftContact");
const giftPhone = document.getElementById("giftPhone");
const giftNote = document.getElementById("giftNote");

/* KLARGJORT GAVEKURV MODAL */
const giftReadyModal = document.getElementById("giftReadyModal");
const giftReadyNoteInput = document.getElementById("giftReadyNoteInput");

/* AFHENTET MODAL */
const pickedModal = document.getElementById("pickedModal");
const pickedDetails = document.getElementById("pickedDetails");
const pickedClose = document.getElementById("pickedClose");
pickedClose.onclick = () => pickedModal.style.display = "none";

/* ===== DATA ===== */
let orders = JSON.parse(localStorage.getItem("orders") || "[]");
let giftBaskets = JSON.parse(localStorage.getItem("giftBaskets") || "[]");

let nextOrderId = orders.length ? Math.max(...orders.map(o => o.id)) + 1 : 1;
let nextGiftId = giftBaskets.length ? Math.max(...giftBaskets.map(g => g.id)) + 1 : 1;

let tempProducts = [];
let editId = null;
let readyId = null;
let editGiftId = null;
let giftReadyId = null;

/* ===== HJÆLPEFUNKTIONER ===== */
function save() { localStorage.setItem("orders", JSON.stringify(orders)); }
function saveGifts() { localStorage.setItem("giftBaskets", JSON.stringify(giftBaskets)); }
function today() { const d = new Date(); d.setHours(d.getHours() + 1); return d.toISOString().split("T")[0]; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().split("T")[0]; }
function weekday(d) { return new Date(d).getDay(); }

function getInstance(o, d) {
    if (!o.instances) o.instances = {};
    if (!o.instances[d]) o.instances[d] = { readyNote: "", afhentet: false };
    return o.instances[d];
}
function getGiftInstance(g, d) {
    if (!g.instances) g.instances = {};
    if (!g.instances[d]) g.instances[d] = { readyNote: "", afhentet: false };
    return g.instances[d];
}

/* ===== INITIALISERING ===== */
function updateDate() {
    const d = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDate.textContent = d.toLocaleDateString('da-DK', options);
}

/* ===== RYD DATA ===== */
function clearAllData() {
    if (!confirm("Er du sikker på, at du vil rydde ALLE ordrer og gavekurve?")) return;
    orders = [];
    giftBaskets = [];
    nextOrderId = 1;
    nextGiftId = 1;
    save();
    saveGifts();
    renderOrders();
    renderCustomers();
    renderGiftBaskets();
    renderPicked();
    alert("Alt data er blevet slettet!");
}

/* ===== TABS ===== */
function showTab(tab, btn) {
    document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
    document.getElementById(tab).classList.add("active");
    if (btn) btn.classList.add("active");

    if (tab === "customersTab") renderCustomers();
    if (tab === "giftsTab") renderGiftBaskets();
    if (tab === "pickedTab") renderPicked();
}

/* ===== ORDRE CARD ===== */
function orderCard(o, isToday, isGenerated) {
    const inst = getInstance(o, o.date);
    if (inst.afhentet) return null;

    const div = document.createElement("div");
    div.className = "order fade-in"; // animation
    div.innerHTML = `
        <strong>${o.orderNumber}</strong> - ${o.customer}<br>
        ${o.products.join(", ")}<br>
        Afhentning: ${o.date} ${o.time || ""}
        ${inst.readyNote ? `<div style="opacity:.7;margin-top:6px">📦 ${inst.readyNote}</div>` : ""}`;

    if (isToday && !isGenerated) {
        const actions = document.createElement("div");
        actions.className = "actions";

        const btnReady = document.createElement("button");
        btnReady.className = "ready hover-glow";
        btnReady.textContent = "Klargjort";
        btnReady.onclick = () => markReady(o.id, o.date);

        const btnPicked = document.createElement("button");
        btnPicked.className = "picked hover-glow";
        btnPicked.textContent = "Afhentet";
        btnPicked.onclick = () => markPicked(o.id, o.date);

        const btnEdit = document.createElement("button");
        btnEdit.className = "edit hover-glow";
        btnEdit.textContent = "Rediger";
        btnEdit.onclick = () => editOrder(o.id);

        actions.appendChild(btnReady);
        actions.appendChild(btnPicked);
        actions.appendChild(btnEdit);

        if (!o.repeat) {
            const btnDelete = document.createElement("button");
            btnDelete.className = "delete hover-glow";
            btnDelete.textContent = "Slet";
            btnDelete.onclick = () => deleteOrder(o.id);
            actions.appendChild(btnDelete);
        }

        div.appendChild(actions);
    }

    return div;
}

/* ===== RENDER ORDRE ===== */
function renderOrders() {
    const todayBox = document.getElementById("orders-today");
    const futureBox = document.getElementById("orders-future");
    todayBox.innerHTML = "<h3>📍 Afhentes i dag</h3>";
    futureBox.innerHTML = "<h3>📆 Kommende afhentninger (7 dage)</h3>";

    const q = document.getElementById("search").value.toLowerCase();
    let t = 0, f = 0;
    const next7 = [...Array(7)].map((_, i) => addDays(today(), i + 1));

    orders.forEach(o => {
        if (!o.customer.toLowerCase().includes(q)) return;

        if (o.date === today()) {
            const c = orderCard(o, true, false);
            if (c) { todayBox.appendChild(c); t++; }
        }

        if (o.repeat) {
            next7.forEach(d => {
                if (weekday(d) === weekday(o.date)) {
                    const c = orderCard({ ...o, date: d }, false, true);
                    if (c) { futureBox.appendChild(c); f++; }
                }
            });
        } else if (o.date > today()) {
            const c = orderCard(o, false, false);
            if (c) { futureBox.appendChild(c); f++; }
        }
    });

    if (!t) todayBox.innerHTML += "<p>Ingen ordrer i dag</p>";
    if (!f) futureBox.innerHTML += "<p>Ingen kommende ordrer</p>";
}

/* ===== ORDRE HANDLING ===== */
function markReady(id, date) {
    readyId = { id, date };
    const o = orders.find(o => o.id === id);
    readyNoteInput.value = getInstance(o, date).readyNote;
    readyModal.style.display = "flex";
}
function submitReady() {
    const o = orders.find(o => o.id === readyId.id);
    getInstance(o, readyId.date).readyNote = readyNoteInput.value;
    hideReadyModal();
    save();
    renderOrders();
}
function hideReadyModal() { readyModal.style.display = "none"; }

function markPicked(id, date) {
    const o = orders.find(o => o.id === id);
    if (!o) return;
    const inst = getInstance(o, date);
    inst.afhentet = true;
    save();
    renderOrders();
    renderPicked();
}

function editOrder(id) {
    const o = orders.find(o => o.id === id);
    if (o) showAddModal(o);
}

function deleteOrder(id) {
    if (confirm("Slet ordre?")) {
        orders = orders.filter(o => o.id !== id);
        save();
        renderOrders();
        renderCustomers();
    }
}

/* ===== MODAL OPRET/REDIGER ORDRE ===== */
function showAddModal(order = null) {
    tempProducts = [];
    if (order) {
        editId = order.id;
        addCustomer.value = order.customer;
        order.products.forEach(p => tempProducts.push(p));
        addDate.value = order.date;
        addTime.value = order.time;
        addRepeat.checked = order.repeat;
    } else {
        editId = null;
        addCustomer.value = "";
        addDate.value = today();
        addTime.value = "";
        addRepeat.checked = false;
    }
    addProductInput.value = "";
    renderTemp();
    addModal.style.display = "flex";
}
function hideAddModal() { addModal.style.display = "none"; }

/* ===== PRODUKTER ===== */
function addProduct() {
    const val = addProductInput.value.trim();
    if (!val) return;
    tempProducts.push(val);
    addProductInput.value = "";
    renderTemp();
}
function removeTemp(i) {
    tempProducts.splice(i, 1);
    renderTemp();
}
function renderTemp() {
    productList.innerHTML = "";
    tempProducts.forEach((p, i) => {
        const li = document.createElement("li");
        li.innerHTML = `${p} <button onclick="removeTemp(${i})">✖</button>`;
        productList.appendChild(li);
    });
}

/* ===== GEM ORDRE ===== */
function submitAddOrder() {
    if (!addCustomer.value.trim() || !tempProducts.length || !addDate.value)
        return alert("Udfyld alle felter");

    if (editId) {
        let o = orders.find(o => o.id === editId);
        o.customer = addCustomer.value;
        o.products = [...tempProducts];
        o.date = addDate.value;
        o.time = addTime.value;
        o.repeat = addRepeat.checked;
    } else {
        orders.push({
            id: nextOrderId++,
            orderNumber: `O${nextOrderId - 1}`,
            customer: addCustomer.value,
            products: [...tempProducts],
            date: addDate.value,
            time: addTime.value,
            repeat: addRepeat.checked,
            instances: {}
        });
    }

    save();
    hideAddModal();
    renderOrders();
    renderCustomers();
}

/* ===== KUNDER ===== */
function renderCustomers() {
    const container = document.getElementById("customerContainer");
    container.innerHTML = "<h3>👤 Faste kunder</h3>";
    const list = orders.filter(o => o.repeat);
    if (!list.length) {
        container.innerHTML += "<p>Ingen faste kunder</p>";
        return;
    }
    list.forEach(o => {
        const div = document.createElement("div");
        div.className = "customer fade-in";
        div.innerHTML = `
          <strong>${o.customer}</strong><br>
          ${o.products.join(", ")}<br>
          Afhentning: ${o.time || ""}`;
        const actions = document.createElement("div");
        actions.className = "actions";

        const btnEdit = document.createElement("button");
        btnEdit.className = "edit hover-glow";
        btnEdit.textContent = "Rediger";
        btnEdit.onclick = () => editOrder(o.id);

        const btnDelete = document.createElement("button");
        btnDelete.className = "delete hover-glow";
        btnDelete.textContent = "Slet";
        btnDelete.onclick = () => deleteOrder(o.id);

        actions.appendChild(btnEdit);
        actions.appendChild(btnDelete);
        div.appendChild(actions);
        container.appendChild(div);
    });
}

/* ===== PRINT ===== */
function printToday() {
    const list = orders.filter(o => o.date === today());
    const w = window.open("");
    w.document.write("<h1>Dagens ordrer</h1>");
    list.forEach(o => {
        w.document.write(
            `<p><strong>${o.customer}</strong>
            <ul>${o.products.map(p => `<li>${p}</li>`).join("")}</ul>
            Afhentning: ${o.time || ""}</p><hr>`
        );
    });
    w.print();
}

/* ===== GAVEKURVE ===== */
function showAddGiftModal(g = null) {
    editGiftId = null;
    giftDate.value = today();
    giftBudget.value = "";
    giftTarget.value = "";
    giftContact.value = "";
    giftPhone.value = "";
    giftNote.value = "";

    if (g) {
        editGiftId = g.id;
        giftDate.value = g.date;
        giftBudget.value = g.budget;
        giftTarget.value = g.target;
        giftContact.value = g.contact;
        giftPhone.value = g.phone;
        giftNote.value = g.note;
    }
    giftModal.style.display = "flex";
}
function hideAddGiftModal() { giftModal.style.display = "none"; }

function submitGiftBasket() {
    if (!giftDate.value || !giftBudget.value) return alert("Udfyld felter");

    if (editGiftId) {
        let g = giftBaskets.find(x => x.id === editGiftId);
        g.date = giftDate.value;
        g.budget = giftBudget.value;
        g.target = giftTarget.value;
        g.contact = giftContact.value;
        g.phone = giftPhone.value;
        g.note = giftNote.value;
    } else {
        giftBaskets.push({
            id: nextGiftId++,
            giftNumber: `G${nextGiftId - 1}`,
            date: giftDate.value,
            budget: giftBudget.value,
            target: giftTarget.value,
            contact: giftContact.value,
            phone: giftPhone.value,
            note: giftNote.value,
            instances: {}
        });
    }

    saveGifts();
    hideAddGiftModal();
    renderGiftBaskets();
}

function renderGiftBaskets() {
    const c = document.getElementById("giftContainer");
    c.innerHTML = "<h3>🎁 Gavekurve</h3>";

    giftBaskets.forEach(g => {
        const inst = getGiftInstance(g, g.date);
        if (inst.afhentet) return;

        const div = document.createElement("div");
        div.className = "order fade-in";
        div.innerHTML = `
          <strong>${g.giftNumber}</strong> - Afhentning: ${g.date}<br>
          <strong>Budget:</strong> ${g.budget} kr<br>
          <strong>Målgruppe:</strong> ${g.target || "-"}<br>
          <strong>Kontakt:</strong> ${g.contact || "-"} (${g.phone || "-"})<br>
          <strong>Noter:</strong> ${g.note || "-"}<br>
          ${inst.readyNote ? `<div style="opacity:.7;margin-top:6px">📦 ${inst.readyNote}</div>` : ""}`;

        const actions = document.createElement("div");
        actions.className = "actions";

        const btnReady = document.createElement("button");
        btnReady.className = "ready hover-glow";
        btnReady.textContent = "Klargjort";
        btnReady.onclick = () => showGiftReadyModal(g.id);

        const btnPicked = document.createElement("button");
        btnPicked.className = "picked hover-glow";
        btnPicked.textContent = "Afhentet";
        btnPicked.onclick = () => markGiftPicked(g.id);

        const btnEdit = document.createElement("button");
        btnEdit.className = "edit hover-glow";
        btnEdit.textContent = "Rediger";
        btnEdit.onclick = () => showAddGiftModal(g);

        const btnDelete = document.createElement("button");
        btnDelete.className = "delete hover-glow";
        btnDelete.textContent = "Slet";
        btnDelete.onclick = () => deleteGiftBasket(g.id);

        actions.appendChild(btnReady);
        actions.appendChild(btnPicked);
        actions.appendChild(btnEdit);
        actions.appendChild(btnDelete);
        div.appendChild(actions);

        c.appendChild(div);
    });
}

/* ===== KLARGJORT GAVEKURV ===== */
function showGiftReadyModal(id) {
    giftReadyId = id;
    const g = giftBaskets.find(x => x.id === id);
    const inst = getGiftInstance(g, g.date);
    giftReadyNoteInput.value = inst.readyNote;
    giftReadyModal.style.display = "flex";
}
function submitGiftReady() {
    const g = giftBaskets.find(x => x.id === giftReadyId);
    const inst = getGiftInstance(g, g.date);
    inst.readyNote = giftReadyNoteInput.value;
    saveGifts();
    hideGiftReadyModal();
    renderGiftBaskets();
}
function hideGiftReadyModal() { giftReadyModal.style.display = "none"; }
function markGiftPicked(id) {
    const g = giftBaskets.find(x => x.id === id);
    if (!g) return;
    const inst = getGiftInstance(g, g.date);
    inst.afhentet = true;
    saveGifts();
    renderGiftBaskets();
    renderPicked();
}
function deleteGiftBasket(id) {
    if (confirm("Slet gavekurv?")) {
        giftBaskets = giftBaskets.filter(x => x.id !== id);
        saveGifts();
        renderGiftBaskets();
    }
}

/* ===== AFHENTET ===== */
function renderPicked() {
    const box = document.getElementById("pickedOrders");
    box.innerHTML = "<h3>📦 Afhentede ordrer</h3>";

    const pickedOrdersSection = document.createElement("div");
    pickedOrdersSection.className = "picked-section";

    const pickedGiftsSection = document.createElement("div");
    pickedGiftsSection.className = "picked-section";

    const pickedOrdersHeader = document.createElement("h4");
    pickedOrdersHeader.textContent = "Ordrer";
    pickedOrdersSection.appendChild(pickedOrdersHeader);

    const pickedGiftsHeader = document.createElement("h4");
    pickedGiftsHeader.textContent = "Gavekurve";
    pickedGiftsSection.appendChild(pickedGiftsHeader);

    // Almindelige ordrer
    orders.forEach(o => {
        const dates = Object.keys(o.instances || {});
        if (!dates.length && o.afhentet) {
            const div = document.createElement("div");
            div.className = "pickedItem";
            div.textContent = `${o.orderNumber} - ${o.customer} (${o.date})`;
            div.onclick = () => showPickedPopup(o, o.date);
            pickedOrdersSection.appendChild(div);
        } else {
            dates.forEach(date => {
                const inst = o.instances[date];
                if (!inst.afhentet) return;
                const div = document.createElement("div");
                div.className = "pickedItem";
                div.textContent = `${o.orderNumber} - ${o.customer} (${date})`;
                div.onclick = () => showPickedPopup(o, date);
                pickedOrdersSection.appendChild(div);
            });
        }
    });

    // Gavekurve
    giftBaskets.forEach(g => {
        const dates = Object.keys(g.instances || {});
        if (!dates.length && g.afhentet) {
            const div = document.createElement("div");
            div.className = "pickedItem";
            div.textContent = `${g.giftNumber} (${g.date})`;
            div.onclick = () => showPickedPopupGift(g, g.date);
            pickedGiftsSection.appendChild(div);
        } else {
            dates.forEach(date => {
                const inst = g.instances[date];
                if (!inst.afhentet) return;
                const div = document.createElement("div");
                div.className = "pickedItem";
                div.textContent = `${g.giftNumber} (${date})`;
                div.onclick = () => showPickedPopupGift(g, date);
                pickedGiftsSection.appendChild(div);
            });
        }
    });

    box.appendChild(pickedOrdersSection);
    box.appendChild(pickedGiftsSection);
}

/* ===== AFHENTET POPUP ===== */
function showPickedPopup(o, date) {
    const inst = getInstance(o, date);
    pickedDetails.innerHTML = ""; // ryd eksisterende indhold
    const info = [
        {label: "Ordre", value: o.orderNumber},
        {label: "Kunde", value: o.customer},
        {label: "Produkter", value: o.products.join(", ")},
        {label: "Afhentning", value: date + " " + (o.time || "")},
        {label: "Noter", value: inst.readyNote || "-"}
    ];
    info.forEach(i => {
        const div = document.createElement("div");
        div.innerHTML = `<strong>${i.label}:</strong> ${i.value}`;
        pickedDetails.appendChild(div);
    });
    pickedModal.classList.add("active");
}

function showPickedPopupGift(g, date) {
    const inst = getGiftInstance(g, date);
    pickedDetails.innerHTML = "";
    const info = [
        {label:"Gavekurv", value:g.giftNumber},
        {label:"Afhentning", value:date},
        {label:"Budget", value:g.budget + " kr"},
        {label:"Målgruppe", value:g.target || "-"},
        {label:"Kontakt", value:g.contact || "- (" + (g.phone || "-") + ")"},
        {label:"Noter", value:g.note || "-"},
        {label:"Klargjort note", value:inst.readyNote || "-"}
    ];
    info.forEach(i => {
        const div = document.createElement("div");
        div.innerHTML = `<strong>${i.label}:</strong> ${i.value}`;
        pickedDetails.appendChild(div);
    });
    pickedModal.classList.add("active");
}

// Luk popup korrekt
pickedClose.onclick = () => {
    pickedModal.classList.remove("active");
    pickedDetails.innerHTML = "";
};



/* ===== INIT ===== */
updateDate();
renderOrders();
renderCustomers();
renderGiftBaskets();
renderPicked();
