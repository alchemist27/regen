import { NextRequest, NextResponse } from 'next/server';
import { createCafe24Client } from '@/lib/cafe24Client';
import { getShopData, checkTokenStatus } from '@/lib/tokenStore';

/**
 * 안전한 날짜 포맷팅 함수
 */
function safeFormatDate(timestamp: number | null | undefined): string | null {
  try {
    if (!timestamp || isNaN(timestamp)) {
      return null;
    }
    
    const date = new Date(timestamp);
    
    // 유효하지 않은 날짜인지 확인
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date.toLocaleString('ko-KR');
  } catch (error) {
    console.warn('날짜 포맷팅 오류:', error);
    return null;
  }
}

/**
 * 토큰 상태 확인 API
 * GET /api/token/status?mall_id=xxx
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

    // 토큰 상태 확인
    const tokenStatus = await checkTokenStatus(mall_id);

    // 추가 정보 포함
    const response = {
      success: true,
      mall_id: mall_id,
      app_type: shopData.app_type,
      status: shopData.status,
      token_status: tokenStatus,
      installed_at: shopData.installed_at,
      last_refresh_at: shopData.last_refresh_at,
      expires_at_readable: safeFormatDate(tokenStatus.expiresAt),
      needs_refresh: tokenStatus.needsRefresh || false,
      health_check: false // 기본값
    };

    // 토큰이 유효한 경우 헬스 체크 수행
    if (tokenStatus.valid) {
      try {
        const client = createCafe24Client(mall_id);
        response.health_check = await client.healthCheck();
      } catch (error) {
        console.warn(`헬스 체크 실패 (${mall_id}):`, error);
        response.health_check = false;
      }
    }

    return NextResponse.json(response);

  } catch (error: unknown) {
    console.error('토큰 상태 확인 오류:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : '토큰 상태 확인 중 오류 발생'
      },
      { status: 500 }
    );
  }
}

/**
 * 여러 쇼핑몰 토큰 상태 일괄 확인
 * POST /api/token/status
 */
export async function POST(request: NextRequest) {
  try {
    const { mall_ids } = await request.json();

    if (!mall_ids || !Array.isArray(mall_ids)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'mall_ids 배열이 필요합니다.' 
        },
        { status: 400 }
      );
    }

    const results = [];

    for (const mall_id of mall_ids) {
      try {
        const shopData = await getShopData(mall_id);
        if (!shopData) {
          results.push({
            mall_id: mall_id,
            success: false,
            error: '쇼핑몰 정보를 찾을 수 없습니다.'
          });
          continue;
        }

        const tokenStatus = await checkTokenStatus(mall_id);
        
        results.push({
          mall_id: mall_id,
          success: true,
          app_type: shopData.app_type,
          status: shopData.status,
          token_valid: tokenStatus.valid,
          minutes_left: tokenStatus.minutesLeft,
          needs_refresh: tokenStatus.needsRefresh || false,
          expires_at: tokenStatus.expiresAt,
          expires_at_readable: safeFormatDate(tokenStatus.expiresAt)
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
      valid_tokens: results.filter(r => r.success && r.token_valid).length,
      invalid_tokens: results.filter(r => !r.success || !r.token_valid).length,
      needs_refresh: results.filter(r => r.success && r.needs_refresh).length,
      results: results
    });

  } catch (error: unknown) {
    console.error('일괄 토큰 상태 확인 오류:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : '일괄 상태 확인 중 오류 발생'
      },
      { status: 500 }
    );
  }
}

/**
 * 모든 쇼핑몰 토큰 상태 확인 (관리자용)
 * PUT /api/token/status
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
    const summary = {
      total_shops: 0,
      valid_tokens: 0,
      invalid_tokens: 0,
      expiring_soon: 0,
      expired: 0,
      errors: 0
    };

    for (const doc of shopsSnapshot.docs) {
      const shopData = doc.data();
      const mallId = shopData.mall_id;
      summary.total_shops++;

      try {
        const tokenStatus = await checkTokenStatus(mallId);
        
        let statusCategory = 'unknown';
        if (!tokenStatus.valid) {
          statusCategory = 'invalid';
          summary.invalid_tokens++;
        } else if (tokenStatus.minutesLeft && tokenStatus.minutesLeft <= 0) {
          statusCategory = 'expired';
          summary.expired++;
        } else if (tokenStatus.needsRefresh) {
          statusCategory = 'expiring_soon';
          summary.expiring_soon++;
        } else {
          statusCategory = 'valid';
          summary.valid_tokens++;
        }

        results.push({
          mall_id: mallId,
          app_type: shopData.app_type,
          status: shopData.status,
          token_valid: tokenStatus.valid,
          minutes_left: tokenStatus.minutesLeft,
          needs_refresh: tokenStatus.needsRefresh || false,
          expires_at: tokenStatus.expiresAt,
          expires_at_readable: safeFormatDate(tokenStatus.expiresAt),
          status_category: statusCategory,
          installed_at: shopData.installed_at,
          last_refresh_at: shopData.last_refresh_at
        });

      } catch (error) {
        summary.errors++;
        results.push({
          mall_id: mallId,
          app_type: shopData.app_type,
          status: shopData.status,
          error: error instanceof Error ? error.message : '알 수 없는 오류',
          status_category: 'error'
        });
      }
    }

    // 결과 정렬 (만료 임박 순)
    results.sort((a, b) => {
      if (a.minutes_left && b.minutes_left) {
        return a.minutes_left - b.minutes_left;
      }
      return 0;
    });

    return NextResponse.json({
      success: true,
      summary: summary,
      results: results,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('전체 토큰 상태 확인 오류:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : '전체 상태 확인 중 오류 발생'
      },
      { status: 500 }
    );
  }
}

/**
 * 토큰 만료 알림 (관리자용)
 * PATCH /api/token/status
 */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminKey = searchParams.get('admin_key');
    const minutesThreshold = parseInt(searchParams.get('minutes') || '30');

    // 관리자 키 확인 (보안)
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    // 만료 임박 토큰 조회
    const { getShopsExpiringSoon } = await import('@/lib/tokenStore');
    const expiringTokens = await getShopsExpiringSoon(minutesThreshold);

    const notifications = [];
    
    for (const shopData of expiringTokens) {
      const tokenStatus = await checkTokenStatus(shopData.mall_id);
      
      notifications.push({
        mall_id: shopData.mall_id,
        user_name: shopData.user_name,
        app_type: shopData.app_type,
        minutes_left: tokenStatus.minutesLeft,
        expires_at: tokenStatus.expiresAt,
        expires_at_readable: safeFormatDate(tokenStatus.expiresAt),
        needs_immediate_refresh: tokenStatus.minutesLeft ? tokenStatus.minutesLeft <= 5 : false
      });
    }

    return NextResponse.json({
      success: true,
      message: `${minutesThreshold}분 내 만료 예정 토큰 조회 완료`,
      threshold_minutes: minutesThreshold,
      expiring_count: notifications.length,
      immediate_refresh_needed: notifications.filter(n => n.needs_immediate_refresh).length,
      notifications: notifications
    });

  } catch (error: unknown) {
    console.error('토큰 만료 알림 조회 오류:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : '만료 알림 조회 중 오류 발생'
      },
      { status: 500 }
    );
  }
} 