import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 카페24에서 전달된 파라미터들
    const mallId = searchParams.get('mall_id');
    const userId = searchParams.get('user_id');
    const userName = searchParams.get('user_name');
    const userType = searchParams.get('user_type');
    const timestamp = searchParams.get('timestamp');
    const hmac = searchParams.get('hmac');
    const code = searchParams.get('code'); // 인증 코드 (있는 경우)
    
    console.log('카페24 콜백 파라미터:', {
      mallId, userId, userName, userType, timestamp, hmac, code
    });

    if (!mallId || !userId) {
      return NextResponse.json(
        { error: 'mall_id와 user_id가 필요합니다.' },
        { status: 400 }
      );
    }

    // Private App의 경우 별도의 토큰 발급 과정이 필요
    // 여기서는 일단 기본 정보를 저장하고 사용자에게 안내
    const shopData = {
      mall_id: mallId,
      user_id: userId,
      user_name: decodeURIComponent(userName || ''),
      user_type: userType,
      timestamp: timestamp,
      hmac: hmac,
      installed_at: serverTimestamp(),
      status: 'installed'
    };

    // Firestore에 쇼핑몰 정보 저장
    await setDoc(doc(db, 'shops', mallId), shopData);

    // 성공 페이지로 리다이렉트
    const redirectUrl = new URL('/auth/success', request.url);
    redirectUrl.searchParams.set('mall_id', mallId);
    redirectUrl.searchParams.set('user_name', userName || '');
    
    return NextResponse.redirect(redirectUrl);

  } catch (error: any) {
    console.error('카페24 OAuth 콜백 오류:', error);
    
    const errorUrl = new URL('/auth/error', request.url);
    errorUrl.searchParams.set('error', error.message);
    
    return NextResponse.redirect(errorUrl);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mall_id, client_id, client_secret } = body;

    if (!mall_id || !client_id || !client_secret) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 카페24 토큰 발급 API 호출
    const tokenResponse = await axios.post(`https://${mall_id}.cafe24api.com/api/v2/oauth/token`, {
      grant_type: 'client_credentials',
      client_id: client_id,
      client_secret: client_secret
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // 토큰 정보를 Firestore에 저장
    await setDoc(doc(db, 'shops', mall_id), {
      access_token: access_token,
      refresh_token: refresh_token,
      expires_in: expires_in,
      token_issued_at: serverTimestamp(),
      client_id: client_id,
      // client_secret은 보안상 저장하지 않음
    }, { merge: true });

    return NextResponse.json({
      success: true,
      message: '토큰이 성공적으로 발급되었습니다.',
      data: {
        mall_id: mall_id,
        access_token: access_token,
        expires_in: expires_in
      }
    });

  } catch (error: any) {
    console.error('토큰 발급 오류:', error);
    
    return NextResponse.json(
      { 
        error: '토큰 발급 중 오류가 발생했습니다.',
        details: error.response?.data || error.message
      },
      { status: 500 }
    );
  }
} 