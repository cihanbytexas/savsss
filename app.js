document.addEventListener("DOMContentLoaded", () => {
    const uploadInput = document.getElementById("upload-save");
    const downloadBtn = document.getElementById("download-save");
    const fileInfo = document.getElementById("file-info");
    const smartList = document.getElementById("smart-list");
    const emptyMsg = document.getElementById("empty-message");
    const editorContainer = document.getElementById("smart-editor-container");
    const searchInput = document.getElementById("search-input");
    const tabs = document.querySelectorAll(".tab");
    const views = document.querySelectorAll(".view-content");

    let fileBuffer = null; 
    let dataView = null;
    let uint8Array = null;
    let currentFileName = "";

    // Sekme Değiştirme
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
            
            fileInfo.innerHTML = `
                <strong>Dosya:</strong> <span style="color:#fff">${file.name}</span> <br>
                <strong>Boyut:</strong> <span style="color:#fff">${(file.size / 1024).toFixed(2)} KB</span> <br>
                <strong>Durum:</strong> İşleniyor...
            `;
            
            emptyMsg.style.display = "none";
            editorContainer.style.display = "block";
            downloadBtn.disabled = false;

            setTimeout(() => {
                extractPropertiesBulletproof();
                renderHexEditor();
            }, 50);
        };
        reader.readAsArrayBuffer(file); 
    });

    // KURŞUN GEÇİRMEZ TARAYICI (Bayt eşleşmesi ile)
    function extractPropertiesBulletproof() {
        let rawStr = "";
        for (let i = 0; i < uint8Array.length; i++) {
            rawStr += String.fromCharCode(uint8Array[i]);
        }
        
        let properties = [];
        // UE4 GVAS Dosyaları İçin Tam Ofset Değerleri
        const types = [
            { type: "IntProperty", offsetAdd: 21 },
            { type: "FloatProperty", offsetAdd: 23 },
            { type: "BoolProperty", offsetAdd: 21 }
        ];

        types.forEach(t => {
            let index = 0;
            while ((index = rawStr.indexOf(t.type, index)) !== -1) {
                try {
                    // İsmi geriye doğru tarayarak bul
                    let i = index - 1;
                    // Boşlukları ve gereksiz uzunluk baytlarını atla
                    while (i > 0 && !(/[a-zA-Z0-9_]/.test(rawStr[i]))) { i--; }
                    let nameEnd = i;
                    // Alfanumerik karakterler bitene kadar geri git (İsmi al)
                    while (i > 0 && (/[a-zA-Z0-9_]/.test(rawStr[i]))) { i--; }
                    let nameStart = i + 1;

                    let varName = rawStr.substring(nameStart, nameEnd + 1);

                    if (varName.length >= 2) {
                        // Tam değer ofsetini hesapla
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
        
        if(properties.length === 0) {
            smartList.innerHTML = `<p style='color:#ed4245; text-align:center; padding: 40px;'>Bu dosyada okunabilir değer bulunamadı.<br><br>Yüksek ihtimalle şifreli bir Config dosyası. Hex Editör sekmesini kullanın.</p>`;
            fileInfo.innerHTML = fileInfo.innerHTML.replace("İşleniyor...", `<span style="color:#ed4245">Okuma Başarısız</span>`);
            return;
        }

        fileInfo.innerHTML = fileInfo.innerHTML.replace("İşleniyor...", `<span style="color:var(--success-color)">Başarılı (${properties.length} Değer)</span>`);
        
        // SaveEditOnline gibi sıraya diz
        properties.sort((a, b) => a.offset - b.offset);

        properties.forEach((prop) => {
            const item = document.createElement("div");
            item.className = "smart-item";
            let currentValue = 0; let step = "1";
            
            // Baytları Okuma
            try {
                if (prop.type === "IntProperty") {
                    currentValue = dataView.getInt32(prop.offset, true); step = "1";
                } else if (prop.type === "FloatProperty") {
                    let fVal = dataView.getFloat32(prop.offset, true);
                    // Küsuratı çok olanları SaveEditOnline gibi uzun göster, tam sayıları temizle
                    currentValue = Number.isInteger(fVal) ? fVal : fVal.toFixed(16).replace(/\.?0+$/, ''); 
                    step = "0.01";
                } else if (prop.type === "BoolProperty") {
                    currentValue = dataView.getUint8(prop.offset) === 1 ? 1 : 0; step = "1";
                }
            } catch(e) { currentValue = 0; }

            item.innerHTML = `
                <div class="smart-left">
                    <span class="smart-offset">[${prop.offset}]</span>
                    <span class="smart-name" title="${prop.name}">> ${prop.name}</span>
                </div>
                <input type="number" class="smart-input" step="${step}" value="${currentValue}" data-offset="${prop.offset}" data-type="${prop.type}">
            `;
            smartList.appendChild(item);
        });

        // Değerleri RAM'e Yazma (Kaydetme)
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
                    // Düzenlendiğini belirtmek için rengi turuncu yap
                    e.target.style.color = "#faa61a"; 
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
                    hexBytes += `<span class="hex-byte" data-index="${i+j}" title="Düzenle">${hexValue}</span> `;
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
                const index = parseInt(this.getAttribute('data-index'));
                const currentHex = this.innerText;
                const newHex = prompt(`Adres: 0x${index.toString(16).toUpperCase()}\nMevcut: ${currentHex}\nYeni (00-FF):`, currentHex);
                
                if (newHex && /^[0-9A-Fa-f]{1,2}$/.test(newHex)) {
                    uint8Array[index] = parseInt(newHex, 16); 
                    this.innerText = newHex.padStart(2, '0').toUpperCase(); 
                    this.style.color = "#faa61a"; 
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
});
