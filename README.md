
# 🌟 GIVEBACK - Nền Tảng Chia Sẻ Yêu Thương 🎁

![GIVEBACK Banner](https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=2070&auto=format&fit=crop)

## 📖 1. Giới Thiệu Tổng Quan
**GIVEBACK** là một hệ sinh thái thiện nguyện số hóa, được thiết kế để kết nối cộng đồng thông qua tinh thần "Cho đi là còn mãi". Thay vì để những món đồ cũ bị lãng phí, GIVEBACK tạo ra một thị trường nhân ái giúp mọi người dễ dàng tặng lại đồ dùng cho những ai thực sự cần, đồng thời quyên góp cho các chiến dịch cứu trợ vùng cao một cách minh bạch.

> **Slogan:** *"Mỗi chuyến đi, một hành trình nhân ái."*

---

## ✨ 2. Các Tính Năng Đột Phá
Dự án được tích hợp các công nghệ hiện đại nhất để tối ưu hóa trải nghiệm người dùng:

### 📸 AI Vision Scanning (Gemini 3 Flash)
- **Tự động nhận diện:** Đệ chỉ cần tải ảnh lên, AI sẽ tự động phân tích tên món đồ, độ tuổi phù hợp (cho quần áo), tác giả (cho sách) và thể loại.
- **Gợi ý thông minh:** Tự động điền thông tin giúp việc đăng tặng diễn ra chỉ trong vài giây.

### 🗺️ GIVEBACK Maps Grounding
- Tìm kiếm các địa điểm thiện nguyện quanh khu vực (quán cơm 2k, mái ấm, thùng bánh mì 0đ) bằng dữ liệu Google Maps thời gian thực.

### 💬 Hệ Thống Chat Real-time & An Toàn
- **Xác nhận tặng quà:** Người tặng có quyền xác nhận "Đã trao" ngay trong khung chat để cập nhật trạng thái món quà.
- **Guest Identity:** Hệ thống minh bạch hóa tài khoản dùng thử (Guest) bằng các banner cảnh báo và nhãn nhận diện để bảo vệ cộng đồng.

### 🔨 Auction For Charity (Admin Manager)
- Admin có thể đưa các vật phẩm giá trị lên sàn đấu giá gây quỹ. Toàn bộ lịch sử đặt giá được lưu trữ minh bạch.

### 🎙️ AI Voice Companion (Live API)
- Trợ lý AI có thể trò chuyện bằng giọng nói chân thực để giải đáp các thắc mắc về thiện nguyện.

---

## 🛠️ 3. Kiến Trúc Công Nghệ
- **Frontend:** React 19 (Modern Hooks), Tailwind CSS (JIT Engine).
- **Backend-as-a-Service:** Firebase (Authentication, Cloud Firestore Real-time).
- **AI Brain:** Google Gemini API (Model: gemini-3-flash-preview & gemini-2.5-flash-native-audio).
- **Deployment:** Vercel / Google Cloud.

---

## 📂 4. Cấu Trúc Thư Mục
```bash
src/
├── components/          # Các thành phần UI tái sử dụng (Navbar, AIHelper, Card...)
├── pages/               # Các trang chính (Home, Marketplace, Auction, Messages...)
├── services/            # Kết nối API (Firebase, Gemini AI)
├── types.ts             # Định nghĩa kiểu dữ liệu (Interface) cho toàn bộ dự án
└── constants.ts         # Lưu trữ các dữ liệu tĩnh, danh mục
```

---

## 🚀 5. Hướng Dẫn Cài Đặt & Chạy Thử
1. **Clone project:** `git clone [link-repo]`
2. **Install dependencies:** `npm install`
3. **Cấu hình biến môi trường:** Tạo file `.env` với:
   - `API_KEY`: Google AI Studio Key.
4. **Run dev:** `npm run dev`

---

## 🛡️ 6. Tầm Nhìn Phát Triển
GIVEBACK hướng tới việc trở thành một mạng xã hội thiện nguyện hàng đầu Việt Nam, tích hợp thêm các tính năng như:
- Theo dõi hành trình chuyến xe cứu trợ qua GPS.
- Hệ thống tích điểm "Hạt giống yêu thương" để đổi các voucher xanh.
- Kết nối trực tiếp với các đơn vị vận chuyển để hỗ trợ phí ship cho người nghèo.

---
❤️ *Dự án được thực hiện với tâm huyết dành cho cộng đồng Việt.*
**Author:** Đệ (de2104) & Senior Engineer Support.
