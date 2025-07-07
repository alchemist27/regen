import axios, { AxiosResponse } from 'axios';
import { 
  getStoredAccessToken, 
  getStoredRefreshToken, 
  updateTokenData, 
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
      console.log(`🔄 ${this.mallId}: 토큰 만료 임박, 자동 갱신 시도...`);
      try {
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
        
        console.log(`✅ ${this.mallId}: 토큰 자동 갱신 완료`);
        return newToken.access_token;
      } catch (error) {
        console.error(`❌ ${this.mallId}: 토큰 자동 갱신 실패:`, error);
        throw new Error('토큰 갱신 실패. 재인증이 필요합니다.');
      }
    }

    // 캐시 업데이트
    this.tokenCache = {
      token: storedToken.access_token,
      expiresAt: storedToken.expires_at
    };

    console.log(`✅ ${this.mallId}: 유효한 토큰 확보 완료`);
    return storedToken.access_token;
  }

  /**
   * Access Token 갱신 (OAuth만 지원)
   */
  public async refreshAccessToken(): Promise<void> {
    console.log(`🔄 ${this.mallId}: 토큰 갱신 시작`);
    
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
      
      console.log(`✅ ${this.mallId}: OAuth 토큰 갱신 완료`);
      console.log(`✅ ${this.mallId}: 토큰 만료 시간: ${new Date(Date.now() + (tokenData.expires_in * 1000)).toLocaleString('ko-KR')}`);
      
    } catch (error) {
      this.handleTokenError(error, 'OAuth 토큰 갱신');
    }
  }

  /**
   * 토큰 에러 처리
   */
  private handleTokenError(error: unknown, context: string): never {
    console.error(`❌ ${this.mallId}: ${context} 실패:`, error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('인증 실패: 토큰이 유효하지 않습니다. 재인증이 필요합니다.');
      } else if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData?.error === 'invalid_grant') {
          throw new Error('Refresh Token이 만료되었습니다. 재인증이 필요합니다.');
        } else {
          throw new Error(`잘못된 요청: ${errorData?.error_description || '알 수 없는 오류'}`);
        }
      }
    }
    
    throw new Error(`${context} 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  /**
   * 인증된 API 요청
   */
  public async makeAuthenticatedRequest(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<AxiosResponse> {
    const { method = 'GET', data, params, headers = {} } = options;
    
    try {
      const token = await this.ensureValidToken();
      
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...headers
        },
        data,
        params,
        timeout: 30000
      };

      console.log(`📡 ${this.mallId}: API 요청 - ${method} ${endpoint}`);
      
      const response = await axios(config);
      
      console.log(`✅ ${this.mallId}: API 응답 성공 - ${response.status}`);
      return response;
      
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log(`🔄 ${this.mallId}: 401 에러 - 토큰 갱신 후 재시도`);
        
        // 토큰 갱신 후 재시도
        await this.refreshAccessToken();
        const newToken = await this.ensureValidToken();
        
        const retryConfig = {
          method,
          url: `${this.baseUrl}${endpoint}`,
          headers: {
            'Authorization': `Bearer ${newToken}`,
            'Content-Type': 'application/json',
            ...headers
          },
          data,
          params,
          timeout: 30000
        };
        
        const retryResponse = await axios(retryConfig);
        console.log(`✅ ${this.mallId}: 재시도 성공 - ${retryResponse.status}`);
        return retryResponse;
      }
      
      console.error(`❌ ${this.mallId}: API 요청 실패:`, error);
      throw error;
    }
  }

  /**
   * 토큰 상태 확인
   */
  public async checkTokenStatus() {
    return await checkTokenStatus(this.mallId);
  }

  /**
   * 게시글 조회
   */
  public async getBoardArticles(boardNo: number, limit: number = 10): Promise<BoardArticle[]> {
    try {
      const response = await this.makeAuthenticatedRequest(
        `/admin/boards/${boardNo}/articles`,
        {
          method: 'GET',
          params: { limit: limit.toString() }
        }
      );
      
      return response.data.articles || [];
    } catch (error) {
      console.error(`❌ ${this.mallId}: 게시글 조회 실패:`, error);
      throw error;
    }
  }

  /**
   * 게시글 생성
   */
  public async createBoardArticle(
    boardNo: number,
    articleData: Partial<BoardArticle>
  ): Promise<BoardArticle> {
    try {
      const response = await this.makeAuthenticatedRequest(
        `/admin/boards/${boardNo}/articles`,
        {
          method: 'POST',
          data: { article: articleData }
        }
      );
      
      return response.data.article;
    } catch (error) {
      console.error(`❌ ${this.mallId}: 게시글 생성 실패:`, error);
      throw error;
    }
  }

  /**
   * 댓글 조회
   */
  public async getBoardComments(boardNo: number, articleNo: number): Promise<BoardComment[]> {
    try {
      const response = await this.makeAuthenticatedRequest(
        `/admin/boards/${boardNo}/articles/${articleNo}/comments`,
        {
          method: 'GET'
        }
      );
      
      return response.data.comments || [];
    } catch (error) {
      console.error(`❌ ${this.mallId}: 댓글 조회 실패:`, error);
      throw error;
    }
  }

  /**
   * 댓글 생성
   */
  public async createBoardComment(
    boardNo: number,
    articleNo: number,
    commentData: Partial<BoardComment>
  ): Promise<BoardComment> {
    try {
      const response = await this.makeAuthenticatedRequest(
        `/admin/boards/${boardNo}/articles/${articleNo}/comments`,
        {
          method: 'POST',
          data: { comment: commentData }
        }
      );
      
      return response.data.comment;
    } catch (error) {
      console.error(`❌ ${this.mallId}: 댓글 생성 실패:`, error);
      throw error;
    }
  }
}

/**
 * Cafe24Client 인스턴스 생성 헬퍼
 */
export function createCafe24Client(mallId: string): Cafe24Client {
  return new Cafe24Client(mallId);
}