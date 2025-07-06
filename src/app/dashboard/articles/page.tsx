'use client';

import { useState } from 'react';
import axios from 'axios';

interface Article {
  article_no: number;
  board_no: number;
  title: string;
  content: string;
  writer_name: string;
  writer_email: string;
  created_date: string;
  reply_count: number;
  view_count: number;
}

interface ArticlesResponse {
  success: boolean;
  data: {
    total_count: number;
    articles: Article[];
  };
  error?: string;
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mallId, setMallId] = useState('');
  const [boardNo, setBoardNo] = useState('1');

  const fetchArticles = async () => {
    if (!mallId) {
      setError('쇼핑몰 ID를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.get<ArticlesResponse>('/api/cafe24/articles', {
        params: {
          mall_id: mallId,
          board_no: boardNo,
          limit: 20
        }
      });

      if (response.data.success) {
        setArticles(response.data.data.articles);
      } else {
        setError(response.data.error || '게시글을 불러오는데 실패했습니다.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">카페24 게시글 관리</h1>
      
      {/* 설정 입력 폼 */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">API 설정</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              쇼핑몰 ID
            </label>
            <input
              type="text"
              value={mallId}
              onChange={(e) => setMallId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="예: cosmos2772"
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
          <p className="text-sm text-blue-800">
            <strong>OAuth App:</strong> 사전에 OAuth 인증이 완료되어야 합니다. 홈페이지에서 &quot;카페24 앱 설치&quot;를 먼저 진행해주세요.
          </p>
        </div>
        <button
          onClick={fetchArticles}
          disabled={loading}
          className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? '로딩 중...' : '게시글 불러오기'}
        </button>
      </div>

      {/* 오류 메시지 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* 게시글 목록 */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">
            미답변 게시글 목록 ({articles.length}개)
          </h2>
        </div>
        
        {articles.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            {loading ? '로딩 중...' : '게시글이 없습니다.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {articles.map((article) => (
              <div key={article.article_no} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {article.title}
                    </h3>
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="mr-4">작성자: {article.writer_name}</span>
                      <span className="mr-4">이메일: {article.writer_email}</span>
                      <span>작성일: {formatDate(article.created_date)}</span>
                    </div>
                    <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded">
                      {article.content.substring(0, 200)}
                      {article.content.length > 200 && '...'}
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col items-end">
                    <div className="text-sm text-gray-500 mb-2">
                      조회수: {article.view_count}
                    </div>
                    <button className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600">
                      GPT 답변 생성
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 