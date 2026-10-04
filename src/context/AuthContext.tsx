import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { signInWithPopup, signOut as fbSignOut, onAuthStateChanged, User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  idToken: string | null;
  profile: {
    name: string;
    email: string;
    college: string;
    committeeRole: string;
  };
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (profile: Partial<AuthContextType['profile']>) => void;
  getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('placement_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      name: 'Aditya Sheetal',
      email: 'adityasheetal.0092@gmail.com',
      college: 'IIM Ahmedabad',
      committeeRole: 'Placement Committee Lead',
    };
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          setIdToken(token);
          if (currentUser.displayName || currentUser.email) {
            setProfile((prev: AuthContextType['profile']) => ({
              ...prev,
              name: currentUser.displayName || prev.name,
              email: currentUser.email || prev.email,
            }));
          }
        } catch (err) {
          console.error('Failed to get Firebase ID token:', err);
        }
      } else {
        setIdToken(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      setUser(result.user);
      const token = await result.user.getIdToken();
      setIdToken(token);
    } catch (error: any) {
      console.warn('Google Sign-In popup notice:', error);
      // If popup is blocked by sandbox iframe, notify user
      if (error?.code === 'auth/popup-blocked') {
        alert('Pop-up was blocked by the browser. Please allow popups for this site to sign in with Google.');
      }
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
      setUser(null);
      setIdToken(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const updateProfile = (newProfile: Partial<AuthContextType['profile']>) => {
    setProfile((prev: AuthContextType['profile']) => {
      const updated = { ...prev, ...newProfile };
      localStorage.setItem('placement_profile', JSON.stringify(updated));
      return updated;
    });
  };

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-user-uid': user?.uid || 'placecom-user-001',
      'x-user-email': user?.email || profile.email,
      'x-user-name': profile.name,
    };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
    return headers;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        idToken,
        profile,
        isLoading,
        signInWithGoogle,
        signOut,
        updateProfile,
        getAuthHeaders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
