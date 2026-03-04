
import { Sponsor } from './types';

export const CATEGORIES = [
  'Quần áo',
  'Đồ gia dụng',
  'Sách vở',
  'Điện tử',
  'Đồ chơi',
  'Khác'
];

export const MOCK_SPONSORS: Sponsor[] = [
  {
    id: 's1',
    name: 'Tập đoàn ABC',
    avatar: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=200&auto=format&fit=crop',
    type: 'organization',
    totalMoney: 500000000,
    totalItemsCount: 1500,
    message: 'Chung tay vì cộng đồng Việt Nam vững mạnh.',
    rank: 'gold',
    history: [
      { missionName: 'Cứu trợ Miền Trung 2024', amount: 300000000, items: '500 thùng mì tôm', date: '2024-10-15' },
      { missionName: 'Áo ấm vùng cao Hà Giang', amount: 200000000, items: '1000 áo phao mới', date: '2024-12-01' }
    ]
  },
  {
    id: 's2',
    name: 'Nguyễn Văn A',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    type: 'individual',
    totalMoney: 25000000,
    totalItemsCount: 1000,
    message: 'Hy vọng các em có điều kiện học tập tốt hơn.',
    rank: 'gold',
    history: [
      { missionName: 'Sách cũ cho em - Lào Cai', items: '1000 bộ sách giáo khoa', date: '2024-09-20' },
      { missionName: 'Quỹ học bổng GIVEBACK', amount: 25000000, date: '2024-11-10' }
    ]
  },
  {
    id: 's3',
    name: 'Quỹ Từ thiện Tâm An',
    avatar: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb8?q=80&w=200&auto=format&fit=crop',
    type: 'organization',
    totalMoney: 200000000,
    totalItemsCount: 200,
    message: 'Lan tỏa yêu thương đến mọi miền tổ quốc.',
    rank: 'silver',
    history: [
      { missionName: 'Xây cầu dân sinh Bến Tre', amount: 150000000, date: '2024-08-05' },
      { missionName: 'Nhu yếu phẩm vùng lũ', amount: 50000000, items: '200 túi thuốc y tế', date: '2024-10-18' }
    ]
  },
  {
    id: 's4',
    name: 'Trần Thị B',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
    type: 'individual',
    totalMoney: 10000000,
    totalItemsCount: 500,
    message: 'Ấm lòng ngày đông vùng biên giới.',
    rank: 'silver',
    history: [
      { missionName: 'Áo ấm vùng cao Hà Giang', items: '500 chiếc áo ấm', date: '2024-12-05' },
      { missionName: 'Bữa cơm 0 đồng', amount: 10000000, date: '2024-11-25' }
    ]
  }
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
  }
];
