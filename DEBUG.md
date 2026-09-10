# Hướng dẫn Kiểm tra & Triển khai Task Manager

## 🔍 Tóm tắt các lỗi đã được sửa

1. **Lỗi tuần tự hóa Date của Google Apps Script (Nguyên nhân chính không hiển thị dữ liệu)**:
   - `google.script.run` không hỗ trợ truyền trực tiếp đối tượng JavaScript `Date`. `Code.gs` đã được sửa để chuyển đổi tất cả ngày tháng sang chuỗi (`yyyy-MM-dd` cho hạn chót, chuỗi ISO cho ngày tạo/cập nhật) trước khi gửi về giao diện.
2. **Lỗi `TypeError: toISOString` khi cập nhật công việc**:
   - `Code.gs` đã được sửa để nhận cả chuỗi string lẫn Date một cách an toàn mà không làm sập server.
3. **Lỗi lệch ngày do múi giờ (Timezone Shift)**:
   - Thay thế việc dùng `.toISOString().split('T')[0]` bằng hàm định dạng theo giờ địa phương (`formatDateToYYYYMMDD`), khắc phục việc các công việc trong Lịch bị lùi 1 ngày so với Google Sheet.
4. **Lỗi Kéo & Thả (Drag & Drop) trong Calendar**:
   - Tách riêng hàm `handleCalendarDrop` để cập nhật chính xác `dueDate`, không còn ghi đè làm sai lệch `status` của công việc.
5. **Đồng bộ hóa dữ liệu khi Lưu (`saveTask`)**:
   - Sử dụng `async/await` và hiệu ứng "Đang lưu...", đảm bảo Google Sheet ghi nhận dữ liệu xong mới tải lại danh sách.
6. **Bổ sung xử lý lỗi (`withFailureHandler`) & Nút Đồng bộ**:
   - Tất cả các thao tác đều có thông báo lỗi chi tiết khi gặp sự cố, kèm nút "Đồng bộ" trên header để làm mới dữ liệu từ Google Sheet bất cứ lúc nào.
7. **Tự động nhận diện dữ liệu nhập tay trên Google Sheet**:
   - Tự động tạo UUID nếu bạn nhập dòng mới trực tiếp trên Google Sheet mà chưa có ID. Bỏ qua các dòng trống hoàn toàn.

---

## 🚀 Các bước cập nhật lên Google Apps Script

Để áp dụng các bản sửa lỗi, bạn cần copy code mới vào Google Apps Script và triển khai (Deploy) lại:

### Bước 1: Mở Apps Script Editor
1. Mở file Google Sheet của bạn.
2. Chọn menu **Tiện ích mở rộng (Extensions)** > **Apps Script**.

### Bước 2: Cập nhật file Code.gs
1. Mở file `Code.gs` trong Apps Script editor.
2. Xóa toàn bộ nội dung cũ và copy toàn bộ nội dung từ file [Code.gs](file:///d:/project/task-manager/Code.gs) mới vào.
3. Nhấn **Ctrl + S** (hoặc nút Save) để lưu.

### Bước 3: Cập nhật file index.html
1. Mở file `index.html` trong Apps Script editor (nếu chưa có, nhấn nút **+** > **HTML** và đặt tên là `index`).
2. Xóa toàn bộ nội dung cũ và copy toàn bộ nội dung từ file [index.html](file:///d:/project/task-manager/index.html) mới vào.
3. Nhấn **Ctrl + S** để lưu.

### Bước 4: Deploy phiên bản mới (BẮT BUỘC)
> [!IMPORTANT]
> Google Apps Script chỉ cập nhật Web App khi bạn tạo một **New Deployment** hoặc chỉnh sửa Deployment hiện tại sang **New version**.

1. Nhấp vào nút **Deploy** (Góc trên bên phải) > chọn **Manage deployments**.
2. Chọn deployment hiện tại của bạn, nhấp vào biểu tượng chiếc bút (**Edit**).
3. Tại mục **Version**, chọn **New version** (Phiên bản mới).
4. Nhấp **Deploy**.
5. Mở URL Web App hoặc refresh lại tab Web App đang mở để kiểm tra kết quả!

---

## 📋 Kiểm tra sau khi cập nhật

1. **Hiển thị dữ liệu**: Khi mở trang, danh sách công việc từ sheet "Tasks" sẽ hiển thị đầy đủ trên cả Lịch (Calendar) và Kanban.
2. **Thêm việc mới**: Nhấn "Thêm việc mới", điền thông tin và bấm "Lưu". Việc mới sẽ xuất hiện ngay lập tức trên Kanban và Calendar.
3. **Kéo thả**:
   - Kéo thẻ giữa các cột Kanban để đổi trạng thái.
   - Kéo thẻ vào các ngày trên Calendar để đổi hạn chót.
4. **Bộ lọc & Thống kê**:
   - Thử lọc theo trạng thái trên Calendar và Kanban.
   - Chuyển sang tab Thống kê để xem tỷ lệ hoàn thành và biểu đồ phân bổ.