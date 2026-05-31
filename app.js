const translations = {
    "tr": {
        "upload_btn": "DOSYA YÜKLE", "download_btn": "KAYDET", "compare_btn": "KARŞILAŞTIR", "compared_file": "Karşılaştırılan:", "main_file": "Ana Dosya:", "active_file": "Aktif Dosya", "no_file": "Henüz dosya seçilmedi. Düzenlemek için .sav uzantılı bir dosya yükleyin.", "tab_values": "Değerler", "tab_hex": "Hex Editör", "empty_msg": "Düzenlemeye başlamak için bir dosya yükleyin.", "search_placeholder": "Arama yap... (Örn: TotalShoot)", "hex_search_placeholder": "Hex veya Metin arat...", "search_btn": "BUL", "offset": "Offset", "ascii": "ASCII", "file_info_name": "Dosya:", "file_info_size": "Boyut:", "file_info_status": "Durum:", "status_processing": "İşleniyor...", "status_success": "Başarılı", "status_fail": "Okuma Başarısız", "fail_desc": "Bu dosyada okunabilir değer bulunamadı.<br><br>Hex Editör sekmesini kullanın.", "modal_title": "Hex Değeri Düzenle", "modal_cancel": "İPTAL", "modal_save": "KAYDET", "search_not_found": "Aranan değer bulunamadı!", "undo": "Geri Al", "redo": "İleri Al", "toggle_lang": "EN",
        "welcome_drop": "Dosyanızı Buraya Sürükleyin", "welcome_drop_sub": "veya bilgisayarınızdan seçmek için tıklayın (.sav)", 
        "exit_title": "Kaydedilmemiş Değişiklikler", "exit_desc": "Yaptığınız değişiklikleri henüz kaydetmediniz. Çıkmak istediğinize emin misiniz?", "exit_btn_cancel": "İPTAL", "exit_btn_confirm": "ÇIK"
    },
    "en": {
        "upload_btn": "UPLOAD", "download_btn": "SAVE", "compare_btn": "COMPARE", "compared_file": "Compared:", "main_file": "Main File:", "active_file": "Active File", "no_file": "No file selected. Upload a .sav file to start editing.", "tab_values": "Values", "tab_hex": "Hex Editor", "empty_msg": "Upload a file to begin editing.", "search_placeholder": "Search... (e.g., TotalShoot)", "hex_search_placeholder": "Search Hex or Text...", "search_btn": "FIND", "offset": "Offset", "ascii": "ASCII", "file_info_name": "File:", "file_info_size": "Size:", "file_info_status": "Status:", "status_processing": "Processing...", "status_success": "Success", "status_fail": "Read Failed", "fail_desc": "No readable values found in this file.<br><br>Please use the Hex Editor.", "modal_title": "Edit Hex Value", "modal_cancel": "CANCEL", "modal_save": "SAVE", "search_not_found": "Value not found!", "undo": "Undo", "redo": "Redo", "toggle_lang": "TR",
        "welcome_drop": "Drag & Drop Your File Here", "welcome_drop_sub": "or click to select from your computer (.sav)",
        "exit_title": "Unsaved Changes", "exit_desc": "You have unsaved changes. Are you sure you want to exit without saving?", "exit_btn_cancel": "CANCEL", "exit_btn_confirm": "EXIT"
    }
};

let currentLang = "tr", totalValuesFound = 0, activeHexIndex = -1, activeHexElement = null, searchMatchIndex = -1, searchMatchLength = 0;
let undoStack = [], redoStack = [], originalUint8Array = null, compareUint8Array = null, compareFileName = "", fileBuffer = null, dataView = null, uint8Array = null, currentFileName = "";
let hasUnsavedChanges = false;

function showToast(message) {
    const toast = document.getElementById("toast-container");
    toast.innerText = message; toast.classList.remove("hidden");
    setTimeout(() => { toast.classList.add("hidden"); }, 3000);
}

function applyTranslations() {
    const langData = translations[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(elem => { if (langData[elem.getAttribute('data-i18n')]) elem.innerHTML = langData[elem.getAttribute('data-i18n')]; });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(elem => { if (langData[elem.getAttribute('data-i18n-placeholder')]) elem.setAttribute('placeholder', langData[elem.getAttribute('data-i18n-placeholder')]); });
    document.querySelectorAll('[data-i18n-title]').forEach(elem => { if (langData[elem.getAttribute('data-i18n-title')]) elem.setAttribute('title', langData[elem.getAttribute('data-i18n-title')]); });
    document.getElementById('lang-toggle').innerText = langData["toggle_lang"];

    const fileInfo = document.getElementById("file-info");
    if (fileInfo.innerHTML.includes(translations[currentLang === "tr" ? "en" : "tr"].file_info_name) || fileInfo.innerHTML.includes(translations[currentLang].file_info_name)) {
        const fileNameSpan = document.getElementById("ui-filename"), fileSizeSpan = document.getElementById("ui-filesize"), fileStatusSpan = document.getElementById("ui-filestatus");
        if(fileNameSpan) {
            fileInfo.innerHTML = `<strong>${langData.active_file}</strong><br><br><strong>${langData.file_info_name}</strong> <span id="ui-filename" style="color:var(--text-main)">${fileNameSpan.innerText}</span> <br><strong>${langData.file_info_size}</strong> <span id="ui-filesize" style="color:var(--text-main)">${fileSizeSpan.innerText}</span> <br><strong>${langData.file_info_status}</strong> <span id="ui-filestatus" style="color:var(--text-main)">${totalValuesFound > 0 ? langData.status_success + ' ('+totalValuesFound+')' : fileStatusSpan.innerText}</span>`;
        }
    }
    if(compareUint8Array) { document.getElementById("compare-details").innerHTML = `<strong style="color:var(--text-main)">${langData.main_file}</strong> ${currentFileName} <br><strong style="color:#ff4444">${langData.compared_file}</strong> ${compareFileName}`; }
}

document.addEventListener("DOMContentLoaded", () => {
    const uploadInput = document.getElementById("upload-save"), downloadBtn = document.getElementById("download-save"), fileInfo = document.getElementById("file-info"), smartList = document.getElementById("smart-list"), emptyMsg = document.getElementById("empty-message"), editorContainer = document.getElementById("smart-editor-container"), hexSearchContainer = document.getElementById("hex-search-container"), searchInput = document.getElementById("search-input"), langToggleBtn = document.getElementById("lang-toggle"), tabs = document.querySelectorAll(".tab"), views = document.querySelectorAll(".view-content"), customModal = document.getElementById("custom-modal"), modalDesc = document.getElementById("modal-desc"), modalInput = document.getElementById("modal-input"), modalCancel = document.getElementById("modal-cancel"), modalSave = document.getElementById("modal-save"), hexSearchInput = document.getElementById("hex-search-input"), hexSearchBtn = document.getElementById("hex-search-btn"), btnUndo = document.getElementById("btn-undo"), btnRedo = document.getElementById("btn-redo"), compareSection = document.getElementById("compare-section"), uploadCompare = document.getElementById("upload-compare"), compareDetails = document.getElementById("compare-details");
    
    const btnExportPatch = document.getElementById("btn-export-patch"), uploadPatch = document.getElementById("upload-patch"), btnImportPatch = document.getElementById("btn-import-patch"), patchDivider = document.getElementById("patch-divider");
    const dropZone = document.getElementById("drop-zone"), dropZoneInput = document.getElementById("drop-zone-input");

    const exitModal = document.getElementById("exit-modal"), exitCancel = document.getElementById("exit-cancel"), exitConfirm = document.getElementById("exit-confirm");

    // Sekme kapatılırken veya sayfa yenilenirken (F5) çıkacak güvenlik uyarısı
    window.addEventListener("beforeunload", (e) => {
        if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ""; }
    });

    // Mobil cihazlarda Geri tuşuna basıldığında kendi şık uyarı ekranımızı gösterme tuzağı
    window.addEventListener("popstate", (e) => {
        if (hasUnsavedChanges) {
            window.history.pushState({ preventBack: true }, ""); // Gerçekten çıkmasını engelle
            exitModal.classList.remove("hidden"); // Bizim şık modalı aç
        }
    });

    exitCancel.addEventListener("click", () => { exitModal.classList.add("hidden"); });
    exitConfirm.addEventListener("click", () => {
        hasUnsavedChanges = false;
        exitModal.classList.add("hidden");
        window.history.back(); // Kullanıcı çıkışı onayladıysa gerçekten çık
    });

    function triggerUnsaved() {
        if (!hasUnsavedChanges) {
            hasUnsavedChanges = true;
            window.history.pushState({ preventBack: true }, ""); // Kullanıcı düzenleme yaptığı an Geri tuşunu tuzağa al
        }
    }

    langToggleBtn.addEventListener("click", () => { currentLang = currentLang === "tr" ? "en" : "tr"; applyTranslations(); });

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active")); views.forEach(v => v.classList.remove("active"));
            tab.classList.add("active"); document.getElementById(tab.dataset.target).classList.add("active");
        });
    });

    function pushHistory(changes) { 
        undoStack.push(changes); 
        redoStack = []; 
        triggerUnsaved(); 
        updateHistoryButtons(); 
    }
    
    function updateHistoryButtons() { btnUndo.disabled = undoStack.length === 0; btnRedo.disabled = redoStack.length === 0; }
    function performUndo() { if (undoStack.length === 0) return; const changes = undoStack.pop(); redoStack.push(changes); changes.forEach(c => { uint8Array[c.index] = c.oldVal; }); extractPropertiesBulletproof(); renderHexEditor(); updateHistoryButtons(); }
    function performRedo() { if (redoStack.length === 0) return; const changes = redoStack.pop(); undoStack.push(changes); changes.forEach(c => { uint8Array[c.index] = c.newVal; }); extractPropertiesBulletproof(); renderHexEditor(); updateHistoryButtons(); }

    btnUndo.addEventListener("click", performUndo); btnRedo.addEventListener("click", performRedo);
    document.addEventListener("keydown", (e) => { if(e.ctrlKey && e.key.toLowerCase() === 'z') performUndo(); if(e.ctrlKey && e.key.toLowerCase() === 'y') performRedo(); });

    function processUploadedFile(file) {
        if (!file) return;
        currentFileName = file.name; const reader = new FileReader();
        reader.onload = (event) => {
            fileBuffer = event.target.result; dataView = new DataView(fileBuffer); uint8Array = new Uint8Array(fileBuffer); originalUint8Array = new Uint8Array(fileBuffer.slice(0)); compareUint8Array = null; compareFileName = ""; compareDetails.style.display = "none"; undoStack = []; redoStack = []; updateHistoryButtons(); searchMatchIndex = -1; searchMatchLength = 0;
            
            hasUnsavedChanges = false; // Yeni dosya yüklendiğinde korumayı sıfırla

            let sizeStr = (file.size / 1024).toFixed(2) + " KB";
            fileInfo.innerHTML = `<strong>${translations[currentLang].active_file}</strong><br><br><strong>${translations[currentLang].file_info_name}</strong> <span id="ui-filename" style="color:var(--text-main)">${file.name}</span> <br><strong>${translations[currentLang].file_info_size}</strong> <span id="ui-filesize" style="color:var(--text-main)">${sizeStr}</span> <br><strong>${translations[currentLang].file_info_status}</strong> <span id="ui-filestatus" style="color:var(--text-main)">${translations[currentLang].status_processing}</span>`;
            
            emptyMsg.style.display = "none"; editorContainer.style.display = "flex"; hexSearchContainer.style.display = "flex"; downloadBtn.disabled = false; downloadBtn.classList.remove("outline-btn"); downloadBtn.classList.add("primary-btn"); compareSection.style.display = "block";
            
            btnImportPatch.style.display = "flex"; btnExportPatch.style.display = "flex"; patchDivider.style.display = "block";

            setTimeout(() => { extractPropertiesBulletproof(); renderHexEditor(); applyTranslations(); }, 50);
        };
        reader.readAsArrayBuffer(file);
    }

    uploadInput.addEventListener("change", (e) => processUploadedFile(e.target.files[0]));
    
    if (dropZone) {
        dropZone.addEventListener("click", () => dropZoneInput.click());
        dropZoneInput.addEventListener("change", (e) => processUploadedFile(e.target.files[0]));
        dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("drag-active"); });
        dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-active"));
        dropZone.addEventListener("drop", (e) => {
            e.preventDefault(); dropZone.classList.remove("drag-active");
            if (e.dataTransfer.files.length) processUploadedFile(e.dataTransfer.files[0]);
        });
    }

    btnExportPatch.addEventListener("click", () => {
        if (!uint8Array || !originalUint8Array) return;
        let changes = [];
        for (let i = 0; i < uint8Array.length; i++) { if (uint8Array[i] !== originalUint8Array[i]) changes.push({ offset: i, oldVal: originalUint8Array[i], newVal: uint8Array[i] }); }
        if (changes.length === 0) { showToast(currentLang === "tr" ? "Dışa aktarılacak bir değişiklik bulunamadı!" : "No changes found to export!"); return; }

        const patchData = JSON.stringify({ app: "SavStudio", filename: currentFileName, timestamp: new Date().toISOString(), changes: changes }, null, 2);
        const blob = new Blob([patchData], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a");
        a.href = url; a.download = currentFileName.replace(".sav", "") + "_patch.json"; document.body.appendChild(a); a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
        showToast(currentLang === "tr" ? "Yama başarıyla dışa aktarıldı." : "Patch exported successfully.");
    });

    uploadPatch.addEventListener("change", (e) => {
        const file = e.target.files[0]; if (!file || !uint8Array) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const patchData = JSON.parse(event.target.result);
                if (!patchData.changes || !Array.isArray(patchData.changes)) throw new Error("Geçersiz yama formatı.");
                let historyChanges = [], appliedCount = 0;
                patchData.changes.forEach(change => {
                    const offset = change.offset; const newVal = change.newVal;
                    if (offset >= 0 && offset < uint8Array.length) {
                        const oldVal = uint8Array[offset];
                        if (oldVal !== newVal) { historyChanges.push({ index: offset, oldVal: oldVal, newVal: newVal }); uint8Array[offset] = newVal; appliedCount++; }
                    }
                });
                if (appliedCount > 0) { pushHistory(historyChanges); extractPropertiesBulletproof(); renderHexEditor(); showToast(currentLang === "tr" ? `${appliedCount} değişiklik başarıyla uygulandı.` : `${appliedCount} changes applied successfully.`); } else { showToast(currentLang === "tr" ? "Uygulanacak yeni bir değişiklik bulunamadı." : "No new changes to apply."); }
            } catch (err) { showToast(currentLang === "tr" ? "Yama dosyası okunamadı: Format hatası." : "Failed to read patch: Invalid format."); }
            e.target.value = "";
        };
        reader.readAsText(file);
    });

    uploadCompare.addEventListener("change", (e) => {
        const file = e.target.files[0]; if (!file || !uint8Array) return;
        compareFileName = file.name; const reader = new FileReader();
        reader.onload = (event) => { compareUint8Array = new Uint8Array(event.target.result); compareDetails.style.display = "block"; document.querySelector(".tabs button[data-target='hex-view']").click(); renderHexEditor(); applyTranslations(); };
        reader.readAsArrayBuffer(file);
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
        }); renderList(properties);
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
                        let origLen = 0; while(uint8Array[offset + origLen] !== 0 && origLen < 128) origLen++; 
                        
                        if (newVal.length > origLen) {
                            showToast(currentLang === "tr" ? `Uyarı: Metin çok uzun! Maksimum ${origLen} karakter olmalı. Fazlası kırpıldı.` : `Warning: Text too long! Max ${origLen} chars. Excess truncated.`);
                            newVal = newVal.substring(0, origLen);
                        }

                        let oldBuffer = new Uint8Array(fileBuffer.slice(offset, offset + origLen));
                        for (let i = 0; i < origLen; i++) { 
                            let newByte = i < newVal.length ? newVal.charCodeAt(i) : 0; 
                            dataView.setUint8(offset + i, newByte); 
                            changes.push({index: offset+i, oldVal: oldBuffer[i], newVal: newByte}); 
                        }
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
    
    downloadBtn.addEventListener("click", () => { 
        hasUnsavedChanges = false; // Dosya indirildiğinde korumayı kaldır
        const blob = new Blob([fileBuffer], { type: "application/octet-stream" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "edited_" + currentFileName; document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0); 
    });

    setTimeout(() => {
        const splash = document.getElementById("splash-screen");
        if (splash) { splash.classList.add("hidden"); }
        applyTranslations();
    }, 1000);
});
