import { NextRequest, NextResponse } from 'next/server';
import { createCafe24Client } from '@/lib/cafe24Client';
import { logCafe24Request } from '@/lib/logging';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let mallId = '';
  let boardNo = 1;
  let statusCode = 200;
  let errorMessage = '';
  
  try {
    const { searchParams } = new URL(request.url);
    mallId = searchParams.get('mall_id') || '';
    boardNo = parseInt(searchParams.get('board_no') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    if (!mallId) {
      statusCode = 400;
      errorMessage = 'mall_id가 필요합니다.';
      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode }
      );
    }

    // 새로운 카페24 클라이언트 사용
    const client = createCafe24Client(mallId);
    
    // 게시글 조회 (자동 토큰 갱신 포함)
    const articlesResponse = await client.getArticles(boardNo, limit, 0);

    const responseData = {
      success: true,
      data: articlesResponse
    };

    // API 로깅
    await logCafe24Request(
      mallId,
      'cafe24_articles',
      `https://${mallId}.cafe24api.com/api/v2/admin/boards/${boardNo}/articles`,
      'GET',
      { limit, offset: 0, order_by: 'created_date', order_direction: 'desc' } as Record<string, unknown>,
      responseData as Record<string, unknown>,
      statusCode,
      Date.now() - startTime
    );

    return NextResponse.json(responseData);

  } catch (error: unknown) {
    console.error('카페24 게시판 조회 오류:', error);
    
    statusCode = 500;
    errorMessage = '게시판 조회 중 오류가 발생했습니다.';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    const errorResponse = { 
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error',
      mallId: mallId,
      timestamp: new Date().toISOString()
    };

    // 오류 로깅
    if (mallId) {
      await logCafe24Request(
        mallId,
        'cafe24_articles',
        `https://${mallId}.cafe24api.com/api/v2/admin/boards/${boardNo || 1}/articles`,
        'GET',
        {} as Record<string, unknown>,
        errorResponse as Record<string, unknown>,
        statusCode,
        Date.now() - startTime,
        errorMessage
      );
    }
    
    return NextResponse.json(errorResponse, { status: statusCode });
  }
} 