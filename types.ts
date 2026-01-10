
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
  date: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  itemsNeeded: NeededItem[];
  targetHouseholds: number;
  sponsors?: Sponsor[];
  createdAt: string;
}
