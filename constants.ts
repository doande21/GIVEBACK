
export const CATEGORIES = [
  'Quần áo',
  'Đồ gia dụng',
  'Sách vở',
  'Điện tử',
  'Đồ chơi',
  'Khác'
];

export const MOCK_ITEMS = [
  {
    id: '1',
    title: 'Bộ sách giáo khoa lớp 10',
    description: 'Sách còn rất mới, mình muốn tặng lại cho bạn nào khó khăn.',
    image: 'https://picsum.photos/seed/books/400/300',
    quantity: 1,
    category: 'Sách vở',
    condition: 'good',
    contact: '0901234567',
    location: 'Quận 1, TP.HCM',
    author: 'Minh Anh',
    createdAt: '2023-10-25'
  },
  {
    id: '2',
    title: 'Nồi cơm điện cũ',
    description: 'Vẫn dùng tốt, nhà mình mới mua nồi mới nên dư ra.',
    image: 'https://picsum.photos/seed/cooker/400/300',
    quantity: 1,
    category: 'Đồ gia dụng',
    condition: 'used',
    contact: '0912345678',
    location: 'Hà Nội',
    author: 'Quốc Bảo',
    createdAt: '2023-10-24'
  }
];

export const MOCK_MISSIONS = [
  {
    id: 'm1',
    location: 'Lào Cai - Hỗ trợ bão lũ',
    description: 'Chuyến cứu trợ các hộ gia đình bị ảnh hưởng nặng nề sau cơn bão số 4.',
    date: '2024-11-15',
    status: 'upcoming',
    targetAmount: 50000000,
    currentAmount: 12500000
  },
  {
    id: 'm2',
    location: 'Mù Cang Chải - Áo ấm cho em',
    description: 'Tặng quần áo ấm và đồ dùng học tập cho trẻ em vùng cao.',
    date: '2024-12-01',
    status: 'upcoming',
    targetAmount: 30000000,
    currentAmount: 5000000
  }
];
