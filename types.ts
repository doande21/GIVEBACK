
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
}

export interface PostMedia {
  url: string;
  type: 'image' | 'video';
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
  status: 'available' | 'claimed' | 'hidden';
  createdAt: string;
  // Các trường AI quét tự động (Smart Metadata)
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
  text: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  type: 'direct' | 'group';
  participants: string[];
  donorId: string;
  donorName: string;
  receiverId: string;
  receiverName: string;
  itemId?: string;
  itemTitle?: string;
  itemImage?: string;
  giftStatus?: 'pending' | 'completed' | 'negotiating';
  lastMessage?: string;
  lastSenderId?: string;
  updatedAt: string;
  readBy?: string[];
  // Added missing properties for group chat support
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

// Added missing interface for Sponsor as used in constants.ts and Sponsors.tsx
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

// Added missing interface for Contribution as used in Sponsor history
export interface Contribution {
  missionName: string;
  amount?: number;
  items?: string;
  date: string;
}

// Added missing interface for NeededItem as used in CharityMission
export interface NeededItem {
  name: string;
  target: number;
  unit: string;
  current: number;
}

// Added missing interface for CharityMission as used in Admin.tsx
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
}

// Added missing interface for AuctionItem as used in Auction.tsx and Admin.tsx
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

// Added missing interface for Bid as used in Auction.tsx
export interface Bid {
  bidderId: string;
  bidderName: string;
  amount: number;
  timestamp: string;
}

// Added missing interface for SocialPost as used in Admin.tsx and Profile.tsx
export interface SocialPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  media?: PostMedia[];
  mediaUrl?: string; // Support for legacy fields
  mediaType?: 'image' | 'video'; // Support for legacy fields
  createdAt: string;
}

// Added missing interface for FriendRequest as used in Profile.tsx and Notifications.tsx
export interface FriendRequest {
  id: string;
  fromId: string;
  fromName: string;
  fromAvatar: string;
  toId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}
