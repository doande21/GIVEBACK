
# 📘 Tài liệu chuyển đổi Hệ quản trị CSDL GIVEBACK

## 1. Tại sao chuyển từ Firebase sang SQL Server?
Dựa trên góp ý của Giảng viên, dự án GIVEBACK sẽ chuyển đổi sang SQL Server vì các lý do:
- **Tính toàn vẹn dữ liệu (Referential Integrity)**: Đảm bảo khi xóa một người dùng, các bài viết của họ cũng được xử lý sạch sẽ (Cascade Delete).
- **Truy vấn phức tạp**: SQL Server hỗ trợ JOIN nhiều bảng mạnh mẽ, giúp thống kê báo cáo tài chính từ thiện chính xác hơn.
- **Tính tuân thủ**: Phù hợp với các tiêu chuẩn lưu trữ dữ liệu truyền thống trong doanh nghiệp Việt Nam.

## 2. Kiến trúc đề xuất (3-Layer Architecture)
Để sử dụng SQL Server, hệ thống cần được cấu trúc lại như sau:
1.  **Frontend**: React (Hiện tại) - Gửi yêu cầu HTTP qua REST API.
2.  **Backend (Middleware)**: Node.js (Express) hoặc ASP.NET Core - Nhận yêu cầu, xử lý Logic và thực hiện câu lệnh SQL.
3.  **Database**: SQL Server - Lưu trữ dữ liệu vật lý.

## 3. Lộ trình thực hiện
- **Bước 1**: Triển khai Schema (trong file `database/schema.sql`) lên SQL Server.
- **Bước 2**: Viết API bằng Node.js sử dụng thư viện `mssql` hoặc `Sequelize (ORM)`.
- **Bước 3**: Thay thế các hàm gọi `firebase/firestore` trong Frontend bằng các hàm `fetch()` gọi đến API Backend.
