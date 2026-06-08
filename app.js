/* ==========================================================================
   VERİTABANI (SUPABASE) BAĞLANTI MOTORU
   ========================================================================== */
const SUPABASE_URL = "https://tdctvesyggvwcjxtmwsj.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkY3R2ZXN5Z2d2d2NqeHRtd3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MzI0MDUsImV4cCI6MjA5NjUwODQwNX0.IcJzir0t3S7fD9G9asDVRjvqkEjrXn8S8AEtG8Z70F8";

let supabaseClient = null;
if (SUPABASE_URL && window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

const translations = {
    "tr": { "upload_btn": "DOSYA YÜKLE", "download_btn": "KAYDET", "compare_btn": "KARŞILAŞTIR", "compared_file": "Karşılaştırılan:", "main_file": "Ana Dosya:", "active_file": "Aktif Dosya", "no_file": "Henüz dosya seçilmedi.", "tab_values": "Değerler", "tab_hex": "Hex Editör", "empty_msg": "Düzenlemeye başlamak için bir dosya yükleyin.", "search_placeholder": "Arama yap... (Örn: TotalShoot)", "hex_search_placeholder": "Hex veya Metin arat...", "search_btn": "BUL", "offset": "Offset", "ascii": "ASCII", "file_info_name": "Dosya:", "file_info_size": "Boyut:", "file_info_status": "Durum:", "status_processing": "İşleniyor...", "status_success": "Başarılı", "status_fail": "Okuma Başarısız", "fail_desc": "Okunabilir değer bulunamadı.", "modal_title": "Hex Değeri Düzenle", "modal_cancel": "İPTAL", "modal_save": "KAYDET", "search_not_found": "Bulunamadı!", "exit_title": "Kaydedilmemiş Değişiklikler", "exit_desc": "Çıkmak istediğinize emin misiniz?", "exit_btn_cancel": "İPTAL", "exit_btn_confirm": "ÇIK" },
    "en": { "upload_btn": "UPLOAD", "download_btn": "SAVE", "compare_btn": "COMPARE", "compared_file": "Compared:", "main_file": "Main File:", "active_file": "Active File", "no_file": "No file selected.", "tab_values": "Values", "tab_hex": "Hex Editor", "empty_msg": "Upload a file.", "search_placeholder": "Search...", "hex_search_placeholder": "Search Hex...", "search_btn": "FIND", "offset": "Offset", "ascii": "ASCII", "file_info_name": "File:", "file_info_size": "Size:", "file_info_status": "Status:", "status_processing": "Processing...", "status_success": "Success", "status_fail": "Failed", "fail_desc": "No values found.", "modal_title": "Edit Hex", "modal_cancel": "CANCEL", "modal_save": "SAVE", "search_not_found": "Not found!", "exit_title": "Unsaved Changes", "exit_desc": "Are you sure?", "exit_btn_cancel": "CANCEL", "exit_btn_confirm": "EXIT" }
};

let currentLang = "tr", totalValuesFound = 0, activeHexIndex = -1, activeHexElement = null, searchMatchIndex = -1, searchMatchLength = 0;
let undoStack = [], redoStack = [], originalUint8Array = null, compareUint8Array = null, compareFileName = "", fileBuffer = null, dataView = null, uint8Array = null, currentFileName = "";
let hasUnsavedChanges = false; let currentFormatData = null;

/* ==========================================================================
   YENİ: MOD MERKEZİ YÖNETİCİSİ
   ========================================================================== */
class ModHubManager {
    static async fetchTemplates(formatType, category = "Tümü") {
        const list = document.getElementById("hub-list-container");
        if (!supabaseClient) { list.innerHTML = `<div style="text-align:center; padding: 40px;">API Bağlantısı Yok.</div>`; return; }

        list.innerHTML = `<div class="splash-loader" style="width:30px; height:4px; margin: 40px auto;"></div>`;

        try {
            let query = supabaseClient.from('community_patches').select('*').eq('target_format', formatType).order('upvotes', { ascending: false }).limit(20);
            if (category !== "Tümü") query = query.eq('game_name', category);
            
            const { data, error } = await query;
            if (error) throw error;

            if (!data || data.length === 0) { list.innerHTML = `<div style="color:var(--text-muted); text-align:center; padding: 40px;">Bu kategoride henüz yama yok.</div>`; return; }

            list.innerHTML = "";
            data.forEach(template => {
                const dateObj = new Date(template.created_at);
                const dateStr = `${dateObj.getDate()}.${dateObj.getMonth()+1}.${dateObj.getFullYear()}`;
                
                const card = document.createElement("div");
                card.className = "patch-card";
                card.innerHTML = `
                    <div class="vote-section">
                        <button class="vote-btn upvote" data-id="${template.id}"><i class="ph-bold ph-caret-up"></i></button>
                        <span class="vote-count" id="vote-val-${template.id}">${template.upvotes || 0}</span>
                    </div>
                    <div class="patch-info">
                        <div class="patch-header">
                            <span class="patch-title">${template.title}</span>
                            <span class="patch-meta">${dateStr} | ${template.game_name}</span>
                        </div>
                        <div class="patch-desc">${template.description}</div>
                        <button class="btn outline-btn template-apply-btn" data-changes='${JSON.stringify(template.changes)}' style="width:fit-content; padding: 4px 12px; font-size:0.75rem;">
                            <i class="ph-bold ph-magic-wand"></i> UYGULA
                        </button>
                    </div>
                `;
                list.appendChild(card);
            });

            // Oylama İşlemi (LocalStorage ile mükerrer oy engeli)
            list.querySelectorAll('.upvote').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.getAttribute("data-id");
                    if(localStorage.getItem(`voted_${id}`)) { showToast("Bu yamaya zaten oy verdiniz."); return; }
                    
                    const countSpan = document.getElementById(`vote-val-${id}`);
                    let currentVal = parseInt(countSpan.innerText);
                    countSpan.innerText = currentVal + 1;
                    e.currentTarget.style.color = "var(--text-main)";
                    
                    localStorage.setItem(`voted_${id}`, "true");
                    await supabaseClient.rpc('increment_upvote', { row_id: id }); // DB'de fonksiyon gerekir, yoksa basitçe update yapılır.
                    // Fallback update
                    await supabaseClient.from('community_patches').update({ upvotes: currentVal + 1 }).eq('id', id);
                });
            });

            list.querySelectorAll('.template-apply-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const changes = JSON.parse(e.currentTarget.getAttribute("data-changes"));
                    this.applyTemplate(changes);
                    document.getElementById("mod-hub-modal").classList.add("hidden"); // Uygulayınca kapat
                });
            });
        } catch (err) { list.innerHTML = `<div style="color:#ff4444; text-align:center; padding: 40px;">Veri çekilemedi.</div>`; }
    }

    static applyTemplate(changesArray) {
        if (!uint8Array) return;
        let historyChanges = [], appliedCount = 0;
        changesArray.forEach(change => {
            const offset = change.offset; const newVal = change.newVal;
            if (offset >= 0 && offset < uint8Array.length) {
                const oldVal = uint8Array[offset];
                if (oldVal !== newVal) { historyChanges.push({ index: offset, oldVal: oldVal, newVal: newVal }); uint8Array[offset] = newVal; appliedCount++; }
            }
        });

        if (appliedCount > 0) { 
            window.pushHistory(historyChanges); if(currentFormatData && currentFormatData.type.includes("UNREAL")) window.extractPropertiesBulletproof(); 
            window.renderHexEditor(); if(activeHexIndex !== -1) window.updateDataInspector(activeHexIndex); 
            showToast(`${appliedCount} byte başarıyla uygulandı.`); 
        } else { showToast("Şablon değerleri zaten dosyada mevcut."); }
    }

    static async shareCurrentPatch(gameName, title, desc) {
        if (!supabaseClient) { showToast("Bağlantı Yok!"); return false; }
        let changes = [];
        for (let i = 0; i < uint8Array.length; i++) {
            if (uint8Array[i] !== originalUint8Array[i]) { changes.push({ offset: i, type: "RawByte", newVal: uint8Array[i] }); }
        }
        if (changes.length === 0) { showToast("Önce dosyada bir değişiklik yapmalısınız!"); return false; }
        if (desc.length < 30) { showToast("Açıklama çok kısa! En az 30 karakter olmalı."); return false; }

        try {
            const { error } = await supabaseClient.from('community_patches').insert([{ game_name: gameName, title: title, description: desc, target_format: currentFormatData.type, changes: changes }]);
            if (error) throw error;
            showToast("Harika! Yamanız topluluk merkezine eklendi.");
            return true;
        } catch (err) { showToast("Gönderim başarısız oldu."); return false; }
    }
}

/* ==========================================================================
   FORMAT DETECTION ENGINE & APP LOGIC
   ========================================================================== */
class FormatDetector {
    static calculateEntropy(uint8Array) { const length = uint8Array.length; if (length === 0) return 0; const frequencies = new Uint32Array(256); for (let i = 0; i < length; i++) frequencies[uint8Array[i]]++; let entropy = 0; for (let i = 0; i < 256; i++) { if (frequencies[i] > 0) { const p = frequencies[i] / length; entropy -= p * Math.log2(p); } } return Number(entropy.toFixed(4)); }
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
class UnrealParser { parse() { return { parserType: "UnrealParser" }; } } class UnityJsonParser { parse() { return { parserType: "UnityJsonParser" }; } } class FallbackHexParser { parse() { return { parserType: "FallbackHexParser", isHexOnly: true }; } }
class SaveRouter { static process(uint8Array) { const formatInfo = FormatDetector.detect(uint8Array); let parser; switch (formatInfo.type) { case 'UNREAL_GVAS': case 'UNREAL_PROPERTY': parser = new UnrealParser(); break; case 'UNITY_JSON': parser = new UnityJsonParser(); break; default: parser = new FallbackHexParser(); break; } return { format: formatInfo, result: parser.parse() }; } }

function showToast(message) { const toast = document.getElementById("toast-container"); toast.innerText = message; toast.classList.remove("hidden"); setTimeout(() => { toast.classList.add("hidden"); }, 4000); }
function applyTranslations() {
    const langData = translations[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(elem => { if (langData[elem.getAttribute('data-i18n')]) elem.innerHTML = langData[elem.getAttribute('data-i18n')]; });
    document.getElementById('lang-toggle').innerText = langData["toggle_lang"];
    const fileInfo = document.getElementById("file-info");
    if (fileInfo.innerHTML.includes(translations[currentLang === "tr" ? "en" : "tr"].file_info_name) || fileInfo.innerHTML.includes(translations[currentLang].file_info_name)) {
        const fileNameSpan = document.getElementById("ui-filename"), fileSizeSpan = document.getElementById("ui-filesize");
        if(fileNameSpan && fileSizeSpan) {
            let formatBadge = currentFormatData ? `<span style="background:var(--accent-bg); color:#fff; padding:2px 6px; border-radius:4px; font-size:0.65rem; margin-left:8px; vertical-align:middle;">${currentFormatData.type}</span>` : '';
            fileInfo.innerHTML = `<strong>${langData.active_file}</strong> ${formatBadge}<br><br><strong>${langData.file_info_name}</strong> <span id="ui-filename" style="color:var(--text-main)">${fileNameSpan.innerText}</span> <br><strong>${langData.file_info_size}</strong> <span id="ui-filesize" style="color:var(--text-main)">${fileSizeSpan.innerText}</span>`;
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const uploadInput = document.getElementById("upload-save"), downloadBtn = document.getElementById("download-save"), fileInfo = document.getElementById("file-info"), smartList = document.getElementById("smart-list"), emptyMsg = document.getElementById("empty-message"), editorContainer = document.getElementById("smart-editor-container"), hexSearchContainer = document.getElementById("hex-search-container"), searchInput = document.getElementById("search-input"), langToggleBtn = document.getElementById("lang-toggle"), tabs = document.querySelectorAll(".tab"), views = document.querySelectorAll(".view-content"), customModal = document.getElementById("custom-modal"), modalDesc = document.getElementById("modal-desc"), modalInput = document.getElementById("modal-input"), modalCancel = document.getElementById("modal-cancel"), modalSave = document.getElementById("modal-save"), hexSearchInput = document.getElementById("hex-search-input"), hexSearchBtn = document.getElementById("hex-search-btn"), btnUndo = document.getElementById("btn-undo"), btnRedo = document.getElementById("btn-redo");
    const dataInspector = document.getElementById("data-inspector"), insAddress = document.getElementById("inspect-address"), insBin = document.getElementById("ins-bin"), insInt8 = document.getElementById("ins-int8"), insUint8 = document.getElementById("ins-uint8"), insInt16 = document.getElementById("ins-int16"), insUint16 = document.getElementById("ins-uint16"), insInt32 = document.getElementById("ins-int32"), insUint32 = document.getElementById("ins-uint32"), insFloat = document.getElementById("ins-float");

    /* YENİ MOD HUB KONTROLLERİ */
    const modHubModal = document.getElementById("mod-hub-modal");
    const btnOpenHub = document.getElementById("btn-open-hub");
    const closeHubBtn = document.getElementById("close-hub");
    const hubCatItems = document.querySelectorAll(".category-item");

    btnOpenHub.addEventListener("click", () => {
        if(!currentFormatData) return;
        modHubModal.classList.remove("hidden");
        const activeCat = document.querySelector(".category-item.active").getAttribute("data-cat");
        ModHubManager.fetchTemplates(currentFormatData.type, activeCat);
    });
    closeHubBtn.addEventListener("click", () => modHubModal.classList.add("hidden"));

    hubCatItems.forEach(item => {
        item.addEventListener("click", (e) => {
            hubCatItems.forEach(i => i.classList.remove("active"));
            e.currentTarget.classList.add("active");
            const cat = e.currentTarget.getAttribute("data-cat");
            document.getElementById("hub-current-cat").innerText = cat === "Tümü" ? "Tüm Oyunlar" : cat;
            ModHubManager.fetchTemplates(currentFormatData.type, cat);
        });
    });

    /* YAMA PAYLAŞMA KONTROLLERİ */
    const shareModal = document.getElementById("share-patch-modal"), btnSharePatch = document.getElementById("btn-share-patch"), shareCancel = document.getElementById("share-cancel"), shareSubmit = document.getElementById("share-submit");
    btnSharePatch.addEventListener("click", () => shareModal.classList.remove("hidden"));
    shareCancel.addEventListener("click", () => shareModal.classList.add("hidden"));
    shareSubmit.addEventListener("click", async () => {
        const gameInput = document.getElementById("share-game"), titleInput = document.getElementById("share-title"), descInput = document.getElementById("share-desc");
        const game = gameInput.value.trim(), title = titleInput.value.trim(), desc = descInput.value.trim();
        
        if(!game || !title) { showToast("Oyun Adı ve Yama Başlığı zorunludur."); return; }
        if(desc.length < 30) { showToast("Açıklama en az 30 karakter olmalıdır!"); return; }
        
        shareSubmit.disabled = true; shareSubmit.innerText = "GÖNDERİLİYOR...";
        const success = await ModHubManager.shareCurrentPatch(game, title, desc);
        if(success) { shareModal.classList.add("hidden"); titleInput.value = ""; descInput.value = ""; }
        shareSubmit.disabled = false; shareSubmit.innerText = "GÖNDER";
    });

    window.pushHistory = function(changes) { undoStack.push(changes); redoStack = []; updateHistoryButtons(); }
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
            
            undoStack = []; redoStack = []; updateHistoryButtons(); searchMatchIndex = -1; searchMatchLength = 0; hasUnsavedChanges = false;
            dataInspector.style.display = "flex"; btnSharePatch.style.display = "inline-flex"; btnOpenHub.style.display = "inline-flex";

            let sizeStr = (file.size / 1024).toFixed(2) + " KB";
            let formatBadge = `<span style="background:var(--accent-bg); color:#fff; padding:2px 6px; border-radius:4px; font-size:0.65rem; margin-left:8px; vertical-align:middle;">${routingData.format.type}</span>`;
            fileInfo.innerHTML = `<strong>${translations[currentLang].active_file}</strong> ${formatBadge}<br><br><strong>${translations[currentLang].file_info_name}</strong> <span id="ui-filename" style="color:var(--text-main)">${file.name}</span> <br><strong>${translations[currentLang].file_info_size}</strong> <span id="ui-filesize" style="color:var(--text-main)">${sizeStr}</span>`;
            emptyMsg.style.display = "none"; editorContainer.style.display = "flex"; hexSearchContainer.style.display = "flex"; downloadBtn.disabled = false; downloadBtn.classList.remove("outline-btn"); downloadBtn.classList.add("primary-btn");

            setTimeout(() => { 
                if (routingData.result.parserType.includes("Unreal")) { window.extractPropertiesBulletproof(); } else { smartList.innerHTML = `<p style='color:#ff4444; text-align:center; padding: 40px;'>Lütfen Hex Editörü kullanın.</p>`; totalValuesFound = 0; }
                window.renderHexEditor(); if(uint8Array.length > 0) window.updateDataInspector(0); applyTranslations(); 
            }, 50);
        }; 
        reader.readAsArrayBuffer(file);
    }

    uploadInput.addEventListener("change", (e) => processUploadedFile(e.target.files[0]));
    tabs.forEach(tab => { tab.addEventListener("click", () => { tabs.forEach(t => t.classList.remove("active")); views.forEach(v => v.classList.remove("active")); tab.classList.add("active"); document.getElementById(tab.dataset.target).classList.add("active"); }); });

    window.updateDataInspector = function(index) {
        if (!uint8Array || index < 0 || index >= uint8Array.length) return;
        activeHexIndex = index; insAddress.innerText = "0x" + index.toString(16).toUpperCase().padStart(8, '0');
        const byte = uint8Array[index]; insBin.innerText = byte.toString(2).padStart(8, '0'); insInt8.innerText = dataView.getInt8(index); insUint8.innerText = byte;
        insInt16.innerText = (index + 2 <= uint8Array.length) ? dataView.getInt16(index, true) : "-"; insUint16.innerText = (index + 2 <= uint8Array.length) ? dataView.getUint16(index, true) : "-";
        insInt32.innerText = (index + 4 <= uint8Array.length) ? dataView.getInt32(index, true) : "-"; insUint32.innerText = (index + 4 <= uint8Array.length) ? dataView.getUint32(index, true) : "-";
        if (index + 4 <= uint8Array.length) { let fVal = dataView.getFloat32(index, true); insFloat.innerText = Number.isInteger(fVal) ? fVal + ".0" : fVal.toFixed(6).replace(/\.?0+$/, ''); } else { insFloat.innerText = "-"; }
    }

    window.extractPropertiesBulletproof = function() {
        let rawStr = ""; for (let i = 0; i < uint8Array.length; i++) { rawStr += String.fromCharCode(uint8Array[i]); }
        let properties = []; const types = [ { type: "IntProperty", offsetAdd: 21 }, { type: "FloatProperty", offsetAdd: 23 }, { type: "BoolProperty", offsetAdd: 21 } ];
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
        smartList.innerHTML = ""; totalValuesFound = properties.length;
        if(properties.length === 0) return;
        properties.sort((a, b) => a.offset - b.offset);
        properties.forEach((prop) => {
            const item = document.createElement("div"); item.className = "smart-item"; let currentValue = 0, step = "1";
            try { if (prop.type === "IntProperty") { currentValue = dataView.getInt32(prop.offset, true); } else if (prop.type === "FloatProperty") { let fVal = dataView.getFloat32(prop.offset, true); currentValue = Number.isInteger(fVal) ? fVal : fVal.toFixed(6).replace(/\.?0+$/, ''); step = "0.01"; } else if (prop.type === "BoolProperty") { currentValue = dataView.getUint8(prop.offset) === 1 ? 1 : 0; } } catch(e) {}
            let inputHTML = prop.type === "BoolProperty" ? `<div class="smart-item-right"><label class="switch"><input type="checkbox" class="smart-checkbox" data-offset="${prop.offset}" data-type="${prop.type}" ${currentValue === 1 ? "checked" : ""}><span class="slider"></span></label></div>` : `<input type="number" class="smart-input" step="${step}" value="${currentValue}" data-offset="${prop.offset}" data-type="${prop.type}">`;
            item.innerHTML = `<div class="smart-left"><span class="smart-offset">0x${prop.offset.toString(16).toUpperCase()}</span><span class="smart-name" title="${prop.name}">${prop.name}</span></div>${inputHTML}`; smartList.appendChild(item);
        });
        document.querySelectorAll(".smart-input, .smart-checkbox").forEach(input => {
            input.addEventListener("change", (e) => {
                const offset = parseInt(e.target.dataset.offset), type = e.target.dataset.type, newVal = type === "BoolProperty" ? (e.target.checked ? 1 : 0) : e.target.value; let changes = []; 
                let bytesToSave = type === "BoolProperty" ? 1 : 4; let oldBuffer = new Uint8Array(fileBuffer.slice(offset, offset + bytesToSave));
                if (type === "IntProperty") dataView.setInt32(offset, Number(newVal), true); else if (type === "FloatProperty") dataView.setFloat32(offset, Number(newVal), true); else if (type === "BoolProperty") { dataView.setUint8(offset, newVal); }
                for(let i=0; i<bytesToSave; i++) changes.push({index: offset+i, oldVal: oldBuffer[i], newVal: uint8Array[offset+i]});
                if(changes.length > 0) window.pushHistory(changes); if (type !== "BoolProperty") e.target.classList.add("edited-val"); window.renderHexEditor(); if(activeHexIndex !== -1) window.updateDataInspector(activeHexIndex);
            });
        });
    }

    function scrollToHex(index) { document.querySelector(".tabs button[data-target='hex-view']").click(); const hexBody = document.getElementById("hex-body"); const row = Math.floor(index / 16); hexBody.scrollTop = row * 28; }
    function openModal(index, currentHex, element) { activeHexIndex = index; activeHexElement = element; modalDesc.innerHTML = `Address: <strong style="color:var(--text-main)">0x${index.toString(16).toUpperCase()}</strong>`; modalInput.value = currentHex; customModal.classList.remove("hidden"); setTimeout(() => { modalInput.focus(); modalInput.select(); }, 50); }
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
        if (foundIdx !== -1) { searchMatchIndex = foundIdx; searchMatchLength = searchBytes.length; scrollToHex(foundIdx); window.renderHexEditor(); window.updateDataInspector(foundIdx); } else { showToast(translations[currentLang].search_not_found); searchMatchIndex = -1; searchMatchLength = 0; window.renderHexEditor(); }
    });

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
                        let isHighlighted = searchMatchIndex !== -1 && (i+j >= searchMatchIndex) && (i+j < searchMatchIndex + searchMatchLength); let isNull = byte === 0; let isAscii = byte >= 32 && byte <= 126;
                        let classNames = "hex-byte"; if(isHighlighted) classNames += " hex-highlight"; else { if(isNull) classNames += " hex-null"; else if(isAscii) classNames += " hex-ascii"; }
                        if(activeHexIndex === (i+j)) classNames += " edited-val";
                        hexBytes += `<span class="${classNames}" data-index="${i+j}">${hexValue}</span> `; asciiChars += isAscii ? String.fromCharCode(byte) : ".";
                    } else { hexBytes += "   "; }
                }
                hexRow += `<div class="hex-bytes-col">${hexBytes}</div>`; asciiChars = asciiChars.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); hexRow += `<div class="hex-ascii-col">${asciiChars}</div></div>`; htmlContent += hexRow;
            }
            contentNode.innerHTML = htmlContent; 
            contentNode.querySelectorAll('.hex-byte').forEach(span => { span.addEventListener('click', function() { const idx = parseInt(this.getAttribute('data-index')); window.updateDataInspector(idx); document.querySelectorAll('.hex-byte').forEach(s => s.classList.remove('edited-val')); this.classList.add('edited-val'); }); span.addEventListener('dblclick', function() { openModal(parseInt(this.getAttribute('data-index')), this.innerText, this); }); });
        }
        hexBody.onscroll = renderChunk; hexBody.scrollTop = currentScrollTop; renderChunk();
    }

    searchInput.addEventListener("input", (e) => { const term = e.target.value.toLowerCase(); document.querySelectorAll(".smart-item").forEach(item => { item.style.display = item.querySelector(".smart-name").innerText.toLowerCase().includes(term) ? "flex" : "none"; }); });
    downloadBtn.addEventListener("click", () => { hasUnsavedChanges = false; const blob = new Blob([fileBuffer], { type: "application/octet-stream" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "edited_" + currentFileName; document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0); });

    setTimeout(() => { const splash = document.getElementById("splash-screen"); if (splash) { splash.classList.add("hidden"); } applyTranslations(); }, 1000);
});
