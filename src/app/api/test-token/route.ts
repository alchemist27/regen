import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getAdminDb } from '@/lib/firebase';

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

    console.log('Private App 토큰 발급 시도:', {
      mall_id,
      client_id: clientId,
      endpoint: `https://${mall_id}.cafe24api.com/api/v2/oauth/token`
    });

    try {
      // Private App 방식: Client Credentials Grant with Basic Auth
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const formData = new URLSearchParams();
      formData.append('grant_type', 'client_credentials');
      
      const tokenResponse = await axios.post(`https://${mall_id}.cafe24api.com/api/v2/oauth/token`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      });

      const { access_token, token_type, expires_in } = tokenResponse.data;
      
      // 만료 시간 계산
      const expiresAtDate = new Date(Date.now() + (expires_in * 1000));
      const expiresAt = expiresAtDate.toISOString();

      // Admin Firebase에 토큰 저장
      const shopData = {
        mall_id: mall_id,
        access_token: access_token,
        token_type: token_type,
        expires_in: expires_in,
        expires_at: expiresAt,
        token_issued_at: new Date(),
        status: 'ready',
        app_type: 'private',
        client_id: clientId,
        last_test_at: new Date()
      };

      const adminDb = getAdminDb();
      if (adminDb) {
        await adminDb.collection('shops').doc(mall_id).set(shopData, { merge: true });
      }

      return NextResponse.json({
        success: true,
        message: 'Private App 토큰 발급 및 Firebase 저장 성공',
        data: {
          mall_id: mall_id,
          token_type: token_type,
          expires_in: expires_in,
          expires_at: expiresAt,
          access_token: access_token.substring(0, 10) + '...' // 보안을 위해 일부만 표시
        }
      });

    } catch (error) {
      console.error('카페24 API 호출 오류:', error);
      
      let errorMessage = '토큰 발급 중 오류가 발생했습니다.';
      let statusCode = 500;
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          statusCode = error.response.status;
          
          if (error.response.status === 401) {
            if (error.response.data?.error === 'invalid_client') {
              errorMessage = '클라이언트 인증 실패: Client ID 또는 Secret이 올바르지 않습니다.';
            } else {
              errorMessage = '인증 실패: 앱 설정을 확인해주세요.';
            }
          } else if (error.response.status === 400) {
            if (error.response.data?.error === 'invalid_grant') {
              errorMessage = '잘못된 Grant Type: 이 앱은 Private App이 아닙니다. OAuth App으로 등록되어 있습니다.';
            } else {
              errorMessage = '잘못된 요청: ' + (error.response.data?.error_description || '알 수 없는 오류');
            }
          } else {
            errorMessage = `카페24 API 오류 (${error.response.status}): ${error.response.statusText}`;
          }
          
          console.error('카페24 API 응답:', error.response.data);
        } else if (error.request) {
          errorMessage = '카페24 서버에 연결할 수 없습니다.';
        }
      }
      
      return NextResponse.json({
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: statusCode === 400 ? 'OAuth App으로 등록된 경우 메인 페이지에서 "카페24 앱 설치" 버튼을 사용해주세요.' : null
      }, { status: statusCode });
    }

  } catch (error: unknown) {
    console.error('토큰 발급 테스트 오류:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: '테스트 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
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

    // Admin Firebase에서 토큰 정보 조회
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase 연결 실패' },
        { status: 500 }
      );
    }

    const shopDoc = await adminDb.collection('shops').doc(mallId).get();
    
    if (!shopDoc.exists) {
      return NextResponse.json(
        { error: '쇼핑몰 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const shopData = shopDoc.data();
    if (!shopData) {
      return NextResponse.json(
        { error: '쇼핑몰 데이터를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Firebase에서 토큰 정보 조회 성공',
      data: {
        mall_id: shopData.mall_id,
        status: shopData.status,
        app_type: shopData.app_type,
        has_access_token: !!shopData.access_token,
        token_type: shopData.token_type,
        expires_at: shopData.expires_at,
        token_issued_at: shopData.installed_at,
        access_token: shopData.access_token ? shopData.access_token.substring(0, 10) + '...' : null,
        token_error: shopData.token_error || null
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