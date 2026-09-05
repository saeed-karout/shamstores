// frontend/src/hooks/useFirebaseAuth.ts

import { useState, useCallback } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { firebaseAuth } from '@/services/firebaseConfig';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface FirebaseAuthState {
  user: FirebaseUser | null;
  loading: boolean;
  error: string | null;
}

export const useFirebaseAuth = () => {
  const [state, setState] = useState<FirebaseAuthState>({
    user: null,
    loading: false,
    error: null,
  });

  /**
   * دخول بغوغل — لمن ربط حسابه سابقاً فقط.
   *
   * إنشاء الحسابات بغوغل موقوف: غوغل يثبت البريد لا نوع الحساب، فكان كل
   * ضاغط للزر يصير زبوناً بما فيهم أصحاب المتاجر. بريد بلا حساب يردّ
   * الخادمُ عليه بـ 404 ورسالة تدلّ على التسجيل بالبريد وكلمة المرور.
   */
  const signInWithGoogle = useCallback(async () => {
    if (!firebaseAuth) {
      toast.error('Firebase not configured');
      return null;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      if (!result.user) return null;

      const idToken = await result.user.getIdToken();

      // axios مباشرةً: عميل الـ API يفكّ التغليف فيبتلع رسالة الخطأ
      const axios = (await import('axios')).default;
      const response = await axios.post(
        `${api.getApiBaseUrl()}/auth/firebase-signin`,
        { idToken },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!response.data || response.data.success !== true) {
        throw new Error(response.data?.error || 'Authentication failed');
      }

      const data = response.data.data;
      if (!data?.token) throw new Error('Missing token in response');

      localStorage.setItem('token', data.token);
      setState(prev => ({ ...prev, user: result.user }));
      return { token: data.token as string, user: data.user };
    } catch (error: any) {
      // إغلاق النافذة تراجعٌ لا عطل — لا يستحق رسالة خطأ حمراء
      if (
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request'
      ) {
        return null;
      }

      const errorMessage =
        error?.response?.data?.error || error?.message || 'Failed to sign in with Google';
      console.error('Firebase sign-in error:', error);
      setState(prev => ({ ...prev, error: errorMessage }));
      toast.error(errorMessage);
      return null;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const linkFirebaseAccount = useCallback(async (jwtToken: string) => {
    if (!firebaseAuth) {
      toast.error('Firebase not configured');
      return false;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      const user = result.user;

      if (user) {
        const idToken = await user.getIdToken();

        try {
          // ✅ استخدم axios مباشرة أيضاً
          const axios = (await import('axios')).default;
          const response = await axios.post(
            `${api.getApiBaseUrl()}/auth/link-firebase`,
            { idToken },
            { headers: { 
              'Content-Type': 'application/json',
              Authorization: `Bearer ${jwtToken}`
            }}
          );

          if (response.data && response.data.success === true) {
            setState(prev => ({ ...prev, user }));
            toast.success('تم ربط حساب Google بنجاح');
            return true;
          } else {
            throw new Error(response.data?.error || 'Failed to link account');
          }
        } catch (apiError: any) {
          console.error('API error:', apiError);
          throw apiError;
        }
      }
      
      return false;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to link Firebase account';
      console.error('Firebase link error:', error);
      setState(prev => ({ ...prev, error: errorMessage }));
      toast.error(errorMessage);
      return false;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (firebaseAuth) {
        await signOut(firebaseAuth);
      }
      setState({ user: null, loading: false, error: null });
      localStorage.removeItem('token');
      toast.success('تم تسجيل الخروج بنجاح');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error('خطأ في تسجيل الخروج');
    }
  }, []);

  return {
    ...state,
    signInWithGoogle,
    linkFirebaseAccount,
    logout,
  };
};