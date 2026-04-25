export interface Pharmacy {
  id: string;
  name: string;
  neighborhood: string;
  lat: number;
  lng: number;
  status: 'certified' | 'pending';
  phone: string;
  address: string;
  rating: number;
}

export interface Medication {
  id: string;
  name: string;
  molecule: string;
  standardPrice: number;
  category: string;
  description: string;
  imageUrl?: string;
}

export interface Stock {
  id: string;
  pharmacyId: string;
  medicationId: string;
  quantity: number;
  price: number;
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'user' | 'admin' | 'pharmacist';
}

export interface Order {
  id: string;
  userId: string;
  pharmacyId: string;
  pharmacyName: string;
  pharmacyPhone: string;
  items: {
    medicationId: string;
    name: string;
    quantity: number;
    price: number;
    imageUrl?: string;
  }[];
  total: number;
  status: 'pending' | 'paid' | 'delivered' | 'cancelled';
  deliveryType: 'pickup' | 'delivery';
  createdAt: any;
}

export interface Review {
  id: string;
  pharmacyId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export interface ChatThread {
  id: string;
  pharmacyId: string;
  pharmacyName: string;
  userId: string;
  userName: string;
  lastMessage: string;
  lastMessageTime: any;
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: any;
}
