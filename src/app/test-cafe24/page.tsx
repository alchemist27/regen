'use client';

import { useState } from 'react';

function SimpleTestContent() {
  const [mallId, setMallId] = useState('cosmos2772');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testTokenStatus = async () => {
    setLoading(true);
    setResult('🔄 OAuth 토큰 상태 확인 중...\n');
    
    try {
      const response = await fetch(`/api/token/status?mall_id=${mallId}`);
      const data = await response.json();
      
      if (response.ok) {
        setResult(prev => prev + '✅ 토큰 상태 확인 성공!\n' + JSON.stringify(data, null, 2));
      } else {
        setResult(prev => prev + '❌ 토큰 상태 확인 실패:\n' + JSON.stringify(data, null, 2));
      }
    } catch (error) {
      setResult(prev => prev + '❌ 네트워크 오류: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const runTest = async () => {
    setLoading(true);
    setResult('🚀 카페24 API 테스트 시작...\n\n');
    
    try {
      // 1. 토큰 상태 확인
      setResult(prev => prev + '1️⃣ 토큰 상태 확인 중...\n');
      const tokenResponse = await fetch(`/api/token/status?mall_id=${mallId}`);
      const tokenData = await tokenResponse.json();
      
      if (!tokenResponse.ok) {
        setResult(prev => prev + '❌ 토큰 상태 확인 실패: ' + tokenData.error + '\n');
        return;
      }
      
      setResult(prev => prev + '✅ 토큰 상태 확인 성공\n\n');

      // 2. 게시글 조회 테스트
      setResult(prev => prev + '2️⃣ 게시글 조회 중...\n');
      const articlesResponse = await fetch(`/api/cafe24/articles?mall_id=${mallId}&limit=5`);
      const articlesData = await articlesResponse.json();
      
      if (articlesResponse.ok) {
        setResult(prev => prev + `✅ 게시글 조회 성공 (${articlesData.data?.total_count || 0}개)\n\n`);
        setResult(prev => prev + '🎉 모든 테스트 통과!\n');
      } else {
        setResult(prev => prev + '❌ 게시글 조회 실패: ' + articlesData.error + '\n');
      }
      
    } catch (error) {
      setResult(prev => prev + '❌ 테스트 중 오류: ' + (error as Error).message + '\n');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">카페24 API 간단 테스트</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">쇼핑몰 ID</label>
          <input
            type="text"
            value={mallId}
            onChange={(e) => setMallId(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="예: myshop"
          />
        </div>
        
        <div className="space-y-2">
          <button
            onClick={testTokenStatus}
            disabled={loading}
            className="w-full bg-orange-500 text-white py-3 px-4 rounded-md hover:bg-orange-600 disabled:bg-gray-400 font-medium"
          >
            {loading ? '테스트 진행 중...' : '🔧 OAuth 토큰 상태 확인'}
          </button>
          
          <button
            onClick={runTest}
            disabled={loading}
            className="w-full bg-blue-500 text-white py-3 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 font-medium"
          >
            {loading ? '테스트 진행 중...' : '🚀 전체 테스트 시작'}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-gray-50 rounded-lg p-4 border">
          <h3 className="font-semibold mb-2">테스트 결과:</h3>
          <pre className="text-sm whitespace-pre-wrap text-gray-700">{result}</pre>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">💡 테스트 내용:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>OAuth 토큰 상태 확인</li>
          <li>토큰 유효기간 확인</li>
          <li>Firebase 저장 상태 확인</li>
          <li>게시글 조회 API 호출 테스트</li>
        </ul>
      </div>

      <div className="mt-4 text-sm text-gray-600 bg-green-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">🚀 OAuth 앱 사용법:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>먼저 홈페이지에서 &quot;카페24 앱 설치&quot; 버튼으로 OAuth 인증 완료</li>
          <li>인증 완료 후 이 페이지에서 토큰 상태 확인</li>
          <li>권한: 게시판 읽기/쓰기 (mall.read_community, mall.write_community)</li>
          <li>토큰은 자동으로 갱신됩니다</li>
        </ul>
      </div>
    </div>
  );
}

export default function TestCafe24Page() {
  return (
    <div className="min-h-screen bg-gray-100">
      <SimpleTestContent />
    </div>
  );
} 