
import { User } from '../types';

export const apiService = {
  // Logic đăng nhập hệ thống Cloud Real-time
  login: async (username: string, password: string): Promise<User | null> => {
    // Tài khoản Admin mặc định cho đồ án
    if (username === 'de2104' && password === '21042005de') {
      return {
        id: 'ADMIN_001',
        name: 'Đệ Quản Trị',
        email: 'de2104@giveback.vn',
        role: 'admin',
        userType: 'individual',
        avatar: 'https://ui-avatars.com/api/?name=Admin&background=059669&color=fff&bold=true',
        createdAt: new Date().toISOString(),
        bio: 'Tài khoản quản trị viên tối cao của hệ thống GIVEBACK Cloud.'
      };
    }
    return null;
  },

  // Đăng nhập qua mạng xã hội (Firebase Auth Bridge)
  socialLogin: async (method: 'google' | 'facebook'): Promise<User> => {
    return {
      id: `${method.toUpperCase()}_${Date.now()}`,
      name: method === 'google' ? 'Google User' : 'Facebook User',
      email: `${method}@social.vn`,
      role: 'user',
      userType: 'individual',
      avatar: `https://ui-avatars.com/api/?name=${method}&background=${method === 'google' ? 'ea4335' : '1877f2'}&color=fff`,
      createdAt: new Date().toISOString()
    };
  }
};
