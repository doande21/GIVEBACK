
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  avatar?: string;
  location?: string;
  organization?: string;
  bio?: string;
  friends?: string[];
  createdAt?: string;
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

export interface PostComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  createdAt: string;
}

export interface PostMedia {
  url: string;
  type: 'image' | 'video';
}

export interface SocialPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  media?: PostMedia[];
  mediaUrl?: string; 
  mediaType?: 'image' | 'video';
  likes: string[]; 
  hearts?: string[]; 
  thanks?: string[]; 
  comments?: PostComment[];
  sharesCount: number;
  createdAt: string;
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

export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  type: 'direct' | 'group';
  groupName?: string;
  groupAdminId?: string;
  itemId?: string;
  itemTitle?: string;
  donorId?: string;
  donorName?: string;
  receiverId?: string;
  receiverName?: string;
  participants: string[];
  lastMessage?: string;
  lastSenderId?: string;
  updatedAt: string;
  readBy?: string[];
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
  missionLocation: string;
  status: 'active' | 'ended';
  authorId: string;
  authorName: string;
  donorName: string;
  createdAt: string;
}

export interface NeededItem {
  name: string;
  target: number;
  current: number;
  unit: string;
}

export interface CharityMission {
  id: string;
  location: string;
  description: string;
  image: string;
  date: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  itemsNeeded: NeededItem[];
  targetBudget: number;
  currentBudget: number;
  targetHouseholds?: number;
  createdAt: string;
}

export interface Bid {
  bidderId: string;
  bidderName: string;
  amount: number;
  timestamp: string;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_KEY: string;
    }
  }
}

export {};
