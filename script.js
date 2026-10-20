let clients = JSON.parse(localStorage.getItem('rjplus_clients')) || [
    {
        id: "VLAN-101",
        name: "ruby ferreras",
        email: "rubyferreras37@gmail.com",
        area: "Cabatuan",
        plan: "Plan 1000",
        balance: 0.00,
        subDate: "2026-07-27",
        landmark: "near construction",
        status: "Active"
    },
    {
        id: "VLAN-102",
        name: "Stephanie Pajanostan",
        email: "stephanie@gmail.com",
        area: "Cabatuan",
        plan: "Plan 1000",
        balance: 0.00,
        subDate: "2026-07-29",
        landmark: "Main Street",
        status: "Active"
    }
];

let expenses = JSON.parse(localStorage.getItem('rjplus_expenses')) || [];
let payments = JSON.parse(localStorage.getItem('rjplus_payments')) || [];
let branches = JSON.parse(localStorage.getItem('rjplus_branches')) || ["Cabatuan", "Santa Potenciana", "Mapanas Main"];

let currentPage = 1;
const rowsPerPage = 5;
let activeNoticeClient = null;
let selectedQuickFilter = 'ALL';

let barChartInstance = null;
let pieChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuthSession();
});

function checkAuthSession() {
    const isLoggedIn = sessionStorage.getItem('rjplus_logged_in');
    if (isLoggedIn === 'true') {
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('mainApp').style.display = 'flex';
        initApp();
    } else {
        document.getElementById('loginModal').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
    }
}

function handleLogin(event) {
    event.preventDefault();
    const emailInput = document.getElementById('loginEmail').value.trim();
    const passwordInput = document.getElementById('loginPassword').value.trim();
    const errorBox = document.getElementById('loginErrorMessage');

    if (emailInput === 'RJPLUS' && passwordInput === '123456789') {
        if (errorBox) errorBox.style.display = 'none';
        sessionStorage.setItem('rjplus_logged_in', 'true');
        checkAuthSession();
    } else {
        if (errorBox) {
            errorBox.textContent = 'Invalid email/username or password. Please try again.';
            errorBox.style.display = 'block';
        } else {
            alert('Invalid email/username or password. Please try again.');
        }
    }
}

function handleLogout() {
    sessionStorage.removeItem('rjplus_logged_in');
    location.reload();
}

function initApp() {
    initDropdowns();
    initCharts();
    renderQuickFilterButtons();
    updateSystem();
    setupEventListeners();
}

function saveData() {
    localStorage.setItem('rjplus_clients', JSON.stringify(clients));
    localStorage.setItem('rjplus_expenses', JSON.stringify(expenses));
    localStorage.setItem('rjplus_payments', JSON.stringify(payments));
    localStorage.setItem('rjplus_branches', JSON.stringify(branches));
}

function switchTab(evt, tabName) {
    const tabContents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove("active");
    }
    const navBtns = document.getElementsByClassName("nav-btn");
    for (let i = 0; i < navBtns.length; i++) {
        navBtns[i].classList.remove("active");
    }
    document.getElementById("tab-" + tabName).classList.add("active");
    if (evt) evt.currentTarget.classList.add("active");
}

function initDropdowns() {
    const branchSelects = ['filterBranchSelect', 'expBranch', 'cArea', 'editArea'];
    branchSelects.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = id === 'filterBranchSelect' ? '<option value="ALL">All Locations</option>' : '';
        branches.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b;
            opt.textContent = b;
            select.appendChild(opt);
        });
        if (currentVal) select.value = currentVal;
    });

    const pSelect = document.getElementById('pClientSelect');
    const soaSelect = document.getElementById('soaClientSelect');
    const invSelect = document.getElementById('invoiceClientSelect');

    [pSelect, soaSelect, invSelect].forEach(select => {
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '<option value="">-- Select Subscriber --</option>';
        clients.forEach((c, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = `${c.name} (${c.area}) - ₱${Number(c.balance).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
            select.appendChild(opt);
        });
        if (currentVal) select.value = currentVal;
    });
}

function renderQuickFilterButtons() {
    const container = document.getElementById('quickFilterContainer');
    if (!container) return;

    container.innerHTML = `<button class="filter-btn ${selectedQuickFilter === 'ALL' ? 'active' : ''}" onclick="setQuickFilter('ALL', this)">All</button>`;

    branches.forEach(b => {
        const btn = document.createElement('button');
        btn.className = `filter-btn ${selectedQuickFilter === b ? 'active' : ''}`;
        btn.textContent = b;
        btn.onclick = (e) => setQuickFilter(b, e.target);
        container.appendChild(btn);
    });
}

function setQuickFilter(location, btnElement) {
    selectedQuickFilter = location;
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    currentPage = 1;
    renderClientTable();
}

function updateSystem() {
    saveData();
    renderClientTable();
    renderExpenseTable();
    renderPaymentTable();
    renderDashboardStats();
    updateCharts();
    checkBillingNotices();
}

function checkBillingNotices() {
    const noticeAlert = document.getElementById('dashboardNoticeAlert');
    const noticeCount = document.getElementById('noticeBadgeCount');
    const noticeText = document.getElementById('noticeAlertText');

    if (!noticeAlert) return;
    const overdueClients = clients.filter(c => parseFloat(c.balance) > 0);

    if (overdueClients.length > 0) {
        noticeAlert.style.display = 'block';
        if (noticeCount) noticeCount.textContent = `${overdueClients.length} Action Needed`;
        if (noticeText) noticeText.textContent = `You have ${overdueClients.length} subscriber(s) with pending balance payments. Send reminders via the Clients tab.`;
    } else {
        noticeAlert.style.display = 'none';
    }
}

function renderClientTable() {
    const tbody = document.getElementById('clientTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchQuery = document.getElementById('searchClientInput')?.value.toLowerCase() || '';

    let filtered = clients.filter(c => {
        const matchesLocation = selectedQuickFilter === 'ALL' || c.area === selectedQuickFilter;
        const matchesSearch = c.name.toLowerCase().includes(searchQuery) ||
            c.id.toLowerCase().includes(searchQuery) ||
            c.area.toLowerCase().includes(searchQuery) ||
            c.email.toLowerCase().includes(searchQuery);
        return matchesLocation && matchesSearch;
    });

    const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * rowsPerPage;
    const paginated = filtered.slice(startIdx, startIdx + rowsPerPage);

    if (paginated.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:1.5rem;">No subscriber records found.</td></tr>';
        return;
    }

    paginated.forEach((client) => {
        const realIndex = clients.indexOf(client);
        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid #334155";

        tr.innerHTML = `
            <td style="padding: 0.75rem;">${client.subDate}</td>
            <td style="padding: 0.75rem; font-weight: 600;">${client.name}</td>
            <td style="padding: 0.75rem; color: #94a3b8;">${client.id}</td>
            <td style="padding: 0.75rem;">${client.area}</td>
            <td style="padding: 0.75rem; color: ${client.balance > 0 ? '#f87171' : '#34d399'}; font-weight: bold;">₱${Number(client.balance).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
            <td style="padding: 0.75rem;"><span class="badge" style="background: rgba(16,185,129,0.2); color: #34d399; padding: 4px 8px; border-radius: 4px;">${client.status}</span></td>
            <td style="padding: 0.75rem; text-align: center;">
                <div class="actions-container">
                    <button type="button" class="btn-action btn-notice" onclick="openNoticeModal(${realIndex})">Notice</button>
                    <button type="button" class="btn-action btn-dashboard" onclick="openClientDashboard(${realIndex})">Dashboard</button>
                    <button type="button" class="btn-action btn-edit" onclick="openEditModal(${realIndex})">Edit</button>
                    <button type="button" class="btn-action btn-delete" onclick="deleteClient(${realIndex})">Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

function handleClientSearch() {
    currentPage = 1;
    renderClientTable();
}

function changePage(dir) {
    currentPage += dir;
    if (currentPage < 1) currentPage = 1;
    renderClientTable();
}

function openNoticeModal(index) {
    activeNoticeClient = clients[index];
    if (!activeNoticeClient) return;

    document.getElementById('modalClientName').textContent = activeNoticeClient.name;
    document.getElementById('modalClientContact').textContent = `VLAN ID: ${activeNoticeClient.id} | Email: ${activeNoticeClient.email}`;
    document.getElementById('noticeTemplateSelect').value = 'reminder';

    updateNoticeMessage();
    document.getElementById('billingNoticeModal').style.display = 'flex';
}

function closeNoticeModal() {
    document.getElementById('billingNoticeModal').style.display = 'none';
}

function updateNoticeMessage() {
    if (!activeNoticeClient) return;
    const template = document.getElementById('noticeTemplateSelect').value;
    const client = activeNoticeClient;

    const startDate = client.subDate || "Jul 27, 2026";
    const dateObj = new Date(startDate);
    dateObj.setMonth(dateObj.getMonth() + 1);
    const endDate = dateObj.toISOString().split('T')[0];

    const formattedBalance = Number(client.balance).toLocaleString('en-US', {minimumFractionDigits: 2});
    let message = "";

    if (template === 'reminder') {
        message = `Greetings ${client.name},\n\nThis is a friendly reminder regarding your outstanding internet balance of ₱${formattedBalance} for the period of ${startDate} to ${endDate}.`;
    } else if (template === 'overdue') {
        message = `Greetings ${client.name},\n\nNotice of Overdue Payment: Your account has an overdue balance of ₱${formattedBalance}. Please settle your payment at your earliest convenience to maintain continuous service.`;
    } else if (template === 'disconnection') {
        message = `Greetings ${client.name},\n\nFinal Disconnection Notice: Your account balance of ₱${formattedBalance} is past due. Kindly settle immediately to prevent temporary disconnection of your internet service.`;
    }

    document.getElementById('noticeMessageText').value = message;
}

function copyNoticeText() {
    const text = document.getElementById('noticeMessageText');
    text.select();
    navigator.clipboard.writeText(text.value);
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Message copied to clipboard!',
        showConfirmButton: false,
        timer: 2000
    });
}

function sendGmailNotice() {
    if (!activeNoticeClient) return;
    const msg = encodeURIComponent(document.getElementById('noticeMessageText').value);
    const subject = encodeURIComponent("RJPLUS Billing Notice");
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${activeNoticeClient.email}&su=${subject}&body=${msg}`, '_blank');
}

function generateSOA() {
    const idx = document.getElementById('soaClientSelect')?.value;
    if (idx === "" || idx === undefined) {
        Swal.fire('Warning', 'Please select a subscriber first.', 'warning');
        return;
    }

    const client = clients[idx];
    if (!client) return;

    if (document.getElementById('soaName')) document.getElementById('soaName').textContent = client.name;
    if (document.getElementById('soaAccNo')) document.getElementById('soaAccNo').textContent = client.id;
    if (document.getElementById('soaEmail')) document.getElementById('soaEmail').textContent = client.email;
    if (document.getElementById('soaBranch')) document.getElementById('soaBranch').textContent = client.area;
    if (document.getElementById('soaSubDate')) document.getElementById('soaSubDate').textContent = client.subDate;
    if (document.getElementById('soaPlanDesc')) document.getElementById('soaPlanDesc').textContent = `${client.plan} Subscription Fee`;
    if (document.getElementById('soaAmount')) document.getElementById('soaAmount').textContent = `₱${Number(client.balance).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    if (document.getElementById('soaTotal')) document.getElementById('soaTotal').textContent = `₱${Number(client.balance).toLocaleString('en-US', {minimumFractionDigits: 2})}`;

    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById('soaDate')) document.getElementById('soaDate').textContent = `Date Generated: ${today}`;

    const soaDisplay = document.getElementById('soaDisplay');
    if (soaDisplay) soaDisplay.style.display = 'block';
}

function sendSOAEmail() {
    const idx = document.getElementById('soaClientSelect')?.value;
    if (idx === "" || idx === undefined) return;
    const client = clients[idx];
    if (!client) return;

    const subject = encodeURIComponent(`Statement of Account - ${client.name} (${client.id})`);
    const body = encodeURIComponent(
        `Dear ${client.name},\n\n` +
        `Here is your Statement of Account from RJPLUS Telecommunication Services:\n\n` +
        `VLAN ID: ${client.id}\n` +
        `Plan: ${client.plan}\n` +
        `Location: ${client.area}\n` +
        `Total Balance Due: ₱${Number(client.balance).toLocaleString('en-US', {minimumFractionDigits: 2})}\n\n` +
        `You can send your payment via GCash:\n` +
        `GCash No.: 09123456789\n` +
        `Name: ST******E P.\n\n` +
        `After payment, please send or reply with the screenshot of your payment receipt to this Gmail account: pajanostanstephaniei15@gmail.com as proof of your transaction.\n\n` +
        `Please settle your payment to avoid service interruption.\n\n` +
        `Thank you,\nRJPLUS Telecommunication Services`
    );

    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${client.email}&su=${subject}&body=${body}`, '_blank');
}

function generateOfficialInvoice() {
    const idx = document.getElementById('invoiceClientSelect')?.value;
    if (idx === "" || idx === undefined) {
        Swal.fire('Error', 'Please select a subscriber first.', 'error');
        return;
    }

    const client = clients[idx];
    if (!client) return;

    if (document.getElementById('invClientName')) document.getElementById('invClientName').textContent = client.name;
    if (document.getElementById('invClientAddress')) document.getElementById('invClientAddress').textContent = `${client.area}, N. Samar`;
    if (document.getElementById('invClientLandmark')) document.getElementById('invClientLandmark').textContent = `Landmark: ${client.landmark || 'N/A'}`;
    if (document.getElementById('invItemDesc')) document.getElementById('invItemDesc').textContent = `${client.plan} Billing Period`;

    const amountStr = `₱${Number(client.balance).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    if (document.getElementById('invItemPrice')) document.getElementById('invItemPrice').textContent = amountStr;
    if (document.getElementById('invItemTotal')) document.getElementById('invItemTotal').textContent = amountStr;
    if (document.getElementById('invSubtotal')) document.getElementById('invSubtotal').textContent = amountStr;
    if (document.getElementById('invTotal')) document.getElementById('invTotal').textContent = amountStr;
    if (document.getElementById('invAmountDue')) document.getElementById('invAmountDue').textContent = amountStr;

    const invPrintArea = document.getElementById('invoicePrintArea');
    if (invPrintArea) invPrintArea.style.display = 'block';
}

function sendInvoiceAsImage() {
    const idx = document.getElementById('invoiceClientSelect')?.value;
    if (idx === "" || idx === undefined) {
        Swal.fire('Error', 'Please select a subscriber first.', 'error');
        return;
    }
    const client = clients[idx];
    const invArea = document.getElementById('invoicePrintArea');

    Swal.fire({
        title: 'Generating Image...',
        text: 'Converting invoice card into PNG picture...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    html2canvas(invArea, { scale: 2 }).then(canvas => {
        Swal.close();
        const imageURI = canvas.toDataURL("image/png");

        const a = document.createElement('a');
        a.href = imageURI;
        a.download = `Invoice_${client.name.replace(/\s+/g, '_')}_${client.id}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        Swal.fire({
            icon: 'success',
            title: 'Invoice Image Created!',
            html: '<b>Invoice PNG image has been downloaded.</b><br>Gmail is opening now. Simply <b>drag and drop</b> the downloaded image into your email compose window!',
            confirmButtonText: 'Got it!'
        }).then(() => {
            const subject = encodeURIComponent(`Official Invoice Statement - ${client.name}`);
            const body = encodeURIComponent(
                `Dear ${client.name},\n\n` +
                `Here is your official billing invoice image attached below.\n\n` +
                `You can send your payment via GCash:\n` +
                `GCash No.: 09123456789\n` +
                `Name: ST******E P.\n\n` +
                `After payment, please send or reply with the screenshot of your payment receipt to this Gmail account: pajanostanstephaniei15@gmail.com as proof of your transaction.\n\n` +
                `Thank you,\nRJPLUS Telecommunication Services`
            );
            window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${client.email}&su=${subject}&body=${body}`, '_blank');
        });
    });
}

function copyInvoiceImageToClipboard() {
    const idx = document.getElementById('invoiceClientSelect')?.value;
    if (idx === "" || idx === undefined) {
        Swal.fire('Error', 'Please select a subscriber first.', 'error');
        return;
    }
    const client = clients[idx];
    const invArea = document.getElementById('invoicePrintArea');

    Swal.fire({
        title: 'Capturing Invoice Image...',
        text: 'Copying picture to your clipboard...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    html2canvas(invArea, { scale: 2 }).then(canvas => {
        canvas.toBlob(blob => {
            navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]).then(() => {
                Swal.fire({
                    icon: 'success',
                    title: 'Copied to Clipboard!',
                    html: '<b>Invoice image copied!</b><br>Gmail will now open. Just press <b>Ctrl + V</b> inside the email body to paste the invoice picture!',
                    confirmButtonText: 'Open Gmail'
                }).then(() => {
                    const subject = encodeURIComponent(`Official Invoice Statement - ${client.name}`);
                    const body = encodeURIComponent(
                        `Dear ${client.name},\n\n` +
                        `Here is your official billing invoice:\n\n` +
                        `(Press Ctrl + V to paste the invoice image here)\n\n` +
                        `You can send your payment via GCash:\n` +
                        `GCash No.: 09123456789\n` +
                        `Name: ST******E P.\n\n` +
                        `After payment, please send or reply with the screenshot of your payment receipt to this Gmail account: pajanostanstephaniei15@gmail.com as proof of your transaction.\n\n` +
                        `Thank you,\nRJPLUS Telecommunication Services`
                    );
                    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${client.email}&su=${subject}&body=${body}`, '_blank');
                });
            }).catch(err => {
                Swal.fire('Error', 'Could not copy image automatically to clipboard. Try downloading PNG instead.', 'error');
            });
        });
    });
}

function openAddSubscriberModal() {
    document.getElementById('subscriberForm').reset();
    document.getElementById('cSubDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('addSubscriberModal').style.display = 'flex';
}

function closeAddSubscriberModal() {
    document.getElementById('addSubscriberModal').style.display = 'none';
}

document.getElementById('subscriberForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const newClient = {
        id: document.getElementById('cVlan').value.trim(),
        name: document.getElementById('cName').value,
        email: document.getElementById('cEmail').value,
        area: document.getElementById('cArea').value,
        plan: document.getElementById('cPlan').value,
        balance: parseFloat(document.getElementById('cBalance').value) || 0,
        subDate: document.getElementById('cSubDate').value,
        landmark: document.getElementById('cLandmark').value,
        status: document.getElementById('cStatus').value
    };
    clients.push(newClient);
    initDropdowns();
    renderQuickFilterButtons();
    updateSystem();
    closeAddSubscriberModal();
    Swal.fire('Success', 'New subscriber added successfully!', 'success');
});

function openEditModal(index) {
    const c = clients[index];
    if (!c) return;
    document.getElementById('editIndex').value = index;
    document.getElementById('editName').value = c.name;
    document.getElementById('editVlan').value = c.id;
    document.getElementById('editEmail').value = c.email;
    document.getElementById('editArea').value = c.area;
    document.getElementById('editPlan').value = c.plan;
    document.getElementById('editBalance').value = c.balance;
    document.getElementById('editSubDate').value = c.subDate;
    document.getElementById('editLandmark').value = c.landmark || '';
    document.getElementById('editStatus').value = c.status;

    document.getElementById('editClientModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editClientModal').style.display = 'none';
}

document.getElementById('editClientForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const idx = document.getElementById('editIndex').value;
    if (idx === "") return;

    clients[idx] = {
        ...clients[idx],
        name: document.getElementById('editName').value,
        id: document.getElementById('editVlan').value.trim(),
        email: document.getElementById('editEmail').value,
        area: document.getElementById('editArea').value,
        plan: document.getElementById('editPlan').value,
        balance: parseFloat(document.getElementById('editBalance').value) || 0,
        subDate: document.getElementById('editSubDate').value,
        landmark: document.getElementById('editLandmark').value,
        status: document.getElementById('editStatus').value
    };

    initDropdowns();
    renderQuickFilterButtons();
    updateSystem();
    closeEditModal();
    Swal.fire('Updated!', 'Subscriber details updated.', 'success');
});

function deleteClient(index) {
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            clients.splice(index, 1);
            initDropdowns();
            renderQuickFilterButtons();
            updateSystem();
            Swal.fire('Deleted!', 'Subscriber has been removed.', 'success');
        }
    });
}

function openClientDashboard(index) {
    const c = clients[index];
    if (!c) return;
    document.getElementById('dashClientName').textContent = c.name;
    document.getElementById('dashClientDetails').textContent = `VLAN ID: ${c.id} | Location: ${c.area}`;
    document.getElementById('dashClientPlan').textContent = c.plan;
    document.getElementById('dashClientBalance').textContent = `₱${Number(c.balance).toLocaleString('en-US', {minimumFractionDigits: 2})}`;

    const historyTbody = document.getElementById('dashPaymentHistory');
    if (historyTbody) {
        historyTbody.innerHTML = '';
        const clientPayments = payments.filter(p => p.clientName === c.name);
        if (clientPayments.length === 0) {
            historyTbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:#94a3b8; padding: 0.5rem;">No payment records found</td></tr>';
        } else {
            clientPayments.forEach(p => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td style="padding:0.5rem;">${p.date}</td><td style="color:#34d399; font-weight:bold; padding:0.5rem;">₱${Number(p.amount).toLocaleString('en-US', {minimumFractionDigits:2})}</td>`;
                historyTbody.appendChild(tr);
            });
        }
    }

    document.getElementById('clientDashboardModal').style.display = 'flex';
}

function closeClientDashboard() {
    document.getElementById('clientDashboardModal').style.display = 'none';
}

function handleExpenseSubmit(event) {
    event.preventDefault();

    const branch = document.getElementById('expBranch').value;
    const desc = document.getElementById('expDesc').value.trim();
    const amount = parseFloat(document.getElementById('expAmount').value) || 0;
    const date = document.getElementById('expDate').value;

    if (!branch || !desc || amount <= 0 || !date) {
        Swal.fire('Error', 'Please fill in all required fields correctly.', 'error');
        return;
    }

    expenses.push({ branch, desc, amount, date });
    updateSystem();

    document.getElementById('expenseForm').reset();
    document.getElementById('expDate').value = new Date().toISOString().split('T')[0];

    Swal.fire('Success', 'Expense recorded successfully!', 'success');
}

document.getElementById('paymentForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const idx = document.getElementById('pClientSelect').value;
    if (idx === "") return;

    const amt = parseFloat(document.getElementById('pAmount').value) || 0;
    const client = clients[idx];

    client.balance = Math.max(0, client.balance - amt);

    payments.unshift({
        clientName: client.name,
        amount: amt,
        date: document.getElementById('pDate').value
    });

    updateSystem();
    this.reset();
    Swal.fire('Success', 'Payment submitted & balance updated!', 'success');
});

function renderExpenseTable() {
    const tbody = document.getElementById('expenseTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (expenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding: 1rem;">No expense logs recorded.</td></tr>';
        return;
    }

    expenses.slice().reverse().forEach((e, idx) => {
        const realIdx = expenses.length - 1 - idx;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 0.75rem;">${e.date}</td>
            <td style="padding: 0.75rem;">${e.branch}</td>
            <td style="padding: 0.75rem;">${e.desc}</td>
            <td style="padding: 0.75rem; color:#f87171; font-weight:bold;">₱${Number(e.amount).toLocaleString('en-US', {minimumFractionDigits:2})}</td>
            <td style="padding: 0.75rem; text-align: center;">
                <button class="btn-action btn-delete" onclick="deleteExpense(${realIdx})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function deleteExpense(index) {
    Swal.fire({
        title: 'Are you sure?',
        text: "This expense log will be deleted!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            expenses.splice(index, 1);
            updateSystem();
            Swal.fire('Deleted!', 'Expense record removed.', 'success');
        }
    });
}

function renderPaymentTable() {
    const tbody = document.getElementById('paymentTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    payments.slice().reverse().forEach((p, idx) => {
        const realIdx = payments.length - 1 - idx;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 0.75rem;">${p.date}</td>
            <td style="padding: 0.75rem;">${p.clientName}</td>
            <td style="padding: 0.75rem; color:#34d399; font-weight:bold;">₱${Number(p.amount).toLocaleString('en-US', {minimumFractionDigits:2})}</td>
            <td style="padding: 0.75rem; text-align: center;"><button class="btn-action btn-delete" onclick="deletePayment(${realIdx})">Delete</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function deletePayment(index) {
    payments.splice(index, 1);
    updateSystem();
}

function renderDashboardStats() {
    const filterBranch = document.getElementById('filterBranchSelect')?.value || 'ALL';

    const filteredClients = filterBranch === 'ALL' ? clients : clients.filter(c => c.area === filterBranch);
    const filteredExpenses = filterBranch === 'ALL' ? expenses : expenses.filter(e => e.branch === filterBranch);

    const totalRev = filteredClients.reduce((acc, c) => acc + (parseFloat(c.balance) || 0), 0);
    const totalExp = filteredExpenses.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
    const totalPay = payments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);

    const totalClientsCount = filteredClients.length;
    const activeClientsCount = filteredClients.filter(c => c.status === 'Active').length;
    const inactiveClientsCount = filteredClients.filter(c => c.status === 'Inactive').length;

    const collectionRateVal = totalRev + totalPay > 0 ? ((totalPay / (totalRev + totalPay)) * 100).toFixed(2) : "0.00";
    const churnRateVal = totalClientsCount > 0 ? ((inactiveClientsCount / totalClientsCount) * 100).toFixed(2) : "0.00";

    if(document.getElementById('totalRevenue')) document.getElementById('totalRevenue').textContent = `₱ ${totalRev.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    if(document.getElementById('totalExpenses')) document.getElementById('totalExpenses').textContent = `₱ ${totalExp.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    if(document.getElementById('netProfit')) document.getElementById('netProfit').textContent = `₱ ${(totalRev - totalExp).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    if(document.getElementById('accountReceivables')) document.getElementById('accountReceivables').textContent = `₱ ${totalRev.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    if(document.getElementById('paymentsReceived')) document.getElementById('paymentsReceived').textContent = `₱ ${totalPay.toLocaleString('en-US', {minimumFractionDigits: 2})}`;

    if(document.getElementById('cntActive')) document.getElementById('cntActive').textContent = activeClientsCount;
    if(document.getElementById('cntInactive')) document.getElementById('cntInactive').textContent = inactiveClientsCount;
    if(document.getElementById('cntPending')) document.getElementById('cntPending').textContent = filteredClients.filter(c => c.status === 'Pending').length;
    if(document.getElementById('cntSuspended')) document.getElementById('cntSuspended').textContent = filteredClients.filter(c => c.status === 'Suspended').length;

    if(document.getElementById('collectionRate')) document.getElementById('collectionRate').textContent = `${collectionRateVal}%`;
    if(document.getElementById('churnRate')) document.getElementById('churnRate').textContent = `${churnRateVal}%`;
}

function initCharts() {
    const barCtx = document.getElementById('barChart')?.getContext('2d');
    const pieCtx = document.getElementById('pieChart')?.getContext('2d');

    if (barCtx) {
        barChartInstance = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: ['REVENUE', 'EXPENSES', 'PROFIT'],
                datasets: [{
                    label: 'Financial Overview (₱)',
                    data: [0, 0, 0],
                    backgroundColor: ['#0099ff', '#ff3b30', '#10b981'],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        min: 0,
                        grid: { color: '#232e48' },
                        ticks: { color: '#94a3b8' }
                    },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    }

    if (pieCtx) {
        pieChartInstance = new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: ['PAYMENTS RECEIVABLE', 'ACCOUNT RECEIVABLE'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#10b981', '#f97316'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            color: '#94a3b8',
                            font: { family: 'Poppins', size: 10 }
                        }
                    }
                }
            }
        });
    }
}

function updateCharts() {
    const totalRev = clients.reduce((acc, c) => acc + (parseFloat(c.balance) || 0), 0);
    const totalExp = expenses.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
    const totalPay = payments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);

    if (barChartInstance) {
        barChartInstance.data.datasets[0].data = [totalRev, totalExp, totalRev - totalExp];
        barChartInstance.update();
    }

    if (pieChartInstance) {
        pieChartInstance.data.datasets[0].data = [totalPay, totalRev];
        pieChartInstance.update();
    }
}

function setupEventListeners() {
    const modals = ['manageLocationsModal', 'addSubscriberModal', 'editClientModal', 'billingNoticeModal', 'clientDashboardModal'];
    modals.forEach(modalId => {
        document.getElementById(modalId)?.addEventListener('click', (e) => {
            if (e.target.id === modalId) {
                document.getElementById(modalId).style.display = 'none';
            }
        });
    });
}

function openManageLocationsModal() {
    renderBranchTable();
    document.getElementById('manageLocationsModal').style.display = 'flex';
}

function closeManageLocationsModal() {
    document.getElementById('manageLocationsModal').style.display = 'none';
}

function renderBranchTable() {
    const tbody = document.getElementById('branchTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    branches.forEach((b, idx) => {
        const count = clients.filter(c => c.area === b).length;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding:0.5rem;">${b}</td>
            <td style="text-align:center;">${count}</td>
            <td style="text-align:center;"><button class="btn btn-secondary" style="padding:2px 8px;" onclick="deleteBranch(${idx})">Remove</button></td>
        `;
        tbody.appendChild(tr);
    });
}

document.getElementById('branchForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('bName').value.trim();
    if (name && !branches.includes(name)) {
        branches.push(name);
        initDropdowns();
        renderQuickFilterButtons();
        updateSystem();
        renderBranchTable();
        document.getElementById('bName').value = '';
    }
});

function deleteBranch(idx) {
    branches.splice(idx, 1);
    initDropdowns();
    renderQuickFilterButtons();
    updateSystem();
    renderBranchTable();
}

function exportClientsToCSV() {
    let csv = 'Start Date,Subscriber Name,VLAN ID,Location,Balance Due,Status\n';
    clients.forEach(c => {
        csv += `"${c.subDate}","${c.name}","${c.id}","${c.area}","${c.balance}","${c.status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'subscribers_list.csv');
    a.click();
}