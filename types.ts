
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  userType: 'individual' | 'organization';
  avatar?: string;
  location?: string;
  bio?: string;
  createdAt?: string;
  organizationName?: string;
  friends?: string[];
  isGuest?: boolean; // Thuộc tính mới để nhận diện tài khoản dùng thử
}

export interface PostMedia {
  url: string;
  type: 'image' | 'video';
}

// Fix: Added missing PostComment interface used in social posts
export interface PostComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  createdAt: string;
}

export interface DonationItem {
  id: string;
  title: string;
  description: string;
  image: string;
  gallery?: PostMedia[];
  quantity: number;
  category: string;
  condition: 'new' | 'good' | 'used';
  location: string;
  author: string;
  authorId: string;
  authorIsGuest?: boolean; // Gắn nhãn cho món đồ
  status: 'available' | 'claimed' | 'hidden';
  createdAt: string;
  minAge?: number;
  maxAge?: number;
  minWeight?: number;
  maxWeight?: number;
  minHeight?: number;
  maxHeight?: number;
  bookAuthor?: string;
  bookGenre?: string;
  toyType?: string;
  householdType?: string;
}

export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  senderIsGuest?: boolean; // Nhận diện người gửi tin nhắn
  text: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  type: 'direct' | 'group';
  participants: string[];
  donorId: string;
  donorName: string;
  donorIsGuest?: boolean;
  receiverId: string;
  receiverName: string;
  receiverIsGuest?: boolean;
  itemId?: string;
  itemTitle?: string;
  itemImage?: string;
  giftStatus?: 'pending' | 'completed' | 'negotiating';
  lastMessage?: string;
  lastSenderId?: string;
  updatedAt: string;
  readBy?: string[];
  groupName?: string;
  groupAdminId?: string;
}

export interface ClaimRecord {
  id: string;
  itemId: string;
  itemTitle: string;
  itemImage: string;
  donorId: string;
  donorName: string;
  receiverId: string;
  receiverName: string;
  createdAt: string;
}

export interface Sponsor {
  id: string;
  name: string;
  avatar?: string;
  type: 'individual' | 'organization';
  totalMoney: number;
  totalItemsCount: number;
  message: string;
  rank: 'gold' | 'silver' | 'bronze';
  history: Contribution[];
}

export interface Contribution {
  missionName: string;
  amount?: number;
  items?: string;
  date: string;
}

export interface NeededItem {
  name: string;
  target: number;
  unit: string;
  current: number;
}

export interface CharityMission {
  id: string;
  location: string;
  description: string;
  date: string;
  targetBudget: number;
  currentBudget: number;
  image: string;
  qrCode?: string;
  itemsNeeded: NeededItem[];
  status: 'upcoming' | 'ongoing' | 'completed';
  createdAt: string;
  updatedAt?: string;
  // Fix: Added missing targetHouseholds property used in mission overview
  targetHouseholds?: number;
}

export interface AuctionItem {
  id: string;
  title: string;
  description: string;
  startingPrice: number;
  currentBid: number;
  endTime: string;
  missionLocation: string;
  donorName: string;
  image: string;
  status: 'active' | 'ended';
  authorId: string;
  authorName: string;
  createdAt: string;
  highestBidderId?: string;
  highestBidderName?: string;
}

export interface Bid {
  bidderId: string;
  bidderName: string;
  amount: number;
  timestamp: string;
}

export interface SocialPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorIsGuest?: boolean;
  content: string;
  media?: PostMedia[];
  mediaUrl?: string; 
  mediaType?: 'image' | 'video'; 
  createdAt: string;
  // Fix: Added missing interaction and metadata properties to resolve errors in Home.tsx
  hearts?: string[];
  thanks?: string[];
  comments?: PostComment[];
  likes?: string[];
  sharesCount?: number;
}

export interface FriendRequest {
  id: string;
  fromId: string;
  fromName: string;
  fromAvatar: string;
  toId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}
