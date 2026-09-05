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

export interface SignupIntent {
  accountType: 'restaurant' | 'store' | 'customer';
  businessName?: string;
}

/**
 * إما جلسة جاهزة، أو طلبٌ صريح بسؤال المستخدم عن نوع حسابه.
 *
 * حقول اختيارية لا اتحاد مُميَّز: `strict: false` في tsconfig يُعطّل تضييق
 * النوع، فالفرع الآخر يبقى مجهولاً بعد فحص `needsAccountType`.
 */
export interface SignInOutcome {
  needsAccountType: boolean;
  /** حين needsAccountType */
  idToken?: string;
  email?: string | null;
  name?: string | null;
  missingBusinessName?: boolean;
  /** حين الجلسة جاهزة */
  token?: string;
  user?: any;
}

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
   * يبادل رمز غوغل بجلسة على منصّتنا.
   *
   * مستقلٌّ عن نافذة غوغل عمداً: حين يردّ الخادم `needsAccountType` تسأل
   * الواجهة عن نوع الحساب ثم تستدعي هذه الدالة بالرمز نفسه — بلا فتح
   * النافذة مرة ثانية وبلا مطالبة المستخدم بتسجيل الدخول من جديد.
   */
  const exchangeIdToken = useCallback(
    async (idToken: string, intent?: SignupIntent): Promise<SignInOutcome> => {
      // axios مباشرةً: عميل الـ API يفكّ التغليف ولا يمرّر حقولاً كـ needsAccountType
      const axios = (await import('axios')).default;
      const response = await axios.post(
        `${api.getApiBaseUrl()}/auth/firebase-signin`,
        {
          idToken,
          accountType: intent?.accountType,
          businessName: intent?.businessName
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!response.data || response.data.success !== true) {
        throw new Error(response.data?.error || 'Authentication failed');
      }

      const data = response.data.data;
      if (!data) throw new Error('Missing data in response');

      // حساب جديد بلا نوع: الخادم لم يُنشئ شيئاً بعد وينتظر جواب المستخدم
      if (data.needsAccountType) {
        return {
          needsAccountType: true,
          idToken,
          email: data.email ?? null,
          name: data.name ?? null,
          missingBusinessName: !!data.missingBusinessName
        };
      }

      if (!data.token) throw new Error('Missing token in response');

      localStorage.setItem('token', data.token);
      return { needsAccountType: false, token: data.token, user: data.user };
    },
    []
  );

  /**
   * نيّة التسجيل: من أي صفحة ضُغط الزر وباسم أي نشاط.
   *
   * غوغل يثبت البريد لا نوع الحساب. بلا نيّة كان الخادم يُنشئ حساب زبون
   * لكل من يضغط الزر، فيبقى صاحب المتجر بدور `user` بلا متجر وتردّه لوحة
   * التحكم إلى الصفحة الرئيسية بلا تفسير. صار يسأل بدل أن يخمّن.
   */
  const signInWithGoogle = useCallback(
    async (intent?: SignupIntent): Promise<SignInOutcome | null> => {
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
        const outcome = await exchangeIdToken(idToken, intent);
        setState(prev => ({ ...prev, user: result.user }));
        return outcome;
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
    },
    [exchangeIdToken]
  );

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
    exchangeIdToken,
    linkFirebaseAccount,
    logout,
  };
};