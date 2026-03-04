
# 📊 Cấu trúc Dữ liệu GIVEBACK (Firestore NoSQL)

Tài liệu này đặc tả cấu trúc các bộ sưu tập (Collections) và mối quan hệ giữa chúng trong hệ thống Firebase Firestore.

## 1. Mối quan hệ giữa các thực thể (Entity Relationships)

Mặc dù Firestore là NoSQL, các mối quan hệ được thiết lập thông qua việc lưu trữ ID tham chiếu (References):

- **Users ↔ Items (1:N)**: Một người dùng có thể đăng nhiều món đồ tặng.
- **Users ↔ SocialPosts (1:N)**: Một người dùng có thể đăng nhiều bài viết trên bản tin.
- **Items ↔ Chats (1:1)**: Một món đồ là trung tâm của một cuộc hội thoại xin quà.
- **Chats ↔ Messages (1:N)**: Một cuộc hội thoại chứa nhiều tin nhắn chi tiết (Sub-collection).
- **Users ↔ Users (N:N)**: Quan hệ bạn bè (được lưu bằng mảng `friends` chứa các `userId`).

---

## 2. Chi tiết các Collections

### 📂 Collection: `users`
| Trường | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | String (PK) | ID duy nhất từ Firebase Auth |
| `name` | String | Họ và tên người dùng |
| `role` | String | `user` hoặc `admin` |
| `friends` | Array<String> | Danh sách ID những người đã kết bạn |
| `userType` | String | `individual` hoặc `organization` |

### 📂 Collection: `items`
| Trường | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | String (PK) | ID tự động |
| `authorId` | String (FK) | Tham chiếu tới `users.id` |
| `title` | String | Tên món đồ |
| `status` | String | `available` (sẵn sàng), `claimed` (đã tặng) |
| `category` | String | Phân loại (Quần áo, Sách,...) |

### 📂 Collection: `chats`
| Trường | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | String (PK) | Thường là nối ID: `chat_user1_user2` |
| `participants`| Array<String> | ID của 2 người đang chat |
| `itemId` | String (FK) | Tham chiếu tới món đồ đang giao dịch |
| `giftStatus` | String | Trạng thái trao quà (negotiating, completed) |

### 📂 Collection: `social_posts`
| Trường | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | String (PK) | ID bài viết |
| `authorId` | String (FK) | Người đăng bài |
| `hearts` | Array<String> | Danh sách ID những người đã thả tim |

---

## 3. Hướng dẫn vẽ sơ đồ cho SRS
Đệ nên sử dụng kiểu vẽ **Physical Data Model** dành cho NoSQL:
1. Vẽ các hình chữ nhật đại diện cho từng Collection.
2. Liệt kê các trường quan trọng nhất.
3. Sử dụng mũi tên một chiều từ trường chứa ID tham chiếu đến Collection gốc.
4. Đối với quan hệ **Chat - Messages**, hãy vẽ một hộp nằm bên trong hộp khác để thể hiện **Sub-collection**.
    