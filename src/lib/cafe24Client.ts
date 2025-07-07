import axios, { AxiosResponse, AxiosError } from 'axios';
import { 
  getStoredAccessToken, 
  getStoredRefreshToken, 
  updateTokenData, 
  getShopData,
  checkTokenStatus 
} from './tokenStore';
import { 
  TokenData, 
  ApiRequestOptions, 
  BoardArticle,
  BoardComment,
  TOKEN_EXPIRY_BUFFER_MINUTES
} from './types';

export class Cafe24Client {
  private mallId: string;
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(mallId: string, clientId?: string, clientSecret?: string) {
    this.mallId = mallId;
    this.clientId = clientId || process.env.CAFE24_CLIENT_ID || '';
    this.clientSecret = clientSecret || process.env.CAFE24_CLIENT_SECRET || '';
    this.baseUrl = `https://${mallId}.cafe24api.com/api/v2`;

    if (!this.clientId || !this.clientSecret) {
      throw new Error('CAFE24_CLIENT_ID와 CAFE24_CLIENT_SECRET가 필요합니다.');
    }
  }

  /**
   * 유효한 토큰 확보 (자동 갱신 포함)
   */
  private async ensureValidToken(): Promise<string> {
    console.log(`🔍 ${this.mallId}: 토큰 확보 시작`);
    
    // 캐시된 토큰 확인
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      console.log(`✅ ${this.mallId}: 캐시된 토큰 사용`);
      return this.tokenCache.token;
    }

    // 저장된 토큰 확인
    console.log(`🔍 ${this.mallId}: Firestore에서 토큰 조회 시도`);
    const storedToken = await getStoredAccessToken(this.mallId);
    
    if (!storedToken) {
      console.error(`❌ ${this.mallId}: Firestore에서 토큰을 찾을 수 없음`);
      throw new Error('토큰이 없습니다. 인증이 필요합니다.');
    }

    console.log(`✅ ${this.mallId}: Firestore에서 토큰 발견`);

    // 만료 5분 전에 자동 갱신
    const bufferTime = Date.now() + (TOKEN_EXPIRY_BUFFER_MINUTES * 60 * 1000);
    if (storedToken.expires_at <= bufferTime) {
      console.log('🔄 토큰 만료 임박, 자동 갱신 시도...');
      await this.refreshAccessToken();
      
      // 갱신된 토큰 다시 조회
      const newToken = await getStoredAccessToken(this.mallId);
      if (!newToken) {
        throw new Error('토큰 갱신 후 조회 실패');
      }
      
      // 캐시 업데이트
      this.tokenCache = {
        token: newToken.access_token,
        expiresAt: newToken.expires_at
      };
      
      return newToken.access_token;
    }

    // 캐시 업데이트
    this.tokenCache = {
      token: storedToken.access_token,
      expiresAt: storedToken.expires_at
    };

    return storedToken.access_token;
  }

  /**
   * Access Token 갱신 (OAuth만 지원)
   */
  public async refreshAccessToken(): Promise<void> {
    const shopData = await getShopData(this.mallId);
    
    if (!shopData) {
      throw new Error('쇼핑몰 정보를 찾을 수 없습니다.');
    }

    // OAuth 토큰 갱신만 지원
    if (shopData.refresh_token) {
      await this.refreshOAuthToken();
    } else {
      throw new Error('Refresh Token이 없습니다. OAuth 재인증이 필요합니다.');
    }
  }



  /**
   * OAuth Token 갱신
   */
  private async refreshOAuthToken(): Promise<void> {
    const refreshToken = await getStoredRefreshToken(this.mallId);
    
    if (!refreshToken) {
      throw new Error('Refresh Token이 없습니다. 재인증이 필요합니다.');
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    const formData = new URLSearchParams();
    formData.append('grant_type', 'refresh_token');
    formData.append('refresh_token', refreshToken);
    
    try {
      const response = await axios.post(`${this.baseUrl}/oauth/token`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        },
        timeout: 30000
      });

      const tokenData: TokenData = response.data;
      
      await updateTokenData(this.mallId, tokenData);
      
      // 캐시 무효화
      this.tokenCache = null;
      
      console.log('✅ OAuth 토큰 갱신 완료');
    } catch (error) {
      this.handleTokenError(error, 'OAuth 토큰 갱신');
    }
  }

  /**
   * 토큰 오류 처리
   */
  private handleTokenError(error: unknown, context: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (axiosError.response?.status === 401) {
        throw new Error(`${context} 실패: 인증 정보가 올바르지 않습니다.`);
      } else if (axiosError.response?.status === 400) {
        const errorData = axiosError.response.data as Record<string, unknown>;
        if (errorData?.error === 'invalid_grant') {
          throw new Error(`${context} 실패: 유효하지 않은 Grant Type입니다.`);
        }
        throw new Error(`${context} 실패: ${errorData?.error_description || '잘못된 요청'}`);
      }
      
      throw new Error(`${context} 실패: ${axiosError.message}`);
    }
    
    throw new Error(`${context} 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }

  /**
   * 인증된 API 요청
   */
  private async makeAuthenticatedRequest<T>(
    endpoint: string, 
    options: ApiRequestOptions = { method: 'GET' }
  ): Promise<T> {
    const token = await this.ensureValidToken();
    
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    const config = {
      method: options.method,
      url,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': '2025-06-01',
        ...options.headers
      },
      data: options.data,
      params: options.params,
      timeout: options.timeout || 30000
    };

    try {
      const response: AxiosResponse<T> = await axios(config);
      
      console.log(`📡 API 요청 성공: ${options.method} ${url}`);
      console.log(`📊 응답 상태: ${response.status}`);
      
      return response.data;
    } catch (error) {
      // 401 오류 시 토큰 갱신 후 재시도
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log('🔄 401 오류 발생, 토큰 갱신 후 재시도...');
        
        // 캐시 무효화
        this.tokenCache = null;
        
        // 토큰 갱신
        await this.refreshAccessToken();
        
        // 새 토큰으로 재시도
        const newToken = await this.ensureValidToken();
        config.headers['Authorization'] = `Bearer ${newToken}`;
        
        const retryResponse: AxiosResponse<T> = await axios(config);
        return retryResponse.data;
      }
      
      this.handleApiError(error, `${options.method} ${url}`);
    }
  }

  /**
   * API 오류 처리
   */
  private handleApiError(error: unknown, context: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      console.error(`❌ API 오류 (${context}):`, {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data
      });
      
      const cafe24Error = new Error(
        `API 요청 실패: ${axiosError.response?.statusText || axiosError.message}`
      ) as Error & { statusCode?: number; response?: AxiosResponse };
      cafe24Error.statusCode = axiosError.response?.status;
      cafe24Error.response = axiosError.response;
      
      throw cafe24Error;
    }
    
    throw new Error(`API 요청 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }

  /**
   * 게시글 목록 조회
   */
  public async getArticles(
    boardNo: number = 1, 
    limit: number = 10, 
    offset: number = 0
  ): Promise<{ articles: BoardArticle[] }> {
    const response = await this.makeAuthenticatedRequest<{ articles: BoardArticle[] }>(
      `/admin/boards/${boardNo}/articles`,
      {
        method: 'GET',
        params: {
          limit: limit.toString(),
          offset: offset.toString(),
          order_by: 'created_date',
          order_direction: 'desc'
        }
      }
    );

    // 미답변 게시글만 필터링
    const unansweredArticles = response.articles.filter(article => 
      !article.article_comment_count || article.article_comment_count === 0
    );

    return {
      articles: unansweredArticles
    };
  }

  /**
   * 게시글 상세 조회
   */
  public async getArticle(boardNo: number, articleNo: number): Promise<BoardArticle> {
    return await this.makeAuthenticatedRequest<BoardArticle>(
      `/admin/boards/${boardNo}/articles/${articleNo}`,
      { method: 'GET' }
    );
  }

  /**
   * 댓글 등록
   */
  public async createComment(
    boardNo: number, 
    articleNo: number, 
    content: string
  ): Promise<BoardComment> {
    const requestData = {
      content: content,
      created_date: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    return await this.makeAuthenticatedRequest<BoardComment>(
      `/admin/boards/${boardNo}/articles/${articleNo}/comments`,
      {
        method: 'POST',
        data: requestData
      }
    );
  }

  /**
   * 토큰 상태 확인
   */
  public async checkTokenStatus() {
    return await checkTokenStatus(this.mallId);
  }

  /**
   * 토큰 갱신 및 상태 확인 (스케줄러용)
   */
  public async checkAndRefreshToken(): Promise<void> {
    const status = await this.checkTokenStatus();
    
    if (!status.valid) {
      console.log(`⚠️ ${this.mallId}: 토큰이 유효하지 않습니다.`);
      return;
    }

    if (status.needsRefresh) {
      console.log(`🔄 ${this.mallId}: 토큰 갱신 필요 (${status.minutesLeft}분 남음)`);
      await this.refreshAccessToken();
    } else {
      console.log(`✅ ${this.mallId}: 토큰 상태 양호 (${status.minutesLeft}분 남음)`);
    }
  }

  /**
   * 헬스 체크 (API 연결 테스트)
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.makeAuthenticatedRequest('/admin/boards/1/articles', {
        method: 'GET',
        params: { limit: '1' }
      });
      return true;
    } catch (error) {
      console.error(`❌ ${this.mallId}: 헬스 체크 실패`, error);
      return false;
    }
  }
}

/**
 * 간편 팩토리 함수
 */
export function createCafe24Client(mallId: string): Cafe24Client {
  return new Cafe24Client(mallId);
}

/**
 * 여러 쇼핑몰 클라이언트 생성
 */
export function createMultipleClients(mallIds: string[]): Map<string, Cafe24Client> {
  const clients = new Map<string, Cafe24Client>();
  
  for (const mallId of mallIds) {
    clients.set(mallId, new Cafe24Client(mallId));
  }
  
  return clients;
} 