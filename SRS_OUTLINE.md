
# 📄 TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS) - GIVEBACK

## 1. Giới thiệu (Introduction)
### 1.1 Mục đích
Tài liệu này đặc tả các yêu cầu chức năng và phi chức năng cho nền tảng GIVEBACK, giúp đội ngũ phát triển và các bên liên quan thống nhất về tầm nhìn dự án.

### 1.2 Phạm vi hệ thống (System Scope)
**Hệ thống BAO GỒM:**
- Nền tảng Web responsive hỗ trợ đa thiết bị.
- Chức năng Marketplace: Đăng tặng, tìm kiếm đồ cũ có hỗ trợ bởi AI Vision (Gemini 3 Flash).
- Chức năng Bản tin: Chia sẻ khoảnh khắc, kết nối đồng đội, tương tác xã hội.
- Chức năng Chat: Trao đổi thời gian thực, xác nhận trạng thái tặng quà.
- Chức năng Bản đồ: Tìm địa điểm từ thiện thực tế qua AI Maps Grounding.
- Chức năng Quản trị: Quản lý sứ mệnh cứu trợ, đấu giá gây quỹ, kiểm duyệt nội dung.
- Chức năng Trợ lý: Hỗ trợ giọng nói/văn bản qua AI Live API.

**Hệ thống KHÔNG BAO GỒM:**
- Dịch vụ vận chuyển hàng hóa tận nơi (Logistics).
- Cổng thanh toán trực tuyến (Payment Gateway). Các giao dịch tài chính thực hiện qua QR ngân hàng thủ công.

## 2. Mô tả tổng quan (Overall Description)
- Mô hình hoạt động: Charity Marketplace kết hợp Mạng xã hội.
- Đặc tính người dùng: Cá nhân hảo tâm, Tổ chức thiện nguyện, Quản trị viên dự án.

## 3. Danh sách User Stories (≥12 Stories)

| ID | Vai trò | User Story | Tiêu chí chấp nhận (Acceptance Criteria) |
| :-- | :--- | :--- | :--- |
| **US01** | Người dùng | Tôi muốn đăng nhập qua mạng xã hội | Hệ thống hỗ trợ Google/Facebook Auth thành công. |
| **US02** | Người tặng | Tôi muốn AI tự động điền thông tin quà tặng từ ảnh | AI nhận diện đúng danh mục và đề xuất tiêu đề bài viết. |
| **US03** | Người nhận | Tôi muốn lọc đồ tặng theo độ tuổi và cân nặng | Kết quả trả về đúng các món đồ quần áo phù hợp tiêu chí. |
| **US04** | Người nhận | Tôi muốn chat trực tiếp với người tặng | Tin nhắn được gửi và nhận theo thời gian thực (Real-time). |
| **US05** | Người tặng | Tôi muốn xác nhận "Đã tặng quà" trong khi chat | Trạng thái món đồ chuyển sang "Claimed" và ẩn khỏi sàn. |
| **US06** | Thành viên | Tôi muốn chia sẻ hoạt động thiện nguyện lên Bản tin | Bài đăng hiển thị đầy đủ ảnh/video và nội dung mô tả. |
| **US07** | Người thiện nguyện | Tôi muốn tìm quán cơm 2k bằng AI Maps | Bản đồ hiển thị chính xác vị trí và có link dẫn đường. |
| **US08** | Nhà hảo tâm | Tôi muốn xem bảng vinh danh các cấp bậc | Hiển thị đúng thứ hạng dựa trên tổng đóng góp tài chính/đồ. |
| **US09** | Thành viên | Tôi muốn kết nối đồng đội (Kết bạn) | Người kia nhận được thông báo và có thể chấp nhận/từ chối. |
| **US10** | Quản trị viên | Tôi muốn tạo Sứ mệnh cứu trợ (Mission) | Mission hiển thị thanh tiến độ quyên góp thực tế. |
| **US11** | Quản trị viên | Tôi muốn tổ chức đấu giá vật phẩm gây quỹ | Hệ thống ghi nhận các lượt trả giá (Bids) công khai. |
| **US12** | Quản trị viên | Tôi muốn kiểm duyệt nội dung cộng đồng | Admin có quyền gỡ bài viết/món đồ vi phạm tiêu chuẩn. |

## 4. Yêu cầu phi chức năng (Non-functional Requirements)
- **Tính sẵn sàng:** Hệ thống hoạt động 24/7 trên Vercel/Firebase.
- **Hiệu năng:** Tốc độ tải trang < 2s, phản hồi AI < 3s.
- **Bảo mật:** Dữ liệu người dùng được mã hóa và bảo mật qua Firebase Rules.
