'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function HomeContent() {
  const searchParams = useSearchParams();
  const [authStatus, setAuthStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [authMessage, setAuthMessage] = useState('');
  const [mallId, setMallId] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // URL 파라미터에서 카페24 앱 설치 정보 확인
    const mallIdParam = searchParams.get('mall_id');
    const userIdParam = searchParams.get('user_id');
    const userNameParam = searchParams.get('user_name');
    const userTypeParam = searchParams.get('user_type');
    const timestampParam = searchParams.get('timestamp');
    const hmacParam = searchParams.get('hmac');

    // 이미 처리 중이거나 처리 완료된 경우 무시
    if (authStatus !== 'idle') {
      return;
    }

    // 카페24 앱 설치 파라미터가 있는 경우에만 자동 인증 처리
    if (mallIdParam && userIdParam && hmacParam) {
      console.log('카페24 앱 설치 파라미터 감지:', { mallIdParam, userIdParam, userNameParam });
      
      // 카페24 앱 설치 파라미터가 있는 경우 자동 인증 처리
      setMallId(mallIdParam);
      setUserName(userNameParam ? decodeURIComponent(userNameParam) : '');
      handleDirectAuth(mallIdParam, userIdParam, userNameParam, userTypeParam, timestampParam, hmacParam);
    }
  }, [searchParams, authStatus]);

  const handleDirectAuth = async (
    mallId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userName?: string | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userType?: string | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    timestamp?: string | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    hmac?: string | null
  ) => {
    setAuthStatus('processing');
    setAuthMessage('카페24 앱 인증을 처리하고 있습니다...');

    try {
      // 카페24 OAuth 인증 시작
      const clientId = process.env.NEXT_PUBLIC_CAFE24_CLIENT_ID || 'yXNidsOEMldlI2x6QwY20A';
      const redirectUri = `${window.location.origin}/api/auth/cafe24/callback`;
      const scope = 'mall.read_community,mall.write_community';
      
      // 카페24 OAuth 인증 페이지로 리다이렉트 (공식 문서 형식)
      const authUrl = `https://${mallId}.cafe24api.com/api/v2/oauth/authorize?` +
        `response_type=code&` +
        `client_id=${clientId}&` +
        `state=${mallId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}`;
      
      console.log('OAuth 인증 URL:', authUrl);
      
      // 상태 업데이트
      setAuthMessage('카페24 OAuth 인증 페이지로 이동합니다...');
      
      // URL 파라미터 정리 후 리다이렉트
      setTimeout(() => {
        // 현재 URL에서 카페24 앱 설치 파라미터 제거
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('mall_id');
        cleanUrl.searchParams.delete('user_id');
        cleanUrl.searchParams.delete('user_name');
        cleanUrl.searchParams.delete('user_type');
        cleanUrl.searchParams.delete('timestamp');
        cleanUrl.searchParams.delete('hmac');
        cleanUrl.searchParams.delete('lang');
        cleanUrl.searchParams.delete('nation');
        cleanUrl.searchParams.delete('shop_no');
        
        // 브라우저 히스토리에 깨끗한 URL 저장
        window.history.replaceState({}, '', cleanUrl.toString());
        
        // OAuth 인증 페이지로 리다이렉트
        window.location.href = authUrl;
      }, 1000);

    } catch (error) {
      console.error('인증 처리 오류:', error);
      setAuthStatus('error');
      setAuthMessage('인증 처리 중 오류가 발생했습니다.');
    }
  };

  const handleManualAuth = () => {
    // 수동 OAuth 인증 시작
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
          
          {/* 인증 상태 표시 */}
          {authStatus === 'processing' && (
            <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-center mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">🔄 인증 처리 중</h3>
              <p className="text-sm text-blue-800">{authMessage}</p>
              {mallId && (
                <div className="mt-4 text-xs text-blue-700 bg-blue-100 p-3 rounded">
                  <p><strong>쇼핑몰 ID:</strong> {mallId}</p>
                  {userName && <p><strong>사용자:</strong> {userName}</p>}
                </div>
              )}
            </div>
          )}

          {authStatus === 'error' && (
            <div className="mb-8 p-6 bg-red-50 rounded-lg border border-red-200">
              <h3 className="text-lg font-semibold text-red-900 mb-2">❌ 인증 오류</h3>
              <p className="text-sm text-red-800 mb-4">{authMessage}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
              >
                다시 시도
              </button>
            </div>
          )}

          {authStatus === 'idle' && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <button
                onClick={handleManualAuth}
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
          )}

          <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">🚀 OAuth 앱 설치 안내</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p><strong>설치 방법:</strong> 카페24 앱스토어에서 설치하거나 위의 &quot;카페24 앱 설치&quot; 버튼을 클릭하여 OAuth 인증을 진행하세요</p>
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
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
