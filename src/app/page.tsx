'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // 카페24 앱 설치 후 리다이렉트 파라미터 확인
    const mallId = searchParams.get('mall_id');
    const userId = searchParams.get('user_id');
    const hmac = searchParams.get('hmac');
    
    if (mallId && userId && hmac) {
      // 카페24 콜백 처리를 위해 리다이렉트
      const callbackUrl = new URL('/api/auth/cafe24/callback', window.location.origin);
      Array.from(searchParams.entries()).forEach(([key, value]) => {
        callbackUrl.searchParams.set(key, value);
      });
      
      window.location.href = callbackUrl.toString();
      return;
    }
  }, [searchParams, router]);

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

  const handlePrivateAppInstall = () => {
    // Private App 설치 URL (카페24 개발자 센터에서 확인 필요)
    const defaultMallId = 'cosmos2772';
    const clientId = 'yXNidsOEMldlI2x6QwY20A';
    
    // Private App 설치 URL 형식 (실제 URL은 카페24 개발자 센터에서 확인)
    const installUrl = `https://${defaultMallId}.cafe24.com/disp/admin/shop1/app/install?app_id=${clientId}`;
    
    console.log('Private App 설치 URL:', installUrl);
    window.location.href = installUrl;
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
              OAuth 앱 설치
            </button>
            <button
              onClick={handlePrivateAppInstall}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              Private 앱 설치
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

          <div className="mt-12 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">🔧 현재 문제 상황</h3>
            <div className="text-sm text-yellow-800 space-y-2">
              <p><strong>문제:</strong> Private App인데도 Client Credentials Grant가 작동하지 않음</p>
              <p><strong>오류:</strong> "Requested client does not have client_credentials grant_type"</p>
              <p><strong>확인 필요:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>카페24 개발자 센터에서 앱 상태 확인</li>
                <li>cosmos2772 쇼핑몰에 앱이 실제로 설치되어 있는지 확인</li>
                <li>Community 권한이 허용되어 있는지 확인</li>
                <li>Client ID/Secret이 올바른지 재확인</li>
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
