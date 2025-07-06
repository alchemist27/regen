'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AuthSuccessContent() {
  const searchParams = useSearchParams();
  const [mallId, setMallId] = useState('');
  const [userName, setUserName] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const mallIdParam = searchParams.get('mall_id');
    const userNameParam = searchParams.get('user_name');
    const readyParam = searchParams.get('ready');
    const errorParam = searchParams.get('error');
    
    if (mallIdParam) setMallId(mallIdParam);
    if (userNameParam) setUserName(decodeURIComponent(userNameParam));
    if (readyParam === 'true') setIsReady(true);
    if (errorParam) setError(decodeURIComponent(errorParam));
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className={`w-16 h-16 ${isReady ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {isReady ? (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <h1 className={`text-2xl font-bold mb-2 ${isReady ? 'text-gray-900' : 'text-red-900'}`}>
            {isReady ? '앱 설치 완료!' : '앱 설치 실패'}
          </h1>
          <p className="text-gray-600">
            안녕하세요, <strong>{userName}</strong>님!<br />
            {isReady ? '카페24 GPT 어시스턴트가 성공적으로 설치되었습니다.' : '앱 설치 중 오류가 발생했습니다.'}
          </p>
        </div>

        {isReady ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">설정 완료!</h3>
              <p className="text-sm text-green-800 mb-3">
                OAuth 앱이 성공적으로 설치되고 액세스 토큰이 발급되었습니다. 바로 사용하실 수 있습니다.
              </p>
              <div className="bg-white p-3 rounded border text-xs">
                <div className="mb-2">
                  <strong>쇼핑몰 ID:</strong> {mallId}
                </div>
                <div className="mb-2">
                  <strong>사용자명:</strong> {userName}
                </div>
                <div className="mb-2">
                  <strong>앱 타입:</strong> OAuth App
                </div>
                <div>
                  <strong>상태:</strong> <span className="text-green-600 font-semibold">토큰 발급 완료</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Link 
                href="/dashboard"
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-center"
              >
                대시보드로 이동
              </Link>
              <Link 
                href="/test-cafe24"
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-center"
              >
                API 테스트
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-2">설치 실패</h3>
              <p className="text-sm text-red-800 mb-3">
                앱 설치 중 오류가 발생했습니다. 다시 시도해주세요.
              </p>
              {error && (
                <div className="bg-white p-3 rounded border text-xs">
                  <div className="mb-2">
                    <strong>쇼핑몰 ID:</strong> {mallId}
                  </div>
                  <div className="mb-2">
                    <strong>사용자명:</strong> {userName}
                  </div>
                  <div className="mb-2">
                    <strong>오류 내용:</strong>
                  </div>
                  <div className="text-red-600 font-mono text-xs bg-red-50 p-2 rounded">
                    {error}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Link 
                href="/"
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors text-center"
              >
                홈으로 돌아가기
              </Link>
              <button 
                onClick={() => window.location.reload()}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                다시 시도
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthSuccessContent />
    </Suspense>
  );
} 