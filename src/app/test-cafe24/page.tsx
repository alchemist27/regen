'use client';

import { useState } from 'react';
import axios from 'axios';

export default function TestCafe24Page() {
  const [mallId, setMallId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [boardNo, setBoardNo] = useState('1');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testArticlesAPI = async () => {
    if (!mallId || !accessToken) {
      alert('쇼핑몰 ID와 액세스 토큰을 입력해주세요.');
      return;
    }

    setLoading(true);
    setResult('');

    try {
      const response = await axios.get('/api/cafe24/articles', {
        params: {
          mall_id: mallId,
          access_token: accessToken,
          board_no: boardNo,
          limit: 5
        }
      });

      setResult(JSON.stringify(response.data, null, 2));
    } catch (error: any) {
      setResult(JSON.stringify(error.response?.data || error.message, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const testCommentsAPI = async () => {
    if (!mallId || !accessToken) {
      alert('쇼핑몰 ID와 액세스 토큰을 입력해주세요.');
      return;
    }

    setLoading(true);
    setResult('');

    try {
      const response = await axios.post('/api/cafe24/comments', {
        mall_id: mallId,
        access_token: accessToken,
        board_no: boardNo,
        article_no: '1', // 테스트용 게시글 번호
        content: '테스트 답변입니다. 이 답변은 GPT가 생성한 것입니다.',
        writer_name: 'GPT 어시스턴트'
      });

      setResult(JSON.stringify(response.data, null, 2));
    } catch (error: any) {
      setResult(JSON.stringify(error.response?.data || error.message, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">카페24 API 테스트</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">API 설정</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              액세스 토큰
            </label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="액세스 토큰 입력"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              게시판 번호
            </label>
            <input
              type="text"
              value={boardNo}
              onChange={(e) => setBoardNo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        <button
          onClick={testArticlesAPI}
          disabled={loading}
          className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? '테스트 중...' : '게시글 조회 테스트'}
        </button>
        <button
          onClick={testCommentsAPI}
          disabled={loading}
          className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-400"
        >
          {loading ? '테스트 중...' : '댓글 등록 테스트'}
        </button>
      </div>

      {result && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">테스트 결과:</h3>
          <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
} 