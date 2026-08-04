const fileInput = document.getElementById("fileInput");
const output = document.getElementById("output");

fileInput.addEventListener("change", function () {
    const file = this.files[0];

    if (!file) {
        output.textContent = "Chưa chọn tệp...";
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        output.textContent = e.target.result;
    };

    reader.readAsText(file, "UTF-8");
});
