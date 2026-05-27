window.addEventListener("load", () => {
    const splashScreen = document.getElementById("splash-screen");
    setTimeout(() => {
        splashScreen.classList.add("hidden");
    }, 1500); 
});

const translations = {
    "tr": {
        "upload_btn": "DOSYA YÜKLE",
        "download_btn": "KAYDET VE İNDİR",
        "active_file": "Aktif Dosya",
        "no_file": "Henüz dosya seçilmedi. Düzenlemek için .sav uzantılı bir dosya yükleyin.",
        "tab_values": "Değerler",
        "tab_hex": "Hex Editör",
        "empty_msg": "Düzenlemeye başlamak için bir dosya yükleyin.",
        "search_placeholder": "Arama yap... (Örn: TotalShoot)",
        "hex_search_placeholder": "Hex (örn: A1 2B) veya Metin (örn: Player) arat...",
        "search_btn": "BUL",
        "offset": "Offset",
        "ascii": "ASCII",
        "file_info_name": "Dosya:",
        "file_info_size": "Boyut:",
        "file_info_status": "Durum:",
        "status_processing": "İşleniyor...",
        "status_success": "Başarılı",
        "status_fail": "Okuma Başarısız",
        "fail_desc": "Bu dosyada okunabilir değer bulunamadı.<br><br>Hex Editör sekmesini kullanın.",
        "modal_title": "Hex Değeri Düzenle",
        "modal_cancel": "İPTAL",
        "modal_save": "KAYDET",
        "search_not_found": "Aranan değer dosyada bulunamadı!",
        "toggle_lang": "EN"
    },
    "en": {
        "upload_btn": "UPLOAD FILE",
        "download_btn": "SAVE & DOWNLOAD",
        "active_file": "Active File",
        "no_file": "No file selected. Upload a .sav file to start editing.",
        "tab_values": "Values",
        "tab_hex": "Hex Editor",
        "empty_msg": "Upload a file to begin editing.",
        "search_placeholder": "Search... (e.g., TotalShoot)",
        "hex_search_placeholder": "Search Hex (e.g., A1 2B) or Text (e.g., Player)...",
        "search_btn": "FIND",
        "offset": "Offset",
        "ascii": "ASCII",
        "file_info_name": "File:",
        "file_info_size": "Size:",
        "file_info_status": "Status:",
        "status_processing": "Processing...",
        "status_success": "Success",
        "status_fail": "Read Failed",
        "fail_desc": "No readable values found in this file.<br><br>Please use the Hex Editor.",
        "modal_title": "Edit Hex Value",
        "modal_cancel": "CANCEL",
        "modal_save": "SAVE",
        "search_not_found": "Value not found in file!",
        "toggle_lang": "TR"
    }
};

let currentLang = "tr";
let totalValuesFound = 0;

// Modal State Değişkenleri
let activeHexIndex = -1;
let activeHexElement = null;

// Arama Highlight Değişkenleri
let searchMatchIndex = -1;
let searchMatchLength = 0;

function applyTranslations() {
    const langData = translations[currentLang];
    
    document.querySelectorAll('[data-i18n]').forEach(elem => {
        const key = elem.getAttribute('data-i18n');
        if (langData[key]) elem.innerHTML = langData[key];
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(elem => {
        const key = elem.getAttribute('data-i18n-placeholder');
        if (langData[key]) elem.setAttribute('placeholder', langData[key]);
    });

    document.getElementById('lang-toggle').innerText = langData["toggle_lang"];

    const fileInfo = document.getElementById("file-info");
    if (fileInfo.innerHTML.includes(translations[currentLang === "tr" ? "en" : "tr"].file_info_name) || fileInfo.innerHTML.includes(translations[currentLang].file_info_name)) {
        const fileNameSpan = document.getElementById("ui-filename");
        const fileSizeSpan = document.getElementById("ui-filesize");
        const fileStatusSpan = document.getElementById("ui-filestatus");
        
        if(fileNameSpan) {
            fileInfo.innerHTML = `
                <strong data-i18n="active_file">${langData.active_file}</strong><br><br>
                <strong>${langData.file_info_name}</strong> <span id="ui-filename" style="color:var(--text-main)">${fileNameSpan.innerText}</span> <br>
                <strong>${langData.file_info_size}</strong> <span id="ui-filesize" style="color:var(--text-main)">${fileSizeSpan.innerText}</span> <br>
                <strong>${langData.file_info_status}</strong> <span id="ui-filestatus" style="color:var(--text-main)">${totalValuesFound > 0 ? langData.status_success + ' ('+totalValuesFound+')' : fileStatusSpan.innerText}</span>
            `;
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const uploadInput = document.getElementById("upload-save");
    const downloadBtn = document.getElementById("download-save");
    const fileInfo = document.getElementById("file-info");
    const smartList = document.getElementById("smart-list");
    const emptyMsg = document.getElementById("empty-message");
    const editorContainer = document.getElementById("smart-editor-container");
    const hexSearchContainer = document.getElementById("hex-search-container");
    const searchInput = document.getElementById("search-input");
    const langToggleBtn = document.getElementById("lang-toggle");
    const tabs = document.querySelectorAll(".tab");
    const views = document.querySelectorAll(".view-content");

    // Modal Elementleri
    const customModal = document.getElementById("custom-modal");
    const modalDesc = document.getElementById("modal-desc");
    const modalInput = document.getElementById("modal-input");
    const modalCancel = document.getElementById("modal-cancel");
    const modalSave = document.getElementById("modal-save");

    // Hex Arama Elementleri
    const hexSearchInput = document.getElementById("hex-search-input");
    const hexSearchBtn = document.getElementById("hex-search-btn");

    let fileBuffer = null; 
    let dataView = null;
    let uint8Array = null;
    let currentFileName = "";

    langToggleBtn.addEventListener("click", () => {
        currentLang = currentLang === "tr" ? "en" : "tr";
        applyTranslations();
    });

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            views.forEach(v => v.classList.remove("active"));
            tab.classList.add("active");
            document.getElementById(tab.dataset.target).classList.add("active");
        });
    });

    uploadInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        currentFileName = file.name;
        const reader = new FileReader();
        reader.onload = (event) => {
            fileBuffer = event.target.result;
            dataView = new DataView(fileBuffer);
            uint8Array = new Uint8Array(fileBuffer);
            
            const lang = translations[currentLang];
            fileInfo.innerHTML = `
                <strong data-i18n="active_file">${lang.active_file}</strong><br><br>
                <strong>${lang.file_info_name}</strong> <span id="ui-filename" style="color:var(--text-main)">${file.name}</span> <br>
                <strong>${lang.file_info_size}</strong> <span id="ui-filesize" style="color:var(--text-main)">${(file.size / 1024).toFixed(2)} KB</span> <br>
                <strong>${lang.file_info_status}</strong> <span id="ui-filestatus" style="color:var(--text-muted)">${lang.status_processing}</span>
            `;
            
            emptyMsg.style.display = "none";
            editorContainer.style.display = "block";
            hexSearchContainer.style.display = "flex";
            downloadBtn.disabled = false;
            downloadBtn.classList.remove("outline-btn");
            downloadBtn.classList.add("primary-btn"); 

            // Değişkenleri sıfırla
            searchMatchIndex = -1;
            searchMatchLength = 0;

            setTimeout(() => {
                extractPropertiesBulletproof();
                renderHexEditor();
            }, 50);
        };
        reader.readAsArrayBuffer(file); 
    });

    function extractPropertiesBulletproof() {
        let rawStr = "";
        for (let i = 0; i < uint8Array.length; i++) {
            rawStr += String.fromCharCode(uint8Array[i]);
        }
        
        let properties = [];
        const types = [
            { type: "IntProperty", offsetAdd: 21 },
            { type: "FloatProperty", offsetAdd: 23 },
            { type: "BoolProperty", offsetAdd: 21 },
            { type: "StrProperty", offsetAdd: 25 }, // YENİ: String desteği eklendi
            { type: "NameProperty", offsetAdd: 25 }
        ];

        types.forEach(t => {
            let index = 0;
            while ((index = rawStr.indexOf(t.type, index)) !== -1) {
                try {
                    let i = index - 1;
                    while (i > 0 && !(/[a-zA-Z0-9_]/.test(rawStr[i]))) { i--; }
                    let nameEnd = i;
                    while (i > 0 && (/[a-zA-Z0-9_]/.test(rawStr[i]))) { i--; }
                    let nameStart = i + 1;
                    let varName = rawStr.substring(nameStart, nameEnd + 1);

                    if (varName.length >= 2) {
                        const valueOffset = index + t.offsetAdd; 
                        if (valueOffset + 4 <= uint8Array.length) {
                            properties.push({ name: varName, type: t.type, offset: valueOffset });
                        }
                    }
                } catch(e) {}
                index += t.type.length;
            }
        });

        renderList(properties);
    }

    function renderList(properties) {
        smartList.innerHTML = "";
        const lang = translations[currentLang];
        totalValuesFound = properties.length;
        
        if(properties.length === 0) {
            smartList.innerHTML = `<p style='color:var(--text-muted); text-align:center; padding: 40px;'>${lang.fail_desc}</p>`;
            document.getElementById("ui-filestatus").innerHTML = `<span style="color:#ff4444">${lang.status_fail}</span>`;
            return;
        }

        document.getElementById("ui-filestatus").innerHTML = `<span style="color:var(--text-main)">${lang.status_success} (${properties.length})</span>`;
        
        properties.sort((a, b) => a.offset - b.offset);

        properties.forEach((prop) => {
            const item = document.createElement("div");
            item.className = "smart-item";
            let currentValue = 0; 
            let step = "1";
            let inputType = "number";
            
            try {
                if (prop.type === "IntProperty") {
                    currentValue = dataView.getInt32(prop.offset, true); step = "1";
                } else if (prop.type === "FloatProperty") {
                    let fVal = dataView.getFloat32(prop.offset, true);
                    currentValue = Number.isInteger(fVal) ? fVal : fVal.toFixed(6).replace(/\.?0+$/, ''); 
                    step = "0.01";
                } else if (prop.type === "BoolProperty") {
                    currentValue = dataView.getUint8(prop.offset) === 1 ? 1 : 0; step = "1";
                } else if (prop.type === "StrProperty" || prop.type === "NameProperty") {
                    inputType = "text";
                    let str = "";
                    let maxSafeLen = 64; 
                    for (let i = 0; i < maxSafeLen; i++) {
                        let char = uint8Array[prop.offset + i];
                        if (char === 0) break; // Null byte gördüğünde bitir
                        if (char >= 32 && char <= 126) str += String.fromCharCode(char);
                    }
                    currentValue = str;
                }
            } catch(e) { currentValue = 0; }

            item.innerHTML = `
                <div class="smart-left">
                    <span class="smart-offset">0x${prop.offset.toString(16).toUpperCase()}</span>
                    <span class="smart-name" title="${prop.name}">${prop.name}</span>
                </div>
                <input type="${inputType}" class="smart-input" step="${step}" value="${currentValue}" data-offset="${prop.offset}" data-type="${prop.type}">
            `;
            smartList.appendChild(item);
        });

        document.querySelectorAll(".smart-input").forEach(input => {
            input.addEventListener("change", (e) => {
                const offset = parseInt(e.target.dataset.offset);
                const type = e.target.dataset.type;
                let newVal = e.target.value;
                try {
                    if (type === "IntProperty") dataView.setInt32(offset, Number(newVal), true);
                    else if (type === "FloatProperty") dataView.setFloat32(offset, Number(newVal), true);
                    else if (type === "BoolProperty") {
                        let parsedVal = Number(newVal) > 0 ? 1 : 0;
                        dataView.setUint8(offset, parsedVal);
                        e.target.value = parsedVal; 
                    } else if (type === "StrProperty" || type === "NameProperty") {
                        // Dosya bozulmasını önlemek için String uzunluğu sabit tutulur (Boşlukları null ile doldur)
                        let origLen = 0;
                        while(uint8Array[offset + origLen] !== 0 && origLen < 128) origLen++;
                        
                        for (let i=0; i<origLen; i++) {
                            if (i < newVal.length) {
                                dataView.setUint8(offset + i, newVal.charCodeAt(i));
                            } else {
                                dataView.setUint8(offset + i, 0); // Kalanı null bayt yap
                            }
                        }
                    }
                    e.target.classList.add("edited-val"); 
                    renderHexEditor(); 
                } catch(err) { console.warn("Edit error:", err); }
            });
        });
    }

    // Modal Yönetimi
    function openModal(index, currentHex, element) {
        activeHexIndex = index;
        activeHexElement = element;
        const decValue = parseInt(currentHex, 16);
        
        modalDesc.innerHTML = `Address: <strong style="color:var(--text-main)">0x${index.toString(16).toUpperCase()}</strong> <br> Decimal: <strong style="color:var(--text-main)">${decValue}</strong>`;
        modalInput.value = currentHex;
        
        customModal.classList.remove("hidden");
        setTimeout(() => {
            modalInput.focus();
            modalInput.select();
        }, 50);
    }

    function closeModal() {
        customModal.classList.add("hidden");
        activeHexIndex = -1;
        activeHexElement = null;
    }

    modalCancel.addEventListener("click", closeModal);
    modalSave.addEventListener("click", () => {
        if (activeHexIndex !== -1) {
            let newHex = modalInput.value.trim().toUpperCase();
            if (/^[0-9A-F]{1,2}$/.test(newHex)) {
                uint8Array[activeHexIndex] = parseInt(newHex, 16);
                if (activeHexElement) {
                    activeHexElement.innerText = newHex.padStart(2, '0');
                    activeHexElement.classList.add("edited-val");
                }
                extractPropertiesBulletproof(); // Veriler sekmesini de güncelle
            }
        }
        closeModal();
    });

    // Modal Input'ta Enter'a basılırsa kaydet
    modalInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") modalSave.click();
        if (e.key === "Escape") closeModal();
    });

    // Hex Arama İşlevi
    hexSearchBtn.addEventListener("click", () => {
        const query = hexSearchInput.value.trim();
        if (!query || !uint8Array) return;

        let searchBytes = [];
        // Eğer arama sadece hex (örn: A1 2B veya a12b) formatındaysa
        if (/^[0-9A-Fa-f\s]+$/.test(query) && query.length >= 2) {
            const cleanQuery = query.replace(/\s/g, "");
            for(let i=0; i<cleanQuery.length; i+=2) {
                searchBytes.push(parseInt(cleanQuery.substring(i, i+2), 16));
            }
        } else {
            // Değilse ASCII metin olarak arat
            for(let i=0; i<query.length; i++) {
                searchBytes.push(query.charCodeAt(i));
            }
        }

        // Bulunduğu yerden sonrasını ara (Find Next özelliği)
        let startIdx = (searchMatchIndex !== -1) ? searchMatchIndex + 1 : 0;
        let foundIdx = -1;

        for (let i = startIdx; i <= uint8Array.length - searchBytes.length; i++) {
            let match = true;
            for (let j = 0; j < searchBytes.length; j++) {
                if (uint8Array[i + j] !== searchBytes[j]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                foundIdx = i;
                break;
            }
        }

        // Bulamazsa baştan tekrar ara
        if (foundIdx === -1 && startIdx > 0) {
            for (let i = 0; i < startIdx; i++) {
                let match = true;
                for (let j = 0; j < searchBytes.length; j++) {
                    if (uint8Array[i + j] !== searchBytes[j]) { match = false; break; }
                }
                if (match) { foundIdx = i; break; }
            }
        }

        if (foundIdx !== -1) {
            searchMatchIndex = foundIdx;
            searchMatchLength = searchBytes.length;
            
            // Satıra kaydır (Scroll)
            const hexBody = document.getElementById("hex-body");
            const row = Math.floor(foundIdx / 16);
            hexBody.scrollTop = row * 28; // hexRowHeight
            
            renderHexEditor(); // Highlight için yeniden çiz
        } else {
            alert(translations[currentLang].search_not_found);
            searchMatchIndex = -1;
            searchMatchLength = 0;
            renderHexEditor();
        }
    });

    hexSearchInput.addEventListener("keyup", (e) => {
        if (e.key === "Enter") hexSearchBtn.click();
    });

    // Virtual Scrolling Hex Editör
    window.renderHexEditor = function() {
        const hexBody = document.getElementById("hex-body");
        const currentScrollTop = hexBody.scrollTop || 0; 
        hexBody.innerHTML = ""; 
        
        if (!uint8Array || uint8Array.length === 0) return;

        const hexRowHeight = 28; 
        const totalRows = Math.ceil(uint8Array.length / 16);
        const totalHeight = totalRows * hexRowHeight;
        
        const scrollWrapper = document.createElement("div");
        scrollWrapper.style.height = totalHeight + "px";
        scrollWrapper.style.position = "relative";
        
        const contentNode = document.createElement("div");
        contentNode.style.position = "absolute";
        contentNode.style.top = "0";
        contentNode.style.left = "0";
        contentNode.style.width = "100%";
        
        scrollWrapper.appendChild(contentNode);
        hexBody.appendChild(scrollWrapper);

        let lastRenderedStart = -1;

        function renderChunk() {
            const scrollTop = hexBody.scrollTop;
            const startRow = Math.floor(scrollTop / hexRowHeight);
            
            if (Math.abs(lastRenderedStart - startRow) < 2 && lastRenderedStart !== -1) return;
            lastRenderedStart = startRow;

            const visibleRows = Math.ceil(hexBody.clientHeight / hexRowHeight);
            const start = Math.max(0, startRow - 5);
            const end = Math.min(totalRows, startRow + visibleRows + 5);

            contentNode.style.transform = `translateY(${start * hexRowHeight}px)`;

            let htmlContent = "";
            for (let r = start; r < end; r++) {
                const i = r * 16;
                let hexRow = `<div class="hex-row" style="height:${hexRowHeight}px; box-sizing: border-box;">`;
                hexRow += `<div class="hex-offset-col">${i.toString(16).padStart(8, '0').toUpperCase()}</div>`;
                let hexBytes = ""; let asciiChars = "";
                
                for (let j = 0; j < 16; j++) {
                    if (i + j < uint8Array.length) {
                        const byte = uint8Array[i + j];
                        const hexValue = byte.toString(16).padStart(2, '0').toUpperCase();
                        
                        // Arama Highlight Mantığı
                        let isHighlighted = searchMatchIndex !== -1 && (i+j >= searchMatchIndex) && (i+j < searchMatchIndex + searchMatchLength);
                        let highlightClass = isHighlighted ? " hex-highlight" : "";
                        
                        hexBytes += `<span class="hex-byte${highlightClass}" data-index="${i+j}" title="Edit">${hexValue}</span> `;
                        asciiChars += (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : ".";
                    } else {
                        hexBytes += "   "; 
                    }
                }
                hexRow += `<div class="hex-bytes-col">${hexBytes}</div>`;
                asciiChars = asciiChars.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                hexRow += `<div class="hex-ascii-col">${asciiChars}</div>`;
                hexRow += `</div>`;
                htmlContent += hexRow;
            }
            contentNode.innerHTML = htmlContent;

            // Tıklayınca Custom Modalı aç
            contentNode.querySelectorAll('.hex-byte').forEach(span => {
                span.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    const currentHex = this.innerText;
                    openModal(index, currentHex, this);
                });
            });
        }

        hexBody.onscroll = renderChunk;
        hexBody.scrollTop = currentScrollTop;
        renderChunk();
    }

    searchInput.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll(".smart-item").forEach(item => {
            const name = item.querySelector(".smart-name").innerText.toLowerCase();
            item.style.display = name.includes(term) ? "flex" : "none";
        });
    });

    downloadBtn.addEventListener("click", () => {
        const blob = new Blob([fileBuffer], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "edited_" + currentFileName;
        document.body.appendChild(a); a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
    });

    applyTranslations();
});
