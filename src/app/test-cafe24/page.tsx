'use client';

import { useState } from 'react';

interface TokenStatus {
  valid: boolean;
  expires_at: number | null;
  minutes_left: number;
  needs_refresh: boolean;
  error?: string;
}

interface TestResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  details?: string;
}

function SimpleTestContent() {
  const [mallId, setMallId] = useState('cosmos2772');
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const checkTokenStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/token/status?mall_id=${mallId}`);
      const result = await response.json();
      
      if (result.success) {
        setTokenStatus(result.data);
        setTestResult({
          success: true,
          data: result.data
        });
      } else {
        setTestResult({
          success: false,
          error: result.error,
          details: result.details
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: '토큰 상태 확인 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/token/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mall_id: mallId }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setTestResult({
          success: true,
          data: result.data
        });
        // 갱신 후 상태 다시 확인
        await checkTokenStatus();
      } else {
        setTestResult({
          success: false,
          error: result.error,
          details: result.details
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: '토큰 갱신 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const testApiCall = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cafe24/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          mall_id: mallId,
          board_no: 1,
          limit: 5
        }),
      });
      
      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: 'API 호출 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-center">카페24 OAuth 토큰 테스트</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">쇼핑몰 ID</label>
        <input
          type="text"
          value={mallId}
          onChange={(e) => setMallId(e.target.value)}
          className="w-full p-3 border rounded-lg"
          placeholder="쇼핑몰 ID를 입력하세요"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={checkTokenStatus}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50"
        >
          {loading ? '확인 중...' : '토큰 상태 확인'}
        </button>
        
        <button
          onClick={refreshToken}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50"
        >
          {loading ? '갱신 중...' : '토큰 갱신'}
        </button>
        
        <button
          onClick={testApiCall}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50"
        >
          {loading ? '호출 중...' : 'API 테스트'}
        </button>
      </div>

      {/* 토큰 상태 표시 */}
      {tokenStatus && (
        <div className={`mb-6 p-4 rounded-lg border ${
          tokenStatus.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <h3 className="font-semibold mb-2">
            {tokenStatus.valid ? '✅ 토큰 유효' : '❌ 토큰 무효'}
          </h3>
          <div className="text-sm space-y-1">
            <p><strong>만료 시간:</strong> {tokenStatus.expires_at ? new Date(tokenStatus.expires_at).toLocaleString('ko-KR') : 'N/A'}</p>
            <p><strong>남은 시간:</strong> {tokenStatus.minutes_left}분</p>
            <p><strong>갱신 필요:</strong> {tokenStatus.needs_refresh ? '예' : '아니오'}</p>
            {tokenStatus.error && (
              <p className="text-red-600"><strong>오류:</strong> {tokenStatus.error}</p>
            )}
          </div>
        </div>
      )}

      {/* 테스트 결과 표시 */}
      {testResult && (
        <div className={`p-6 rounded-lg border ${
          testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <h3 className="font-semibold mb-3">
            {testResult.success ? '✅ 성공' : '❌ 실패'}
          </h3>
          
          {testResult.success && testResult.data && (
            <div className="bg-white p-4 rounded border">
              <pre className="text-sm overflow-auto">
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            </div>
          )}
          
          {!testResult.success && (
            <div className="space-y-2">
              <p className="text-red-600 font-medium">{testResult.error}</p>
              {testResult.details && (
                <p className="text-red-500 text-sm">{testResult.details}</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">💡 테스트 내용:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>OAuth 토큰 상태 확인</li>
          <li>토큰 유효기간 확인</li>
          <li>Firebase 저장 상태 확인</li>
          <li>게시글 조회 API 호출 테스트</li>
          <li>토큰 자동 갱신 테스트</li>
        </ul>
      </div>

      <div className="mt-4 text-sm text-gray-600 bg-green-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">🚀 OAuth 앱 사용법:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>먼저 홈페이지에서 &quot;카페24 앱 설치&quot; 버튼으로 OAuth 인증 완료</li>
          <li>인증 완료 후 이 페이지에서 토큰 상태 확인</li>
          <li>권한: 게시판 읽기/쓰기 (mall.read_community, mall.write_community)</li>
          <li>토큰은 자동으로 갱신됩니다 (만료 5분 전)</li>
          <li>Firestore에 안전하게 저장됩니다</li>
        </ul>
      </div>
    </div>
  );
}

export default function TestCafe24Page() {
  return <SimpleTestContent />;
} 