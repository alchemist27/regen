'use client';

import { Suspense } from 'react';

function HomeContent() {
  // OAuth 콜백은 직접 /api/auth/cafe24/callback으로 처리됨

  const handleCafe24Login = () => {
    // 카페24 OAuth 인증 시작
    const defaultMallId = process.env.NEXT_PUBLIC_DEFAULT_MALL_ID || 'cosmos2772';
    const clientId = process.env.NEXT_PUBLIC_CAFE24_CLIENT_ID || 'yXNidsOEMldlI2x6QwY20A';
    const redirectUri = `${window.location.origin}/api/auth/cafe24/callback`;
    const scope = 'mall.read_community,mall.write_community';
    
    // 카페24 OAuth 인증 페이지로 리다이렉트 (공식 문서 형식)
    const authUrl = `https://${defaultMallId}.cafe24api.com/api/v2/oauth/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `state=${defaultMallId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}`;
    
    console.log('OAuth 인증 URL:', authUrl);
    window.location.href = authUrl;
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            카페24 GPT 어시스턴트
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8">
            AI가 자동으로 고객 문의에 답변해드립니다
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-12">
            카페24 게시판의 문의글을 분석하여 적절한 답변을 생성하고, 관리자가 검토 후 등록할 수 있습니다.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <button
              onClick={handleCafe24Login}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              카페24 앱 설치
            </button>
            <a
              href="/dashboard"
              className="bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3 px-8 rounded-lg border-2 border-gray-200 transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              대시보드 보기
            </a>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="/test-openai"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              OpenAI 테스트
            </a>
            <a
              href="/test-cafe24"
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              카페24 API 테스트
            </a>
          </div>

          <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">🚀 OAuth 앱 설치 안내</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p><strong>설치 방법:</strong> 위의 &quot;카페24 앱 설치&quot; 버튼을 클릭하여 OAuth 인증을 진행하세요</p>
              <p><strong>필요 권한:</strong> 게시판 읽기/쓰기 (mall.read_community, mall.write_community)</p>
              <p><strong>지원 기능:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>게시판 문의글 자동 수집</li>
                <li>AI 기반 답변 생성</li>
                <li>답변 검토 및 등록</li>
                <li>토큰 자동 갱신</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              자동 문의 수집
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              카페24 게시판의 미답변 문의를 자동으로 수집합니다.
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              AI 답변 생성
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              GPT-3.5를 활용하여 상황에 맞는 답변을 생성합니다.
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              관리자 검토
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              생성된 답변을 검토하고 수정 후 게시판에 등록합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
