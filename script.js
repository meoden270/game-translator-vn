/* =========================================================
   GAME TRANSLATOR VN - v0.2.1
   ---------------------------------------------------------
   - Lọc text RPG Maker JSON tốt hơn
   - Bỏ ID, tên resource, tag/plugin, công thức và giá trị nội bộ
   - Ưu tiên thoại, lựa chọn, tên, mô tả và text tự nhiên
   - Giữ nguyên cấu trúc JSON
   - Với file text: chỉ thay đúng phần text được nhận diện
   - Không tự động gọi API
   ========================================================= */

"use strict";

let currentFile = null;
let originalText = "";
let currentData = null;
let extractedTexts = [];
let translations = new Map();

function findElement(...ids) {
    for (const id of ids) {
        const el = document.getElementById(id);
        if (el) return el;
    }
    return null;
}

function getUI() {
    return {
        fileInput: findElement("fileInput", "file", "uploadFile", "fileUpload"),
        translateButton: findElement("translateButton", "translateBtn", "translate"),
        resultBox: findElement("result", "resultBox", "output", "translationResult"),
        fileNameBox: findElement("fileName", "selectedFile", "file-name")
    };
}

document.addEventListener("DOMContentLoaded", () => {
    setupFileInput();
    setupTranslateButton();
    console.log("Game Translator VN v0.2.1 đã khởi động.");
});

function setupFileInput() {
    const { fileInput, fileNameBox } = getUI();

    if (!fileInput) {
        console.warn("Không tìm thấy ô chọn file.");
        return;
    }

    fileInput.addEventListener("change", async event => {
        const file = event.target.files?.[0];
        if (!file) return;

        currentFile = file;
        if (fileNameBox) fileNameBox.textContent = file.name;
        showMessage(`Đang đọc: ${file.name}...`);

        try {
            originalText = await file.text();
            currentData = null;
            extractedTexts = [];
            translations.clear();

            if (getExtension(file.name) === "json") {
                processJSON(originalText);
            } else {
                processTextFile(originalText);
            }
        } catch (error) {
            console.error(error);
            showMessage("❌ Không thể đọc file.");
        }
    });
}

function setupTranslateButton() {
    const { translateButton } = getUI();

    if (!translateButton) {
        console.warn("Không tìm thấy nút Dịch.");
        return;
    }

    translateButton.addEventListener("click", () => {
        if (!currentFile) {
            showMessage("⚠️ Hãy chọn file trước.");
            return;
        }

        if (extractedTexts.length === 0) {
            showMessage("⚠️ Không tìm thấy đoạn text có thể dịch.");
            return;
        }

        renderTranslationEditor();
        showMessage(`Đã tìm thấy ${extractedTexts.length} đoạn text có thể dịch.`);
    });
}

function processJSON(text) {
    try {
        currentData = JSON.parse(text);
        extractedTexts = [];
        scanJSON(currentData, []);
        renderPreview();
        showMessage(`✅ Đọc JSON thành công: ${extractedTexts.length} đoạn text có thể dịch.`);
    } catch (error) {
        console.error(error);
        showMessage("❌ File JSON không hợp lệ hoặc đã bị lỗi cấu trúc.");
    }
}

function scanJSON(value, path) {
    if (typeof value === "string") {
        if (isTranslatableJSONValue(value, path)) {
            addExtractedText(value, path);
        }
        return;
    }

    if (Array.isArray(value)) {
        value.forEach((item, index) => scanJSON(item, [...path, index]));
        return;
    }

    if (value && typeof value === "object") {
        Object.keys(value).forEach(key => scanJSON(value[key], [...path, key]));
    }
}

function addExtractedText(original, path) {
    const key = pathToString(path);

    if (extractedTexts.some(item => pathToString(item.path) === key)) return;

    extractedTexts.push({
        path: [...path],
        original,
        translation: translations.get(key) || ""
    });
}

function isTranslatableJSONValue(text, path) {
    const value = String(text).trim();
    if (!value) return false;

    const key = getLastPathKey(path);
    const lowerKey = String(key).toLowerCase();

    const blockedKeys = new Set([
        "id", "code", "type", "nameid", "filename", "file", "src", "url",
        "iconindex", "characterindex", "faceindex", "battlername",
        "animationname", "effectname", "variable", "var", "formula",
        "script", "scriptcall", "note", "meta", "uuid", "guid", "key",
        "symbol", "command", "eventid", "x", "y", "width", "height",
        "opacity", "speed", "duration", "delay", "volume", "pitch", "pan"
    ]);

    if (blockedKeys.has(lowerKey)) return false;

    /* Các tag hiển thị kiểu <Battle Portrait: ...> không đưa ra dịch. */
    if (/^<[^>]+>$/.test(value)) return false;

    /* Resource/file. */
    if (/\.(png|jpg|jpeg|gif|webp|bmp|svg|ogg|m4a|wav|mp3|mid|midi|ttf|otf|woff|woff2)$/i.test(value)) {
        return false;
    }

    /* URL/path/mã màu. */
    if (/^(https?:\/\/|ftp:\/\/|data:|file:\/\/)/i.test(value)) return false;
    if (/^[A-Za-z]:[\\/]|^(?:\.{0,2}[\\/])/.test(value)) return false;
    if (/^#[0-9A-F]{3,8}$/i.test(value)) return false;

    /* Công thức/code. */
    if (isTechnicalExpression(value)) return false;

    /* JSON được lưu bên trong chuỗi. */
    if ((value.startsWith("{") && value.endsWith("}")) ||
        (value.startsWith("[") && value.endsWith("]"))) {
        return false;
    }

    if (/^(true|false|null|undefined|NaN|Infinity)$/i.test(value)) return false;
    if (/^[\d\s.,+\-*/%]+$/.test(value)) return false;

    /* ID nội bộ như Actor1_1, Cha_test, Actor_A. */
    if (isLikelyInternalId(value)) return false;

    /* Escape/control code đứng một mình. */
    if (/^(?:\\[A-Za-z]+(?:\[[^\]]*\])?)+$/.test(value)) return false;

    if (!/[A-Za-zÀ-ỹ一-鿿ぁ-んァ-ヶ가-힣]/.test(value)) return false;

    if (value.length <= 3 && /^[A-Za-z0-9_.$-]+$/.test(value)) return false;

    return true;
}

function isTechnicalExpression(value) {
    const patterns = [
        /\b[a-zA-Z_$][\w$]*\.(atk|def|mat|mdf|agi|luk|hp|mp|tp)\b/i,
        /\b(?:this|self|actor|enemy|target|user)\s*[.[]/i,
        /\b(?:Math|JSON|Array|String|Number|Object|Date|RegExp)\.[A-Za-z_$]/,
        /(?:===|!==|==|!=|&&|\|\||=>|\+\+|--|\+=|-=|\*=|\/=)/,
        /\b(?:var|let|const|function|return|if|else|for|while|switch|case|new)\b/i,
        /[A-Za-z_$][\w$]*\s*\([^)]*\)\s*(?:;|$)/,
        /[A-Za-z_$][\w$]*\s*=\s*[^=]/,
        /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/,
        /^[A-Za-z_$][\w$]*(?:\[[^\]]+\])+$/,
        /^\s*[A-Za-z_$][\w$]*\s*[*+\-/]\s*[A-Za-z0-9_$.[\]]+\s*$/
    ];

    return patterns.some(pattern => pattern.test(value));
}

function isLikelyInternalId(value) {
    if (/\s/.test(value)) return false;

    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value)) {
        if (/^(Actor|Enemy|Item|Weapon|Armor|Skill|State|Class|Map|CommonEvent|Event|Troop|Game|System|Vehicle|Battle|Cha|Character|EV|SE|BGM|BGS|ME|SFX)/i.test(value)) {
            return true;
        }

        if (/^[A-Za-z]+_\d+$/.test(value)) return true;
        if (/^[A-Za-z]+\d+_[A-Za-z0-9]+$/.test(value)) return true;
        if (/^[A-Za-z0-9]+_[A-Za-z0-9_]+$/.test(value)) return true;
        if (/^[A-Za-z]+(?:\d+){2,}$/.test(value)) return true;
    }

    return false;
}

function processTextFile(text) {
    currentData = null;
    extractedTexts = [];

    const extension = getExtension(currentFile?.name || "");
    const lines = text.split(/\r?\n/);

    lines.forEach((line, index) => {
        const candidate = extractTextFromLine(line, extension);
        if (!candidate) return;

        extractedTexts.push({
            path: ["line", index],
            original: candidate.text,
            translation: ""
        });
    });

    renderPreview();
    showMessage(`✅ Đã tìm thấy ${extractedTexts.length} dòng text có thể dịch.`);
}

function extractTextFromLine(line, extension) {
    const trimmed = line.trim();

    if (!trimmed) return null;
    if (/^(\/\/|\/\*|\*|#|;)/.test(trimmed)) return null;

    if (extension === "rpy") {
        const dialogue = trimmed.match(/^(?:[A-Za-z_]\w*\s+)?["'](.+?)["']\s*$/);

        if (dialogue && isTranslatablePlainText(dialogue[1])) {
            return { text: dialogue[1] };
        }

        const assignment = trimmed.match(/=\s*["'](.+?)["']\s*$/);

        if (assignment && isTranslatablePlainText(assignment[1])) {
            return { text: assignment[1] };
        }

        return null;
    }

    if (extension === "ks") {
        const textPart = trimmed.replace(/^\[[^\]]+\]\s*/, "");

        if (isTranslatablePlainText(textPart)) {
            return { text: textPart };
        }

        return null;
    }

    if (extension === "xml") {
        const match = line.match(/>([^<>]+)</);

        if (match && isTranslatablePlainText(match[1].trim())) {
            return { text: match[1].trim() };
        }

        return null;
    }

    if (extension === "js") {
        const match = trimmed.match(
            /^(?:const|let|var)\s+\w+\s*=\s*["'](.+?)["']\s*;?$/
        );

        if (match && isTranslatablePlainText(match[1])) {
            return { text: match[1] };
        }

        return null;
    }

    if (isTranslatablePlainText(trimmed)) {
        return { text: trimmed };
    }

    return null;
}

function isTranslatablePlainText(value) {
    if (!value || !/[A-Za-zÀ-ỹ一-鿿ぁ-んァ-ヶ가-힣]/.test(value)) {
        return false;
    }

    if (isTechnicalExpression(value)) return false;
    if (isLikelyInternalId(value)) return false;
    if (/^<[^>]+>$/.test(value)) return false;
    if (/\.(png|jpg|jpeg|gif|webp|ogg|wav|mp3|ttf|otf)$/i.test(value)) {
        return false;
    }

    return true;
}

function renderPreview() {
    const { resultBox } = getUI();

    if (!resultBox) return;

    if (extractedTexts.length === 0) {
        resultBox.innerHTML = "<p>Không tìm thấy text có thể dịch.</p>";
        return;
    }

    const preview = extractedTexts.slice(0, 100).map((item, index) => `
        <div class="gt-row">
            <div class="gt-number">${index + 1}</div>
            <div class="gt-original">${escapeHTML(item.original)}</div>
        </div>
    `).join("");

    resultBox.innerHTML = `
        <div class="gt-header">
            <strong>Text cần dịch: ${extractedTexts.length}</strong>
            <small>Hiển thị 100 mục đầu tiên</small>
        </div>
        <div class="gt-list">${preview}</div>
    `;
}

function renderTranslationEditor() {
    const { resultBox } = getUI();

    if (!resultBox) return;

    resultBox.innerHTML = "";

    const container = document.createElement("div");
    container.className = "gt-editor";

    const title = document.createElement("div");

    title.innerHTML = `
        <h3>🇻🇳 Bản dịch</h3>
        <p>Chỉ dịch phần văn bản. Không thay đổi code, ID hoặc cấu trúc file.</p>
    `;

    container.appendChild(title);

    extractedTexts.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "gt-edit-row";

        const left = document.createElement("textarea");
        left.className = "gt-original-input";
        left.value = item.original;
        left.readOnly = true;
        left.setAttribute("aria-label", `Văn bản gốc ${index + 1}`);

        const right = document.createElement("textarea");
        right.className = "gt-translation-input";
        right.placeholder = "Nhập bản dịch tiếng Việt...";
        right.value = item.translation || "";
        right.setAttribute("aria-label", `Bản dịch ${index + 1}`);

        right.addEventListener("input", () => {
            item.translation = right.value;
            translations.set(pathToString(item.path), right.value);
        });

        row.appendChild(left);
        row.appendChild(right);
        container.appendChild(row);
    });

    const exportButton = document.createElement("button");

    exportButton.type = "button";
    exportButton.textContent = "💾 Xuất file đã dịch";
    exportButton.className = "gt-export-button";
    exportButton.addEventListener("click", exportTranslatedFile);

    container.appendChild(exportButton);
    resultBox.appendChild(container);
}

function exportTranslatedFile() {
    if (!currentFile) {
        showMessage("⚠️ Chưa có file.");
        return;
    }

    let outputText;

    if (currentData !== null) {
        const clonedData = deepClone(currentData);

        extractedTexts.forEach(item => {
            if (item.translation?.trim()) {
                setValueByPath(
                    clonedData,
                    item.path,
                    preserveSpecialCodes(
                        item.original,
                        item.translation
                    )
                );
            }
        });

        outputText = JSON.stringify(clonedData, null, 2);
    } else {
        outputText = exportTextFile();
    }

    downloadFile(
        makeTranslatedFileName(currentFile.name),
        outputText
    );

    showMessage("✅ Đã tạo file bản dịch.");
}

function exportTextFile() {
    const extension = getExtension(currentFile?.name || "");
    const lines = originalText.split(/\r?\n/);

    [...extractedTexts]
        .filter(item => item.translation?.trim())
        .sort((a, b) => b.path[1] - a.path[1])
        .forEach(item => {
            const lineIndex = item.path[1];

            if (lineIndex < 0 || lineIndex >= lines.length) return;

            const translated = preserveSpecialCodes(
                item.original,
                item.translation
            );

            if (extension === "rpy" || extension === "js") {
                lines[lineIndex] = replaceQuotedValue(
                    lines[lineIndex],
                    item.original,
                    translated
                );
            } else {
                const index = lines[lineIndex].indexOf(item.original);

                if (index !== -1) {
                    lines[lineIndex] =
                        lines[lineIndex].slice(0, index) +
                        translated +
                        lines[lineIndex].slice(index + item.original.length);
                }
            }
        });

    return lines.join("\n");
}

function replaceQuotedValue(line, original, translated) {
    const escaped = escapeRegExp(original);
    const pattern = new RegExp(`(["'])${escaped}\\1`);

    if (!pattern.test(line)) return line;

    return line.replace(
        pattern,
        (_, quote) => `${quote}${translated}${quote}`
    );
}

function preserveSpecialCodes(original, translated) {
    const result = translated;

    const codes = [
        ...(original.match(/%[0-9]+/g) || []),
        ...(original.match(/\\[A-Za-z]+(?:\[[^\]]*\])?/g) || [])
    ];

    [...new Set(codes)].forEach(code => {
        if (!result.includes(code)) {
            console.warn("Bản dịch thiếu code:", code);
        }
    });

    return result;
}

function setValueByPath(object, path, value) {
    if (!path.length) return;

    let current = object;

    for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];

        if (
            current === null ||
            current === undefined ||
            current[key] === undefined ||
            current[key] === null
        ) {
            return;
        }

        current = current[key];
    }

    if (current !== null && current !== undefined) {
        current[path[path.length - 1]] = value;
    }
}

function deepClone(data) {
    return JSON.parse(JSON.stringify(data));
}

function downloadFile(filename, content) {
    const blob = new Blob(
        [content],
        { type: "application/octet-stream" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function makeTranslatedFileName(filename) {
    const dot = filename.lastIndexOf(".");

    if (dot === -1) {
        return `${filename}_vi`;
    }

    return filename.slice(0, dot) + "_vi" + filename.slice(dot);
}

function pathToString(path) {
    return path.map(part => `[${String(part)}]`).join(".");
}

function getExtension(filename) {
    const dot = filename.lastIndexOf(".");

    if (dot === -1) return "";

    return filename.slice(dot + 1).toLowerCase();
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHTML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showMessage(message) {
    console.log(message);

    const status = findElement(
        "status",
        "message",
        "statusMessage"
    );

    if (status) {
        status.textContent = message;
    }
}

document.addEventListener("keydown", event => {
    if (
        event.ctrlKey &&
        event.key.toLowerCase() === "o"
    ) {
        event.preventDefault();

        const { fileInput } = getUI();

        if (fileInput) {
            fileInput.click();
        }
    }
});
