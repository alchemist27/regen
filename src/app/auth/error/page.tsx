'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

function ErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');

  const handleRetry = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            인증 오류
          </h1>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">
              <strong>오류 내용:</strong>
            </p>
            <p className="text-sm text-red-700 mt-1">
              {error || '알 수 없는 오류가 발생했습니다.'}
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              다시 시도
            </button>
            
            <a
              href="/test-cafe24"
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors block text-center"
            >
              API 테스트 페이지로 이동
            </a>
          </div>
          
          <div className="mt-6 text-xs text-gray-500">
            <p>문제가 계속 발생하면 다음을 확인해주세요:</p>
            <ul className="list-disc list-inside mt-2 text-left">
              <li>카페24 쇼핑몰 ID가 올바른지 확인</li>
              <li>앱이 올바르게 설치되었는지 확인</li>
              <li>권한이 올바르게 허용되었는지 확인</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
} 