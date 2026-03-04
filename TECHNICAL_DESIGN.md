
# 📐 THIẾT KẾ KỸ THUẬT DỰ ÁN GIVEBACK

## 1. Kiến trúc hệ thống (System Architecture)
Hệ thống sử dụng mô hình **Serverless - AI Integrated**:
- **Frontend:** ReactJS 19 (Component-based), Tailwind CSS.
- **Backend Service:** Firebase (Auth, Firestore, Hosting).
- **AI Engine:** Google Gemini (Dòng 3 cho Vision, Dòng 2.5 cho Audio/Maps).
- **External API:** Google Maps Grounding.

## 2. Đặc tả chi tiết 10 Thực thể (ERD Data Dictionary)

1.  **Users:** `id`, `name`, `email`, `role` (admin/user), `userType` (individual/org), `avatar`, `friends` (Array IDs).
2.  **Items:** `id`, `authorId` (FK), `categoryId` (FK), `title`, `description`, `image`, `status` (available/claimed/hidden).
3.  **Categories:** `id`, `name` (Quần áo, Sách vở, Đồ gia dụng, Điện tử, Đồ chơi).
4.  **SocialPosts:** `id`, `authorId` (FK), `content`, `mediaUrl`, `createdAt`.
5.  **PostHearts:** `postId` (FK), `userId` (FK). (Dùng để đếm lượt yêu thích).
6.  **PostComments:** `id`, `postId` (FK), `authorId` (FK), `text`, `createdAt`.
7.  **ChatSessions:** `id`, `itemId` (FK), `donorId` (FK), `receiverId` (FK), `lastMessage`, `updatedAt`.
8.  **Messages:** `id`, `sessionId` (FK), `senderId` (FK), `text`, `mediaUrl`, `createdAt`.
9.  **CharityMissions:** `id`, `location`, `description`, `targetBudget`, `currentBudget`, `image`, `qrCode`.
10. **Sponsors:** `id`, `name`, `totalMoney`, `totalItemsCount`, `rank` (gold/silver/bronze), `message`.

## 3. Sơ đồ trạng thái vật phẩm (Item Lifecycle)
- **Khởi tạo:** User upload ảnh -> AI Vision phân tích -> Trạng thái: `Available`.
- **Tương tác:** Receiver nhấn chat -> Tạo ChatSession -> Trạng thái: `Negotiating`.
- **Kết thúc:** Donor nhấn "Confirm Gift" -> Trạng thái: `Claimed` (Ẩn khỏi Marketplace).
- **Kiểm duyệt:** Admin phát hiện vi phạm -> Trạng thái: `Hidden`.

## 4. Công nghệ AI tích hợp
- **Gemini 3 Flash:** Tự động gắn Tag (minAge, bookAuthor...) từ ảnh chụp.
- **Gemini 2.5 Flash:** Thực hiện Maps Grounding tìm địa điểm quán cơm 2k.
- **Gemini Live API:** Trợ lý giọng nói hướng dẫn người dùng mới.
