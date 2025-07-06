'use client';

import { useState } from 'react';

export default function TestOpenAIPage() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const testOpenAI = async () => {
    if (!message.trim()) {
      alert('메시지를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch('/api/test-openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();

      if (data.success) {
        setResponse(data.response);
      } else {
        setError(data.error || '오류가 발생했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
      console.error('Test error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">OpenAI API 테스트</h1>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">테스트 메시지</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="예: 배송은 언제 되나요?"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                disabled={isLoading}
              />
            </div>

            <button
              onClick={testOpenAI}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-md"
            >
              {isLoading ? 'GPT 응답 생성 중...' : 'OpenAI API 테스트'}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-red-800">오류 발생</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            )}

            {response && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-green-800">GPT 응답</h3>
                <div className="mt-2 text-sm text-green-700 whitespace-pre-wrap">{response}</div>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">테스트 예시</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• "배송은 언제 되나요?"</p>
              <p>• "반품하고 싶어요"</p>
              <p>• "상품 사이즈가 맞지 않아요"</p>
            </div>
          </div>

          <div className="mt-6">
            <a href="/" className="text-blue-600 hover:text-blue-500 text-sm font-medium">← 홈으로 돌아가기</a>
          </div>
        </div>
      </div>
    </div>
  );
}
