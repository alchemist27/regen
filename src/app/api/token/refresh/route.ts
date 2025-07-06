import { NextRequest, NextResponse } from 'next/server';
import { createCafe24Client } from '@/lib/cafe24Client';
import { getShopData } from '@/lib/tokenStore';
import { RefreshTokenResponse } from '@/lib/types';

/**
 * 토큰 갱신 API
 * POST /api/token/refresh
 */
export async function POST(request: NextRequest) {
  try {
    const { mall_id } = await request.json();

    if (!mall_id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'mall_id가 필요합니다.' 
        },
        { status: 400 }
      );
    }

    // 쇼핑몰 정보 확인
    const shopData = await getShopData(mall_id);
    if (!shopData) {
      return NextResponse.json(
        { 
          success: false,
          error: '쇼핑몰 정보를 찾을 수 없습니다.' 
        },
        { status: 404 }
      );
    }

    // 카페24 클라이언트 생성
    const client = createCafe24Client(mall_id);

    // 토큰 갱신 실행
    await client.refreshAccessToken();

    // 갱신된 토큰 정보 조회
    const updatedShopData = await getShopData(mall_id);
    if (!updatedShopData) {
      return NextResponse.json(
        { 
          success: false,
          error: '갱신된 토큰 정보를 조회할 수 없습니다.' 
        },
        { status: 500 }
      );
    }

    const response: RefreshTokenResponse = {
      success: true,
      access_token: updatedShopData.access_token ? 
        updatedShopData.access_token.substring(0, 10) + '...' : undefined,
      expires_in: updatedShopData.expires_in,
      expires_at: updatedShopData.expires_at ? 
        new Date(updatedShopData.expires_at).getTime() : undefined
    };

    console.log(`✅ 토큰 갱신 성공: ${mall_id}`);

    return NextResponse.json(response);

  } catch (error: unknown) {
    console.error('토큰 갱신 오류:', error);
    
    let errorMessage = '토큰 갱신 중 오류가 발생했습니다.';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    const response: RefreshTokenResponse = {
      success: false,
      error: errorMessage
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * 수동 토큰 갱신 (쿼리 파라미터 사용)
 * GET /api/token/refresh?mall_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mall_id = searchParams.get('mall_id');

    if (!mall_id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'mall_id가 필요합니다.' 
        },
        { status: 400 }
      );
    }

    // 쇼핑몰 정보 확인
    const shopData = await getShopData(mall_id);
    if (!shopData) {
      return NextResponse.json(
        { 
          success: false,
          error: '쇼핑몰 정보를 찾을 수 없습니다.' 
        },
        { status: 404 }
      );
    }

    // 카페24 클라이언트 생성
    const client = createCafe24Client(mall_id);

    // 토큰 상태 확인
    const tokenStatus = await client.checkTokenStatus();
    
    if (!tokenStatus.valid) {
      return NextResponse.json(
        { 
          success: false,
          error: '토큰이 유효하지 않습니다. 재인증이 필요합니다.' 
        },
        { status: 401 }
      );
    }

    // 갱신이 필요한 경우에만 갱신
    if (tokenStatus.needsRefresh) {
      await client.refreshAccessToken();
      
      // 갱신된 토큰 정보 조회
      const updatedShopData = await getShopData(mall_id);
      
      const response: RefreshTokenResponse = {
        success: true,
        access_token: updatedShopData?.access_token ? 
          updatedShopData.access_token.substring(0, 10) + '...' : undefined,
        expires_in: updatedShopData?.expires_in,
        expires_at: updatedShopData?.expires_at ? 
          new Date(updatedShopData.expires_at).getTime() : undefined
      };

      console.log(`✅ 토큰 갱신 성공: ${mall_id}`);
      return NextResponse.json(response);
    } else {
      // 갱신 불필요
      return NextResponse.json({
        success: true,
        message: '토큰 갱신이 필요하지 않습니다.',
        expires_at: tokenStatus.expiresAt,
        minutes_left: tokenStatus.minutesLeft
      });
    }

  } catch (error: unknown) {
    console.error('토큰 갱신 오류:', error);
    
    let errorMessage = '토큰 갱신 중 오류가 발생했습니다.';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    const response: RefreshTokenResponse = {
      success: false,
      error: errorMessage
    };

    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * 모든 쇼핑몰 토큰 일괄 갱신 (관리자용)
 * PUT /api/token/refresh
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminKey = searchParams.get('admin_key');

    // 관리자 키 확인 (보안)
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    // 모든 쇼핑몰 데이터 조회
    const { getAdminDb } = await import('@/lib/firebase');
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase 연결 실패' },
        { status: 500 }
      );
    }

    const shopsSnapshot = await adminDb.collection('shops').get();
    const results = [];

    for (const doc of shopsSnapshot.docs) {
      const shopData = doc.data();
      const mallId = shopData.mall_id;

      try {
        const client = createCafe24Client(mallId);
        const tokenStatus = await client.checkTokenStatus();

        if (tokenStatus.valid && tokenStatus.needsRefresh) {
          await client.refreshAccessToken();
          results.push({
            mall_id: mallId,
            status: 'refreshed',
            message: '토큰 갱신 완료'
          });
        } else if (tokenStatus.valid) {
          results.push({
            mall_id: mallId,
            status: 'skipped',
            message: '갱신 불필요',
            minutes_left: tokenStatus.minutesLeft
          });
        } else {
          results.push({
            mall_id: mallId,
            status: 'error',
            message: '토큰 무효'
          });
        }
      } catch (error) {
        results.push({
          mall_id: mallId,
          status: 'error',
          message: error instanceof Error ? error.message : '알 수 없는 오류'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: '일괄 토큰 갱신 완료',
      results: results,
      total_shops: results.length,
      refreshed_count: results.filter(r => r.status === 'refreshed').length,
      skipped_count: results.filter(r => r.status === 'skipped').length,
      error_count: results.filter(r => r.status === 'error').length
    });

  } catch (error: unknown) {
    console.error('일괄 토큰 갱신 오류:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : '일괄 갱신 중 오류 발생'
      },
      { status: 500 }
    );
  }
} 