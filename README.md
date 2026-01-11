# 🌟 GIVEBACK - Nền tảng chia sẻ yêu thương

![GIVEBACK Banner](https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=2070&auto=format&fit=crop)

## 📖 Giới thiệu
**GIVEBACK** là một nền tảng diễn đàn hiện đại giúp kết nối những người muốn tặng đồ dùng cũ với những người đang cần. Dự án được xây dựng với tinh thần **tự nguyện 100%**, hướng tới một cộng đồng bền vững và nhân ái.

> "Hạnh phúc không phải là khi bạn nhận được, mà là khi bạn biết cho đi."

## ✨ Tính năng nổi bật
- 📸 **AI Vision**: Tự động nhận diện món đồ qua hình ảnh và gợi ý thông tin bài đăng (Sử dụng Gemini 3 Flash).
- 🔍 **Tìm kiếm thông minh**: Lọc món đồ theo danh mục và từ khóa thời gian thực với hiệu ứng mượt mà.
- 💬 **Hệ thống Chat**: Trao đổi trực tiếp giữa người tặng và người nhận qua Firebase Realtime updates.
- 🔨 **Đấu giá Gây quỹ**: Tổ chức đấu giá các món đồ giá trị để lấy kinh phí cho các chuyến cứu trợ vùng xa.
- 🗺️ **GIVEBACK Maps**: Tìm kiếm các địa điểm từ thiện, mái ấm xung quanh bằng sức mạnh của AI.
- 🛡️ **Bảng điều khiển Admin**: Giám sát cứu trợ, quản lý bài đăng và theo dõi các phiên chat cộng đồng.

## 🛠️ Công nghệ sử dụng
- **Frontend**: React 19, TypeScript, Tailwind CSS.
- **Backend**: Firebase (Authentication, Firestore Database).
- **AI**: Google Gemini API (Phân tích hình ảnh, Gợi ý nội dung, Live Voice).
- **Bundler**: Vite.

## 🚀 Hướng dẫn đẩy code lên GitHub (Dành cho Đệ)

Nếu Đệ muốn đẩy dự án này lên tài khoản GitHub cá nhân, hãy chạy các lệnh sau trong Terminal:

```bash
# Khởi tạo và commit
git init
git add .
git commit -m "feat: Khởi tạo dự án GIVEBACK"

# Kết nối với Repo (Thay 'USERNAME' bằng tên GitHub của Đệ)
git branch -M main
git remote add origin https://github.com/doande21/GIVEBACK.git
git push -u origin main
```

## 🌐 Triển khai (Deployment)

Dự án có thể dễ dàng triển khai lên **Vercel** hoặc **Netlify**:

1. Kết nối tài khoản GitHub với Vercel.
2. Chọn Repository `GIVEBACK`.
3. **Quan trọng:** Thêm biến môi trường (Environment Variable) tên là `API_KEY` với giá trị là Gemini API Key của Đệ.
4. Nhấn **Deploy**.

## 🤝 Liên hệ & Đóng góp
Dự án được khởi xướng bởi **Đệ (doande21)**. Mọi ý tưởng đóng góp về tính năng hay hợp tác thiện nguyện xin vui lòng liên hệ qua:
- **Email**: admin@giveback.vn
- **GitHub**: [@doande21](https://github.com/doande21)

---
❤️ *Mang yêu thương đi xa hơn cùng GIVEBACK.*