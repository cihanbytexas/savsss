// --- YENİ EKLENEN KISIM: Splash Screen ---
window.addEventListener("load", () => {
    const splashScreen = document.getElementById("splash-screen");
    setTimeout(() => {
        splashScreen.classList.add("hidden");
    }, 1500); // 1.5 saniye animasyonu izlet ve ekranı aç
});

// --- MEVCUT İÇERİK ---
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
        "offset": "Offset",
        "ascii": "ASCII",
        "file_info_name": "Dosya:",
        "file_info_size": "Boyut:",
        "file_info_status": "Durum:",
        "status_processing": "İşleniyor...",
        "status_success": "Başarılı",
        "status_fail": "Okuma Başarısız",
        "fail_desc": "Bu dosyada okunabilir değer bulunamadı.<br><br>Hex Editör sekmesini kullanın.",
        "prompt_msg": "Yeni Hex Değeri (00-FF):",
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
        "offset": "Offset",
        "ascii": "ASCII",
        "file_info_name": "File:",
        "file_info_size": "Size:",
        "file_info_status": "Status:",
        "status_processing": "Processing...",
        "status_success": "Success",
        "status_fail": "Read Failed",
        "fail_desc": "No readable values found in this file.<br><br>Please use the Hex Editor.",
        "prompt_msg": "New Hex Value (00-FF):",
        "toggle_lang": "TR"
    }
};

let currentLang = "tr";
let totalValuesFound = 0;

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
    const searchInput = document.getElementById("search-input");
    const langToggleBtn = document.getElementById("lang-toggle");
    const tabs = document.querySelectorAll(".tab");
    const views = document.querySelectorAll(".view-content");

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
            downloadBtn.disabled = false;
            downloadBtn.classList.remove("outline-btn");
            downloadBtn.classList.add("primary-btn"); 

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
            { type: "BoolProperty", offsetAdd: 21 }
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
            let currentValue = 0; let step = "1";
            
            try {
                if (prop.type === "IntProperty") {
                    currentValue = dataView.getInt32(prop.offset, true); step = "1";
                } else if (prop.type === "FloatProperty") {
                    let fVal = dataView.getFloat32(prop.offset, true);
                    currentValue = Number.isInteger(fVal) ? fVal : fVal.toFixed(6).replace(/\.?0+$/, ''); 
                    step = "0.01";
                } else if (prop.type === "BoolProperty") {
                    currentValue = dataView.getUint8(prop.offset) === 1 ? 1 : 0; step = "1";
                }
            } catch(e) { currentValue = 0; }

            item.innerHTML = `
                <div class="smart-left">
                    <span class="smart-offset">0x${prop.offset.toString(16).toUpperCase()}</span>
                    <span class="smart-name" title="${prop.name}">${prop.name}</span>
                </div>
                <input type="number" class="smart-input" step="${step}" value="${currentValue}" data-offset="${prop.offset}" data-type="${prop.type}">
            `;
            smartList.appendChild(item);
        });

        document.querySelectorAll(".smart-input").forEach(input => {
            input.addEventListener("change", (e) => {
                const offset = parseInt(e.target.dataset.offset);
                const type = e.target.dataset.type;
                let newVal = Number(e.target.value);
                try {
                    if (type === "IntProperty") dataView.setInt32(offset, newVal, true);
                    else if (type === "FloatProperty") dataView.setFloat32(offset, newVal, true);
                    else if (type === "BoolProperty") {
                        newVal = newVal > 0 ? 1 : 0;
                        dataView.setUint8(offset, newVal);
                        e.target.value = newVal; 
                    }
                    e.target.classList.add("edited-val"); 
                    renderHexEditor(); 
                } catch(err) {}
            });
        });
    }

    function renderHexEditor() {
        const hexBody = document.getElementById("hex-body");
        hexBody.innerHTML = ""; 
        const maxBytesToRender = Math.min(uint8Array.length, 16384); 
        let htmlContent = "";
        
        for (let i = 0; i < maxBytesToRender; i += 16) {
            let hexRow = `<div class="hex-row">`;
            hexRow += `<div class="hex-offset-col">${i.toString(16).padStart(8, '0').toUpperCase()}</div>`;
            let hexBytes = ""; let asciiChars = "";
            
            for (let j = 0; j < 16; j++) {
                if (i + j < maxBytesToRender) {
                    const byte = uint8Array[i + j];
                    const hexValue = byte.toString(16).padStart(2, '0').toUpperCase();
                    hexBytes += `<span class="hex-byte" data-index="${i+j}" title="Edit">${hexValue}</span> `;
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
        hexBody.innerHTML = htmlContent;

        document.querySelectorAll('.hex-byte').forEach(span => {
            span.addEventListener('click', function() {
                const lang = translations[currentLang];
                const index = parseInt(this.getAttribute('data-index'));
                const currentHex = this.innerText;
                const newHex = prompt(`Address: 0x${index.toString(16).toUpperCase()}\n\n${lang.prompt_msg}`, currentHex);
                
                if (newHex && /^[0-9A-Fa-f]{1,2}$/.test(newHex)) {
                    uint8Array[index] = parseInt(newHex, 16); 
                    this.innerText = newHex.padStart(2, '0').toUpperCase(); 
                    this.classList.add("edited-val");
                    extractPropertiesBulletproof(); 
                }
            });
        });
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
