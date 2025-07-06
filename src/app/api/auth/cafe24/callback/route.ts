import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getAdminDb } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // OAuth 인증 코드 플로우 파라미터 확인
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // mall_id
    const error = searchParams.get('error');
    
    // 기존 Private App 방식 파라미터들
    const mallId = searchParams.get('mall_id') || state;
    const userId = searchParams.get('user_id');
    const userName = searchParams.get('user_name');
    const userType = searchParams.get('user_type');
    const timestamp = searchParams.get('timestamp');
    const hmac = searchParams.get('hmac');
    
    console.log('카페24 콜백 파라미터:', {
      code, state, error, mallId, userId, userName, userType, timestamp, hmac
    });

    // OAuth 에러 처리
    if (error) {
      console.error('OAuth 인증 에러:', error);
      const errorUrl = new URL('/auth/error', request.url);
      errorUrl.searchParams.set('error', `OAuth 인증 실패: ${error}`);
      return NextResponse.redirect(errorUrl);
    }

    if (!mallId) {
      return NextResponse.json(
        { error: 'mall_id 또는 state 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    let accessToken = '';
    let refreshToken = '';
    let tokenError = '';
    let expiresAt = '';
    
    try {
      // 환경변수에서 클라이언트 정보 가져오기
      const clientId = process.env.CAFE24_CLIENT_ID;
      const clientSecret = process.env.CAFE24_CLIENT_SECRET;
      const redirectUri = `${new URL(request.url).origin}/api/auth/cafe24/callback`;
      
      if (!clientId || !clientSecret) {
        throw new Error('CAFE24_CLIENT_ID와 CAFE24_CLIENT_SECRET 환경변수가 필요합니다.');
      }

      if (code) {
        // OAuth 인증 코드로 토큰 교환
        console.log('OAuth 토큰 교환 시작:', { mallId, code: code.substring(0, 10) + '...' });
        
        // Form data 형식으로 요청 본문 구성
        const formData = new URLSearchParams();
        formData.append('grant_type', 'authorization_code');
        formData.append('client_id', clientId);
        formData.append('client_secret', clientSecret);
        formData.append('code', code);
        formData.append('redirect_uri', redirectUri);
        
        const tokenResponse = await axios.post(`https://${mallId}.cafe24api.com/api/v2/oauth/token`, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        accessToken = tokenResponse.data.access_token;
        refreshToken = tokenResponse.data.refresh_token;
        const expiresIn = tokenResponse.data.expires_in;
        
        // 만료 시간 계산
        const expiresAtDate = new Date(Date.now() + (expiresIn * 1000));
        expiresAt = expiresAtDate.toISOString();
        
        console.log('OAuth 토큰 교환 성공:', {
          mall_id: mallId,
          token_type: tokenResponse.data.token_type,
          expires_in: expiresIn,
          expires_at: expiresAt
        });

      } else {
        // Private App 방식 (기존 코드)
        console.log('Private App 토큰 발급 시작:', { mallId });
        
        // Form data 형식으로 요청 본문 구성
        const formData = new URLSearchParams();
        formData.append('grant_type', 'client_credentials');
        formData.append('client_id', clientId);
        formData.append('client_secret', clientSecret);
        
        const tokenResponse = await axios.post(`https://${mallId}.cafe24api.com/api/v2/oauth/token`, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        accessToken = tokenResponse.data.access_token;
        const expiresIn = tokenResponse.data.expires_in;
        
        // 만료 시간 계산
        const expiresAtDate = new Date(Date.now() + (expiresIn * 1000));
        expiresAt = expiresAtDate.toISOString();
        
        console.log('Private App 토큰 발급 성공:', {
          mall_id: mallId,
          token_type: tokenResponse.data.token_type,
          expires_in: expiresIn,
          expires_at: expiresAt
        });
      }

    } catch (error) {
      console.error('토큰 발급 실패:', error);
      if (axios.isAxiosError(error)) {
        console.error('응답 데이터:', error.response?.data);
        console.error('응답 상태:', error.response?.status);
      }
      tokenError = error instanceof Error ? error.message : '토큰 발급 중 오류가 발생했습니다.';
    }

    // 쇼핑몰 정보 저장
    const shopData = {
      mall_id: mallId,
      user_id: userId || 'oauth_user',
      user_name: decodeURIComponent(userName || ''),
      user_type: userType || 'oauth',
      timestamp: timestamp || Date.now().toString(),
      hmac: hmac || '',
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      token_error: tokenError,
      installed_at: new Date(),
      status: accessToken ? 'ready' : 'error',
      app_type: code ? 'oauth' : 'private',
      auth_code: code || ''
    };

    // Admin Firestore에 쇼핑몰 정보 저장
    const adminDb = getAdminDb();
    if (adminDb) {
      await adminDb.collection('shops').doc(mallId).set(shopData);
    }

    // 성공 페이지로 리다이렉트
    const redirectUrl = new URL('/auth/success', request.url);
    redirectUrl.searchParams.set('mall_id', mallId);
    redirectUrl.searchParams.set('user_name', userName || '');
    redirectUrl.searchParams.set('ready', accessToken ? 'true' : 'false');
    redirectUrl.searchParams.set('app_type', code ? 'oauth' : 'private');
    if (tokenError) {
      redirectUrl.searchParams.set('error', tokenError);
    }
    
    return NextResponse.redirect(redirectUrl);

  } catch (error: unknown) {
    console.error('카페24 OAuth 콜백 오류:', error);
    
    const errorUrl = new URL('/auth/error', request.url);
    errorUrl.searchParams.set('error', error instanceof Error ? error.message : 'Unknown error');
    
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
    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', client_id);
    formData.append('client_secret', client_secret);
    
    const tokenResponse = await axios.post(`https://${mall_id}.cafe24api.com/api/v2/oauth/token`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    // 만료 시간 계산
    const expiresAtDate = new Date(Date.now() + (expires_in * 1000));
    const expiresAt = expiresAtDate.toISOString();

    // 토큰 정보를 Admin Firestore에 저장
    const adminDb = getAdminDb();
    if (adminDb) {
      await adminDb.collection('shops').doc(mall_id).set({
        access_token: access_token,
        refresh_token: refresh_token,
        expires_in: expires_in,
        expires_at: expiresAt,
        token_issued_at: new Date(),
        client_id: client_id,
        // client_secret은 보안상 저장하지 않음
      }, { merge: true });
    }

    return NextResponse.json({
      success: true,
      message: '토큰이 성공적으로 발급되었습니다.',
      data: {
        mall_id: mall_id,
        access_token: access_token,
        expires_in: expires_in,
        expires_at: expiresAt
      }
    });

  } catch (error: unknown) {
    console.error('토큰 발급 오류:', error);
    
    return NextResponse.json(
      { 
        error: '토큰 발급 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 