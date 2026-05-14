import axios from 'axios';
import api from './api';
import { User, LoginRequest, RegisterRequest, AuthResponse } from './types';


class AuthService {
  // تسجيل الدخول
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      console.log('🔍 Login attempt:', data.email);
      const response = await api.post<AuthResponse>('/auth/login', data);
      
      if (response.token) {
        console.log('✅ Login successful, saving token');
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // التحقق من أن التوكن محفوظ
        const savedToken = localStorage.getItem('token');
        console.log('🔍 Saved token:', savedToken ? 'Yes' : 'No');
      }
      
      return response;
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  }

  // تسجيل جديد
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      console.log('🔍 Register attempt:', data.email);
      const response = await api.post<AuthResponse>('/auth/register', data);
      
      if (response.token) {
        console.log('✅ Register successful, saving token');
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      
      return response;
    } catch (error) {
      console.error('❌ Register error:', error);
      throw error;
    }
  }

  // الحصول على المستخدم الحالي
  async getCurrentUser(): Promise<User | null> {
    const token = this.getToken();
    console.log('🔍 Getting current user, token exists:', !!token);
    
    if (!token) {
      console.log('🔍 No token found');
      return null;
    }

    try {
      console.log('🔍 Fetching current user from API...');
      const user = await api.get<User>('/auth/me');
      
      if (user) {
        console.log('✅ Current user fetched:', user.email);
        localStorage.setItem('user', JSON.stringify(user));
        return user;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting current user:', error);
      
      // إذا فشل الطلب بسبب 401، نسحب التوكن
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log('🔍 Token expired or invalid, logging out');
        this.logout();
      }
      
      return null;
    }
  }

  // تسجيل الخروج
  logout(): void {
    console.log('🔍 Logging out');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // الحصول على التوكن
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // الحصول على المستخدم من التخزين المحلي
  getUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  // التحقق من المصادقة
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getUser();
    console.log('🔍 isAuthenticated check:', { 
      hasToken: !!token, 
      hasUser: !!user 
    });
    return !!token && !!user;
  }

  // التحقق من صلاحية المالك
  isOwner(): boolean {
    const user = this.getUser();
    return user?.role === 'owner' || user?.role === 'super_admin';
  }

  // التحقق من صلاحية الأدمن
  isAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 'super_admin';
  }

  // التحقق من صلاحية المستخدم العادي
  isUser(): boolean {
    const user = this.getUser();
    return user?.role === 'user';
  }
}

export default new AuthService();