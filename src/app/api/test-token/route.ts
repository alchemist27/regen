import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { mall_id } = await request.json();

    if (!mall_id) {
      return NextResponse.json(
        { error: 'mall_id가 필요합니다.' },
        { status: 400 }
      );
    }

    // 환경변수에서 클라이언트 정보 가져오기
    const clientId = process.env.CAFE24_CLIENT_ID;
    const clientSecret = process.env.CAFE24_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'CAFE24_CLIENT_ID와 CAFE24_CLIENT_SECRET 환경변수가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    console.log('토큰 발급 시도:', {
      mall_id,
      client_id: clientId,
      endpoint: `https://${mall_id}.cafe24api.com/api/v2/oauth/token`
    });

    // 카페24 토큰 발급 API 호출
    const tokenResponse = await axios.post(`https://${mall_id}.cafe24api.com/api/v2/oauth/token`, {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const { access_token, token_type, expires_in } = tokenResponse.data;

    // Firebase에 토큰 저장
    const shopData = {
      mall_id: mall_id,
      access_token: access_token,
      token_type: token_type,
      expires_in: expires_in,
      token_issued_at: serverTimestamp(),
      status: 'ready',
      app_type: 'private',
      client_id: clientId,
      last_test_at: serverTimestamp()
    };

    await setDoc(doc(db, 'shops', mall_id), shopData, { merge: true });

    return NextResponse.json({
      success: true,
      message: '토큰 발급 및 Firebase 저장 성공',
      data: {
        mall_id: mall_id,
        token_type: token_type,
        expires_in: expires_in,
        access_token: access_token.substring(0, 10) + '...' // 보안을 위해 일부만 표시
      }
    });

  } catch (error: unknown) {
    console.error('토큰 발급 테스트 오류:', error);
    
    let errorMessage = '토큰 발급 중 오류가 발생했습니다.';
    let statusCode = 500;
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        statusCode = error.response.status;
        errorMessage = `카페24 API 오류 (${error.response.status}): ${error.response.statusText}`;
        console.error('카페24 API 응답:', error.response.data);
      } else if (error.request) {
        errorMessage = '카페24 서버에 연결할 수 없습니다.';
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: statusCode }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mallId = searchParams.get('mall_id');

    if (!mallId) {
      return NextResponse.json(
        { error: 'mall_id가 필요합니다.' },
        { status: 400 }
      );
    }

    // Firebase에서 토큰 정보 조회
    const shopDoc = await getDoc(doc(db, 'shops', mallId));
    
    if (!shopDoc.exists()) {
      return NextResponse.json(
        { error: '쇼핑몰 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const shopData = shopDoc.data();
    
    return NextResponse.json({
      success: true,
      message: 'Firebase에서 토큰 정보 조회 성공',
      data: {
        mall_id: shopData.mall_id,
        status: shopData.status,
        app_type: shopData.app_type,
        has_access_token: !!shopData.access_token,
        token_type: shopData.token_type,
        expires_in: shopData.expires_in,
        token_issued_at: shopData.token_issued_at,
        access_token: shopData.access_token ? shopData.access_token.substring(0, 10) + '...' : null
      }
    });

  } catch (error: unknown) {
    console.error('토큰 조회 오류:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Firebase에서 토큰 정보 조회 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 