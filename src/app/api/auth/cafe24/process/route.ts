import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 현재 URL에서 받은 파라미터들
    const mallId = searchParams.get('mall_id');
    const userId = searchParams.get('user_id');
    const userName = searchParams.get('user_name');
    const userType = searchParams.get('user_type');
    const timestamp = searchParams.get('timestamp');
    const hmac = searchParams.get('hmac');
    
    console.log('카페24 앱 설치 파라미터:', {
      mallId, userId, userName, userType, timestamp, hmac
    });

    if (!mallId || !userId) {
      return NextResponse.json(
        { error: 'mall_id와 user_id가 필요합니다.' },
        { status: 400 }
      );
    }

    // 콜백 API로 리다이렉트
    const callbackUrl = new URL('/api/auth/cafe24/callback', request.url);
    callbackUrl.searchParams.set('mall_id', mallId);
    callbackUrl.searchParams.set('user_id', userId);
    if (userName) callbackUrl.searchParams.set('user_name', userName);
    if (userType) callbackUrl.searchParams.set('user_type', userType);
    if (timestamp) callbackUrl.searchParams.set('timestamp', timestamp);
    if (hmac) callbackUrl.searchParams.set('hmac', hmac);
    
    return NextResponse.redirect(callbackUrl);

  } catch (error: unknown) {
    console.error('카페24 앱 설치 처리 오류:', error);
    
    return NextResponse.json(
      { error: '처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 