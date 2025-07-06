'use client';

import { useState, Suspense } from 'react';

function SimpleTestContent() {
  const [mallId, setMallId] = useState('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    if (!mallId.trim()) {
      setResult('❌ Mall ID를 입력해주세요.');
      return;
    }

    setLoading(true);
    setResult('🔄 테스트 진행 중...\n');

    try {
      // 1. 토큰 생성 테스트
      setResult(prev => prev + '\n1️⃣ 토큰 생성 중...');
      const tokenResponse = await fetch('/api/test-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mall_id: mallId }),
      });

      const tokenData = await tokenResponse.json();
      
      if (!tokenResponse.ok) {
        throw new Error(`토큰 생성 실패: ${tokenData.error}`);
      }

      setResult(prev => prev + '\n✅ 토큰 생성 성공');
      setResult(prev => prev + `\n📅 만료일: ${new Date(tokenData.data.expires_at).toLocaleString()}`);

      // 2. 게시글 조회 API 테스트
      setResult(prev => prev + '\n\n2️⃣ 게시글 조회 API 테스트 중...');
      const articlesResponse = await fetch(`/api/cafe24/articles?mall_id=${mallId}&board_no=1&limit=5`);
      const articlesData = await articlesResponse.json();

      if (!articlesResponse.ok) {
        throw new Error(`API 호출 실패: ${articlesData.error}`);
      }

      setResult(prev => prev + '\n✅ 게시글 조회 API 성공');
      setResult(prev => prev + `\n📊 조회된 게시글 수: ${articlesData.articles?.length || 0}개`);

      setResult(prev => prev + '\n\n🎉 모든 테스트 완료!');

    } catch (error) {
      setResult(prev => prev + `\n❌ 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
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
        
        <button
          onClick={runTest}
          disabled={loading}
          className="w-full bg-blue-500 text-white py-3 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 font-medium"
        >
          {loading ? '테스트 진행 중...' : '🚀 테스트 시작'}
        </button>
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
          <li>Cafe24 액세스 토큰 자동 생성</li>
          <li>토큰 유효기간 확인</li>
          <li>Firebase 저장 확인</li>
          <li>게시글 조회 API 호출 테스트</li>
        </ul>
      </div>
    </div>
  );
}

export default function SimpleTestPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <SimpleTestContent />
    </Suspense>
  );
} 