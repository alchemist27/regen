'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';

export default function AuthSuccessPage() {
  const searchParams = useSearchParams();
  const [mallId, setMallId] = useState('');
  const [userName, setUserName] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenData, setTokenData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const mallIdParam = searchParams.get('mall_id');
    const userNameParam = searchParams.get('user_name');
    
    if (mallIdParam) setMallId(mallIdParam);
    if (userNameParam) setUserName(decodeURIComponent(userNameParam));
  }, [searchParams]);

  const issueToken = async () => {
    if (!mallId || !clientId || !clientSecret) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/cafe24/callback', {
        mall_id: mallId,
        client_id: clientId,
        client_secret: clientSecret
      });

      if (response.data.success) {
        setTokenData(response.data.data);
      } else {
        setError(response.data.error || '토큰 발급에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

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

        {!tokenData ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">다음 단계: API 토큰 발급</h3>
              <p className="text-sm text-blue-800">
                카페24 API를 사용하기 위해 Client ID와 Client Secret을 입력해주세요.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                쇼핑몰 ID
              </label>
              <input
                type="text"
                value={mallId}
                onChange={(e) => setMallId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: myshop"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client ID
              </label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="카페24에서 발급받은 Client ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Secret
              </label>
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="카페24에서 발급받은 Client Secret"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <button
              onClick={issueToken}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? '토큰 발급 중...' : 'API 토큰 발급'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">토큰 발급 완료!</h3>
              <p className="text-sm text-green-800 mb-3">
                API 토큰이 성공적으로 발급되었습니다.
              </p>
              <div className="bg-white p-3 rounded border text-xs">
                <div className="mb-2">
                  <strong>쇼핑몰 ID:</strong> {tokenData.mall_id}
                </div>
                <div className="mb-2">
                  <strong>액세스 토큰:</strong> {tokenData.access_token.substring(0, 20)}...
                </div>
                <div>
                  <strong>유효 시간:</strong> {tokenData.expires_in}초
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
        )}
      </div>
    </div>
  );
} 