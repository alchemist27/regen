'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthSuccessPage() {
  const searchParams = useSearchParams();
  const [mallId, setMallId] = useState('');
  const [userName, setUserName] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const mallIdParam = searchParams.get('mall_id');
    const userNameParam = searchParams.get('user_name');
    const readyParam = searchParams.get('ready');
    
    if (mallIdParam) setMallId(mallIdParam);
    if (userNameParam) setUserName(decodeURIComponent(userNameParam));
    if (readyParam === 'true') setIsReady(true);
  }, [searchParams]);

  // Private App은 토큰 발급이 불필요하므로 함수 제거

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">앱 설치 완료!</h1>
          <p className="text-gray-600">
            안녕하세요, <strong>{userName}</strong>님!<br />
            카페24 GPT 어시스턴트가 성공적으로 설치되었습니다.
          </p>
        </div>

        {isReady ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">설정 완료!</h3>
              <p className="text-sm text-green-800 mb-3">
                Private App이 성공적으로 설치되었습니다. 바로 사용하실 수 있습니다.
              </p>
              <div className="bg-white p-3 rounded border text-xs">
                <div className="mb-2">
                  <strong>쇼핑몰 ID:</strong> {mallId}
                </div>
                <div className="mb-2">
                  <strong>사용자명:</strong> {userName}
                </div>
                <div>
                  <strong>앱 타입:</strong> Private App (토큰 발급 불필요)
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">설정 중...</h3>
              <p className="text-sm text-blue-800">
                앱 설정을 처리하고 있습니다. 잠시만 기다려주세요.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 