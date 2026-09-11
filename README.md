# Task Manager - Quản lý công việc cá nhân

Một webapp quản lý công việc cá nhân sử dụng Google Apps Script và Google Sheets, với giao diện responsive và đầy đủ tính năng.

## 📋 Tính năng chính

### 📅 Calendar View (Giao diện Lịch)
- Xem tất cả công việc theo ngày
- Nhấp vào ngày để tạo nhanh việc
- Kéo thả công việc để đổi hạn chót
- Lọc theo ngày (Hôm nay, Tuần này, Tháng này)
- Lọc theo trạng thái
- Màu sắc theo mức độ khẩn cấp và trạng thái
- Cảnh báo quá hạn (pulsing animation)
- Chuyển tháng qua nút mũi tên
- Nút "Hôm nay" để quay về ngày hiện tại

### 📋 Kanban View (Giao diện Kanban)
- 4 cột: Chưa bắt đầu, Đang làm, Hoàn thành, Cancel
- Kéo thả công việc giữa các cột
- Tự động ghi nhận thời gian hoàn thành (Completed At)
- Bộ lọc nhanh theo trạng thái, mức độ, loại
- Hiển thị thông tin chi tiết trên mỗi thẻ
- Sửa và xóa công việc trực tiếp

### 📊 Statistics View (Giao diện Thống kê)
- Thống kê tổng quan: Tổng công việc, Hoàn thành, Đang làm, Chưa bắt đầu
- Phân tích theo mức độ khẩn cấp (biểu đồ bar)
- Phân tích theo loại công việc (biểu đồ bar)
- Tính phần trăm hoàn thành
- Lọc theo khoảng thời gian (từ ngày đến ngày)
- Xuất file Excel với dữ liệu đã lọc

### ✨ Tính năng khác
- Thêm, sửa, xóa công việc dễ dàng
- Mức độ khẩn cấp: Khẩn cấp, Cao, Thường, Thấp
- **Loại công việc: Có thể thêm, sửa, xóa loại mới** (tự động lưu vào Google Sheet)
- Database tự động tạo trong Google Sheets
- Giao diện responsive cho mobile và desktop
- Toast notifications
- Modal forms

## 🚀 Cách cài đặt

### Bước 1: Tạo Google Sheet mới
1. Truy cập [Google Sheets](https://sheets.google.com/)
2. Tạo một Google Sheet mới
3. Đặt tên cho sheet (ví dụ: "Task Manager")

### Bước 2: Mở Google Apps Script
1. Trong Google Sheet, chọn menu **Extensions** > **Apps Script**
2. Một tab mới sẽ mở ra với editor

### Bước 3: Tạo file Code.gs
1. Trong editor, click vào **+** (nếu chưa có file) hoặc tạo file mới
2. Đặt tên file là `Code.gs`
3. Copy toàn bộ nội dung từ file `Code.gs` trong thư mục này
4. Paste vào editor và lưu (Ctrl+S hoặc click nút Save)

### Bước 4: Tạo file index.html
1. Click vào **+** để tạo file mới
2. Đặt tên file là `index.html`
3. Copy toàn bộ nội dung từ file `index.html` trong thư mục này
4. Paste vào editor và lưu

### Bước 5: Deploy webapp
1. Click vào menu **Deploy** > **New deployment**
2. Chọn type: **Web app**
3. Cấu hình:
   - **Description**: Task Manager
   - **Execute as**: Me
   - **Who has access**: Anyone (hoặc Anyone within [your organization] nếu bạn dùng Google Workspace)
4. Click **Deploy**
5. Copy URL webapp được tạo (bắt đầu bằng `https://script.google.com/...`)

### Bước 6: Sử dụng
1. Mở URL webapp vừa tạo
2. Bắt đầu quản lý công việc của bạn!

## 📊 Cấu trúc Database (Google Sheets)

Sheet "Tasks" sẽ tự động được tạo với các cột:

| ID | Title | Description | Status | Priority | Category | DueDate | CompletedAt | CreatedAt | UpdatedAt |
|----|-------|-------------|--------|----------|----------|---------|-------------|-----------|-----------|
| UUID | Tiêu đề | Mô tả | Not Started/In Progress/Completed/Cancel | Urgent/High/Normal/Low | Work/Personal/Family/Project | YYYY-MM-DD | YYYY-MM-DD HH:MM:SS | YYYY-MM-DD HH:MM:SS | YYYY-MM-DD HH:MM:SS |

Ba sheet phụ cũng tự động được tạo khi cần:
- **Subtasks**: `ID | TaskID | Title | Completed | CreatedAt | UpdatedAt`
- **Templates**: `ID | Name | Title | Description | Priority | Category`
- **Categories**: `Category | Color` (đã có từ trước)

Cài đặt nhắc nhở email (bật/tắt, số ngày nhắc trước) được lưu trong Script Properties của Apps Script, không nằm trong Sheet.

## 🎨 Giao diện

### Màu sắc theo mức độ khẩn cấp
- **Khẩn cấp (Urgent)**: Đỏ (#e74c3c)
- **Cao (High)**: Cam (#e67e22)
- **Thường (Normal)**: Xanh dương (#3498db)
- **Thấp (Low)**: Xanh lá (#2ecc71)

### Màu sắc theo trạng thái
- **Chưa bắt đầu (Not Started)**: Tím (#9b59b6)
- **Đang làm (In Progress)**: Vàng cam (#f39c12)
- **Hoàn thành (Completed)**: Xanh lá (#2ecc71)
- **Cancel**: Xám (#95a5a6)

## 📱 Responsive Design

Webapp hỗ trợ:
- Desktop: 4 cột Kanban, full calendar
- Tablet: 2 cột Kanban, calendar compact
- Mobile: 1 cột Kanban, calendar stacked

## 🔧 Tùy chỉnh

### Thay đổi màu sắc
Chỉnh sửa trong file `index.html`:
- Màu gradient header: `background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);`
- Màu các trạng thái và mức độ trong CSS

### Thay đổi ngôn ngữ
Chỉnh sửa text trong file `index.html`:
- Tất cả text hiện tại là tiếng Việt
- Thay đổi theo ngôn ngữ mong muốn

### Thêm cột mới
1. Thêm cột vào mảng `COLUMNS` trong file `Code.gs`
2. Cập nhật logic trong các hàm `getTasks`, `addTask`, `updateTask`
3. Cập nhật UI trong file `index.html`

## 📝 Cập nhật

### Cập nhật Code.gs
1. Mở Google Apps Script editor
2. Chỉnh sửa file `Code.gs`
3. Lưu (Ctrl+S)
4. Deploy lại webapp (Deploy > New deployment)

### Cập nhật index.html
1. Mở file `index.html` trong editor
2. Chỉnh sửa
3. Lưu (Ctrl+S)
4. Deploy lại webapp

## ⚠️ Lưu ý

- Webapp cần kết nối internet để hoạt động
- Google Sheets sẽ tự động tạo sheet "Tasks" khi bạn chạy lần đầu
- Completed At sẽ tự động ghi nhận khi kéo thả vào cột "Hoàn thành"
- Overdue warning chỉ hiển thị khi có công việc quá hạn

## 🐛 Troubleshooting

### Webapp không hiển thị
- Kiểm tra URL đã copy đúng chưa
- Kiểm tra quyền truy cập (Anyone hoặc Anyone within organization)
- Refresh trang

### Không thể thêm công việc
- Kiểm tra Google Sheet có đang mở không
- Kiểm tra quyền truy cập Google Sheets

### Lỗi drag and drop
- Kiểm tra trình duyệt hỗ trợ HTML5 drag and drop
- Thử lại trên trình duyệt khác

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy:
1. Kiểm tra console (F12) để xem lỗi
2. Xem lại các bước cài đặt
3. Đảm bảo đã deploy webapp thành công

## 🆕 Tính năng mới

- **Reminder notifications**: Thông báo trình duyệt (khi tab đang mở) + email nhắc nhở hàng ngày qua Google Apps Script trigger (cấu hình trong nút "Nhắc nhở" trên header).
- **Subtasks**: Thêm công việc con bên trong mỗi task, theo dõi tiến độ (x/y hoàn thành), hiển thị badge trên thẻ Kanban.
- **Search functionality**: Ô tìm kiếm trên header, lọc theo tiêu đề/mô tả, không phân biệt dấu tiếng Việt.
- **Task templates**: Lưu một công việc thành mẫu ("Lưu thành mẫu" trong form), tái sử dụng khi tạo việc mới, quản lý trong nút "Mẫu".
- **Statistics and reports**: Thêm thẻ "Quá hạn"/"Đã hủy" và biểu đồ xu hướng hoàn thành theo tuần.

## 🎯 Tương lai

Các tính năng có thể thêm:
- [ ] Export to CSV
- [ ] Dark mode
- [ ] Multiple users support
- [ ] Recurring tasks

---

**Made with ❤️ using Google Apps Script**