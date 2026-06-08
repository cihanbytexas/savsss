/* ==========================================================================
   VERİTABANI (SUPABASE) BAĞLANTI MOTORU
   ========================================================================== */
const SUPABASE_URL = "https://tdctvesyggvwcjxtmwsj.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkY3R2ZXN5Z2d2d2NqeHRtd3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzI0MDUsImV4cCI6MjA5NjUwODQwNX0.IcJzir0t3S7fD9G9asDVRjvqkEjrXn8S8AEtG8Z70F8";

let supabaseClient = null;

// DÜZELTİLEN KISIM: Mantık hatası giderildi, direkt bağlantı kontrolü yapılıyor.
if (SUPABASE_URL && window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Veritabanı Motoru Aktif.");
} else {
    console.warn("Veritabanı API Key'leri eksik veya Supabase kütüphanesi yüklenemedi.");
}

const translations = {
    "tr": { "upload_btn": "DOSYA YÜKLE", "download_btn": "KAYDET", "compare_btn": "KARŞILAŞTIR", "compared_file": "Karşılaştırılan:", "main_file": "Ana Dosya:", "active_file": "Aktif Dosya", "no_file": "Henüz dosya seçilmedi. Düzenlemek için .sav uzantılı bir dosya yükleyin.", "tab_values": "Değerler", "tab_hex": "Hex Editör", "empty_msg": "Düzenlemeye başlamak için bir dosya yükleyin.", "search_placeholder": "Arama yap... (Örn: TotalShoot)", "hex_search_placeholder": "Hex veya Metin arat...", "search_btn": "BUL", "offset": "Offset", "ascii": "ASCII", "file_info_name": "Dosya:", "file_info_size": "Boyut:", "file_info_status": "Durum:", "status_processing": "İşleniyor...", "status_success": "Başarılı", "status_fail": "Okuma Başarısız", "fail_desc": "Bu dosyada okunabilir değer bulunamadı.<br><br>Hex Editör sekmesini kullanın.", "modal_title": "Hex Değeri Düzenle", "modal_cancel": "İPTAL", "modal_save": "KAYDET", "search_not_found": "Aranan değer bulunamadı!", "undo": "Geri Al", "redo": "İleri Al", "toggle_lang": "EN", "welcome_drop": "Dosyanızı Buraya Sürükleyin", "welcome_drop_sub": "veya bilgisayarınızdan seçmek için tıklayın (.sav)", "exit_title": "Kaydedilmemiş Değişiklikler", "exit_desc": "Yaptığınız değişiklikleri henüz kaydetmediniz. Çıkmak istediğinize emin misiniz?", "exit_btn_cancel": "İPTAL", "exit_btn_confirm": "ÇIK" },
    "en": { "upload_btn": "UPLOAD", "download_btn": "SAVE", "compare_btn": "COMPARE", "compared_file": "Compared:", "main_file": "Main File:", "active_file": "Active File", "no_file": "No file selected. Upload a .sav file to start editing.", "tab_values": "Values", "tab_hex": "Hex Editor", "empty_msg": "Upload a file to begin editing.", "search_placeholder": "Search... (e.g., TotalShoot)", "hex_search_placeholder": "Search Hex or Text...", "search_btn": "FIND", "offset": "Offset", "ascii": "ASCII", "file_info_name": "File:", "file_info_size": "Size:", "file_info_status": "Status:", "status_processing": "Processing...", "status_success": "Success", "status_fail": "Read Failed", "fail_desc": "No readable values found in this file.<br><br>Please use the Hex Editor.", "modal_title": "Edit Hex Value", "modal_cancel": "CANCEL", "modal_save": "SAVE", "search_not_found": "Value not found!", "undo": "Undo", "redo": "Redo", "toggle_lang": "TR", "welcome_drop": "Drag & Drop Your File Here", "welcome_drop_sub": "or click to select from your computer (.sav)", "exit_title": "Unsaved Changes", "exit_desc": "You have unsaved changes. Are you sure you want to exit without saving?", "exit_btn_cancel": "CANCEL", "exit_btn_confirm": "EXIT" }
};

let currentLang = "tr", totalValuesFound = 0, activeHexIndex = -1, activeHexElement = null, searchMatchIndex = -1, searchMatchLength = 0;
let undoStack = [], redoStack = [], originalUint8Array = null, compareUint8Array = null, compareFileName = "", fileBuffer = null, dataView = null, uint8Array = null, currentFileName = "";
let hasUnsavedChanges = false;
let currentFormatData = null;

/* ==========================================================================
   BULUT ŞABLON YÖNETİCİSİ (Canlı Veritabanı Entegrasyonu)
   ========================================================================== */
class CloudTemplateManager {
    static async fetchTemplates(formatType) {
        const container = document.getElementById("cloud-templates-section");
        const list = document.getElementById("template-list-container");
        
        if (!supabaseClient) {
            container.style.display = "block";
            list.innerHTML = `<div style="color:var(--text-muted); font-size:0.8rem; padding: 10px; text-align:center;">Veritabanı API Anahtarları bekleniyor.</div>`;
            return;
        }

        try {
            list.innerHTML = `<div class="splash-loader" style="width:20px; height:20px; margin: 10px auto;"></div>`;
            container.style.display = "block";

            const { data, error } = await supabaseClient
                .from('community_patches')
                .select('*')
                .eq('target_format', formatType)
                .order('upvotes', { ascending: false })
                .limit(10);

            if (error) throw error;

            if (!data || data.length === 0) {
                list.innerHTML = `<div style="color:var(--text-muted); font-size:0.8rem; padding: 10px; text-align:center;">Bu format için henüz topluluk yaması yok. İlk sen paylaş!</div>`;
                return;
            }

            list.innerHTML = "";
            data.forEach(template => {
                const card = document.createElement("div");
                card.className = "template-card";
                // DÜZELTİLEN KISIM: Oy (upvote) sayısını gösteren badge eklendi
                card.innerHTML = `
                    <div class="template-card-title">
                        <span>${template.title}</span>
                        <div style="display:flex; gap:5px;">
                            <span class="template-badge" style="background:transparent; color:var(--text-muted); border: 1px solid var(--border-color);"><i class="ph-bold ph-caret-up"></i> ${template.upvotes || 0}</span>
                            <span class="template-badge">${template.game_name}</span>
                        </div>
                    </div>
                    <div class="template-card-desc">${template.description}</div>
                    <button class="template-apply-btn" data-changes='${JSON.stringify(template.changes)}'>
                        <i class="ph-bold ph-magic-wand"></i> UYGULA
                    </button>
                `;
                list.appendChild(card);
            });

            list.querySelectorAll('.template-apply-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const changes = JSON.parse(e.currentTarget.getAttribute("data-changes"));
                    this.applyTemplate(changes);
                });
            });
        } catch (err) {
            console.error("Supabase Error:", err);
            list.innerHTML = `<div style="color:#ff4444; font-size:0.8rem; padding: 10px; text-align:center;">Veri çekilemedi. Bağlantıyı kontrol edin.</div>`;
        }
    }

    static applyTemplate(changesArray) {
        if (!uint8Array) return;
        let historyChanges = [];
        let appliedCount = 0;

        changesArray.forEach(change => {
            const offset = change.offset;
            const newVal = change.newVal;
            if (offset >= 0 && offset < uint8Array.length) {
                const oldVal = uint8Array[offset];
                if (oldVal !== newVal) { 
                    historyChanges.push({ index: offset, oldVal: oldVal, newVal: newVal }); 
                    uint8Array[offset] = newVal; 
                    appliedCount++; 
                }
            }
        });

        if (appliedCount > 0) { 
            window.pushHistory(historyChanges); 
            if(currentFormatData && currentFormatData.type.includes("UNREAL")) window.extractPropertiesBulletproof(); 
            window.renderHexEditor(); 
            if(activeHexIndex !== -1) window.updateDataInspector(activeHexIndex); 
            showToast(`${appliedCount} byte başarıyla uygulandı.`); 
        } else { showToast("Şablon değerleri zaten dosyada mevcut."); }
    }

    static async shareCurrentPatch(gameName, title, desc) {
        if (!supabaseClient) { showToast("Veritabanı API Anahtarı eksik!"); return false; }
        if (!originalUint8Array || !uint8Array) return false;

        let changes = [];
        for (let i = 0; i < uint8Array.length; i++) {
            if (uint8Array[i] !== originalUint8Array[i]) {
                changes.push({ offset: i, type: "RawByte", newVal: uint8Array[i] });
            }
        }

        if (changes.length === 0) { showToast("Önce dosyada bir değişiklik yapmalısınız!"); return false; }

        try {
            const { error } = await supabaseClient
                .from('community_patches')
                .insert([{
                    game_name: gameName,
                    title: title,
                    description: desc,
                    target_format: currentFormatData.type,
                    changes: changes
                }]);
            
            if (error) throw error;
            showToast("Harika! Yamanız topluluk veritabanına eklendi.");
            this.fetchTemplates(currentFormatData.type); 
            return true;
        } catch (err) {
            console.error(err);
            showToast("Gönderim başarısız oldu.");
            return false;
        }
    }
}

/* ==========================================================================
   FORMAT DETECTION ENGINE
   ========================================================================== */
class FormatDetector {
    static calculateEntropy(uint8Array) {
        const length = uint8Array.length; if (length === 0) return 0;
        const frequencies = new Uint32Array(256); for (let i = 0; i < length; i++) frequencies[uint8Array[i]]++;
        let entropy = 0; for (let i = 0; i < 256; i++) { if (frequencies[i] > 0) { const p = frequencies[i] / length; entropy -= p * Math.log2(p); } }
        return Number(entropy.toFixed(4));
    }
    static detect(uint8Array) {
        const entropy = this.calculateEntropy(uint8Array); const metadata = { entropy: entropy, size: uint8Array.length, isEncryptedOrCompressed: entropy >= 7.5 };
        if (uint8Array.length >= 4 && uint8Array[0] === 0x47 && uint8Array[1] === 0x56 && uint8Array[2] === 0x41 && uint8Array[3] === 0x53) { return { type: 'UNREAL_GVAS', confidence: 1.0, metadata: { ...metadata, engine: "Unreal Engine", description: "GVAS Format" } }; }
        const previewLimit = Math.min(500, uint8Array.length); const previewStr = String.fromCharCode.apply(null, uint8Array.slice(0, previewLimit));
        if (previewStr.includes("Property")) { return { type: 'UNREAL_PROPERTY', confidence: 0.85, metadata: { ...metadata, engine: "Unreal Engine", description: "Headerless Property" } }; }
        let firstCharIndex = -1; for (let i = 0; i < Math.min(50, uint8Array.length); i++) { const byte = uint8Array[i]; if (byte !== 0x20 && byte !== 0x09 && byte !== 0x0A && byte !== 0x0D && byte !== 0xEF && byte !== 0xBB && byte !== 0xBF) { firstCharIndex = i; break; } }
        if (firstCharIndex !== -1 && uint8Array[firstCharIndex] === 0x7B) { return { type: 'UNITY_JSON', confidence: 0.90, metadata: { ...metadata, engine: "Unity", description: "JSON Data" } }; }
        if (metadata.isEncryptedOrCompressed) { return { type: 'ENCRYPTED_BIN', confidence: 0.80, metadata: { ...metadata, engine: "Unknown", description: "Packed/Encrypted" } }; }
        return { type: 'UNKNOWN_BIN', confidence: 1.0, metadata: { ...metadata, engine: "Unknown", description: "Raw Binary" } };
    }
}

class UnrealParser { parse() { return { parserType: "UnrealParser" }; } }
class UnityJsonParser { parse() { return { parserType: "UnityJsonParser" }; } }
class FallbackHexParser { parse() { return { parserType: "FallbackHexParser", isHexOnly: true }; } }

class SaveRouter {
    static process(uint8Array) {
        const formatInfo = FormatDetector.detect(uint8Array); let parser;
        switch (formatInfo.type) { case 'UNREAL_GVAS': case 'UNREAL_PROPERTY': parser = new UnrealParser(); break; case 'UNITY_JSON': parser = new UnityJsonParser(); break; default: parser = new FallbackHexParser(); break; }
        return { format: formatInfo, result: parser.parse() };
    }
}

/* ==========================================================================
   UI & CORE APPLICATION LOGIC
   ========================================================================== */
function showToast(message) { const toast = document.getElementById("toast-container"); toast.innerText = message; toast.classList.remove("hidden"); setTimeout(() => { toast.classList.add("hidden"); }, 4000); }
function applyTranslations() {
    const langData = translations[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(elem => { if (langData[elem.getAttribute('data-i18n')]) elem.innerHTML = langData[elem.getAttribute('data-i18n')]; });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(elem => { if (langData[elem.getAttribute('data-i18n-placeholder')]) elem.setAttribute('placeholder', langData[elem.getAttribute('data-i18n-placeholder')]); });
    document.getElementById('lang-toggle').innerText = langData["toggle_lang"];
    const fileInfo = document.getElementById("file-info");
    if (fileInfo.innerHTML.includes(translations[currentLang === "tr" ? "en" : "tr"].file_info_name) || fileInfo.innerHTML.includes(translations[currentLang].file_info_name)) {
        const fileNameSpan = document.getElementById("ui-filename"), fileSizeSpan = document.getElementById("ui-filesize"), fileStatusSpan = document.getElementById("ui-filestatus");
        if(fileNameSpan && fileSizeSpan) {
            let formatBadge = currentFormatData ? `<span style="background:var(--accent-bg); color:#fff; padding:2px 6px; border-radius:4px; font-size:0.65rem; margin-left:8px; vertical-align:middle; letter-spacing:0.5px;">${currentFormatData.type}</span>` : '';
            fileInfo.innerHTML = `<strong>${langData.active_file}</strong> ${formatBadge}<br><br><strong>${langData.file_info_name}</strong> <span id="ui-filename" style="color:var(--text-main)">${fileNameSpan.innerText}</span> <br><strong>${langData.file_info_size}</strong> <span id="ui-filesize" style="color:var(--text-main)">${fileSizeSpan.innerText}</span> <br><strong>${langData.file_info_status}</strong> <span id="ui-filestatus" style="color:var(--text-main)">${totalValuesFound > 0 ? langData.status_success + ' ('+totalValuesFound+')' : fileStatusSpan.innerText}</span>`;
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const uploadInput = document.getElementById("upload-save"), downloadBtn = document.getElementById("download-save"), fileInfo = document.getElementById("file-info"), smartList = document.getElementById("smart-list"), emptyMsg = document.getElementById("empty-message"), editorContainer = document.getElementById("smart-editor-container"), hexSearchContainer = document.getElementById("hex-search-container"), searchInput = document.getElementById("search-input"), langToggleBtn = document.getElementById("lang-toggle"), tabs = document.querySelectorAll(".tab"), views = document.querySelectorAll(".view-content"), customModal = document.getElementById("custom-modal"), modalDesc = document.getElementById("modal-desc"), modalInput = document.getElementById("modal-input"), modalCancel = document.getElementById("modal-cancel"), modalSave = document.getElementById("modal-save"), hexSearchInput = document.getElementById("hex-search-input"), hexSearchBtn = document.getElementById("hex-search-btn"), btnUndo = document.getElementById("btn-undo"), btnRedo = document.getElementById("btn-redo"), compareSection = document.getElementById("compare-section"), uploadCompare = document.getElementById("upload-compare"), compareDetails = document.getElementById("compare-details");
    const btnExportPatch = document.getElementById("btn-export-patch"), uploadPatch = document.getElementById("upload-patch"), btnImportPatch = document.getElementById("btn-import-patch"), patchDivider = document.getElementById("patch-divider");
    const dropZone = document.getElementById("drop-zone"), dropZoneInput = document.getElementById("drop-zone-input");
    const exitModal = document.getElementById("exit-modal"), exitCancel = document.getElementById("exit-cancel"), exitConfirm = document.getElementById("exit-confirm");
    const dataInspector = document.getElementById("data-inspector"), insAddress = document.getElementById("inspect-address"), insBin = document.getElementById("ins-bin"), insInt8 = document.getElementById("ins-int8"), insUint8 = document.getElementById("ins-uint8"), insInt16 = document.getElementById("ins-int16"), insUint16 = document.getElementById("ins-uint16"), insInt32 = document.getElementById("ins-int32"), insUint32 = document.getElementById("ins-uint32"), insFloat = document.getElementById("ins-float");

    /* YAMA PAYLAŞMA MODALI KONTROLLERİ */
    const shareModal = document.getElementById("share-patch-modal");
    const btnSharePatch = document.getElementById("btn-share-patch");
    const shareCancel = document.getElementById("share-cancel");
    const shareSubmit = document.getElementById("share-submit");

    btnSharePatch.addEventListener("click", () => {
        if (!supabaseClient) { showToast("Veritabanı bağlantısı yok!"); return; }
        shareModal.classList.remove("hidden");
    });
    shareCancel.addEventListener("click", () => shareModal.classList.add("hidden"));
    
    shareSubmit.addEventListener("click", async () => {
        const gameInput = document.getElementById("share-game");
        const titleInput = document.getElementById("share-title");
        const descInput = document.getElementById("share-desc");
        
        const game = gameInput.value.trim();
        const title = titleInput.value.trim();
        const desc = descInput.value.trim();
        
        if(!game || !title) { showToast("Oyun Adı ve Yama Başlığı zorunludur."); return; }
        
        shareSubmit.disabled = true;
        shareSubmit.innerText = "GÖNDERİLİYOR...";
        
        const success = await CloudTemplateManager.shareCurrentPatch(game, title, desc);
        
        // DÜZELTİLEN KISIM: Başarılı olursa formu temizle ve kapat
        if(success) { 
            shareModal.classList.add("hidden"); 
            gameInput.value = "";
            titleInput.value = "";
            descInput.value = "";
        }
        
        shareSubmit.disabled = false;
        shareSubmit.innerText = "GÖNDER";
    });

    window.addEventListener("beforeunload", (e) => { if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ""; } });
    window.addEventListener("popstate", (e) => { if (hasUnsavedChanges) { window.history.pushState({ preventBack: true }, ""); exitModal.classList.remove("hidden"); } });
    exitCancel.addEventListener("click", () => { exitModal.classList.add("hidden"); });
    exitConfirm.addEventListener("click", () => { hasUnsavedChanges = false; exitModal.classList.add("hidden"); window.history.go(-2); });
    function triggerUnsaved() { if (!hasUnsavedChanges) { hasUnsavedChanges = true; window.history.pushState({ preventBack: true }, ""); } }
    langToggleBtn.addEventListener("click", () => { currentLang = currentLang === "tr" ? "en" : "tr"; applyTranslations(); });
    tabs.forEach(tab => { tab.addEventListener("click", () => { tabs.forEach(t => t.classList.remove("active")); views.forEach(v => v.classList.remove("active")); tab.classList.add("active"); document.getElementById(tab.dataset.target).classList.add("active"); }); });

    window.pushHistory = function(changes) { undoStack.push(changes); redoStack = []; triggerUnsaved(); updateHistoryButtons(); }
    function updateHistoryButtons() { btnUndo.disabled = undoStack.length === 0; btnRedo.disabled = redoStack.length === 0; }
    function performUndo() { if (undoStack.length === 0) return; const changes = undoStack.pop(); redoStack.push(changes); changes.forEach(c => { uint8Array[c.index] = c.oldVal; }); if(currentFormatData && currentFormatData.type.includes("UNREAL")) window.extractPropertiesBulletproof(); window.renderHexEditor(); updateHistoryButtons(); if(activeHexIndex !== -1) window.updateDataInspector(activeHexIndex); }
    function performRedo() { if (redoStack.length === 0) return; const changes = redoStack.pop(); undoStack.push(changes); changes.forEach(c => { uint8Array[c.index] = c.newVal; }); if(currentFormatData && currentFormatData.type.includes("UNREAL")) window.extractPropertiesBulletproof(); window.renderHexEditor(); updateHistoryButtons(); if(activeHexIndex !== -1) window.updateDataInspector(activeHexIndex); }
    btnUndo.addEventListener("click", performUndo); btnRedo.addEventListener("click", performRedo);

    function processUploadedFile(file) {
        if (!file) return;
        currentFileName = file.name; const reader = new FileReader();
        reader.onload = (event) => {
            fileBuffer = event.target.result; dataView = new DataView(fileBuffer); uint8Array = new Uint8Array(fileBuffer); originalUint8Array = new Uint8Array(fileBuffer.slice(0)); 
            const routingData = SaveRouter.process(uint8Array); currentFormatData = routingData.format;
            
            // VERİTABANINDAN YAMALARI ÇEK
            CloudTemplateManager.fetchTemplates(currentFormatData.type);

            compareUint8Array = null; compareFileName = ""; compareDetails.style.display = "none"; undoStack = []; redoStack = []; updateHistoryButtons(); searchMatchIndex = -1; searchMatchLength = 0; hasUnsavedChanges = false;
            dataInspector.style.display = "flex"; btnSharePatch.style.display = "inline-flex";

            let sizeStr = (file.size / 1024).toFixed(2) + " KB";
            let formatBadge = `<span style="background:var(--accent-bg); color:#fff; padding:2px 6px; border-radius:4px; font-size:0.65rem; margin-left:8px; vertical-align:middle; letter-spacing:0.5px;">${routingData.format.type}</span>`;
            fileInfo.innerHTML = `<strong>${translations[currentLang].active_file}</strong> ${formatBadge}<br><br><strong>${translations[currentLang].file_info_name}</strong> <span id="ui-filename" style="color:var(--text-main)">${file.name}</span> <br><strong>${translations[currentLang].file_info_size}</strong> <span id="ui-filesize" style="color:var(--text-main)">${sizeStr}</span> <br><strong>${translations[currentLang].file_info_status}</strong> <span id="ui-filestatus" style="color:var(--text-main)">${translations[currentLang].status_processing}</span>`;
            emptyMsg.style.display = "none"; editorContainer.style.display = "flex"; hexSearchContainer.style.display = "flex"; downloadBtn.disabled = false; downloadBtn.classList.remove("outline-btn"); downloadBtn.classList.add("primary-btn"); compareSection.style.display = "block"; btnImportPatch.style.display = "flex"; btnExportPatch.style.display = "flex"; patchDivider.style.display = "block";

            setTimeout(() => { 
                if (routingData.result.parserType.includes("Unreal")) { window.extractPropertiesBulletproof(); } else if (routingData.result.parserType === "UnityJsonParser") { smartList.innerHTML = `<p style='color:var(--text-main); text-align:center; padding: 40px;'>Unity JSON verisi tespit edildi. Lütfen Hex Editörü kullanın.</p>`; totalValuesFound = 0; } else { smartList.innerHTML = `<p style='color:#ff4444; text-align:center; padding: 40px;'>Dosya şifreli veya desteklenmiyor (Entropy: ${routingData.format.metadata.entropy}). Lütfen Hex Editörü kullanın.</p>`; totalValuesFound = 0; }
                window.renderHexEditor(); if(uint8Array.length > 0) window.updateDataInspector(0); applyTranslations(); 
            }, 50);
        }; 
        reader.readAsArrayBuffer(file);
    }

    uploadInput.addEventListener("change", (e) => processUploadedFile(e.target.files[0]));
    if (dropZone) { dropZone.addEventListener("click", () => dropZoneInput.click()); dropZoneInput.addEventListener("change", (e) => processUploadedFile(e.target.files[0])); dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("drag-active"); }); dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-active")); dropZone.addEventListener("drop", (e) => { e.preventDefault(); dropZone.classList.remove("drag-active"); if (e.dataTransfer.files.length) processUploadedFile(e.dataTransfer.files[0]); }); }

    window.updateDataInspector = function(index) {
        if (!uint8Array || index < 0 || index >= uint8Array.length) return;
        activeHexIndex = index; insAddress.innerText = "0x" + index.toString(16).toUpperCase().padStart(8, '0');
        const byte = uint8Array[index]; insBin.innerText = byte.toString(2).padStart(8, '0'); insInt8.innerText = dataView.getInt8(index); insUint8.innerText = byte;
        insInt16.innerText = (index + 2 <= uint8Array.length) ? dataView.getInt16(index, true) : "-"; insUint16.innerText = (index + 2 <= uint8Array.length) ? dataView.getUint16(index, true) : "-";
        insInt32.innerText = (index + 4 <= uint8Array.length) ? dataView.getInt32(index, true) : "-"; insUint32.innerText = (index + 4 <= uint8Array.length) ? dataView.getUint32(index, true) : "-";
        if (index + 4 <= uint8Array.length) { let fVal = dataView.getFloat32(index, true); insFloat.innerText = Number.isInteger(fVal) ? fVal + ".0" : fVal.toFixed(6).replace(/\.?0+$/, ''); } else { insFloat.innerText = "-"; }
    }

    btnExportPatch.addEventListener("click", () => {
        if (!uint8Array || !originalUint8Array) return; let changes = [];
        for (let i = 0; i < uint8Array.length; i++) { if (uint8Array[i] !== originalUint8Array[i]) changes.push({ offset: i, oldVal: originalUint8Array[i], newVal: uint8Array[i] }); }
        if (changes.length === 0) { showToast(currentLang === "tr" ? "Dışa aktarılacak bir değişiklik bulunamadı!" : "No changes found to export!"); return; }
        const patchData = JSON.stringify({ app: "SavStudio", filename: currentFileName, timestamp: new Date().toISOString(), changes: changes }, null, 2);
        const blob = new Blob([patchData], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a");
        a.href = url; a.download = currentFileName.replace(".sav", "") + "_patch.json"; document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0); showToast(currentLang === "tr" ? "Yama başarıyla dışa aktarıldı." : "Patch exported successfully.");
    });

    uploadPatch.addEventListener("change", (e) => {
        const file = e.target.files[0]; if (!file || !uint8Array) return; const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const patchData = JSON.parse(event.target.result); if (!patchData.changes || !Array.isArray(patchData.changes)) throw new Error("Geçersiz yama formatı.");
                let historyChanges = [], appliedCount = 0;
                patchData.changes.forEach(change => { const offset = change.offset; const newVal = change.newVal; if (offset >= 0 && offset < uint8Array.length) { const oldVal = uint8Array[offset]; if (oldVal !== newVal) { historyChanges.push({ index: offset, oldVal: oldVal, newVal: newVal }); uint8Array[offset] = newVal; appliedCount++; } } });
                if (appliedCount > 0) { window.pushHistory(historyChanges); if(currentFormatData && currentFormatData.type.includes("UNREAL")) window.extractPropertiesBulletproof(); window.renderHexEditor(); if(activeHexIndex !== -1) window.updateDataInspector(activeHexIndex); showToast(currentLang === "tr" ? `${appliedCount} değişiklik başarıyla uygulandı.` : `${appliedCount} changes applied successfully.`); } else { showToast(currentLang === "tr" ? "Uygulanacak yeni bir değişiklik bulunamadı." : "No new changes to apply."); }
            } catch (err) { showToast(currentLang === "tr" ? "Yama dosyası okunamadı: Format hatası." : "Failed to read patch: Invalid format."); } e.target.value = "";
        }; reader.readAsText(file);
    });

    uploadCompare.addEventListener("change", (e) => {
        const file = e.target.files[0]; if (!file || !uint8Array) return; compareFileName = file.name; const reader = new FileReader();
        reader.onload = (event) => { compareUint8Array = new Uint8Array(event.target.result); compareDetails.style.display = "block"; document.querySelector(".tabs button[data-target='hex-view']").click(); window.renderHexEditor(); applyTranslations(); }; reader.readAsArrayBuffer(file);
    });

    window.extractPropertiesBulletproof = function() {
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
                if (prop.type === "IntProperty") { currentValue = dataView.getInt32(prop.offset, true); step = "1"; } else if (prop.type === "FloatProperty") { let fVal = dataView.getFloat32(prop.offset, true); currentValue = Number.isInteger(fVal) ? fVal : fVal.toFixed(6).replace(/\.?0+$/, ''); step = "0.01"; } else if (prop.type === "BoolProperty") { currentValue = dataView.getUint8(prop.offset) === 1 ? 1 : 0; } else if (prop.type === "StrProperty" || prop.type === "NameProperty") { inputType = "text"; let str = ""; for (let i = 0; i < 64; i++) { let char = uint8Array[prop.offset + i]; if (char === 0) break; if (char >= 32 && char <= 126) str += String.fromCharCode(char); } currentValue = str; }
            } catch(e) { currentValue = 0; }
            let inputHTML = "";
            if (prop.type === "BoolProperty") { let isChecked = currentValue === 1 ? "checked" : ""; inputHTML = `<div class="smart-item-right"><label class="switch"><input type="checkbox" class="smart-checkbox" data-offset="${prop.offset}" data-type="${prop.type}" ${isChecked}><span class="slider"></span></label></div>`; } else { inputHTML = `<input type="${inputType}" class="smart-input" step="${step}" value="${currentValue}" data-offset="${prop.offset}" data-type="${prop.type}">`; }
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
                        if (newVal.length > origLen) { showToast(currentLang === "tr" ? `Uyarı: Metin çok uzun!` : `Warning: Text too long!`); newVal = newVal.substring(0, origLen); }
                        let oldBuffer = new Uint8Array(fileBuffer.slice(offset, offset + origLen));
                        for (let i = 0; i < origLen; i++) { let newByte = i < newVal.length ? newVal.charCodeAt(i) : 0; dataView.setUint8(offset + i, newByte); changes.push({index: offset+i, oldVal: oldBuffer[i], newVal: newByte}); }
                    }
                    if(changes.length > 0) window.pushHistory(changes); if (type !== "BoolProperty") e.target.classList.add("edited-val"); window.renderHexEditor(); if(activeHexIndex !== -1) window.updateDataInspector(activeHexIndex);
                } catch(err) {}
            });
        });
    }

    function scrollToHex(index) { document.querySelector(".tabs button[data-target='hex-view']").click(); const hexBody = document.getElementById("hex-body"); const row = Math.floor(index / 16); hexBody.scrollTop = row * 28; }
    function openModal(index, currentHex, element) { activeHexIndex = index; activeHexElement = element; const decValue = parseInt(currentHex, 16); modalDesc.innerHTML = `Address: <strong style="color:var(--text-main)">0x${index.toString(16).toUpperCase()}</strong> <br> Decimal: <strong style="color:var(--text-main)">${decValue}</strong>`; modalInput.value = currentHex; customModal.classList.remove("hidden"); setTimeout(() => { modalInput.focus(); modalInput.select(); }, 50); }
    function closeModal() { customModal.classList.add("hidden"); }

    modalCancel.addEventListener("click", closeModal);
    modalSave.addEventListener("click", () => {
        if (activeHexIndex !== -1) {
            let newHex = modalInput.value.trim().toUpperCase();
            if (/^[0-9A-F]{1,2}$/.test(newHex)) { let oldVal = uint8Array[activeHexIndex]; let newVal = parseInt(newHex, 16); if(oldVal !== newVal) { window.pushHistory([{index: activeHexIndex, oldVal: oldVal, newVal: newVal}]); uint8Array[activeHexIndex] = newVal; if (activeHexElement) { activeHexElement.innerText = newHex.padStart(2, '0'); activeHexElement.classList.add("edited-val"); } if(currentFormatData && currentFormatData.type.includes("UNREAL")) window.extractPropertiesBulletproof(); window.updateDataInspector(activeHexIndex); } }
        } closeModal();
    });
    modalInput.addEventListener("keyup", (e) => { if (e.key === "Enter") modalSave.click(); if (e.key === "Escape") closeModal(); });

    hexSearchBtn.addEventListener("click", () => {
        const query = hexSearchInput.value.trim(); if (!query || !uint8Array) return; let searchBytes = [];
        if (/^[0-9A-Fa-f\s]+$/.test(query) && query.length >= 2) { const cleanQuery = query.replace(/\s/g, ""); for(let i=0; i<cleanQuery.length; i+=2) searchBytes.push(parseInt(cleanQuery.substring(i, i+2), 16)); } else { for(let i=0; i<query.length; i++) searchBytes.push(query.charCodeAt(i)); }
        let startIdx = (searchMatchIndex !== -1) ? searchMatchIndex + 1 : 0; let foundIdx = -1;
        for (let i = startIdx; i <= uint8Array.length - searchBytes.length; i++) { let match = true; for (let j = 0; j < searchBytes.length; j++) { if (uint8Array[i + j] !== searchBytes[j]) { match = false; break; } } if (match) { foundIdx = i; break; } }
        if (foundIdx === -1 && startIdx > 0) { for (let i = 0; i < startIdx; i++) { let match = true; for (let j = 0; j < searchBytes.length; j++) { if (uint8Array[i + j] !== searchBytes[j]) { match = false; break; } } if (match) { foundIdx = i; break; } } }
        if (foundIdx !== -1) { searchMatchIndex = foundIdx; searchMatchLength = searchBytes.length; scrollToHex(foundIdx); window.renderHexEditor(); window.updateDataInspector(foundIdx); } else { showToast(translations[currentLang].search_not_found); searchMatchIndex = -1; searchMatchLength = 0; window.renderHexEditor(); }
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
                        if(activeHexIndex === (i+j)) classNames += " edited-val";
                        hexBytes += `<span class="${classNames}" data-index="${i+j}">${hexValue}</span> `; asciiChars += isAscii ? String.fromCharCode(byte) : ".";
                    } else { hexBytes += "   "; }
                }
                hexRow += `<div class="hex-bytes-col">${hexBytes}</div>`; asciiChars = asciiChars.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); hexRow += `<div class="hex-ascii-col">${asciiChars}</div></div>`; htmlContent += hexRow;
            }
            contentNode.innerHTML = htmlContent; 
            contentNode.querySelectorAll('.hex-byte').forEach(span => { 
                span.addEventListener('click', function() { const idx = parseInt(this.getAttribute('data-index')); window.updateDataInspector(idx); document.querySelectorAll('.hex-byte').forEach(s => s.classList.remove('edited-val')); this.classList.add('edited-val'); });
                span.addEventListener('dblclick', function() { openModal(parseInt(this.getAttribute('data-index')), this.innerText, this); });
            });
        }
        hexBody.onscroll = renderChunk; hexBody.scrollTop = currentScrollTop; renderChunk();
    }

    searchInput.addEventListener("input", (e) => { const term = e.target.value.toLowerCase(); document.querySelectorAll(".smart-item").forEach(item => { item.style.display = item.querySelector(".smart-name").innerText.toLowerCase().includes(term) ? "flex" : "none"; }); });
    downloadBtn.addEventListener("click", () => { hasUnsavedChanges = false; const blob = new Blob([fileBuffer], { type: "application/octet-stream" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "edited_" + currentFileName; document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0); });

    setTimeout(() => { const splash = document.getElementById("splash-screen"); if (splash) { splash.classList.add("hidden"); } applyTranslations(); }, 1000);
});
