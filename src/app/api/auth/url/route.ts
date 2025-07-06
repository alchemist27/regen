import { NextRequest, NextResponse } from 'next/server';
import { AuthUrlParams } from '@/lib/types';

/**
 * OAuth 인증 URL 생성 API
 * POST /api/auth/url
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mall_id, scope, redirect_uri } = body;

    if (!mall_id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'mall_id가 필요합니다.' 
        },
        { status: 400 }
      );
    }

    // 환경변수에서 클라이언트 정보 가져오기
    const clientId = process.env.CAFE24_CLIENT_ID;
    
    if (!clientId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'CAFE24_CLIENT_ID 환경변수가 설정되지 않았습니다.' 
        },
        { status: 500 }
      );
    }

    // 기본값 설정
    const defaultScope = 'mall.read_community,mall.write_community';
    const defaultRedirectUri = `${new URL(request.url).origin}/api/auth/cafe24/callback`;
    
    const authParams: AuthUrlParams = {
      mall_id: mall_id,
      client_id: clientId,
      redirect_uri: redirect_uri || defaultRedirectUri,
      scope: scope || defaultScope,
      state: mall_id // mall_id를 state로 사용
    };

    // OAuth 인증 URL 생성
    const authUrl = `https://${mall_id}.cafe24api.com/api/v2/oauth/authorize?` +
      `response_type=code&` +
      `client_id=${encodeURIComponent(authParams.client_id)}&` +
      `state=${encodeURIComponent(authParams.state)}&` +
      `redirect_uri=${encodeURIComponent(authParams.redirect_uri)}&` +
      `scope=${encodeURIComponent(authParams.scope)}`;

    console.log('OAuth 인증 URL 생성:', {
      mall_id: mall_id,
      client_id: clientId,
      scope: authParams.scope,
      redirect_uri: authParams.redirect_uri
    });

    return NextResponse.json({
      success: true,
      auth_url: authUrl,
      params: authParams,
      expires_in: 600, // 10분 후 만료
      created_at: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('OAuth URL 생성 오류:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'OAuth URL 생성 중 오류 발생'
      },
      { status: 500 }
    );
  }
}

/**
 * OAuth 인증 URL 생성 (GET 방식)
 * GET /api/auth/url?mall_id=xxx&scope=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mall_id = searchParams.get('mall_id');
    const scope = searchParams.get('scope');
    const redirect_uri = searchParams.get('redirect_uri');

    if (!mall_id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'mall_id가 필요합니다.' 
        },
        { status: 400 }
      );
    }

    // 환경변수에서 클라이언트 정보 가져오기
    const clientId = process.env.CAFE24_CLIENT_ID;
    
    if (!clientId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'CAFE24_CLIENT_ID 환경변수가 설정되지 않았습니다.' 
        },
        { status: 500 }
      );
    }

    // 기본값 설정
    const defaultScope = 'mall.read_community,mall.write_community';
    const defaultRedirectUri = `${new URL(request.url).origin}/api/auth/cafe24/callback`;
    
    const authParams: AuthUrlParams = {
      mall_id: mall_id,
      client_id: clientId,
      redirect_uri: redirect_uri || defaultRedirectUri,
      scope: scope || defaultScope,
      state: mall_id // mall_id를 state로 사용
    };

    // OAuth 인증 URL 생성
    const authUrl = `https://${mall_id}.cafe24api.com/api/v2/oauth/authorize?` +
      `response_type=code&` +
      `client_id=${encodeURIComponent(authParams.client_id)}&` +
      `state=${encodeURIComponent(authParams.state)}&` +
      `redirect_uri=${encodeURIComponent(authParams.redirect_uri)}&` +
      `scope=${encodeURIComponent(authParams.scope)}`;

    // 직접 리다이렉트 옵션
    const shouldRedirect = searchParams.get('redirect') === 'true';
    
    if (shouldRedirect) {
      return NextResponse.redirect(authUrl);
    }

    return NextResponse.json({
      success: true,
      auth_url: authUrl,
      params: authParams,
      expires_in: 600, // 10분 후 만료
      created_at: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('OAuth URL 생성 오류:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'OAuth URL 생성 중 오류 발생'
      },
      { status: 500 }
    );
  }
}

/**
 * 여러 쇼핑몰 OAuth URL 일괄 생성
 * PUT /api/auth/url
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { mall_ids, scope, redirect_uri } = body;

    if (!mall_ids || !Array.isArray(mall_ids)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'mall_ids 배열이 필요합니다.' 
        },
        { status: 400 }
      );
    }

    // 환경변수에서 클라이언트 정보 가져오기
    const clientId = process.env.CAFE24_CLIENT_ID;
    
    if (!clientId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'CAFE24_CLIENT_ID 환경변수가 설정되지 않았습니다.' 
        },
        { status: 500 }
      );
    }

    // 기본값 설정
    const defaultScope = 'mall.read_community,mall.write_community';
    const defaultRedirectUri = `${new URL(request.url).origin}/api/auth/cafe24/callback`;
    
    const results = [];

    for (const mall_id of mall_ids) {
      try {
        const authParams: AuthUrlParams = {
          mall_id: mall_id,
          client_id: clientId,
          redirect_uri: redirect_uri || defaultRedirectUri,
          scope: scope || defaultScope,
          state: mall_id
        };

        // OAuth 인증 URL 생성
        const authUrl = `https://${mall_id}.cafe24api.com/api/v2/oauth/authorize?` +
          `response_type=code&` +
          `client_id=${encodeURIComponent(authParams.client_id)}&` +
          `state=${encodeURIComponent(authParams.state)}&` +
          `redirect_uri=${encodeURIComponent(authParams.redirect_uri)}&` +
          `scope=${encodeURIComponent(authParams.scope)}`;

        results.push({
          mall_id: mall_id,
          success: true,
          auth_url: authUrl,
          params: authParams
        });

      } catch (error) {
        results.push({
          mall_id: mall_id,
          success: false,
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        });
      }
    }

    return NextResponse.json({
      success: true,
      total_count: results.length,
      success_count: results.filter(r => r.success).length,
      error_count: results.filter(r => !r.success).length,
      results: results,
      expires_in: 600, // 10분 후 만료
      created_at: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('일괄 OAuth URL 생성 오류:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : '일괄 URL 생성 중 오류 발생'
      },
      { status: 500 }
    );
  }
}

/**
 * Private App 설치 URL 생성 (참고용)
 * PATCH /api/auth/url
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { mall_id } = body;

    if (!mall_id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'mall_id가 필요합니다.' 
        },
        { status: 400 }
      );
    }

    // 환경변수에서 클라이언트 정보 가져오기
    const clientId = process.env.CAFE24_CLIENT_ID;
    
    if (!clientId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'CAFE24_CLIENT_ID 환경변수가 설정되지 않았습니다.' 
        },
        { status: 500 }
      );
    }

    // Private App 설치 URL (카페24 개발자 센터에서 확인 필요)
    const installUrl = `https://${mall_id}.cafe24.com/disp/admin/shop1/app/install?app_id=${clientId}`;
    
    // 직접 토큰 발급 URL (Private App의 경우)
    const tokenUrl = `${new URL(request.url).origin}/api/test-token`;

    return NextResponse.json({
      success: true,
      app_type: 'private',
      install_url: installUrl,
      token_url: tokenUrl,
      mall_id: mall_id,
      client_id: clientId,
      note: 'Private App은 설치 후 별도 인증 없이 토큰 발급이 가능합니다.',
      created_at: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('Private App URL 생성 오류:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Private App URL 생성 중 오류 발생'
      },
      { status: 500 }
    );
  }
} 