import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { saveTokenData } from '@/lib/tokenStore';
import { saveServerShopData } from '@/lib/serverTokenStore';
import { TokenData } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // OAuth 인증 코드 플로우 파라미터만 처리
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // mall_id
    const error = searchParams.get('error');
    
    // OAuth에서 mall_id는 state 파라미터로 전달됨
    const mallId = state;
    
    console.log('🔄 OAuth 콜백 처리 시작:', { 
      code: code ? code.substring(0, 10) + '...' : null, 
      state, 
      mallId, 
      error
    });

    // OAuth 에러 처리
    if (error) {
      console.error('❌ OAuth 인증 에러:', error);
      const errorUrl = new URL('/auth/error', request.url);
      errorUrl.searchParams.set('error', `OAuth 인증 실패: ${error}`);
      return NextResponse.redirect(errorUrl);
    }

    // 필수 파라미터 확인 (OAuth만)
    if (!mallId) {
      console.error('❌ mall_id(state) 파라미터 누락');
      return NextResponse.json(
        { error: 'OAuth state 파라미터(mall_id)가 필요합니다.' },
        { status: 400 }
      );
    }
    
    // OAuth 인증 코드 확인
    if (!code) {
      console.error('❌ OAuth 인증 코드 누락');
      return NextResponse.json(
        { error: 'OAuth 인증 코드가 필요합니다.' },
        { status: 400 }
      );
    }

    let tokenData: TokenData | null = null;
    let tokenError = '';
    
    try {
      // 환경변수에서 클라이언트 정보 가져오기
      const clientId = process.env.CAFE24_CLIENT_ID;
      const clientSecret = process.env.CAFE24_CLIENT_SECRET;
      const redirectUri = `${new URL(request.url).origin}/api/auth/cafe24/callback`;
      
      if (!clientId || !clientSecret) {
        throw new Error('CAFE24_CLIENT_ID와 CAFE24_CLIENT_SECRET 환경변수가 필요합니다.');
      }

      // OAuth App: Authorization Code Grant
      console.log('🔄 OAuth 토큰 교환 시작:', { mallId, redirectUri });
      
      // Basic Authentication 헤더 생성
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      // Form data 형식으로 요청 본문 구성
      const formData = new URLSearchParams();
      formData.append('grant_type', 'authorization_code');
      formData.append('code', code);
      formData.append('redirect_uri', redirectUri);
      
      const tokenResponse = await axios.post(`https://${mallId}.cafe24api.com/api/v2/oauth/token`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        },
        timeout: 30000
      });

      tokenData = tokenResponse.data;
      if (tokenData) {
        console.log('✅ OAuth 토큰 발급 성공:', {
          mallId,
          hasAccessToken: !!tokenData.access_token,
          hasRefreshToken: !!tokenData.refresh_token,
          expiresIn: tokenData.expires_in
        });
      }

      // 새로운 토큰 저장 시스템 사용
      if (tokenData) {
        await saveTokenData(mallId, tokenData, {
          userId: 'oauth_user',
          userName: 'OAuth 사용자',
          userType: 'oauth'
        });
      }

      console.log('✅ Firestore 토큰 저장 완료');

    } catch (error) {
      console.error('❌ 토큰 발급 실패:', error);
      
      if (axios.isAxiosError(error)) {
        console.error('응답 데이터:', error.response?.data);
        console.error('응답 상태:', error.response?.status);
        
        // 구체적인 오류 메시지 생성
        if (error.response?.status === 401) {
          if (error.response.data?.error === 'invalid_client') {
            tokenError = '클라이언트 인증 실패: Client ID 또는 Secret이 올바르지 않습니다.';
          } else {
            tokenError = '인증 실패: 앱 설정을 확인해주세요.';
          }
        } else if (error.response?.status === 400) {
          if (error.response.data?.error === 'invalid_grant') {
            tokenError = '잘못된 Grant Type: 앱 타입과 요청 방식이 일치하지 않습니다.';
          } else {
            tokenError = '잘못된 요청: ' + (error.response.data?.error_description || '알 수 없는 오류');
          }
        } else {
          tokenError = `카페24 API 오류 (${error.response?.status}): ${error.response?.statusText}`;
        }
      } else {
        tokenError = error instanceof Error ? error.message : '토큰 발급 중 오류가 발생했습니다.';
      }
    }

    // 안전한 만료 시간 계산
    const calculateExpiresAt = (expiresIn: number | undefined): string => {
      if (!expiresIn || isNaN(expiresIn) || expiresIn <= 0) {
        // 기본값: 2시간 (7200초)
        expiresIn = 7200;
      }
      
      try {
        const expiresAtTime = Date.now() + (expiresIn * 1000);
        const expiresAtDate = new Date(expiresAtTime);
        
        // 유효한 날짜인지 확인
        if (isNaN(expiresAtDate.getTime())) {
          throw new Error('Invalid date calculation');
        }
        
        return expiresAtDate.toISOString();
      } catch (error) {
        console.error('❌ 만료 시간 계산 실패:', error);
        // 기본값으로 2시간 후 설정
        return new Date(Date.now() + (7200 * 1000)).toISOString();
      }
    };

    // 서버 메모리에 임시 저장 (즉시 사용 가능)
    const shopData = {
      mall_id: mallId,
      user_id: 'oauth_user',
      user_name: 'OAuth 사용자',
      user_type: 'oauth',
      timestamp: Date.now().toString(),
      hmac: '',
      access_token: tokenData?.access_token || '',
      refresh_token: tokenData?.refresh_token || '',
      token_type: tokenData?.token_type || 'Bearer',
      expires_in: tokenData?.expires_in || 7200,
      expires_at: calculateExpiresAt(tokenData?.expires_in),
      token_error: tokenError,
      installed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_refresh_at: new Date().toISOString(),
      status: (tokenData ? 'ready' : 'error') as 'ready' | 'error',
      app_type: 'oauth' as const,
      auth_code: code,
      client_id: process.env.CAFE24_CLIENT_ID || '',
      scope: 'mall.read_community,mall.write_community'
    };

    // 서버 메모리에 토큰 저장 (즉시 사용 가능)
    saveServerShopData(mallId, shopData);

    // 성공 페이지로 리다이렉트
    const redirectUrl = new URL('/auth/success', request.url);
    redirectUrl.searchParams.set('mall_id', mallId);
    redirectUrl.searchParams.set('user_name', 'OAuth 사용자');
    redirectUrl.searchParams.set('ready', tokenData ? 'true' : 'false');
    redirectUrl.searchParams.set('app_type', 'oauth');
    
    // 토큰 정보 추가 (토큰 상태 확인에 사용)
    if (tokenData && tokenData.access_token) {
      redirectUrl.searchParams.set('access_token', tokenData.access_token);
      redirectUrl.searchParams.set('expires_at', shopData.expires_at);
    }
    
    // 토큰 발급 실패 시에만 오류 메시지 포함
    if (tokenError && !tokenData) {
      redirectUrl.searchParams.set('error', tokenError);
    }
    
    console.log('🔄 성공 페이지로 리다이렉트:', redirectUrl.toString());
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('❌ 카페24 OAuth 콜백 오류:', error);
    
    const errorUrl = new URL('/auth/error', request.url);
    errorUrl.searchParams.set('error', error instanceof Error ? error.message : 'Unknown error');
    
    return NextResponse.redirect(errorUrl);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, state, redirect_uri } = body;

    if (!code || !state) {
      return NextResponse.json(
        { error: 'OAuth 인증 코드(code)와 상태값(state)이 필요합니다.' },
        { status: 400 }
      );
    }

    const mallId = state;
    const clientId = process.env.CAFE24_CLIENT_ID;
    const clientSecret = process.env.CAFE24_CLIENT_SECRET;
    const redirectUri = redirect_uri || `${new URL(request.url).origin}/api/auth/cafe24/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'CAFE24_CLIENT_ID와 CAFE24_CLIENT_SECRET 환경변수가 필요합니다.' },
        { status: 500 }
      );
    }

    // OAuth 토큰 교환
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const formData = new URLSearchParams();
    formData.append('grant_type', 'authorization_code');
    formData.append('code', code);
    formData.append('redirect_uri', redirectUri);

    const tokenResponse = await axios.post(`https://${mallId}.cafe24api.com/api/v2/oauth/token`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      timeout: 30000
    });

    const tokenData = tokenResponse.data;
    
    // 새로운 토큰 저장 시스템 사용
    await saveTokenData(mallId, tokenData, {
      userId: 'oauth_user',
      userName: 'OAuth 사용자',
      userType: 'oauth'
    });

    return NextResponse.json({
      success: true,
      message: 'OAuth 토큰이 성공적으로 발급되었습니다.',
      data: {
        mall_id: mallId,
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type,
        has_refresh_token: !!tokenData.refresh_token
      }
    });

  } catch (error) {
    console.error('❌ OAuth 토큰 발급 오류:', error);
    
    let errorMessage = 'OAuth 토큰 발급 중 오류가 발생했습니다.';
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 400) {
        errorMessage = '잘못된 OAuth 인증 코드이거나 만료되었습니다.';
      } else if (error.response?.status === 401) {
        errorMessage = '클라이언트 인증 실패: Client ID 또는 Secret이 올바르지 않습니다.';
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 