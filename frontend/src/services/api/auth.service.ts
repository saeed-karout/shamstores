// frontend/src/services/api/auth.service.ts

import apiClient from './client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterRestaurantData {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  city: string;
}

export interface RegisterStoreData {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  city: string;
}

export interface RegisterUserData {
  name: string;
  email: string;
  password: string;
  phone: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<any> {
    return apiClient.post('/auth/login', credentials);
  }

  async userLogin(credentials: LoginCredentials): Promise<any> {
    return apiClient.post('/auth/user/login', credentials);
  }

  async deliveryLogin(credentials: LoginCredentials): Promise<any> {
    return apiClient.post('/auth/delivery/login', credentials);
  }

  async registerRestaurant(data: RegisterRestaurantData): Promise<any> {
    return apiClient.post('/auth/register', data);
  }

  async registerStore(data: RegisterStoreData): Promise<any> {
    return apiClient.post('/auth/register-store', data);
  }

  async registerUser(data: RegisterUserData): Promise<any> {
    return apiClient.post('/auth/user/register', data);
  }

  async getMe(): Promise<any> {
    return apiClient.get('/auth/me');
  }

  async logout(): Promise<void> {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}

export const authService = new AuthService();