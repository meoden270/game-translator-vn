# 📜 CHANGELOG

Tất cả các thay đổi quan trọng của dự án sẽ được ghi lại tại đây.

---

## [v0.2.2] - 2026-08-30

### ✨ Cải thiện giao diện dịch

- Cải thiện giao diện dịch theo chiều dọc.
- Ô text gốc và ô bản dịch tự động điều chỉnh chiều cao theo nội dung.
- Text ngắn → ô nhỏ gọn.
- Text dài → ô tự mở rộng để hiển thị đầy đủ nội dung.
- Tối ưu hiển thị trên điện thoại.
- Không còn phải kéo thủ công textarea để xem nội dung dài.

### 🔧 Cải thiện xử lý file

- Sửa lỗi chọn file nhưng hệ thống vẫn báo:
  `⚠️ Hãy chọn file game trước.`
- Cải thiện quá trình đọc và xử lý file text.
- Giữ lại các dòng tag quan trọng trong giao diện dịch.

### 🏷️ Giữ nguyên cấu trúc game

Các dòng sau được giữ lại và hiển thị:

- `<Battle Portrait: ...>`
- `<Menu Portrait: ...>`
- `<Passive State: ...>`
- `<Trait Sets>`
- `Element: ...`
- `SubElement: ...`
- `Gender: ...`
- `Race: ...`
- `Nature: ...`
- `Alignment: ...`
- `Blessing: ...`
- `Curse: ...`
- `Zodiac: ...`
- `Variant: ...`
- `<Biography>`
- `<WordWrap>`

### 🛡️ Bảo vệ code

- Tiếp tục giữ các mã đặc biệt trong nội dung game.
- Không tự ý thay đổi cấu trúc file gốc khi xuất file.
- Giữ nguyên phần code không cần dịch.

### 🐛 Sửa lỗi

- Sửa lỗi JavaScript khiến giao diện không phản hồi sau khi chọn file.
- Sửa lỗi thiếu `});` trong `showTranslationEditor()`.
- Sửa lỗi textarea không tự động giãn đúng kích thước.

---

## [v0.2.1]

### ✨ Giao diện

- Thêm giao diện dịch dọc.
- Hiển thị text gốc ở trên và ô nhập bản dịch ở dưới.
- Hỗ trợ giao diện mobile.
- Thêm đánh số từng mục dịch.

### 🔧 Xử lý file

- Hỗ trợ đọc file JSON.
- Hỗ trợ xử lý file text.
- Giữ nguyên nội dung file khi xuất.

---

## [v0.2.0]

### 🚧 Phiên bản nền

- Xây dựng giao diện Game Translator VN.
- Thêm chức năng chọn file.
- Thêm nút Dịch.
- Thêm khu vực hiển thị kết quả.

---

# Changelog

## [v0.2.1] - 30/08/2026

### ✨ Cải thiện
- Hoàn thiện giao diện dịch file game.
- Hiển thị text gốc ở phía trên.
- Hiển thị ô nhập bản dịch tiếng Việt ở phía dưới.
- Sửa lỗi số thứ tự bị hiển thị trùng.
- Cải thiện giao diện trên điện thoại.
- Giữ nguyên cấu trúc file khi xuất bản dịch.

### 🛠️ Hỗ trợ
- Đọc và phân tích file JSON.
- Đọc file text/game.
- Nhận diện và bỏ qua một số dữ liệu không cần dịch.
- Giữ nguyên các code đặc biệt trong text.
- Xuất file đã dịch với hậu tố `_vi`.

### 📌 Ghi chú
- Phiên bản này tập trung hoàn thiện giao diện và hệ thống dịch thủ công.
- Tính năng dịch tự động sẽ được phát triển ở phiên bản tiếp theo.
---

## v0.2.0 - 30/08/2026

🎉 Cải tiến hệ thống dịch.

### Thêm mới

- Hỗ trợ đọc JSON RPG Maker.
- Tự động tìm các đoạn text có thể dịch.
- Hiển thị văn bản gốc và ô nhập bản dịch.
- Giữ nguyên cấu trúc JSON.
- Giữ nguyên các giá trị không phải text.
- Xuất file sau khi dịch.
- Hỗ trợ thêm TXT, RPY, KS, JS, XML cơ bản.
- Cải thiện giao diện dịch trên điện thoại.

---

# v0.1.0 - 05/08/2026

🎉 Phát hành phiên bản đầu tiên.

## Thêm mới
- Tạo repository GitHub.
- Triển khai website bằng GitHub Pages.
- Thêm giao diện HTML.
- Thêm CSS.
- Thêm JavaScript.
- Cho phép chọn tệp.
- Đọc nội dung tệp.
- Hiển thị nội dung tệp.

## Đang phát triển
- Đọc JSON của RPG Maker.
- Hỗ trợ dịch game.
