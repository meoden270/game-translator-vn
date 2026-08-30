/* =========================================================
   GAME TRANSLATOR VN - v0.2.2
   ========================================================= */

"use strict";

let currentFile = null;
let originalText = "";
let currentData = null;
let extractedTexts = [];

const fileInput = document.getElementById("fileInput");
const translateBtn = document.getElementById("translateBtn");
const output = document.getElementById("output");

/* =========================
   CHỌN FILE
   ========================= */

if (fileInput) {
    fileInput.addEventListener("change", async function () {

        const file = this.files[0];

        if (!file) return;

        currentFile = file;

        try {
            originalText = await file.text();
            currentData = null;
            extractedTexts = [];

            if (getExtension(file.name) === "json") {
                processJSON(originalText);
            } else {
                processTextFile(originalText);
            }

        } catch (error) {
            console.error(error);
            output.textContent = "❌ Không thể đọc file.";
        }
    });
}

/* =========================
   NÚT DỊCH
   ========================= */

if (translateBtn) {
    translateBtn.addEventListener("click", function () {

        if (!currentFile) {
            output.textContent = "⚠️ Hãy chọn file game trước.";
            return;
        }

        if (!extractedTexts.length) {
            output.textContent =
                "⚠️ Không tìm thấy text có thể dịch.";
            return;
        }

        showTranslationEditor();
    });
}

/* =========================
   JSON
   ========================= */

function processJSON(text) {

    try {
        currentData = JSON.parse(text);
        extractedTexts = [];

        scanJSON(currentData, []);

        showPreview();

    } catch (error) {
        console.error(error);
        currentData = null;
        output.textContent = "❌ File JSON không hợp lệ.";
    }
}

function scanJSON(value, path) {

    if (typeof value === "string") {

        if (isTranslatable(value)) {
            extractedTexts.push({
                path: [...path],
                original: value,
                translation: ""
            });
        }

        return;
    }

    if (Array.isArray(value)) {

        value.forEach(function (item, index) {
            scanJSON(item, [...path, index]);
        });

        return;
    }

    if (value && typeof value === "object") {

        Object.keys(value).forEach(function (key) {
            scanJSON(value[key], [...path, key]);
        });
    }
}

/* =========================
   KIỂM TRA TEXT
   ========================= */

function isTranslatable(text) {

    const value = String(text).trim();

    if (!value) return false;

    /* Không dịch số */
    if (/^[\d\s.,+\-*/%]+$/.test(value)) {
        return false;
    }

    /* Không dịch true / false / null */
    if (/^(true|false|null|undefined)$/i.test(value)) {
        return false;
    }

    /* Không dịch đường dẫn / tài nguyên */
    if (
        /\.(png|jpg|jpeg|gif|webp|bmp|svg|ogg|m4a|wav|mp3|mid|midi|ttf|otf|woff|woff2)$/i.test(value)
    ) {
        return false;
    }

    /* Không dịch URL */
    if (/^(https?:\/\/|ftp:\/\/|data:)/i.test(value)) {
        return false;
    }

    /* Không dịch công thức RPG */
    if (
        /\b[a-z]\.(atk|def|mat|mdf|agi|luk|hp|mp|tp)\b/i.test(value)
    ) {
        return false;
    }

    /* Không dịch ID nội bộ */
    if (
        /^(Actor|Enemy|Item|Weapon|Armor|Skill|State|Class|Map|Event|Troop|Character|EV)\w*$/i.test(value)
    ) {
        return false;
    }

    /* Không dịch mã kiểu abc_xyz */
    if (
        /^[A-Za-z0-9]+_[A-Za-z0-9_]+$/.test(value) &&
        !/\s/.test(value)
    ) {
        return false;
    }

    /* Phải có chữ */
    return /[A-Za-zÀ-ỹ一-鿿ぁ-んァ-ヶ가-힣]/.test(value);
}

/* =========================
   FILE TEXT / RPY / KS / JS
   ========================= */

function processTextFile(text) {

    currentData = null;
    extractedTexts = [];

    const lines = text.split(/\r?\n/);

    lines.forEach(function (line, index) {

        const clean = line.trim();

        if (!clean) return;

        /* Bỏ comment */
        if (/^(#|\/\/|\/\*|\*|;)/.test(clean)) {
            return;
        }

        /*
         * GIỮ NGUYÊN CÁC DÒNG TAG
         * Không được làm mất khỏi giao diện
         */

        if (
            /^<(Battle Portrait|Menu Portrait):\s*[^>]+>$/i.test(clean)
        ) {
            extractedTexts.push({
                path: ["line", index],
                original: clean,
                translation: "",
                locked: true
            });

            return;
        }

        if (
            /^<\/?(Biography|WordWrap|Trait Sets)>$/i.test(clean)
        ) {
            extractedTexts.push({
                path: ["line", index],
                original: clean,
                translation: "",
                locked: true
            });

            return;
        }

        /*
         * Các lệnh có nội dung cần dịch
         * Ví dụ:
         * <Passive State: Half Encounters>
         */

        if (/^<[^>]+:\s*.+>$/.test(clean)) {

            extractedTexts.push({
                path: ["line", index],
                original: clean,
                translation: "",
                locked: false
            });

            return;
        }

        /*
         * Trait Sets
         * Element: Dark
         * Gender: Male
         * Nature: Modest
         */

        if (
            /^[A-Za-zÀ-ỹ一-鿿ぁ-んァ-ヶ가-힣]+\s*:\s*.+$/.test(clean)
        ) {

            extractedTexts.push({
                path: ["line", index],
                original: clean,
                translation: "",
                locked: false
            });

            return;
        }

        /*
         * Nội dung Biography / WordWrap
         */

        if (isTranslatable(clean)) {

            extractedTexts.push({
                path: ["line", index],
                original: clean,
                translation: "",
                locked: false
            });
        }
    });

    showPreview();
}

/* =========================
   PREVIEW
   ========================= */

function showPreview() {

    if (!output) return;

    if (!extractedTexts.length) {
        output.textContent =
            "Không tìm thấy text có thể dịch.";
        return;
    }

    let text =
        "📋 TEXT TÌM THẤY: " +
        extractedTexts.length +
        "\n\n";

    const limit =
        Math.min(extractedTexts.length, 100);

    for (let i = 0; i < limit; i++) {

        text +=
            (i + 1) +
            ". " +
            extractedTexts[i].original +
            "\n";
    }

    if (extractedTexts.length > 100) {
        text +=
            "\n... còn " +
            (extractedTexts.length - 100) +
            " text khác.";
    }

    output.textContent = text;
}

/* =========================
   GIAO DIỆN DỊCH
   ========================= */

function showTranslationEditor() {

    output.innerHTML = "";

    const editor =
        document.createElement("div");

    editor.className = "gt-editor";

    const title =
        document.createElement("div");

    title.innerHTML =
        "<h3>🇻🇳 Dịch file game</h3>" +
        "<p>Text gốc ở trên — Bản dịch ở dưới</p>";

    editor.appendChild(title);

    extractedTexts.forEach(function (item, index) {

        const row =
            document.createElement("div");

        row.className = "gt-edit-row";

        const original =
            document.createElement("textarea");

        original.className =
            "gt-original-input";

        original.value =
            item.original;

        original.readOnly = true;

        const translation =
            document.createElement("textarea");

        translation.className =
            "gt-translation-input";

        translation.placeholder =
            "Nhập bản dịch tiếng Việt...";

        translation.addEventListener(
            "input",
            function () {

                item.translation =
                    translation.value;

                autoResize(translation);
            }
        );

        row.appendChild(original);
        row.appendChild(translation);

        editor.appendChild(row);

requestAnimationFrame(function () {
    autoResize(original);
    autoResize(translation);
});

}); // đóng forEach

const exportButton =
        document.createElement("button");

    exportButton.textContent =
        "💾 Xuất file đã dịch";

    exportButton.className =
        "gt-export-button";

    exportButton.addEventListener(
        "click",
        exportTranslatedFile
    );

    editor.appendChild(exportButton);

    output.appendChild(editor);

    document
        .querySelectorAll(".gt-translation-input")
        .forEach(autoResize);
}

/* =========================
   TỰ GIÃN Ô CHỮ
   ========================= */

function autoResize(element) {

    if (!element) return;

    element.style.height = "auto";
    element.style.height = element.scrollHeight + "px";
    }

/* =========================
   XUẤT FILE
   ========================= */

function exportTranslatedFile() {

    if (!currentFile) return;

    let result;

    if (currentData !== null) {

        const cloned =
            JSON.parse(
                JSON.stringify(currentData)
            );

        extractedTexts.forEach(function (item) {

            if (
                item.translation &&
                item.translation.trim()
            ) {

                setValue(
                    cloned,
                    item.path,
                    preserveCodes(
                        item.original,
                        item.translation
                    )
                );
            }
        });

        result =
            JSON.stringify(
                cloned,
                null,
                2
            );

    } else {

        result = exportText();
    }

    downloadFile(
        makeFileName(currentFile.name),
        result
    );
}

/* =========================
   XUẤT FILE TEXT
   ========================= */

function exportText() {

    const lines =
        originalText.split(/\r?\n/);

    extractedTexts
        .filter(function (item) {
            return (
                item.translation &&
                item.translation.trim()
            );
        })
        .sort(function (a, b) {
            return b.path[1] - a.path[1];
        })
        .forEach(function (item) {

            const lineIndex =
                item.path[1];

            if (
                lineIndex < 0 ||
                lineIndex >= lines.length
            ) {
                return;
            }

            const oldLine =
                lines[lineIndex];

            const translated =
                preserveCodes(
                    item.original,
                    item.translation
                );

            const position =
                oldLine.indexOf(
                    item.original
                );

            if (position !== -1) {

                lines[lineIndex] =
                    oldLine.slice(0, position) +
                    translated +
                    oldLine.slice(
                        position +
                        item.original.length
                    );
            }
        });

    return lines.join("\n");
}

/* =========================
   GIỮ CODE ĐẶC BIỆT
   ========================= */

function preserveCodes(
    original,
    translated
) {

    const codes =
        original.match(
            /%[0-9]+|\\[A-Za-z]+(?:\[[^\]]*\])?/g
        ) || [];

    codes.forEach(function (code) {

        if (!translated.includes(code)) {

            console.warn(
                "Bản dịch thiếu code:",
                code
            );
        }
    });

    return translated;
}

/* =========================
   SET VALUE JSON
   ========================= */

function setValue(
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

        if (
            current === null ||
            current === undefined
        ) {
            return;
        }

        current =
            current[path[i]];
    }

    if (
        current !== null &&
        current !== undefined
    ) {

        current[
            path[path.length - 1]
        ] = value;
    }
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

    setTimeout(function () {
        URL.revokeObjectURL(url);
    }, 1000);
}

/* =========================
   TÊN FILE
   ========================= */

function makeFileName(filename) {

    const dot =
        filename.lastIndexOf(".");

    if (dot === -1) {
        return filename + "_vi";
    }

    return (
        filename.slice(0, dot) +
        "_vi" +
        filename.slice(dot)
    );
}

/* =========================
   EXTENSION
   ========================= */

function getExtension(filename) {

    const dot =
        filename.lastIndexOf(".");

    if (dot === -1) return "";

    return filename
        .slice(dot + 1)
        .toLowerCase();
}

/* =========================
   CTRL + O
   ========================= */

document.addEventListener(
    "keydown",
    function (event) {

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

console.log(
    "🎮 Game Translator VN v0.2.2 đang chạy."
);
