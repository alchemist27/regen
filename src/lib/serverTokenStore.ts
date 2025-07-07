import type { ShopData, TokenStatus } from './types';

// 메모리 기반 토큰 저장소 (서버 재시작 시 초기화됨)
const tokenStore = new Map<string, ShopData>();

/**
 * 서버 사이드 토큰 저장
 */
export function saveServerShopData(mallId: string, shopData: ShopData): void {
  tokenStore.set(mallId, shopData);
  console.log('✅ 서버 토큰 저장 완료:', mallId);
}

/**
 * 서버 사이드 토큰 조회
 */
export function getServerShopData(mallId: string): ShopData | null {
  const shopData = tokenStore.get(mallId);
  console.log('🔍 서버 토큰 조회:', mallId, shopData ? '존재' : '없음');
  return shopData || null;
}

/**
 * 서버 사이드 토큰 상태 확인
 */
export function checkServerTokenStatus(mallId: string): TokenStatus {
  const shopData = getServerShopData(mallId);
  
  if (!shopData) {
    return {
      valid: false,
      expiresAt: null,
      minutesLeft: 0,
      needsRefresh: false,
      error: '쇼핑몰 정보를 찾을 수 없습니다.'
    };
  }

  if (!shopData.access_token) {
    return {
      valid: false,
      expiresAt: null,
      minutesLeft: 0,
      needsRefresh: false,
      error: '액세스 토큰이 없습니다.'
    };
  }

  // 만료 시간 파싱 및 검증
  let expiresAt: number;
  try {
    if (!shopData.expires_at || shopData.expires_at === '') {
      return {
        valid: false,
        expiresAt: 0,
        minutesLeft: 0,
        needsRefresh: true,
        error: '토큰 만료 시간이 설정되지 않았습니다.'
      };
    }
    
    expiresAt = new Date(shopData.expires_at).getTime();
    
    // 유효하지 않은 날짜인지 확인
    if (isNaN(expiresAt)) {
      return {
        valid: false,
        expiresAt: 0,
        minutesLeft: 0,
        needsRefresh: true,
        error: '토큰 만료 시간이 유효하지 않습니다.'
      };
    }
  } catch (error) {
    return {
      valid: false,
      expiresAt: 0,
      minutesLeft: 0,
      needsRefresh: true,
      error: `토큰 만료 시간 파싱 오류: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }

  const now = Date.now();
  const minutesLeft = Math.floor((expiresAt - now) / (1000 * 60));

  // 토큰 만료 확인
  if (now >= expiresAt) {
    return {
      valid: false,
      expiresAt: expiresAt,
      minutesLeft: 0,
      needsRefresh: true,
      error: '토큰이 만료되었습니다.'
    };
  }

  // 갱신 필요 여부 확인 (기본 5분 전)
  const refreshThreshold = 5 * 60 * 1000; // 5분
  const needsRefresh = (expiresAt - now) <= refreshThreshold;

  return {
    valid: true,
    expiresAt: expiresAt,
    minutesLeft: minutesLeft,
    needsRefresh: needsRefresh
  };
}

/**
 * 서버 사이드 토큰 업데이트
 */
export function updateServerShopData(mallId: string, updates: Partial<ShopData>): void {
  const existing = getServerShopData(mallId);
  if (existing) {
    const updated = { ...existing, ...updates };
    tokenStore.set(mallId, updated);
    console.log('✅ 서버 토큰 업데이트 완료:', mallId);
  }
}

/**
 * 저장된 모든 쇼핑몰 ID 목록 조회
 */
export function getAllServerMallIds(): string[] {
  return Array.from(tokenStore.keys());
}

/**
 * 토큰 저장소 상태 확인
 */
export function getServerTokenStoreStatus(): {
  total: number;
  mallIds: string[];
} {
  const mallIds = getAllServerMallIds();
  return {
    total: mallIds.length,
    mallIds: mallIds
  };
} 