import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { logCafe24Request } from '@/lib/logging';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let mallId = '';
  let statusCode = 200;
  let errorMessage = '';
  
  try {
    const { searchParams } = new URL(request.url);
    mallId = searchParams.get('mall_id') || '';
    const boardNo = searchParams.get('board_no') || '1'; // 기본값 1
    const limit = searchParams.get('limit') || '10'; // 기본값 10개
    
    if (!mallId) {
      statusCode = 400;
      errorMessage = 'mall_id가 필요합니다.';
      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode }
      );
    }

    // 카페24 API 엔드포인트 구성
    const apiUrl = `https://${mallId}.cafe24api.com/api/v2/admin/boards/${boardNo}/articles`;
    
    const requestData = {
      limit: limit,
      offset: 0,
      order_by: 'created_date',
      order_direction: 'desc'
    };

    const response = await axios.get(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': '2024-06-01'
      },
      params: requestData
    });

    // 미답변 게시글만 필터링
    const articles = response.data.articles || [];
    const unansweredArticles = articles.filter((article: { reply_count?: number }) => 
      !article.reply_count || article.reply_count === 0
    );

    const responseData = {
      success: true,
      data: {
        total_count: unansweredArticles.length,
        articles: unansweredArticles
      }
    };

    // API 로깅
    await logCafe24Request(
      mallId,
      'cafe24_articles',
      apiUrl,
      'GET',
      requestData,
      responseData,
      statusCode,
      Date.now() - startTime
    );

    return NextResponse.json(responseData);

  } catch (error: unknown) {
    console.error('카페24 게시판 조회 오류:', error);
    
    statusCode = 500;
    errorMessage = '게시판 조회 중 오류가 발생했습니다.';
    
    const errorResponse = { 
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error'
    };

    // 오류 로깅
    if (mallId) {
      await logCafe24Request(
        mallId,
        'cafe24_articles',
        `https://${mallId}.cafe24api.com/api/v2/admin/boards/*/articles`,
        'GET',
        {},
        errorResponse,
        statusCode,
        Date.now() - startTime,
        errorMessage
      );
    }
    
    return NextResponse.json(errorResponse, { status: statusCode });
  }
} 