import { NextRequest, NextResponse } from 'next/server';
import { createCafe24Client } from '@/lib/cafe24Client';
import { checkTokenStatus } from '@/lib/tokenStore';

/**
 * 토큰 갱신 API
 * POST /api/token/refresh
 */
export async function POST(request: NextRequest) {
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

    console.log(`🔄 토큰 갱신 요청: ${mall_id}`);

    // 현재 토큰 상태 확인
    const currentStatus = await checkTokenStatus(mall_id);
    
    if (!currentStatus.valid && !currentStatus.expiresAt) {
      return NextResponse.json(
        { 
          success: false,
          error: '갱신할 토큰이 없습니다. 재인증이 필요합니다.',
          suggestion: 'OAuth 앱을 다시 설치해주세요.'
        },
        { status: 404 }
      );
    }

    // Cafe24 클라이언트로 토큰 갱신
    const client = createCafe24Client(mall_id);
    
    try {
      await client.refreshAccessToken();
      
      // 갱신 후 상태 확인
      const newStatus = await checkTokenStatus(mall_id);
      
      console.log(`✅ 토큰 갱신 완료: ${mall_id}`, {
        valid: newStatus.valid,
        minutesLeft: newStatus.minutesLeft,
        needsRefresh: newStatus.needsRefresh
      });

      return NextResponse.json({
        success: true,
        message: '토큰이 성공적으로 갱신되었습니다.',
        data: {
          mall_id: mall_id,
          valid: newStatus.valid,
          expires_at: newStatus.expiresAt,
          minutes_left: newStatus.minutesLeft,
          needs_refresh: newStatus.needsRefresh,
          refreshed_at: new Date().toISOString()
        }
      });

    } catch (refreshError) {
      console.error(`❌ 토큰 갱신 실패: ${mall_id}`, refreshError);
      
      let errorMessage = '토큰 갱신에 실패했습니다.';
      
      if (refreshError instanceof Error) {
        if (refreshError.message.includes('Refresh Token이 없습니다')) {
          errorMessage = 'Refresh Token이 없습니다. 재인증이 필요합니다.';
        } else if (refreshError.message.includes('만료되었습니다')) {
          errorMessage = 'Refresh Token이 만료되었습니다. 재인증이 필요합니다.';
        } else if (refreshError.message.includes('재인증이 필요합니다')) {
          errorMessage = refreshError.message;
        }
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: errorMessage,
          details: refreshError instanceof Error ? refreshError.message : 'Unknown error',
          suggestion: '메인 페이지에서 OAuth 앱을 다시 설치해주세요.'
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ 토큰 갱신 API 오류:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: '토큰 갱신 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * 여러 쇼핑몰 토큰 일괄 갱신
 * PUT /api/token/refresh
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { mall_ids } = body;

    if (!mall_ids || !Array.isArray(mall_ids)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'mall_ids 배열이 필요합니다.' 
        },
        { status: 400 }
      );
    }

    console.log(`🔄 일괄 토큰 갱신 요청: ${mall_ids.length}개 쇼핑몰`);

    const results = [];

    for (const mall_id of mall_ids) {
      try {
        // 현재 토큰 상태 확인
        const currentStatus = await checkTokenStatus(mall_id);
        
        if (!currentStatus.valid && !currentStatus.expiresAt) {
          results.push({
            mall_id: mall_id,
            success: false,
            error: '갱신할 토큰이 없습니다. 재인증이 필요합니다.',
            action: 'skip'
          });
          continue;
        }

        // 갱신이 필요한 경우만 갱신
        if (currentStatus.needsRefresh || !currentStatus.valid) {
          console.log(`🔄 토큰 갱신 시작: ${mall_id}`);
          
          const client = createCafe24Client(mall_id);
          await client.refreshAccessToken();
          
          // 갱신 후 상태 확인
          const newStatus = await checkTokenStatus(mall_id);
          
          results.push({
            mall_id: mall_id,
            success: true,
            valid: newStatus.valid,
            expires_at: newStatus.expiresAt,
            minutes_left: newStatus.minutesLeft,
            needs_refresh: newStatus.needsRefresh,
            action: 'refreshed',
            refreshed_at: new Date().toISOString()
          });
        } else {
          results.push({
            mall_id: mall_id,
            success: true,
            valid: currentStatus.valid,
            expires_at: currentStatus.expiresAt,
            minutes_left: currentStatus.minutesLeft,
            needs_refresh: currentStatus.needsRefresh,
            action: 'skipped_valid',
            message: '토큰이 아직 유효합니다.'
          });
        }

      } catch (error) {
        results.push({
          mall_id: mall_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          action: 'failed'
        });
      }
    }

    const summary = {
      total_count: results.length,
      success_count: results.filter(r => r.success).length,
      error_count: results.filter(r => !r.success).length,
      refreshed_count: results.filter(r => r.action === 'refreshed').length,
      skipped_count: results.filter(r => r.action === 'skipped_valid').length
    };

    console.log(`📊 일괄 토큰 갱신 완료:`, summary);

    return NextResponse.json({
      success: true,
      summary: summary,
      results: results,
      processed_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 일괄 토큰 갱신 실패:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: '일괄 토큰 갱신 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 