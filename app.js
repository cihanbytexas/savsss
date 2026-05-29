// ==========================================
// 🔴 SUPABASE BULUT BAĞLANTI AYARLARI
// ==========================================
const SUPABASE_URL = 'https://svuimwapedjuozkrgyov.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2dWltd2FwZWRqdW96a3JneW92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTU0MTgsImV4cCI6MjA5NTYzMTQxOH0.DjgZ5gEbHKnLAbhP7EWrGc4-5cWIl4O2rjDOopUs83k';

let supabase = null;

function initSupabase() {
    try {
        if (window.supabase && window.supabase.createClient) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log("Supabase başarıyla başlatıldı.");
        }
    } catch (err) { console.error("Supabase hatası:", err); }
}
// ==========================================

const translations = {
    "tr": { "upload_btn": "DOSYA YÜKLE", "download_btn": "KAYDET", "compare_btn": "KARŞILAŞTIR", "compared_file": "Karşılaştırılan:", "main_file": "Ana Dosya:", "active_file": "Aktif Dosya", "no_file": "Henüz dosya seçilmedi. Düzenlemek için .sav uzantılı bir dosya yükleyin.", "tab_values": "Değerler", "tab_hex": "Hex Editör", "empty_msg": "Düzenlemeye başlamak için bir dosya yükleyin.", "search_placeholder": "Arama yap... (Örn: TotalShoot)", "hex_search_placeholder": "Hex veya Metin arat...", "search_btn": "BUL", "offset": "Offset", "ascii": "ASCII", "file_info_name": "Dosya:", "file_info_size": "Boyut:", "file_info_status": "Durum:", "status_processing": "İşleniyor...", "status_success": "Başarılı", "status_fail": "Okuma Başarısız", "fail_desc": "Bu dosyada okunabilir değer bulunamadı.<br><br>Hex Editör sekmesini kullanın.", "modal_title": "Hex Değeri Düzenle", "modal_cancel": "İPTAL", "modal_save": "KAYDET", "search_not_found": "Aranan değer bulunamadı!", "patch_import": "Yama Uygula (.json)", "patch_export": "Yamayı Dışa Aktar", "share_patch": "Toplulukta Paylaş", "patch_empty": "Değişiklik bulunamadı!", "patch_success_export": "Yama başarıyla kaydedildi!", "patch_success_import": "Yama başarıyla uygulandı!", "patch_error": "Geçersiz yama dosyası!", "undo": "Geri Al", "redo": "İleri Al", "community": "Topluluk", "share_title": "Toplulukta Paylaş", "share_desc": "Yaptığınız değişiklikleri diğer oyuncularla paylaşın.", "share_author_ph": "Yazar Adı (Örn: Texas)", "share_game_ph": "Oyun Adı (Örn: PUBG)", "share_title_ph": "Yama Başlığı (Örn: Aim Active)", "share_btn": "PAYLAŞ", "share_success": "Yamanız başarıyla paylaşıldı!", "share_fail": "Paylaşım başarısız oldu.", "apply_btn": "UYGULA", "conn_error": "Bağlantı Hatası!", "toggle_lang": "EN" },
    "en": { "upload_btn": "UPLOAD", "download_btn": "SAVE", "compare_btn": "COMPARE", "compared_file": "Compared:", "main_file": "Main File:", "active_file": "Active File", "no_file": "No file selected. Upload a .sav file to start editing.", "tab_values": "Values", "tab_hex": "Hex Editor", "empty_msg": "Upload a file to begin editing.", "search_placeholder": "Search... (e.g., TotalShoot)", "hex_search_placeholder": "Search Hex or Text...", "search_btn": "FIND", "offset": "Offset", "ascii": "ASCII", "file_info_name": "File:", "file_info_size": "Size:", "file_info_status": "Status:", "status_processing": "Processing...", "status_success": "Success", "status_fail": "Read Failed", "fail_desc": "No readable values found in this file.<br><br>Please use the Hex Editor.", "modal_title": "Edit Hex Value", "modal_cancel": "CANCEL", "modal_save": "SAVE", "search_not_found": "Value not found!", "patch_import": "Import Patch (.json)", "patch_export": "Export Patch", "share_patch": "Share to Community", "patch_empty": "No changes found!", "patch_success_export": "Patch exported successfully!", "patch_success_import": "Patch applied successfully!", "patch_error": "Invalid patch file!", "undo": "Undo", "redo": "Redo", "community": "Community", "share_title": "Share to Community", "share_desc": "Share your modifications with other players.", "share_author_ph": "Author Name (e.g., Texas)", "share_game_ph": "Game Name (e.g., PUBG)", "share_title_ph": "Patch Title (e.g., Aim Active)", "share_btn": "SHARE", "share_success": "Patch shared successfully!", "share_fail": "Failed to share patch.", "apply_btn": "APPLY", "conn_error": "Connection Error!", "toggle_lang": "TR" }
};

let currentLang = "tr", totalValuesFound = 0, activeHexIndex = -1, activeHexElement = null, searchMatchIndex = -1, searchMatchLength = 0, undoStack = [], redoStack = [], originalUint8Array = null, compareUint8Array = null, compareFileName = "", fileBuffer = null, dataView = null, uint8Array = null, currentFileName = "";

function showToast(message) {
    const toast = document.getElementById("toast-container");
    toast.innerText = message;
    toast.classList.remove("hidden");
    setTimeout(() => { toast.classList.add("hidden"); }, 3000);
}

function applyTranslations() {
    const langData = translations[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(elem => { if (langData[elem.getAttribute('data-i18n')]) elem.innerHTML = langData[elem.getAttribute('data-i18n')]; });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(elem => { if (langData[elem.getAttribute('data-i18n-placeholder')]) elem.setAttribute('placeholder', langData[elem.getAttribute('data-i18n-placeholder')]); });
    document.querySelectorAll('[data-i18n-title]').forEach(elem => { if (langData[elem.getAttribute('data-i18n-title')]) elem.setAttribute('title', langData[elem.getAttribute('data-i18n-title')]); });
    document.getElementById('lang-toggle').innerText = langData["toggle_lang"];
}

document.addEventListener("DOMContentLoaded", () => {
    
    // SİHRİN GERÇEKLEŞTİĞİ YER: Yükleme ekranı asla kilitlenmeyecek!
    const splashScreen = document.getElementById("splash-screen");
    if(splashScreen) {
        setTimeout(() => {
            splashScreen.classList.add("hidden");
            initSupabase(); 
        }, 500); 
    }

    const uploadInput = document.getElementById("upload-save"), downloadBtn = document.getElementById("download-save"), fileInfo = document.getElementById("file-info"), smartList = document.getElementById("smart-list"), emptyMsg = document.getElementById("empty-message"), editorContainer = document.getElementById("smart-editor-container"), hexSearchContainer = document.getElementById("hex-search-container"), searchInput = document.getElementById("search-input"), langToggleBtn = document.getElementById("lang-toggle"), tabs = document.querySelectorAll(".tab"), views = document.querySelectorAll(".view-content"), customModal = document.getElementById("custom-modal"), modalDesc = document.getElementById("modal-desc"), modalInput = document.getElementById("modal-input"), modalCancel = document.getElementById("modal-cancel"), modalSave = document.getElementById("modal-save"), hexSearchInput = document.getElementById("hex-search-input"), hexSearchBtn = document.getElementById("hex-search-btn"), btnUndo = document.getElementById("btn-undo"), btnRedo = document.getElementById("btn-redo"), btnExportPatch = document.getElementById("btn-export-patch"), btnImportPatch = document.getElementById("btn-import-patch"), btnSharePatch = document.getElementById("btn-share-patch"), patchDivider = document.getElementById("patch-divider"), uploadPatch = document.getElementById("upload-patch"), compareSection = document.getElementById("compare-section"), uploadCompare = document.getElementById("upload-compare"), compareDetails = document.getElementById("compare-details"), btnCommunity = document.getElementById("btn-community"), editorWrapper = document.getElementById("editor-wrapper"), communityView = document.getElementById("community-view"), communityLoader = document.getElementById("community-loader"), communityList = document.getElementById("community-list"), shareModal = document.getElementById("share-modal"), shareAuthor = document.getElementById("share-author"), shareGame = document.getElementById("share-game"), shareTitle = document.getElementById("share-title-input"), shareCancel = document.getElementById("share-cancel"), shareSave = document.getElementById("share-save");

    langToggleBtn.addEventListener("click", () => { currentLang = currentLang === "tr" ? "en" : "tr"; applyTranslations(); });

    let isCommunityOpen = false;
    btnCommunity.addEventListener("click", () => {
        isCommunityOpen = !isCommunityOpen;
        if(isCommunityOpen) { btnCommunity.classList.remove("outline-btn"); btnCommunity.classList.add("primary-btn"); editorWrapper.style.display = "none"; communityView.style.display = "flex"; loadCommunityPatches(); } 
        else { btnCommunity.classList.add("outline-btn"); btnCommunity.classList.remove("primary-btn"); editorWrapper.style.display = "flex"; communityView.style.display = "none"; }
    });

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active")); views.forEach(v => v.classList.remove("active"));
            tab.classList.add("active"); document.getElementById(tab.dataset.target).classList.add("active");
        });
    });

    function pushHistory(changes) { undoStack.push(changes); redoStack = []; updateHistoryButtons(); }
    function updateHistoryButtons() { btnUndo.disabled = undoStack.length === 0; btnRedo.disabled = redoStack.length === 0; }
    function performUndo() { if (undoStack.length === 0) return; const changes = undoStack.pop(); redoStack.push(changes); changes.forEach(c => { uint8Array[c.index] = c.oldVal; }); extractPropertiesBulletproof(); renderHexEditor(); updateHistoryButtons(); }
    function performRedo() { if (redoStack.length === 0) return; const changes = redoStack.pop(); undoStack.push(changes); changes.forEach(c => { uint8Array[c.index] = c.newVal; }); extractPropertiesBulletproof(); renderHexEditor(); updateHistoryButtons(); }

    btnUndo.addEventListener("click", performUndo); btnRedo.addEventListener("click", performRedo);
    document.addEventListener("keydown", (e) => { if(e.ctrlKey && e.key.toLowerCase() === 'z') performUndo(); if(e.ctrlKey && e.key.toLowerCase() === 'y') performRedo(); });

    uploadInput.addEventListener("change", (e) => {
        const file = e.target.files[0]; if (!file) return;
        if(isCommunityOpen) btnCommunity.click();
        currentFileName = file.name; const reader = new FileReader();
        reader.onload = (event) => {
            fileBuffer = event.target.result; dataView = new DataView(fileBuffer); uint8Array = new Uint8Array(fileBuffer); originalUint8Array = new Uint8Array(fileBuffer.slice(0));
            compareUint8Array = null; compareFileName = ""; compareDetails.style.display = "none"; undoStack = []; redoStack = []; updateHistoryButtons(); searchMatchIndex = -1; searchMatchLength = 0;
            fileInfo.innerHTML = `<strong>Aktif Dosya:</strong> <span style="color:var(--text-main)">${file.name}</span>`;
            emptyMsg.style.display = "none"; editorContainer.style.display = "flex"; hexSearchContainer.style.display = "flex"; downloadBtn.disabled = false; downloadBtn.classList.remove("outline-btn"); downloadBtn.classList.add("primary-btn"); btnExportPatch.style.display = "flex"; btnImportPatch.style.display = "flex"; btnSharePatch.style.display = "flex"; patchDivider.style.display = "block"; compareSection.style.display = "block";
            setTimeout(() => { extractPropertiesBulletproof(); renderHexEditor(); }, 50);
        };
        reader.readAsArrayBuffer(file); 
    });

    uploadCompare.addEventListener("change", (e) => {
        const file = e.target.files[0]; if (!file || !uint8Array) return;
        compareFileName = file.name; const reader = new FileReader();
        reader.onload = (event) => {
            compareUint8Array = new Uint8Array(event.target.result); compareDetails.style.display = "block";
            document.querySelector(".tabs button[data-target='hex-view']").click(); renderHexEditor(); 
        };
        reader.readAsArrayBuffer(file);
    });

    btnSharePatch.addEventListener("click", () => {
        if (!uint8Array || !originalUint8Array) return;
        let changes = []; for (let i = 0; i < uint8Array.length; i++) { if (uint8Array[i] !== originalUint8Array[i]) changes.push({ o: i, v: uint8Array[i] }); }
        if (changes.length === 0) return showToast(translations[currentLang].patch_empty);
        if (!supabase) return showToast(translations[currentLang].conn_error);
        shareModal.classList.remove("hidden");
    });

    shareCancel.addEventListener("click", () => { shareModal.classList.add("hidden"); });

    shareSave.addEventListener("click", async () => {
        if (!supabase) return showToast(translations[currentLang].conn_error);
        const author = shareAuthor.value.trim() || "Anonim", game = shareGame.value.trim() || "Bilinmiyor", title = shareTitle.value.trim() || "İsimsiz Yama";
        let changes = []; for (let i = 0; i < uint8Array.length; i++) { if (uint8Array[i] !== originalUint8Array[i]) changes.push({ o: i, v: uint8Array[i] }); }
        const patchData = { savstudio: true, version: 1, changes: changes };
        shareSave.disabled = true; shareSave.innerText = "...";
        const { data, error } = await supabase.from('community_patches').insert([{ title: title, author: author, game_name: game, patch_data: patchData }]);
        shareSave.disabled = false; shareSave.innerText = translations[currentLang].share_btn; shareModal.classList.add("hidden");
        if (error) { showToast(translations[currentLang].share_fail); } else { showToast(translations[currentLang].share_success); shareAuthor.value = ""; shareGame.value = ""; shareTitle.value = ""; }
    });

    async function loadCommunityPatches() {
        communityLoader.style.display = "block"; communityList.style.display = "none"; communityList.innerHTML = "";
        if (!supabase) { communityLoader.style.display = "none"; communityList.style.display = "flex"; communityList.innerHTML = `<p style="text-align:center; color:#ff4444;">${translations[currentLang].conn_error}</p>`; return; }
        const { data, error } = await supabase.from('community_patches').select('*').order('created_at', { ascending: false }).limit(20);
        communityLoader.style.display = "none"; communityList.style.display = "flex";
        if (error || !data || data.length === 0) { communityList.innerHTML = `<p style="text-align:center; color:var(--text-muted);">Henüz paylaşılan yama yok.</p>`; return; }
        data.forEach(patch => {
            const date = new Date(patch.created_at).toLocaleDateString(); const changesCount = patch.patch_data.changes ? patch.patch_data.changes.length : 0;
            const card = document.createElement("div"); card.className = "community-card";
            card.innerHTML = `<div class="community-info"><span class="community-title">${patch.title}</span><span class="community-meta">${patch.game_name} | Yazar: ${patch.author}</span><span class="community-meta" style="color:var(--text-main)">${changesCount} değişiklik | ${date}</span></div><button class="btn primary-btn apply-cloud-patch" data-id="${patch.id}"><i class="ph-bold ph-download-simple"></i> <span class="hide-mobile">${translations[currentLang].apply_btn}</span></button>`;
            communityList.appendChild(card);
        });
        document.querySelectorAll(".apply-cloud-patch").forEach(btn => {
            btn.addEventListener("click", (e) => {
                if(!uint8Array) return showToast(translations[currentLang].no_file);
                const patchId = e.currentTarget.getAttribute("data-id"); const patchObj = data.find(p => p.id == patchId);
                if(patchObj && patchObj.patch_data && patchObj.patch_data.changes) {
                    let historyChanges = [];
                    patchObj.patch_data.changes.forEach(c => { if (c.o < uint8Array.length) { let oldVal = uint8Array[c.o]; if(oldVal !== c.v) { historyChanges.push({ index: c.o, oldVal: oldVal, newVal: c.v }); uint8Array[c.o] = c.v; } } });
                    if (historyChanges.length > 0) { pushHistory(historyChanges); extractPropertiesBulletproof(); renderHexEditor(); btnCommunity.click(); showToast(translations[currentLang].patch_success_import); } 
                    else { showToast(translations[currentLang].patch_empty); }
                }
            });
        });
    }

    btnExportPatch.addEventListener("click", () => {
        if (!uint8Array || !originalUint8Array) return;
        let changes = []; for (let i = 0; i < uint8Array.length; i++) { if (uint8Array[i] !== originalUint8Array[i]) changes.push({ o: i, v: uint8Array[i] }); }
        if (changes.length === 0) return showToast(translations[currentLang].patch_empty);
        const patchData = { savstudio: true, version: 1, changes: changes }; const blob = new Blob([JSON.stringify(patchData)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = currentFileName.replace(".sav", "") + "_patch.json"; document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0); showToast(translations[currentLang].patch_success_export);
    });

    uploadPatch.addEventListener("change", (e) => {
        const file = e.target.files[0]; if (!file || !uint8Array) return; const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const patchData = JSON.parse(event.target.result); if (!patchData.savstudio || !patchData.changes) throw new Error("Invalid format");
                let historyChanges = []; patchData.changes.forEach(c => { if (c.o < uint8Array.length) { let oldVal = uint8Array[c.o]; if(oldVal !== c.v) { historyChanges.push({ index: c.o, oldVal: oldVal, newVal: c.v }); uint8Array[c.o] = c.v; } } });
                if (historyChanges.length > 0) { pushHistory(historyChanges); extractPropertiesBulletproof(); renderHexEditor(); showToast(translations[currentLang].patch_success_import); } else { showToast(translations[currentLang].patch_empty); }
            } catch(err) { showToast(translations[currentLang].patch_error); } e.target.value = ""; 
        }; reader.readAsText(file);
    });

    function extractPropertiesBulletproof() {
        let rawStr = ""; for (let i = 0; i < uint8Array.length; i++) { rawStr += String.fromCharCode(uint8Array[i]); }
        let properties = []; const types = [ { type: "IntProperty", offsetAdd: 21 }, { type: "FloatProperty", offsetAdd: 23 }, { type: "BoolProperty", offsetAdd: 21 }, { type: "StrProperty", offsetAdd: 25 }, { type: "NameProperty", offsetAdd: 25 } ];
        types.forEach(t => {
            let index = 0;
            while ((index = rawStr.indexOf(t.type, index)) !== -1) {
                try {
                    let i = index - 1; while (i > 0 && !(/[a-zA-Z0-9_]/.test(rawStr[i]))) { i--; } let nameEnd = i; while (i > 0 && (/[a-zA-Z0-9_]/.test(rawStr[i]))) { i--; } let nameStart = i + 1; let varName = rawStr.substring(nameStart, nameEnd + 1);
                    if (varName.length >= 2) { const valueOffset = index + t.offsetAdd; if (valueOffset + 4 <= uint8Array.length) properties.push({ name: varName, type: t.type, offset: valueOffset }); }
                } catch(e) {} index += t.type.length;
            }
        });
        renderList(properties);
    }

    function renderList(properties) {
        smartList.innerHTML = ""; const lang = translations[currentLang]; totalValuesFound = properties.length;
        if(properties.length === 0) { smartList.innerHTML = `<p style='color:var(--text-muted); text-align:center; padding: 40px;'>${lang.fail_desc}</p>`; return; }
        properties.sort((a, b) => a.offset - b.offset);
        properties.forEach((prop) => {
            const item = document.createElement("div"); item.className = "smart-item"; let currentValue = 0; let step = "1"; let inputType = "number";
            try {
                if (prop.type === "IntProperty") { currentValue = dataView.getInt32(prop.offset, true); step = "1"; } 
                else if (prop.type === "FloatProperty") { let fVal = dataView.getFloat32(prop.offset, true); currentValue = Number.isInteger(fVal) ? fVal : fVal.toFixed(6).replace(/\.?0+$/, ''); step = "0.01"; } 
                else if (prop.type === "BoolProperty") { currentValue = dataView.getUint8(prop.offset) === 1 ? 1 : 0; } 
                else if (prop.type === "StrProperty" || prop.type === "NameProperty") { inputType = "text"; let str = ""; for (let i = 0; i < 64; i++) { let char = uint8Array[prop.offset + i]; if (char === 0) break; if (char >= 32 && char <= 126) str += String.fromCharCode(char); } currentValue = str; }
            } catch(e) { currentValue = 0; }
            let inputHTML = "";
            if (prop.type === "BoolProperty") { let isChecked = currentValue === 1 ? "checked" : ""; inputHTML = `<div class="smart-item-right"><label class="switch"><input type="checkbox" class="smart-checkbox" data-offset="${prop.offset}" data-type="${prop.type}" ${isChecked}><span class="slider"></span></label></div>`; } 
            else { inputHTML = `<input type="${inputType}" class="smart-input" step="${step}" value="${currentValue}" data-offset="${prop.offset}" data-type="${prop.type}">`; }
            item.innerHTML = `<div class="smart-left"><span class="smart-offset">0x${prop.offset.toString(16).toUpperCase()}</span><span class="smart-name" title="${prop.name}">${prop.name}</span></div>${inputHTML}`; smartList.appendChild(item);
        });

        document.querySelectorAll(".smart-input, .smart-checkbox").forEach(input => {
            input.addEventListener("change", (e) => {
                const offset = parseInt(e.target.dataset.offset); const type = e.target.dataset.type; let newVal = type === "BoolProperty" ? (e.target.checked ? 1 : 0) : e.target.value; let changes = []; 
                try {
                    if (type === "IntProperty" || type === "FloatProperty" || type === "BoolProperty") {
                        let bytesToSave = type === "BoolProperty" ? 1 : 4; let oldBuffer = new Uint8Array(fileBuffer.slice(offset, offset + bytesToSave));
                        if (type === "IntProperty") dataView.setInt32(offset, Number(newVal), true); else if (type === "FloatProperty") dataView.setFloat32(offset, Number(newVal), true); else if (type === "BoolProperty") { dataView.setUint8(offset, newVal); }
                        for(let i=0; i<bytesToSave; i++) changes.push({index: offset+i, oldVal: oldBuffer[i], newVal: uint8Array[offset+i]});
                    } else if (type === "StrProperty" || type === "NameProperty") {
                        let origLen = 0; while(uint8Array[offset + origLen] !== 0 && origLen < 128) origLen++; let oldBuffer = new Uint8Array(fileBuffer.slice(offset, offset + origLen));
                        for (let i=0; i<origLen; i++) { let newByte = i < newVal.length ? newVal.charCodeAt(i) : 0; dataView.setUint8(offset + i, newByte); changes.push({index: offset+i, oldVal: oldBuffer[i], newVal: newByte}); }
                    }
                    if(changes.length > 0) pushHistory(changes); if (type !== "BoolProperty") e.target.classList.add("edited-val"); renderHexEditor(); 
                } catch(err) {}
            });
        });
    }

    function scrollToHex(index) { document.querySelector(".tabs button[data-target='hex-view']").click(); const hexBody = document.getElementById("hex-body"); const row = Math.floor(index / 16); hexBody.scrollTop = row * 28; }
    function openModal(index, currentHex, element) { activeHexIndex = index; activeHexElement = element; const decValue = parseInt(currentHex, 16); modalDesc.innerHTML = `Address: <strong style="color:var(--text-main)">0x${index.toString(16).toUpperCase()}</strong> <br> Decimal: <strong style="color:var(--text-main)">${decValue}</strong>`; modalInput.value = currentHex; customModal.classList.remove("hidden"); setTimeout(() => { modalInput.focus(); modalInput.select(); }, 50); }
    function closeModal() { customModal.classList.add("hidden"); activeHexIndex = -1; activeHexElement = null; }

    modalCancel.addEventListener("click", closeModal);
    modalSave.addEventListener("click", () => {
        if (activeHexIndex !== -1) {
            let newHex = modalInput.value.trim().toUpperCase();
            if (/^[0-9A-F]{1,2}$/.test(newHex)) { let oldVal = uint8Array[activeHexIndex]; let newVal = parseInt(newHex, 16); if(oldVal !== newVal) { pushHistory([{index: activeHexIndex, oldVal: oldVal, newVal: newVal}]); uint8Array[activeHexIndex] = newVal; if (activeHexElement) { activeHexElement.innerText = newHex.padStart(2, '0'); activeHexElement.classList.add("edited-val"); } extractPropertiesBulletproof(); } }
        } closeModal();
    });

    modalInput.addEventListener("keyup", (e) => { if (e.key === "Enter") modalSave.click(); if (e.key === "Escape") closeModal(); });

    hexSearchBtn.addEventListener("click", () => {
        const query = hexSearchInput.value.trim(); if (!query || !uint8Array) return; let searchBytes = [];
        if (/^[0-9A-Fa-f\s]+$/.test(query) && query.length >= 2) { const cleanQuery = query.replace(/\s/g, ""); for(let i=0; i<cleanQuery.length; i+=2) searchBytes.push(parseInt(cleanQuery.substring(i, i+2), 16)); } else { for(let i=0; i<query.length; i++) searchBytes.push(query.charCodeAt(i)); }
        let startIdx = (searchMatchIndex !== -1) ? searchMatchIndex + 1 : 0; let foundIdx = -1;
        for (let i = startIdx; i <= uint8Array.length - searchBytes.length; i++) { let match = true; for (let j = 0; j < searchBytes.length; j++) { if (uint8Array[i + j] !== searchBytes[j]) { match = false; break; } } if (match) { foundIdx = i; break; } }
        if (foundIdx === -1 && startIdx > 0) { for (let i = 0; i < startIdx; i++) { let match = true; for (let j = 0; j < searchBytes.length; j++) { if (uint8Array[i + j] !== searchBytes[j]) { match = false; break; } } if (match) { foundIdx = i; break; } } }
        if (foundIdx !== -1) { searchMatchIndex = foundIdx; searchMatchLength = searchBytes.length; scrollToHex(foundIdx); renderHexEditor(); } else { showToast(translations[currentLang].search_not_found); searchMatchIndex = -1; searchMatchLength = 0; renderHexEditor(); }
    });

    hexSearchInput.addEventListener("keyup", (e) => { if (e.key === "Enter") hexSearchBtn.click(); });

    window.renderHexEditor = function() {
        const hexBody = document.getElementById("hex-body"); const currentScrollTop = hexBody.scrollTop || 0; hexBody.innerHTML = ""; if (!uint8Array || uint8Array.length === 0) return;
        const hexRowHeight = 28; const totalRows = Math.ceil(uint8Array.length / 16); const scrollWrapper = document.createElement("div"); scrollWrapper.style.height = (totalRows * hexRowHeight) + "px"; scrollWrapper.style.position = "relative";
        const contentNode = document.createElement("div"); contentNode.style.position = "absolute"; contentNode.style.top = "0"; contentNode.style.left = "0"; contentNode.style.width = "100%"; scrollWrapper.appendChild(contentNode); hexBody.appendChild(scrollWrapper);
        let lastRenderedStart = -1;
        function renderChunk() {
            const startRow = Math.floor(hexBody.scrollTop / hexRowHeight); if (Math.abs(lastRenderedStart - startRow) < 2 && lastRenderedStart !== -1) return; lastRenderedStart = startRow;
            const visibleRows = Math.ceil(hexBody.clientHeight / hexRowHeight); const start = Math.max(0, startRow - 5); const end = Math.min(totalRows, startRow + visibleRows + 5); contentNode.style.transform = `translateY(${start * hexRowHeight}px)`;
            let htmlContent = "";
            for (let r = start; r < end; r++) {
                const i = r * 16; let hexRow = `<div class="hex-row" style="height:${hexRowHeight}px; box-sizing: border-box;"><div class="hex-offset-col">${i.toString(16).padStart(8, '0').toUpperCase()}</div>`; let hexBytes = ""; let asciiChars = "";
                for (let j = 0; j < 16; j++) {
                    if (i + j < uint8Array.length) {
                        const byte = uint8Array[i + j]; const hexValue = byte.toString(16).padStart(2, '0').toUpperCase();
                        let isHighlighted = searchMatchIndex !== -1 && (i+j >= searchMatchIndex) && (i+j < searchMatchIndex + searchMatchLength); let isDiff = compareUint8Array && compareUint8Array[i+j] !== undefined && compareUint8Array[i+j] !== byte; let isNull = byte === 0; let isAscii = byte >= 32 && byte <= 126;
                        let classNames = "hex-byte"; if(isDiff) classNames += " hex-diff"; else if(isHighlighted) classNames += " hex-highlight"; else { if(isNull) classNames += " hex-null"; else if(isAscii) classNames += " hex-ascii"; }
                        hexBytes += `<span class="${classNames}" data-index="${i+j}" title="Edit">${hexValue}</span> `; asciiChars += isAscii ? String.fromCharCode(byte) : ".";
                    } else { hexBytes += "   "; }
                }
                hexRow += `<div class="hex-bytes-col">${hexBytes}</div>`; asciiChars = asciiChars.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); hexRow += `<div class="hex-ascii-col">${asciiChars}</div></div>`; htmlContent += hexRow;
            }
            contentNode.innerHTML = htmlContent; contentNode.querySelectorAll('.hex-byte').forEach(span => { span.addEventListener('click', function() { openModal(parseInt(this.getAttribute('data-index')), this.innerText, this); }); });
        }
        hexBody.onscroll = renderChunk; hexBody.scrollTop = currentScrollTop; renderChunk();
    }

    searchInput.addEventListener("input", (e) => { const term = e.target.value.toLowerCase(); document.querySelectorAll(".smart-item").forEach(item => { item.style.display = item.querySelector(".smart-name").innerText.toLowerCase().includes(term) ? "flex" : "none"; }); });
    downloadBtn.addEventListener("click", () => { const blob = new Blob([fileBuffer], { type: "application/octet-stream" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "edited_" + currentFileName; document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0); });

    applyTranslations();
});
