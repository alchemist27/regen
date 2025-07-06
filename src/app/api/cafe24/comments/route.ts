import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { logCafe24Request } from '@/lib/logging';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let mallId = '';
  let statusCode = 200;
  let errorMessage = '';
  
  try {
    const requestBody = await request.json();
    mallId = requestBody.mall_id;
    const boardNo = requestBody.board_no || '1';
    const articleNo = requestBody.article_no;
    const content = requestBody.content;
    
    if (!mallId || !articleNo || !content) {
      statusCode = 400;
      errorMessage = 'mall_id, article_no, content가 필요합니다.';
      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode }
      );
    }

    // Firestore에서 액세스 토큰 조회
    const shopDoc = await getDoc(doc(db, 'shops', mallId));
    if (!shopDoc.exists()) {
      statusCode = 404;
      errorMessage = '쇼핑몰 정보를 찾을 수 없습니다. 앱을 먼저 설치해주세요.';
      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode }
      );
    }

    const shopData = shopDoc.data();
    const accessToken = shopData.access_token;

    if (!accessToken) {
      statusCode = 401;
      errorMessage = '액세스 토큰이 없습니다. 앱을 다시 설치해주세요.';
      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode }
      );
    }

    // 카페24 공식 API 호출 방식
    const apiUrl = `https://${mallId}.cafe24api.com/api/v2/admin/boards/${boardNo}/articles/${articleNo}/comments`;
    
    const requestData = {
      content: content,
      created_date: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    // 카페24 공식 포맷에 맞춘 요청
    const response = await axios({
      method: 'POST',
      url: apiUrl,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': '2025-06-01'
      },
      data: requestData,
      timeout: 30000
    });

    const responseData = {
      success: true,
      data: response.data
    };

    // API 로깅
    await logCafe24Request(
      mallId,
      'cafe24_comments',
      apiUrl,
      'POST',
      requestData as Record<string, unknown>,
      responseData as Record<string, unknown>,
      statusCode,
      Date.now() - startTime
    );

    return NextResponse.json(responseData);

  } catch (error: unknown) {
    console.error('카페24 답변 등록 오류:', error);
    
    statusCode = 500;
    errorMessage = '답변 등록 중 오류가 발생했습니다.';
    
    // Axios 오류 상세 분석
    if (axios.isAxiosError(error)) {
      if (error.response) {
        statusCode = error.response.status;
        errorMessage = `카페24 API 오류 (${error.response.status}): ${error.response.statusText}`;
        console.error('카페24 API 응답 오류:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      } else if (error.request) {
        errorMessage = '카페24 서버에 연결할 수 없습니다.';
        console.error('네트워크 연결 오류:', error.message);
      } else {
        console.error('요청 설정 오류:', error.message);
      }
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
        `https://${mallId}.cafe24api.com/api/v2/admin/boards/*/articles/*/comments`,
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