import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';

export async function GET() {
  try {
    console.log('Firebase 연결 테스트 시작...');
    
    // 1. 테스트 문서 작성
    const testDocRef = doc(db, 'test', 'connection');
    await setDoc(testDocRef, {
      message: 'Firebase Firestore 연결 테스트',
      timestamp: serverTimestamp(),
      test_data: {
        success: true,
        version: '1.0.0'
      }
    });
    
    console.log('테스트 문서 작성 완료');
    
    // 2. 테스트 문서 읽기
    const testDoc = await getDoc(testDocRef);
    
    if (!testDoc.exists()) {
      throw new Error('테스트 문서를 찾을 수 없습니다.');
    }
    
    const testData = testDoc.data();
    console.log('테스트 문서 읽기 완료:', testData);
    
    // 3. 컬렉션 목록 확인 (shops, api_logs)
    const collections = ['shops', 'api_logs'];
    const collectionStatus: Record<string, { exists: boolean; documentCount?: number; error?: string }> = {};
    
    for (const collectionName of collections) {
      try {
        const snapshot = await getDocs(collection(db, collectionName));
        collectionStatus[collectionName] = {
          exists: true,
          documentCount: snapshot.size
        };
      } catch (error) {
        collectionStatus[collectionName] = {
          exists: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Firebase Firestore 연결 성공!',
      data: {
        testDocument: testData,
        collections: collectionStatus,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error: unknown) {
    console.error('Firebase 연결 테스트 실패:', error);
    
    let errorMessage = 'Firebase 연결 테스트 중 오류가 발생했습니다.';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: errorDetails,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { testData } = await request.json();
    
    // 사용자 정의 테스트 데이터로 Firestore 쓰기 테스트
    const customTestRef = doc(db, 'test', 'custom');
    await setDoc(customTestRef, {
      ...testData,
      timestamp: serverTimestamp(),
      source: 'API 테스트'
    });
    
    const savedDoc = await getDoc(customTestRef);
    
    return NextResponse.json({
      success: true,
      message: '사용자 정의 데이터 저장 성공',
      data: savedDoc.data()
    });
    
  } catch (error: unknown) {
    console.error('사용자 정의 테스트 실패:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 