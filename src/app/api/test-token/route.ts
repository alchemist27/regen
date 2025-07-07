import { NextRequest, NextResponse } from 'next/server';
import { saveTokenData, getStoredAccessToken } from '@/lib/tokenStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mall_id, access_token, expires_in, refresh_token } = body;

    if (!mall_id || !access_token) {
      return NextResponse.json(
        { error: 'mall_id와 access_token이 필요합니다.' },
        { status: 400 }
      );
    }

    // 토큰 데이터 저장 테스트
    const tokenData = {
      access_token,
      refresh_token: refresh_token || '',
      token_type: 'Bearer',
      expires_in: expires_in || 7200,
      scope: 'mall.read_community,mall.write_community'
    };

    console.log('🧪 토큰 저장 테스트 시작:', mall_id);
    await saveTokenData(mall_id, tokenData, {
      userId: 'test_user',
      userName: 'Test User',
      userType: 'oauth'
    });

    return NextResponse.json({
      success: true,
      message: '토큰 저장 테스트 성공',
      data: {
        mall_id,
        expires_in: tokenData.expires_in,
        expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()
      }
    });

  } catch (error) {
    console.error('❌ 토큰 저장 테스트 실패:', error);
    return NextResponse.json(
      { 
        error: '토큰 저장 테스트 실패',
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

    console.log('🧪 토큰 조회 테스트 시작:', mallId);
    const tokenData = await getStoredAccessToken(mallId);

    return NextResponse.json({
      success: true,
      message: '토큰 조회 테스트 완료',
      data: {
        mall_id: mallId,
        has_token: !!tokenData,
        token_info: tokenData ? {
          expires_at: tokenData.expires_at,
          expires_at_formatted: new Date(tokenData.expires_at).toLocaleString('ko-KR'),
          minutes_left: Math.floor((tokenData.expires_at - Date.now()) / (1000 * 60)),
          token_type: tokenData.token_type,
          scope: tokenData.scope
        } : null
      }
    });

  } catch (error) {
    console.error('❌ 토큰 조회 테스트 실패:', error);
    return NextResponse.json(
      { 
        error: '토큰 조회 테스트 실패',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 