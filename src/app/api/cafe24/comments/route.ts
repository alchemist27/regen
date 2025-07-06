import { NextRequest, NextResponse } from 'next/server';
import { createCafe24Client } from '@/lib/cafe24Client';
import { logCafe24Request } from '@/lib/logging';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let mallId = '';
  let boardNo = 1;
  let articleNo = 0;
  let statusCode = 200;
  let errorMessage = '';
  
  try {
    const requestBody = await request.json();
    mallId = requestBody.mall_id;
    boardNo = parseInt(requestBody.board_no || '1');
    articleNo = parseInt(requestBody.article_no);
    const content = requestBody.content;
    
    if (!mallId || !articleNo || !content) {
      statusCode = 400;
      errorMessage = 'mall_id, article_no, content가 필요합니다.';
      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode }
      );
    }

    // 새로운 카페24 클라이언트 사용
    const client = createCafe24Client(mallId);
    
    // 댓글 등록 (자동 토큰 갱신 포함)
    const commentResponse = await client.createComment(boardNo, articleNo, content);

    const responseData = {
      success: true,
      data: commentResponse
    };

    // API 로깅
    await logCafe24Request(
      mallId,
      'cafe24_comments',
      `https://${mallId}.cafe24api.com/api/v2/admin/boards/${boardNo}/articles/${articleNo}/comments`,
      'POST',
      { content } as Record<string, unknown>,
      responseData as Record<string, unknown>,
      statusCode,
      Date.now() - startTime
    );

    return NextResponse.json(responseData);

  } catch (error: unknown) {
    console.error('카페24 답변 등록 오류:', error);
    
    statusCode = 500;
    errorMessage = '답변 등록 중 오류가 발생했습니다.';
    
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
        'cafe24_comments',
        `https://${mallId}.cafe24api.com/api/v2/admin/boards/${boardNo}/articles/${articleNo}/comments`,
        'POST',
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