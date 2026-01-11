
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  avatar?: string;
  location?: string;
  organization?: string;
  bio?: string;
  createdAt?: string;
}

export interface DonationItem {
  id: string;
  title: string;
  description: string;
  image: string;
  video?: string;
  quantity: number;
  category: string;
  condition: 'new' | 'good' | 'used';
  contact: string;
  location: string;
  author: string;
  authorId: string;
  createdAt: string;
}

export interface AuctionItem {
  id: string;
  title: string;
  description: string;
  image: string;
  startingPrice: number;
  currentBid: number;
  highestBidderId?: string;
  highestBidderName?: string;
  endTime: string;
  missionId: string; 
  missionLocation: string;
  status: 'active' | 'ended';
  authorId: string;
  authorName: string;
  donorName: string;
  createdAt: string;
}

export interface Bid {
  id: string;
  auctionId: string;
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
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  likes: string[];
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
}

export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  itemId: string;
  itemTitle: string;
  donorId: string;
  donorName: string;
  receiverId: string;
  receiverName: string;
  participants: string[];
  lastMessage?: string;
  lastSenderId?: string;
  updatedAt: string;
}

export interface NeededItem {
  name: string;
  target: number;
  current: number;
  unit: string;
}

export interface Sponsor {
  name: string;
  logo: string;
}

export interface CharityMission {
  id: string;
  location: string;
  description: string;
  image: string;
  video?: string;
  date: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  itemsNeeded: NeededItem[];
  targetBudget: number;
  currentBudget: number; // Thêm: Số tiền hiện có đã nhận được
  targetHouseholds: number;
  sponsors?: Sponsor[];
  createdAt: string;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_KEY: string;
    }
  }
}

export {};
