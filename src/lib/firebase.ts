import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeApp as initializeAdminApp, getApps as getAdminApps, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Firestore } from 'firebase-admin/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Client-side Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Client-side Firestore 데이터베이스 초기화
export const db = getFirestore(app);

// Firebase Auth 초기화
export const auth = getAuth(app);

// Admin SDK 초기화 (서버 사이드에서만 사용)
let adminDb: Firestore | null = null;

export function getAdminDb(): Firestore | null {
  if (adminDb) return adminDb;
  
  // 서버 환경에서만 Admin SDK 초기화
  if (typeof window === 'undefined') {
    try {
      // Admin 앱이 이미 초기화되어 있는지 확인
      const adminApps = getAdminApps();
      let adminApp;
      
      if (adminApps.length === 0) {
        // Admin 앱 초기화
        adminApp = initializeAdminApp({
          credential: cert({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      } else {
        adminApp = adminApps[0];
      }
      
      adminDb = getAdminFirestore(adminApp);
      return adminDb;
    } catch (error) {
      console.error('Admin SDK 초기화 실패:', error);
      return null;
    }
  }
  
  return null;
}

export default app; 