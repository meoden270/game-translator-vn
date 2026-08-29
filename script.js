/* =========================================================
   GAME TRANSLATOR VN - v0.2
   ---------------------------------------------------------
   Chức năng:
   - Đọc file game
   - Hỗ trợ JSON / TXT / RPY / KS / JS / XML cơ bản
   - Với JSON:
       + Giữ nguyên toàn bộ cấu trúc
       + Chỉ xử lý chuỗi text
       + Không đụng vào số, boolean, key, công thức...
   - Hiển thị danh sách text có thể dịch
   - Cho phép sửa bản dịch thủ công
   - Xuất file đã dịch
   ========================================================= */

"use strict";

/* =========================
   BIẾN CHÍNH
   ========================= */

let currentFile = null;
let originalText = "";
let currentData = null;
let extractedTexts = [];
let translations = new Map();

/* =========================
   TÌM ELEMENT TRONG HTML
   ========================= */

function findElement(...ids) {
    for (const id of ids) {
        const el = document.getElementById(id);
        if (el) return el;
    }
    return null;
}

const fileInput =
    findElement("fileInput", "file", "uploadFile", "fileUpload");

const translateButton =
    findElement("translateButton", "translateBtn", "translate");

const resultBox =
    findElement("result", "resultBox", "output", "translationResult");

const fileNameBox =
    findElement("fileName", "selectedFile", "file-name");

/* =========================
   KHỞI TẠO
   ========================= */

document.addEventListener("DOMContentLoaded", () => {
    setupFileInput();
    setupTranslateButton();

    console.log("Game Translator VN v0.2 đã khởi động.");
});

/* =========================
   FILE INPUT
   ========================= */

function setupFileInput() {
    if (!fileInput) {
        console.warn("Không tìm thấy ô chọn file.");
        return;
    }

    fileInput.addEventListener("change", async (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        currentFile = file;

        if (fileNameBox) {
            fileNameBox.textContent = file.name;
        }

        showMessage(`Đang đọc: ${file.name}...`);

        try {
            originalText = await file.text();

            currentData = null;
            extractedTexts = [];
            translations.clear();

            const extension = getExtension(file.name);

            if (extension === "json") {
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

/* =========================
   NÚT DỊCH
   ========================= */

function setupTranslateButton() {
    if (!translateButton) {
        console.warn("Không tìm thấy nút Dịch.");
        return;
    }

    translateButton.addEventListener("click", async () => {

        if (!currentFile) {
            showMessage("⚠️ Hãy chọn file trước.");
            return;
        }

        if (extractedTexts.length === 0) {
            showMessage("⚠️ Không tìm thấy đoạn text để dịch.");
            return;
        }

        /*
         * v0.2 chưa gọi API tự động.
         *
         * Thay vì tự ý phá file bằng một API không ổn định,
         * ta hiển thị danh sách text để kiểm tra/chỉnh sửa.
         */

        renderTranslationEditor();

        showMessage(
            `Đã tìm thấy ${extractedTexts.length} đoạn text.`
        );
    });
}

/* =========================
   XỬ LÝ JSON
   ========================= */

function processJSON(text) {

    try {
        currentData = JSON.parse(text);

        extractedTexts = [];

        scanJSON(
            currentData,
            []
        );

        renderPreview();

        showMessage(
            `✅ Đọc JSON thành công: ${extractedTexts.length} đoạn text có thể dịch.`
        );

    } catch (error) {

        console.error(error);

        showMessage(
            "❌ File JSON không hợp lệ hoặc đã bị lỗi cấu trúc."
        );
    }
}

/* =========================
   QUÉT JSON
   ========================= */

function scanJSON(value, path) {

    if (typeof value === "string") {

        if (isTranslatableText(value)) {

            extractedTexts.push({
                path: [...path],
                original: value,
                translation: translations.get(
                    pathToString(path)
                ) || ""
            });
        }

        return;
    }

    if (Array.isArray(value)) {

        value.forEach((item, index) => {

            scanJSON(
                item,
                [...path, index]
            );

        });

        return;
    }

    if (value && typeof value === "object") {

        Object.keys(value).forEach(key => {

            /*
             * Không quét key JSON.
             * Chỉ quét VALUE.
             */

            scanJSON(
                value[key],
                [...path, key]
            );

        });
    }
}

/* =========================
   NHẬN DIỆN TEXT
   ========================= */

function isTranslatableText(text) {

    const value = text.trim();

    /*
     * Bỏ chuỗi rỗng
     */

    if (!value) return false;

    /*
     * Bỏ số thuần túy
     */

    if (/^[\d\s.,+\-*/%]+$/.test(value)) {
        return false;
    }

    /*
     * Bỏ công thức RPG Maker.
     *
     * Ví dụ:
     * a.atk * 4 - b.def * 2
     * 100 + a.mat * 2 - b.mdf * 2
     */

    if (
        /\b[a-z]\.(atk|def|mat|mdf|agi|luk|hp|mp|tp)\b/i.test(value)
    ) {
        return false;
    }

    /*
     * Bỏ tên file/resource phổ biến
     */

    if (
        /\.(png|jpg|jpeg|webp|ogg|m4a|wav|mp3|mid|midi|ttf|otf)$/i.test(value)
    ) {
        return false;
    }

    /*
     * Bỏ tên event kiểu EV001
     */

    if (/^EV\d+$/i.test(value)) {
        return false;
    }

    /*
     * Bỏ chuỗi giống ID nội bộ
     */

    if (
        /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value) &&
        value.length < 25
    ) {
        /*
         * Những từ đơn vẫn có thể là text.
         * Chỉ bỏ những chuỗi rõ ràng là mã.
         */
        if (
            /^(true|false|null|undefined)$/i.test(value)
        ) {
            return false;
        }
    }

    /*
     * Bỏ escape/control code nếu toàn bộ chuỗi chỉ chứa code.
     */

    if (/^\\[A-Za-z]+$/.test(value)) {
        return false;
    }

    /*
     * Nếu có chữ cái hoặc chữ CJK thì coi là text.
     */

    if (/[A-Za-zÀ-ỹ一-鿿ぁ-んァ-ヶ]/.test(value)) {
        return true;
    }

    return false;
}

/* =========================
   XỬ LÝ FILE TEXT
   ========================= */

function processTextFile(text) {

    currentData = null;

    extractedTexts = [];

    const lines = text.split(/\r?\n/);

    lines.forEach((line, index) => {

        const clean = line.trim();

        if (!isTranslatableText(clean)) {
            return;
        }

        extractedTexts.push({
            path: ["line", index],
            original: clean,
            translation: ""
        });
    });

    renderPreview();

    showMessage(
        `✅ Đã tìm thấy ${extractedTexts.length} dòng text.`
    );
}

/* =========================
   HIỂN THỊ PREVIEW
   ========================= */

function renderPreview() {

    if (!resultBox) return;

    if (extractedTexts.length === 0) {

        resultBox.innerHTML =
            "<p>Không tìm thấy text có thể dịch.</p>";

        return;
    }

    const preview = extractedTexts
        .slice(0, 100)
        .map((item, index) => {

            return `
                <div class="gt-row">
                    <div class="gt-number">${index + 1}</div>
                    <div class="gt-original">
                        ${escapeHTML(item.original)}
                    </div>
                </div>
            `;

        })
        .join("");

    resultBox.innerHTML = `
        <div class="gt-header">
            <strong>Text tìm thấy: ${extractedTexts.length}</strong>
            <small>Hiển thị 100 mục đầu tiên</small>
        </div>

        <div class="gt-list">
            ${preview}
        </div>
    `;
}

/* =========================
   GIAO DIỆN CHỈNH BẢN DỊCH
   ========================= */

function renderTranslationEditor() {

    if (!resultBox) return;

    resultBox.innerHTML = "";

    const container = document.createElement("div");

    container.className = "gt-editor";

    const title = document.createElement("div");

    title.innerHTML = `
        <h3>🇻🇳 Bản dịch</h3>
        <p>
            Nhập bản dịch ở cột bên phải.
            Code và cấu trúc file sẽ được giữ nguyên.
        </p>
    `;

    container.appendChild(title);

    extractedTexts.forEach((item, index) => {

        const row = document.createElement("div");

        row.className = "gt-edit-row";

        const left = document.createElement("textarea");

        left.className = "gt-original-input";
        left.value = item.original;
        left.readOnly = true;

        const right = document.createElement("textarea");

        right.className = "gt-translation-input";

        right.placeholder = "Nhập bản dịch tiếng Việt...";

        right.value = item.translation || "";

        right.addEventListener("input", () => {

            item.translation = right.value;

            translations.set(
                pathToString(item.path),
                right.value
            );
        });

        row.appendChild(left);
        row.appendChild(right);

        container.appendChild(row);
    });

    const exportButton = document.createElement("button");

    exportButton.textContent =
        "💾 Xuất file đã dịch";

    exportButton.className =
        "gt-export-button";

    exportButton.addEventListener(
        "click",
        exportTranslatedFile
    );

    container.appendChild(exportButton);

    resultBox.appendChild(container);
}

/* =========================
   XUẤT FILE
   ========================= */

function exportTranslatedFile() {

    if (!currentFile) {
        showMessage("⚠️ Chưa có file.");
        return;
    }

    let outputText = "";

    /*
     * JSON
     */

    if (currentData !== null) {

        const clonedData =
            deepClone(currentData);

        extractedTexts.forEach(item => {

            if (
                item.translation &&
                item.translation.trim()
            ) {

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

        /*
         * Giữ JSON đẹp và hợp lệ.
         */

        outputText =
            JSON.stringify(
                clonedData,
                null,
                2
            );
    }

    /*
     * TXT / RPY / KS / JS / XML...
     */

    else {

        outputText = originalText;

        /*
         * Thay từng dòng text.
         *
         * Chỉ thay khi người dùng thực sự
         * nhập bản dịch.
         */

        const sorted =
            [...extractedTexts]
                .sort(
                    (a, b) =>
                        b.path[1] - a.path[1]
                );

        const lines =
            outputText.split(/\r?\n/);

        sorted.forEach(item => {

            const lineIndex =
                item.path[1];

            if (
                item.translation &&
                item.translation.trim()
            ) {

                const originalLine =
                    lines[lineIndex];

                const leading =
                    originalLine.match(/^\s*/)?.[0] || "";

                lines[lineIndex] =
                    leading +
                    preserveSpecialCodes(
                        originalLine.trim(),
                        item.translation
                    );
            }
        });

        outputText =
            lines.join("\n");
    }

    downloadFile(
        makeTranslatedFileName(
            currentFile.name
        ),
        outputText
    );

    showMessage(
        "✅ Đã tạo file bản dịch."
    );
}

/* =========================
   GIỮ CODE / PLACEHOLDER
   ========================= */

function preserveSpecialCodes(
    original,
    translated
) {

    let result = translated;

    /*
     * Giữ %1, %2, %3...
     */

    const percentCodes =
        original.match(/%\d+/g) || [];

    percentCodes.forEach(code => {

        if (!result.includes(code)) {

            result += code;
        }
    });

    /*
     * Giữ \n, \V[1], \N[1], \C[1]...
     */

    const escapeCodes =
        original.match(
            /\\[A-Za-z]+(?:\[\d+\])?/g
        ) || [];

    escapeCodes.forEach(code => {

        if (!result.includes(code)) {

            /*
             * Không tự ý thêm nếu đây là
             * escape code nằm giữa câu.
             *
             * Chỉ cảnh báo trong console.
             */

            console.warn(
                "Escape code bị thiếu trong bản dịch:",
                code
            );
        }
    });

    return result;
}

/* =========================
   SET VALUE THEO PATH
   ========================= */

function setValueByPath(
    object,
    path,
    value
) {

    if (!path.length) return;

    let current = object;

    for (
        let i = 0;
        i < path.length - 1;
        i++
    ) {

        const key = path[i];

        if (
            current[key] === undefined ||
            current[key] === null
        ) {
            return;
        }

        current = current[key];
    }

    current[
        path[path.length - 1]
    ] = value;
}

/* =========================
   CLONE DATA
   ========================= */

function deepClone(data) {

    return JSON.parse(
        JSON.stringify(data)
    );
}

/* =========================
   DOWNLOAD
   ========================= */

function downloadFile(
    filename,
    content
) {

    const blob =
        new Blob(
            [content],
            {
                type:
                    "application/octet-stream"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download = filename;

    document.body.appendChild(link);

    link.click();

    link.remove();

    setTimeout(() => {

        URL.revokeObjectURL(url);

    }, 1000);
}

/* =========================
   TÊN FILE MỚI
   ========================= */

function makeTranslatedFileName(
    filename
) {

    const dot =
        filename.lastIndexOf(".");

    if (dot === -1) {
        return filename + "_vi";
    }

    const name =
        filename.substring(0, dot);

    const extension =
        filename.substring(dot);

    return (
        name +
        "_vi" +
        extension
    );
}

/* =========================
   PATH
   ========================= */

function pathToString(path) {

    return path
        .map(part => `[${part}]`)
        .join(".");
}

/* =========================
   EXTENSION
   ========================= */

function getExtension(filename) {

    const dot =
        filename.lastIndexOf(".");

    if (dot === -1) {
        return "";
    }

    return filename
        .substring(dot + 1)
        .toLowerCase();
}

/* =========================
   HTML ESCAPE
   ========================= */

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* =========================
   THÔNG BÁO
   ========================= */

function showMessage(message) {

    console.log(message);

    /*
     * Nếu HTML có element status
     * thì hiển thị ở đó.
     */

    const status =
        findElement(
            "status",
            "message",
            "statusMessage"
        );

    if (status) {
        status.textContent = message;
    }
}

/* =========================================================
   PHÍM TẮT
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        /*
         * Ctrl + O:
         * mở file
         */

        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "o"
        ) {

            event.preventDefault();

            if (fileInput) {
                fileInput.click();
            }
        }

    }
);
