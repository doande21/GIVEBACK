<<<<<<< HEAD

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
=======
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
>>>>>>> 80f8758a99c2b38f1b4a8af22ba14dc416cb3960
