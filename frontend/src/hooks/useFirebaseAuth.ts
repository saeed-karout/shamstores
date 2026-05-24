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

  const signInWithGoogle = useCallback(async () => {
    if (!firebaseAuth) {
      toast.error('Firebase not configured');
      return null;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      const user = result.user;

      if (user) {
        // Get Firebase ID token
        const idToken = await user.getIdToken();

        // Send to backend for authentication
        const response = await api.post('/auth/firebase-signin', { idToken });

        if (response.data.success) {
          const { token, user: userData } = response.data.data;
          
          // Store JWT token
          localStorage.setItem('token', token);
          
          setState(prev => ({ ...prev, user }));
          toast.success('تم تسجيل الدخول بنجاح');
          
          return { token, user: userData };
        } else {
          throw new Error(response.data.error || 'Failed to authenticate');
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to sign in with Google';
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

        // Send to backend to link account
        const response = await api.post('/auth/link-firebase', { idToken }, {
          headers: { Authorization: `Bearer ${jwtToken}` }
        });

        if (response.data.success) {
          setState(prev => ({ ...prev, user }));
          toast.success('تم ربط حساب Google بنجاح');
          return true;
        } else {
          throw new Error(response.data.error || 'Failed to link account');
        }
      }
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
