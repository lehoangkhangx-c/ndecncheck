// Mock Data
let ecns = [
    {
        id: "ECN-2024-001",
        itemCode: "TR-8902-X",
        line: "CR",
        category: "Housing",
        description: "Thay đổi khuôn đúc Housing mặt trước để tăng độ bền nhiệt.",
        lotNumbers: ["LOT240501A", "LOT240508B", ""],
        deliveries: [true, true, false],
        firstDeliveryDate: "2024-05-01",
        driveLink: "https://drive.google.com/example1",
        image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=400",
        lastUpdate: "2024-05-08"
    },
    {
        id: "ECN-2024-002",
        itemCode: "CP-4410-Z",
        line: "CV",
        category: "Terminal",
        description: "Mạ lại lớp Niken cho Terminal 0.64 để chống oxy hóa.",
        lotNumbers: ["LOT240502Z", "LOT240510C", "LOT240515D"],
        deliveries: [true, true, true],
        firstDeliveryDate: "2024-05-02",
        driveLink: "https://drive.google.com/example2",
        image: "https://images.unsplash.com/photo-1590674899484-13da0d1b58f5?auto=format&fit=crop&q=80&w=400",
        lastUpdate: "2024-05-15"
    },
    {
        id: "ECN-2024-003",
        itemCode: "HD-1122-M",
        line: "SP",
        category: "TPA",
        description: "Cập nhật thiết kế TPA để tránh lắp ngược linh kiện.",
        lotNumbers: ["LOT240520M", "", ""],
        deliveries: [true, false, false],
        firstDeliveryDate: "2024-05-20",
        driveLink: "https://drive.google.com/example3",
        image: "https://images.unsplash.com/photo-1565373676930-de49242d7350?auto=format&fit=crop&q=80&w=400",
        lastUpdate: "2024-05-20"
    }
];

const lines = ["CR", "CV", "SP", "HC", "PSW", "VS1", "HM", "VS2", "GA", "PC"];
const categories = ["Housing", "TPA", "Terminal", "Seal", "Wire", "Bracket", "Connector"];

// State Management
let currentFilter = { line: 'all', category: 'all', search: '' };
let isAdmin = false;
let editingEcnId = null;
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEbV-8ShOalFeSmQDEDNXrLsyEhfvp1b2Czdp0QaAsf2mXc2FfeWMx3dbZFdh4Jl1LKw/exec'; // URL Google Apps Script Web App

// DOM Elements
const ecnGrid = document.getElementById('ecnGrid');
const lineList = document.getElementById('lineList');
const searchInput = document.getElementById('searchInput');
const detailOverlay = document.getElementById('detailOverlay');
const detailContent = document.getElementById('detailContent');
const closeDetail = document.getElementById('closeDetail');
const adminToggle = document.getElementById('adminToggle');
const adminActions = document.getElementById('adminActions');
const addModal = document.getElementById('addModal');
const addEcnBtn = document.getElementById('addEcnBtn');
const cancelAdd = document.getElementById('cancelAdd');
const saveEcn = document.getElementById('saveEcn');
const sidebar = document.querySelector('.sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarIcon = sidebarToggle.querySelector('i');
const closeSidebar = document.getElementById('closeSidebar');
const addCatBtn = document.getElementById('addCatBtn');
const adminCategoryActions = document.getElementById('adminCategoryActions');
const addCatModalBtn = document.getElementById('addCatModalBtn');
const catPromptOverlay = document.getElementById('catPromptOverlay');
const newCatInput = document.getElementById('newCatInput');
const saveCatBtn = document.getElementById('saveCatBtn');
const cancelCatBtn = document.getElementById('cancelCatBtn');
const deleteConfirmOverlay = document.getElementById('deleteConfirmOverlay');
const deleteConfirmText = document.getElementById('deleteConfirmText');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
let categoryToDelete = null;
let ecnToDelete = null;
let isZoomed = false;
let zoomScale = 1;
let initialDist = 0;
let initialScale = 1;
let startX = 0, startY = 0, translateX = 0, translateY = 0;

// Persistence & Sync logic
async function loadData() {
    // 1. Load from LocalStorage first (instant UI)
    const savedEcns = localStorage.getItem('ecns');
    const savedCats = localStorage.getItem('categories');
    if (savedEcns) ecns = JSON.parse(savedEcns);
    if (savedCats) {
        const parsedCats = JSON.parse(savedCats);
        categories.splice(0, categories.length, ...parsedCats);
    }
    renderLines();
    renderECNs();

    // 2. Fetch from Google Sheets if SCRIPT_URL is configured
    if (!SCRIPT_URL) {
        console.warn('Chưa cấu hình SCRIPT_URL. Đang chạy ở chế độ Offline.');
        return;
    }

    try {
        const response = await fetch(SCRIPT_URL);
        const serverData = await response.json();
        if (serverData && Array.isArray(serverData)) {
            ecns = serverData;
            localStorage.setItem('ecns', JSON.stringify(ecns));
            renderECNs();
            console.log('Dữ liệu đã được cập nhật từ Server.');
        }
    } catch (e) {
        console.error('Không thể kết nối Server:', e);
    }
}

function saveData() {
    localStorage.setItem('ecns', JSON.stringify(ecns));
    localStorage.setItem('categories', JSON.stringify(categories));
}

async function syncData(action, data) {
    saveData();
    if (!SCRIPT_URL) return;

    try {
        // Send to Google Apps Script
        await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action, data }),
            mode: 'no-cors' // Google Apps Script requires no-cors for simple POST
        });
    } catch (e) {
        console.error('Lỗi đồng bộ server:', e);
    }
}

function getDirectDriveLink(url) {
    if (!url) return '';
    // Handle Google Drive links
    if (url.includes('drive.google.com')) {
        const fileId = url.match(/[-\w]{25,}/);
        if (fileId) {
            // Using the thumbnail endpoint is often the most reliable for embedding
            return `https://drive.google.com/thumbnail?id=${fileId[0]}&sz=w1000`;
        }
    }
    return url;
}
function init() {
    loadData();
    renderLines();
    renderCategories();
    renderECNs();
    setupEventListeners();
}

function renderLines() {
    lineList.innerHTML = `
        <div class="line-item active" data-line="all">
            <i data-lucide="layout-grid"></i>
            <span>Tất cả Line</span>
        </div>
    `;

    lines.forEach(line => {
        // Get categories present in this line
        const lineEcns = ecns.filter(e => e.line === line);
        const lineCats = [...new Set(lineEcns.map(e => e.category))].sort();

        const group = document.createElement('div');
        group.className = 'line-group';
        group.innerHTML = `
            <div class="line-item" data-line="${line}">
                <i data-lucide="component"></i> 
                <span>${line}</span>
                <i data-lucide="chevron-right" class="dropdown-icon" style="margin-left: auto; width: 12px; opacity: 0.5;"></i>
            </div>
            <div class="sub-category-list">
                <div class="sub-item ${currentFilter.line === line && currentFilter.category === 'all' ? 'active' : ''}" data-cat="all">
                    <i data-lucide="layers"></i> Tất cả loại
                </div>
                ${lineCats.map(cat => `
                    <div class="sub-item ${currentFilter.line === line && currentFilter.category === cat ? 'active' : ''}" data-cat="${cat}">
                        <i data-lucide="tag"></i> ${cat}
                    </div>
                `).join('')}
            </div>
        `;
        lineList.appendChild(group);
    });
    lucide.createIcons();
}

function renderCategories() {
    // This is now handled within renderLines as a nested dropdown
}

function renderECNs() {
    const filtered = ecns.filter(ecn => {
        const matchesLine = currentFilter.line === 'all' || ecn.line === currentFilter.line;
        const matchesCat = currentFilter.category === 'all' || ecn.category.toLowerCase() === currentFilter.category.toLowerCase();
        const searchLower = currentFilter.search.toLowerCase();
        const matchesSearch =
            (ecn.itemCode?.toLowerCase().includes(searchLower) || false) ||
            (ecn.id?.toLowerCase().includes(searchLower) || false) ||
            (ecn.description?.toLowerCase().includes(searchLower) || false) ||
            (ecn.line?.toLowerCase().includes(searchLower) || false) ||
            (ecn.category?.toLowerCase().includes(searchLower) || false) ||
            (ecn.m4e?.toLowerCase().includes(searchLower) || false);
        return matchesLine && matchesCat && matchesSearch;
    });

    ecnGrid.innerHTML = filtered.map(ecn => {
        const deliveryCount = ecn.deliveries.filter(d => d).length;
        const isDone = deliveryCount === 3;

        return `
            <div class="ecn-card" onclick="showDetail('${ecn.id}', '${ecn.itemCode}')">
                <!-- Delivery Status Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 20px; margin-bottom: 16px; border-bottom: 1px solid var(--bg-accent);">
                    <div style="display: flex; gap: 10px; align-items: center;">
                        ${[0, 1, 2].map((i) => {
            const colors = ['#ff4757', '#ffa502', '#2ed573'];
            const isActive = ecn.deliveries[i];
            // If whole ECN is done, use green for all dots
            const dotColor = isDone ? '#2ed573' : colors[i];
            return `
                                <div style="width: 55px; height: 55px; border-radius: 50%; background: ${isActive ? dotColor : 'var(--bg-accent)'}; border: 2.5px solid ${isActive ? 'transparent' : '#cbd5e1'}; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; box-shadow: ${isActive ? '0 0 20px ' + dotColor + '80' : 'none'};">
                                    ${isActive ? '<i data-lucide="check" style="width: 32px; height: 32px; stroke-width: 4;"></i>' : ''}
                                </div>
                            `;
        }).join('')}
                    </div>
                    <span style="font-size: 11px; font-weight: 700; color: var(--primary); background: var(--primary-glow); padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(2, 132, 199, 0.2);">${ecn.line}</span>
                </div>

                <div class="card-header" style="margin-bottom: 8px;">
                    <span style="font-weight: 600; color: var(--text-dim); font-size: 13px;">${ecn.id}</span>
                </div>
                
                <div style="display: flex; gap: 16px; align-items: flex-start;">
                    <div style="flex: 1;">
                        <h2 style="font-size: 18px; margin-bottom: 8px; color: var(--text-main);">${ecn.itemCode}</h2>
                        <p style="color: var(--text-dim); font-size: 13px; line-height: 1.5;">
                            ${ecn.description.substring(0, 80)}${ecn.description.length > 80 ? '...' : ''}
                        </p>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; flex-shrink: 0;">
                        ${ecn.image ? `
                            <div style="width: 80px; height: 80px;" onclick="event.stopPropagation(); openImageViewer('${ecn.image}')">
                                <img src="${ecn.image}" referrerpolicy="no-referrer" style="width: 100%; height: 100%; object-fit: cover; border-radius: var(--radius-sm); border: 1px solid var(--bg-accent); cursor: pointer;">
                            </div>
                        ` : ''}
                        <span class="badge ${isDone ? 'badge-success' : 'badge-danger'}" style="font-size: 9px; padding: 2px 8px; white-space: nowrap; width: fit-content;">
                            ${isDone ? 'Hoàn thành' : 'Chưa hoàn thành'}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    lucide.createIcons();
}

function showDetail(id, itemCode) {
    const ecn = ecns.find(e => e.id === id && e.itemCode === itemCode);
    if (!ecn) return;

    const deliveryCount = ecn.deliveries.filter(d => d).length;
    const titleEl = document.getElementById('detailHeaderTitle');
    titleEl.textContent = ecn.itemCode;

    if (deliveryCount === 3) {
        titleEl.style.color = '#10b981';
        titleEl.style.textShadow = '0 4px 12px rgba(16, 185, 129, 0.2)';
    } else {
        titleEl.style.color = '#ef4444';
        titleEl.style.textShadow = '0 4px 12px rgba(239, 68, 68, 0.2)';
    }

    detailContent.innerHTML = `
        <div style="margin-bottom: 16px;" onclick="openImageViewer('${ecn.image}')">
            <img src="${ecn.image}" referrerpolicy="no-referrer" style="width: calc(100% - 8px); margin: 0 auto 16px auto; display: block; aspect-ratio: 8 / 4; object-fit: cover; border-radius: var(--radius-lg); border: 1px solid var(--bg-accent); cursor: pointer;">
        </div>
        
        <div style="display: flex; justify-content: center; margin-bottom: 32px;">
            <span style="font-size: 11px; font-weight: 700; background: var(--bg-accent); color: var(--text-dim); border: 1px solid rgba(0, 0, 0, 0.05); padding: 4px 12px; border-radius: 6px; opacity: 0.8;">
                ${ecn.id}
            </span>
        </div>

        <div style="background: var(--bg-card); padding: 24px; border-radius: var(--radius-lg); border: 1px solid var(--glass-border); margin-bottom: 32px;">
            <h3 style="margin-bottom: 20px; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="truck"></i> Theo dõi 3 lần giao hàng
            </h3>
            
            <div style="display: flex; gap: 16px; margin-top: 20px;">
                ${[0, 1, 2].map(i => {
        const colors = ['#ff4757', '#ffa502', '#2ed573'];
        const isActive = ecn.deliveries[i];
        return `
                        <div style="flex: 1; padding: 16px; background: ${isActive ? colors[i] + '15' : 'var(--bg-accent)'}; border-radius: var(--radius-md); border: 2px solid ${isActive ? colors[i] : 'transparent'}; display: flex; flex-direction: column; align-items: center; gap: 12px; transition: all 0.3s ease; box-shadow: ${isActive ? '0 0 15px ' + colors[i] + '40' : 'none'};">
                            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${isActive ? colors[i] : '#cbd5e1'}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 14px; box-shadow: ${isActive ? '0 0 12px ' + colors[i] + '80' : 'none'};">
                                ${isActive ? '<i data-lucide="check" style="width:18px"></i>' : i + 1}
                            </div>
                            <div style="text-align: center;">
                                <div style="font-weight: 800; color: ${isActive ? 'var(--text-main)' : 'var(--text-dim)'}; font-size: 11px; margin-bottom: 8px; opacity: 0.8;">LOT ${i + 1}</div>
                                ${isAdmin ? `
                                    <input type="text" 
                                        class="search-input" 
                                        style="padding: 8px 12px; font-size: 12px; width: 100%; text-align: center; background: white; height: 36px;" 
                                        value="${ecn.lotNumbers[i]}" 
                                        onchange="updateLotNumber('${ecn.id}', ${i}, this.value, '${ecn.itemCode}')"
                                        placeholder="Ngày..."
                                    >
                                    <button onclick="toggleDelivery('${ecn.id}', ${i}, '${ecn.itemCode}')" style="margin-top: 8px; width: 100%; font-size: 10px; background: ${isActive ? 'rgba(148, 163, 184, 0.1)' : colors[i] + '15'}; border: 1.5px solid ${isActive ? '#94a3b8' : colors[i]}; color: ${isActive ? '#64748b' : colors[i]}; padding: 6px; border-radius: 100px; cursor: pointer; font-weight: 800; transition: all 0.2s;">
                                        ${isActive ? 'Đã giao' : 'Chưa giao'}
                                    </button>
                                ` : `
                                    <div style="${ecn.lotNumbers[i] ? 'font-weight: 700; font-size: 12px;' : 'font-weight: 500; font-size: 11px; opacity: 0.8;'} color: ${isActive ? colors[i] : 'var(--text-dim)'};">
                                        ${ecn.lotNumbers[i] || (isActive ? 'Đã giao' : 'Chưa giao')}
                                    </div>
                                `}
                            </div>
                        </div>
                    `;
    }).join('')}
            </div>

            ${deliveryCount === 3 ? `
                <div style="background: rgba(34, 197, 94, 0.1); border: 1px dashed var(--success); padding: 16px; border-radius: var(--radius-md); text-align: center; margin-top: 16px;">
                    <p style="color: var(--success); font-weight: 600;">Đã hoàn thành 3 lot</p>
                </div>
            ` : ''}
        </div>

        <div style="margin-bottom: 32px;">
            <h3 style="margin-bottom: 12px; font-size: 13px; text-transform: uppercase; color: var(--text-dim); letter-spacing: 0.5px;">Nội dung thay đổi</h3>
            <p style="line-height: 1.6; font-size: 14px; color: var(--text-main); opacity: 0.8;">${ecn.description}</p>
        </div>

        <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 24px; padding: 24px 8px 0 8px; border-top: 1px solid var(--glass-border);">
            <!-- Line Section -->
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 100px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 4px; background: var(--primary-glow); color: var(--primary); width: 95px; height: 28px; border-radius: 100px; border: 1px solid var(--primary); font-size: 9px; font-weight: 800; letter-spacing: 0.5px;">
                    <i data-lucide="layers" style="width: 10px; height: 10px;"></i> LINE
                </div>
                <span style="font-size: 13px; font-weight: 800; color: var(--text-main); text-transform: uppercase;">${ecn.line}</span>
            </div>

            <!-- 4M+1E Section -->
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 100px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 4px; background: rgba(168, 85, 247, 0.1); color: #a855f7; width: 95px; height: 28px; border-radius: 100px; border: 1px solid #a855f7; font-size: 9px; font-weight: 800; letter-spacing: 0.5px;">
                    <i data-lucide="cog" style="width: 10px; height: 10px;"></i> 4M+1E
                </div>
                <span style="font-size: 13px; font-weight: 800; color: var(--text-main); text-transform: uppercase;">${ecn.m4e || 'N/A'}</span>
            </div>

            <!-- Category Section -->
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; min-width: 100px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 4px; background: rgba(148, 163, 184, 0.1); color: var(--text-dim); width: 95px; height: 28px; border-radius: 100px; border: 1px solid var(--bg-accent); font-size: 9px; font-weight: 800; letter-spacing: 0.5px;">
                    <i data-lucide="tag" style="width: 10px; height: 10px;"></i> PHÂN LOẠI
                </div>
                <span style="font-size: 13px; font-weight: 800; color: var(--text-main); text-transform: uppercase;">${ecn.category}</span>
            </div>
        </div>

        ${isAdmin ? `
            <div style="display: flex; gap: 12px; margin-top: 32px; padding-top: 24px; border-top: 1px dashed var(--glass-border);">
                <button id="btnEditECN" data-id="${ecn.id}" data-itemcode="${ecn.itemCode}" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; background: var(--bg-accent); color: var(--text-main); border: 1px solid var(--glass-border); border-radius: var(--radius-md); font-weight: 700; cursor: pointer;">
                    <i data-lucide="edit-3" style="width: 18px;"></i> Sửa ECN
                </button>
                <button id="btnDeleteECN" data-id="${ecn.id}" data-itemcode="${ecn.itemCode}" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid #ef4444; border-radius: var(--radius-md); font-weight: 700; cursor: pointer;">
                    <i data-lucide="trash-2" style="width: 18px;"></i> Xóa ECN
                </button>
            </div>
        ` : ''}
    `;

    detailOverlay.style.display = 'flex';
    lucide.createIcons();

    // Attach listeners for Edit/Delete buttons (Safer than inline onclick)
    if (isAdmin) {
        const btnEdit = document.getElementById('btnEditECN');
        const btnDelete = document.getElementById('btnDeleteECN');
        if (btnEdit) btnEdit.onclick = () => editECN(ecn.id, ecn.itemCode);
        if (btnDelete) btnDelete.onclick = () => deleteECN(ecn.id, ecn.itemCode);
    }
}

function toggleDelivery(id, index, itemCode) {
    const ecn = ecns.find(e => e.id === id && e.itemCode === itemCode);
    if (ecn) {
        ecn.deliveries[index] = !ecn.deliveries[index];
        syncData('updateECN', ecn);
        showDetail(id, itemCode); // Re-render detail
        renderECNs();   // Re-render grid
    }
}

function deleteECN(id, itemCode) {
    const ecn = ecns.find(e => e.id === id && e.itemCode === itemCode);
    if (!ecn) return;

    ecnToDelete = { id, itemCode };
    deleteConfirmText.textContent = `Bạn có chắc chắn muốn xóa ECN "${id}" (${itemCode}) không? Hành động này không thể hoàn tác.`;
    deleteConfirmOverlay.style.display = 'flex';
}

function editECN(id, itemCode) {
    const ecn = ecns.find(e => e.id === id && e.itemCode === itemCode);
    if (!ecn) return;

    editingEcnId = id + '|' + itemCode;

    // Fill form
    document.getElementById('newEcnId').value = ecn.id;
    document.getElementById('newItemCode').value = ecn.itemCode; // Fill the specific code
    document.getElementById('newLine').value = ecn.line;
    document.getElementById('new4m').value = ecn.m4e || '';
    document.getElementById('newCat').value = ecn.category;
    document.getElementById('newDesc').value = ecn.description;
    document.getElementById('newImage').value = ecn.image;
    document.getElementById('newDrive').value = ecn.driveLink;

    // Update Modal UI
    document.querySelector('#addModal h2').textContent = 'Chỉnh sửa ECN';
    document.getElementById('saveEcn').textContent = 'Cập nhật';
    addModal.style.display = 'flex';
}

function updateLotNumber(id, index, value, itemCode) {
    const ecn = ecns.find(e => e.id === id && e.itemCode === itemCode);
    if (ecn) {
        ecn.lotNumbers[index] = value;
        syncData('updateECN', ecn);
        renderECNs();
    }
}

// Image Viewer Logic
function openImageViewer(url) {
    if (!url) return;
    const viewer = document.getElementById('imageViewer');
    const img = document.getElementById('fullImage');
    img.src = url;
    viewer.style.display = 'flex';
    resetZoom();
    lucide.createIcons(); // Ensure the X icon is rendered
}

window.closeImageViewer = function () {
    const viewer = document.getElementById('imageViewer');
    viewer.style.display = 'none';
    resetZoom();
}

function resetZoom() {
    const img = document.getElementById('fullImage');
    isZoomed = false;
    zoomScale = 1;
    translateX = 0;
    translateY = 0;
    img.style.transformOrigin = 'center';
    img.style.transform = 'translate(0, 0) scale(1)';
    img.style.cursor = 'zoom-in';
}

function toggleZoom(e) {
    if (e.touches && e.touches.length > 1) return;
    const img = document.getElementById('fullImage');
    if (!isZoomed) {
        isZoomed = true;
        zoomScale = 2.5;
        img.style.cursor = 'grab';
    } else {
        resetZoom();
    }
    updateImageTransform();
}

function updateImageTransform() {
    const img = document.getElementById('fullImage');
    img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${zoomScale})`;
}

function setupEventListeners() {
    // Sidebar filtering (Nested Dropdown)
    lineList.addEventListener('click', (e) => {
        const lineItem = e.target.closest('.line-item');
        const subItem = e.target.closest('.sub-item');

        if (lineItem) {
            const line = lineItem.dataset.line;

            // Clear all active states in sidebar
            document.querySelectorAll('#lineList .line-item, .sub-item').forEach(el => el.classList.remove('active'));
            lineItem.classList.add('active');

            currentFilter.line = line;
            currentFilter.category = 'all';

            renderECNs();
            // If it's "All Lines", no sub-menu to show
            if (line === 'all') {
                // Refresh to collapse others
                renderLines();
            }
        } else if (subItem) {
            const cat = subItem.dataset.cat;
            const group = subItem.closest('.line-group');
            const parentLineItem = group.querySelector('.line-item');

            document.querySelectorAll('.sub-item').forEach(el => el.classList.remove('active'));
            subItem.classList.add('active');

            currentFilter.line = parentLineItem.dataset.line;
            currentFilter.category = cat;
            renderECNs();
        }
    });

    // Search
    searchInput.addEventListener('input', (e) => {
        currentFilter.search = e.target.value;
        renderECNs();
    });

    // Detail Panel
    closeDetail.addEventListener('click', () => {
        detailOverlay.style.display = 'none';
    });

    detailOverlay.addEventListener('click', (e) => {
        if (e.target === detailOverlay) detailOverlay.style.display = 'none';
    });

    // Sidebar Toggle
    sidebarToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('open');
        const isOpen = sidebar.classList.contains('open');
        sidebarIcon.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
        lucide.createIcons();
    });

    closeSidebar.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarIcon.setAttribute('data-lucide', 'menu');
        lucide.createIcons();
    });

    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
        // Chỉ đóng nếu sidebar đang mở và click KHÔNG nằm trong sidebar hoặc nút mở sidebar
        // Kiểm tra e.target.closest vì e.target có thể bị xóa khỏi DOM sau khi click (ví dụ khi render lại)
        const isSidebarClick = e.target.closest('.sidebar');
        const isToggleClick = e.target.closest('#sidebarToggle');

        if (sidebar.classList.contains('open') && !isSidebarClick && !isToggleClick) {
            sidebar.classList.remove('open');
            sidebarIcon.setAttribute('data-lucide', 'menu');
            lucide.createIcons();
        }
    });

    // Custom Password Modal Logic
    const passwordModal = document.getElementById('passwordModal');
    const adminPasswordInput = document.getElementById('adminPasswordInput');
    const submitPassword = document.getElementById('submitPassword');
    const cancelPassword = document.getElementById('cancelPassword');

    adminToggle.addEventListener('click', () => {
        if (!isAdmin) {
            passwordModal.style.display = 'flex';
            adminPasswordInput.value = '';
            adminPasswordInput.focus();
        } else {
            isAdmin = false;
            updateAdminUI();
        }
    });

    cancelPassword.addEventListener('click', () => {
        passwordModal.style.display = 'none';
    });

    submitPassword.addEventListener('click', verifyAdminPassword);
    adminPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verifyAdminPassword();
    });

    function verifyAdminPassword() {
        const password = adminPasswordInput.value;
        const SECRET = "MjAwNDIwMjE="; // btoa('20042021')

        if (btoa(password) === SECRET) {
            isAdmin = true;
            passwordModal.style.display = 'none';
            updateAdminUI();
            alert("Đăng nhập Admin thành công!");
        } else {
            alert("Sai mật khẩu! Bạn không có quyền truy cập.");
        }
    }

    function updateAdminUI() {
        adminToggle.classList.toggle('active', isAdmin);
        adminToggle.innerHTML = isAdmin ?
            '<i data-lucide="unlock" style="width: 20px; height: 20px;"></i> <span class="desktop-only" style="font-size: 13px; margin-left: 6px;">Admin On</span>' :
            '<i data-lucide="user-cog" style="width: 20px; height: 20px;"></i> <span class="desktop-only" style="font-size: 13px; margin-left: 6px;">Admin Off</span>';
        adminActions.style.display = isAdmin ? 'flex' : 'none';
        adminCategoryActions.style.display = isAdmin ? 'block' : 'none';
        addCatModalBtn.style.display = isAdmin ? 'flex' : 'none';
        lucide.createIcons();
        renderECNs();
        renderCategories();
    }

    addCatBtn.addEventListener('click', addNewCategory);
    addCatModalBtn.addEventListener('click', addNewCategory);

    // Custom Category Prompt Listeners
    cancelCatBtn.addEventListener('click', () => {
        catPromptOverlay.style.display = 'none';
        newCatInput.value = '';
    });

    saveCatBtn.addEventListener('click', () => {
        const newCat = newCatInput.value.trim();
        if (newCat && !categories.includes(newCat)) {
            categories.push(newCat);
            syncData('addCategory', { name: newCat });
            renderCategories();

            // Select the newly added category in the dropdown
            const newCatSelect = document.getElementById('newCat');
            if (newCatSelect) {
                newCatSelect.value = newCat;
            }

            catPromptOverlay.style.display = 'none';
            newCatInput.value = '';
        } else if (categories.includes(newCat)) {
            window.alert('Phân loại này đã tồn tại!');
        }
    });

    // Custom Delete Confirmation Listeners
    cancelDeleteBtn.addEventListener('click', () => {
        deleteConfirmOverlay.style.display = 'none';
        categoryToDelete = null;
        ecnToDelete = null;
    });

    confirmDeleteBtn.addEventListener('click', () => {
        if (categoryToDelete) {
            const index = categories.indexOf(categoryToDelete);
            if (index > -1) {
                categories.splice(index, 1);
                syncData('deleteCategory', { name: categoryToDelete });
                renderCategories();
            }
            deleteConfirmOverlay.style.display = 'none';
            categoryToDelete = null;
        } else if (ecnToDelete) {
            const index = ecns.findIndex(e => e.id === ecnToDelete.id && e.itemCode === ecnToDelete.itemCode);
            if (index !== -1) {
                ecns.splice(index, 1);
                syncData('deleteECN', { id: ecnToDelete.id, itemCode: ecnToDelete.itemCode });
                detailOverlay.style.display = 'none';
                renderECNs();
            }
            deleteConfirmOverlay.style.display = 'none';
            ecnToDelete = null;
        }
    });

    // Add ECN Modal
    addEcnBtn.addEventListener('click', () => {
        addModal.style.display = 'flex';
    });

    cancelAdd.addEventListener('click', () => {
        addModal.style.display = 'none';
        editingEcnId = null;
        document.querySelector('#addModal h2').textContent = 'Thêm ECN Mới';
        document.getElementById('saveEcn').textContent = 'Lưu';
    });

    saveEcn.addEventListener('click', () => {
        const ecnId = document.getElementById('newEcnId').value;
        const itemCodesText = document.getElementById('newItemCode').value;
        const line = document.getElementById('newLine').value;
        const m4e = document.getElementById('new4m').value;
        const category = document.getElementById('newCat').value;
        const description = document.getElementById('newDesc').value;
        const driveLink = document.getElementById('newDrive').value;
        const imageLink = document.getElementById('newImage').value;

        // Tách các mã hàng bằng dấu phẩy hoặc xuống dòng
        const itemCodes = itemCodesText.split(/[,\n]/).map(code => code.trim()).filter(code => code !== "");

        if (!ecnId || itemCodes.length === 0) {
            alert('Vui lòng nhập Tên ECN và ít nhất một Mã hàng!');
            return;
        }

        if (editingEcnId) {
            // Update mode
            const [oldId, oldCode] = editingEcnId.split('|');
            const targetEcn = ecns.find(e => e.id === oldId && e.itemCode === oldCode);

            if (targetEcn) {
                targetEcn.id = ecnId;
                targetEcn.itemCode = itemCodes[0];
                targetEcn.line = line;
                targetEcn.m4e = m4e;
                targetEcn.category = category;
                targetEcn.description = description;
                targetEcn.driveLink = driveLink;
                targetEcn.image = getDirectDriveLink(imageLink);
                targetEcn.lastUpdate = new Date().toISOString().split('T')[0];

                syncData('updateECN', targetEcn);
            }
            editingEcnId = null;
        } else {
            // Create mode
            itemCodes.forEach(code => {
                const newEcn = {
                    id: ecnId,
                    itemCode: code,
                    line: line,
                    m4e: m4e,
                    category: category,
                    description: description,
                    lotNumbers: ["", "", ""],
                    deliveries: [false, false, false],
                    firstDeliveryDate: new Date().toISOString().split('T')[0],
                    driveLink: driveLink,
                    image: getDirectDriveLink(imageLink) || "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=400",
                    lastUpdate: new Date().toISOString().split('T')[0]
                };
                ecns.unshift(newEcn);
                syncData('addECN', newEcn);
            });
        }

        renderECNs();
        addModal.style.display = 'none';

        // Reset Modal UI
        document.querySelector('#addModal h2').textContent = 'Thêm ECN Mới';
        document.getElementById('saveEcn').textContent = 'Lưu';

        // Reset fields
        ['newEcnId', 'newItemCode', 'newDesc', 'newDrive', 'newImage', 'new4m'].forEach(id => document.getElementById(id).value = '');
    });

    // Image Viewer Listeners
    const fullImage = document.getElementById('fullImage');
    const imageViewer = document.getElementById('imageViewer');
    const closeViewerBtn = document.getElementById('closeViewer');

    closeViewerBtn.addEventListener('click', closeImageViewer);
    imageViewer.addEventListener('click', (e) => {
        if (e.target === imageViewer || e.target.id === 'viewerContent') closeImageViewer();
    });

    // Mouse Wheel Zoom
    fullImage.addEventListener('wheel', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY;
        const zoomStep = 0.5; // Increased for clear feedback

        if (delta < 0) {
            // Zoom in (scroll up)
            zoomScale = Math.min(zoomScale + zoomStep, 10);
        } else {
            // Zoom out (scroll down)
            zoomScale = Math.max(zoomScale - zoomStep, 1);
        }

        isZoomed = zoomScale > 1;
        fullImage.style.cursor = isZoomed ? 'grab' : 'zoom-in';
        updateImageTransform();
    }, { passive: false });

    fullImage.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleZoom(e);
    });

    // Dragging & Pinch Zoom Logic
    const handleStart = (e) => {
        if (e.touches && e.touches.length === 2) {
            // Pinch start
            initialDist = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            initialScale = zoomScale;
            return;
        }

        if (!isZoomed && (!e.touches || e.touches.length === 1)) return;

        const pos = e.type === 'mousedown' ? e : e.touches[0];
        startX = pos.clientX - translateX;
        startY = pos.clientY - translateY;
        fullImage.style.transition = 'none';
        fullImage.style.cursor = 'grabbing';

        const handleMove = (moveEvent) => {
            if (moveEvent.touches && moveEvent.touches.length === 2) {
                moveEvent.preventDefault();
                // Pinch move
                const dist = Math.hypot(
                    moveEvent.touches[0].pageX - moveEvent.touches[1].pageX,
                    moveEvent.touches[0].pageY - moveEvent.touches[1].pageY
                );
                zoomScale = Math.min(Math.max(initialScale * (dist / initialDist), 1), 5);
                isZoomed = zoomScale > 1;
                fullImage.style.cursor = isZoomed ? 'grab' : 'zoom-in';
                updateImageTransform();
                return;
            }

            if (!isZoomed) return;
            moveEvent.preventDefault();
            const movePos = moveEvent.type === 'mousemove' ? moveEvent : moveEvent.touches[0];
            translateX = movePos.clientX - startX;
            translateY = movePos.clientY - startY;
            updateImageTransform();
        };

        const handleEnd = () => {
            fullImage.style.transition = 'transform 0.3s ease';
            if (isZoomed) fullImage.style.cursor = 'grab';
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);
    };

    fullImage.addEventListener('mousedown', handleStart);
    fullImage.addEventListener('touchstart', handleStart, { passive: false });
}

function addNewCategory() {
    catPromptOverlay.style.display = 'flex';
    newCatInput.focus();
}

function deleteCategory(catName) {
    console.log('Attempting to delete category:', catName);

    if (!catName) return;

    // Kiểm tra xem có ECN nào đang dùng danh mục này không
    const isUsed = ecns.some(e => e.category.trim().toLowerCase() === catName.trim().toLowerCase());

    if (isUsed) {
        window.alert(`Không thể xóa! Danh mục "${catName}" đang được sử dụng bởi một hoặc nhiều ECN.`);
        return;
    }

    // Hiển thị modal xác nhận thay vì window.confirm
    categoryToDelete = catName;
    deleteConfirmText.textContent = `Bạn có chắc chắn muốn xóa danh mục "${catName}" không? Hành động này không thể hoàn tác.`;
    deleteConfirmOverlay.style.display = 'flex';
}

// Run init
init();
