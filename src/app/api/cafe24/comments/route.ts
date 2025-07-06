import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { logCafe24Request } from '@/lib/logging';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let mallId = '';
  let statusCode = 200;
  let errorMessage = '';
  
  try {
    const body = await request.json();
    const { 
      mall_id, 
      access_token, 
      board_no, 
      article_no, 
      content, 
      writer_name = 'CS 담당자' 
    } = body;

    mallId = mall_id || '';

    if (!mall_id || !access_token || !board_no || !article_no || !content) {
      statusCode = 400;
      errorMessage = '필수 파라미터가 누락되었습니다.';
      return NextResponse.json(
        { 
          error: errorMessage,
          required: ['mall_id', 'access_token', 'board_no', 'article_no', 'content']
        },
        { status: statusCode }
      );
    }

    // 카페24 API 엔드포인트 구성
    const apiUrl = `https://${mall_id}.cafe24api.com/api/v2/admin/boards/${board_no}/articles/${article_no}/comments`;
    
    const requestData = {
      content: content,
      writer_name: writer_name,
      writer_email: '', // 선택사항
      writer_password: '', // 선택사항
      use_secret: 'F' // 비밀댓글 여부 (F: 공개, T: 비밀)
    };

    const response = await axios.post(apiUrl, requestData, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': '2024-06-01'
      }
    });

    const responseData = {
      success: true,
      data: response.data,
      message: '댓글이 성공적으로 등록되었습니다.'
    };

    // API 로깅
    await logCafe24Request(
      mallId,
      'cafe24_comments',
      apiUrl,
      'POST',
      requestData,
      responseData,
      statusCode,
      Date.now() - startTime
    );

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('카페24 댓글 등록 오류:', error);
    
    statusCode = 500;
    errorMessage = '댓글 등록 중 오류가 발생했습니다.';
    
    const errorResponse = { 
      error: errorMessage,
      details: error.response?.data || error.message
    };

    // 오류 로깅
    if (mallId) {
      await logCafe24Request(
        mallId,
        'cafe24_comments',
        `https://${mallId}.cafe24api.com/api/v2/admin/boards/*/articles/*/comments`,
        'POST',
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