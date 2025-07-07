import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  StoredToken, 
  TokenData, 
  ShopData, 
  TokenStatus,
  COLLECTIONS,
  DOCUMENT_IDS,
  TOKEN_EXPIRY_BUFFER_MINUTES
} from './types';

// ===== 상수 =====
const TOKENS_COLLECTION = COLLECTIONS.TOKENS;
const TOKEN_DOC_ID = DOCUMENT_IDS.TOKENS;

// ===== 클라이언트 사이드 토큰 관리 =====

/**
 * Access Token 저장 (클라이언트 사이드)
 */
export async function saveAccessToken(
  mallId: string,
  accessToken: string,
  expiresIn: number,
  refreshToken?: string,
  tokenType?: string
): Promise<void> {
  if (!db) {
    throw new Error('Firebase 클라이언트가 초기화되지 않았습니다.');
  }

  const tokenData: StoredToken = {
    access_token: accessToken,
    expires_at: Date.now() + (expiresIn * 1000),
    refresh_token: refreshToken,
    token_type: tokenType || 'Bearer',
    scope: 'mall.read_community,mall.write_community'
  };

  const tokenRef = doc(db, TOKENS_COLLECTION, `${mallId}_${TOKEN_DOC_ID}`);
  
  await setDoc(tokenRef, {
    access_token: tokenData,
    refresh_token: refreshToken || null,
    mall_id: mallId,
    updated_at: serverTimestamp(),
    created_at: serverTimestamp()
  }, { merge: true });

  console.log(`✅ 클라이언트 토큰 저장 완료: ${mallId}`);
}

/**
 * Access Token 조회 (클라이언트 사이드)
 */
export async function getStoredAccessToken(mallId: string): Promise<StoredToken | null> {
  if (!db) {
    throw new Error('Firebase 클라이언트가 초기화되지 않았습니다.');
  }

  const tokenRef = doc(db, TOKENS_COLLECTION, `${mallId}_${TOKEN_DOC_ID}`);
  const docSnap = await getDoc(tokenRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  const tokenData = data.access_token;

  if (!tokenData) {
    return null;
  }

  // 토큰 만료 확인
  if (Date.now() >= tokenData.expires_at) {
    console.log(`⚠️ 토큰 만료: ${mallId}`);
    return null;
  }

  return tokenData;
}

/**
 * Refresh Token 조회 (클라이언트 사이드)
 */
export async function getStoredRefreshToken(mallId: string): Promise<string | null> {
  if (!db) {
    throw new Error('Firebase 클라이언트가 초기화되지 않았습니다.');
  }

  const tokenRef = doc(db, TOKENS_COLLECTION, `${mallId}_${TOKEN_DOC_ID}`);
  const docSnap = await getDoc(tokenRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return data.refresh_token || null;
}

/**
 * 토큰 삭제 (클라이언트 사이드)
 */
export async function deleteStoredToken(mallId: string): Promise<void> {
  if (!db) {
    throw new Error('Firebase 클라이언트가 초기화되지 않았습니다.');
  }

  const tokenRef = doc(db, TOKENS_COLLECTION, `${mallId}_${TOKEN_DOC_ID}`);
  await deleteDoc(tokenRef);

  console.log(`✅ 클라이언트 토큰 삭제 완료: ${mallId}`);
}

// ===== 서버 사이드 토큰 관리 =====

/**
 * 쇼핑몰 데이터 조회 (서버 사이드)
 */
export async function getShopData(mallId: string): Promise<ShopData | null> {
  console.log('🔍 getShopData 호출:', mallId);
  
  // Client SDK 사용으로 전환
  if (!db) {
    console.error('❌ Firebase가 초기화되지 않았습니다.');
    throw new Error('Firebase가 초기화되지 않았습니다.');
  }
  
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const docRef = doc(db, 'shops', mallId);
    console.log('📄 Firestore 문서 참조 생성:', docRef.path);
    
    const docSnap = await getDoc(docRef);
    console.log('📋 문서 존재 여부:', docSnap.exists());
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('✅ 문서 데이터 조회 성공:', { mall_id: mallId, has_access_token: !!data.access_token });
      
      return {
        mall_id: data.mall_id || mallId,
        user_id: data.user_id || '',
        user_name: data.user_name || '',
        user_type: data.user_type || '',
        timestamp: data.timestamp || '',
        hmac: data.hmac || '',
        access_token: data.access_token || '',
        refresh_token: data.refresh_token || '',
        token_type: data.token_type || 'Bearer',
        expires_in: data.expires_in || 7200,
        expires_at: data.expires_at || '',
        token_error: data.token_error || '',
        installed_at: data.installed_at || '',
        updated_at: data.updated_at || '',
        last_refresh_at: data.last_refresh_at || '',
        status: data.status || 'pending',
        app_type: data.app_type || 'oauth',
        auth_code: data.auth_code || '',
        client_id: data.client_id || '',
        scope: data.scope || 'mall.read_community,mall.write_community'
      };
    }
    
    console.log('❌ 문서가 존재하지 않습니다:', mallId);
    return null;
  } catch (error) {
    console.error('❌ Client SDK로 쇼핑몰 데이터 조회 실패:', error);
    return null;
  }
}

/**
 * 토큰 데이터 업데이트 (서버 사이드)
 */
export async function updateTokenData(
  mallId: string, 
  tokenData: Partial<TokenData>
): Promise<void> {
  // Client SDK 사용으로 전환
  if (!db) {
    throw new Error('Firebase가 초기화되지 않았습니다.');
  }

  try {
    const { doc, updateDoc } = await import('firebase/firestore');
    const shopRef = doc(db, 'shops', mallId);
    
    const updateData: Partial<ShopData> = {
      updated_at: new Date().toISOString(),
      last_refresh_at: new Date().toISOString()
    };

    if (tokenData.access_token) {
      updateData.access_token = tokenData.access_token;
    }

    if (tokenData.refresh_token) {
      updateData.refresh_token = tokenData.refresh_token;
    }

    if (tokenData.expires_in) {
      try {
        const expiresAtTimestamp = Date.now() + (tokenData.expires_in * 1000);
        const expiresAt = new Date(expiresAtTimestamp);
        
        // 유효한 날짜인지 확인
        if (isNaN(expiresAt.getTime())) {
          throw new Error('Invalid expiration date');
        }
        
        updateData.expires_at = expiresAt.toISOString();
        updateData.expires_in = tokenData.expires_in;
      } catch (dateError) {
        console.warn('토큰 만료 시간 계산 오류:', dateError);
        // 기본값으로 2시간 후 설정
        const fallbackDate = new Date(Date.now() + (7200 * 1000));
        updateData.expires_at = fallbackDate.toISOString();
        updateData.expires_in = 7200;
      }
    }

    if (tokenData.token_type) {
      updateData.token_type = tokenData.token_type;
    }

    updateData.status = 'ready';

    await updateDoc(shopRef, updateData);

    // 클라이언트 사이드 토큰도 업데이트
    if (tokenData.access_token && tokenData.expires_in) {
      await saveAccessToken(
        mallId, 
        tokenData.access_token, 
        tokenData.expires_in,
        tokenData.refresh_token,
        tokenData.token_type
      );
    }

    console.log('✅ 토큰 데이터 업데이트 완료');
  } catch (error) {
    console.error('Client SDK로 토큰 데이터 업데이트 실패:', error);
    throw error;
  }
}

/**
 * 토큰 상태 확인
 */
export async function checkTokenStatus(mallId: string): Promise<TokenStatus> {
  const shopData = await getShopData(mallId);
  
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
  const refreshThreshold = TOKEN_EXPIRY_BUFFER_MINUTES * 60 * 1000;
  const needsRefresh = (expiresAt - now) <= refreshThreshold;

  return {
    valid: true,
    expiresAt: expiresAt,
    minutesLeft: minutesLeft,
    needsRefresh: needsRefresh
  };
}

/**
 * 만료된 토큰 정리 (Client SDK 사용)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  // Client SDK로는 복잡한 쿼리가 제한적이므로 간단한 로그만 출력
  console.log('⚠️ 만료된 토큰 정리는 Admin SDK가 필요합니다.');
  return 0;
}

/**
 * 모든 쇼핑몰 데이터 조회 (Client SDK 사용)
 */
export async function getAllShopsData(): Promise<ShopData[]> {
  // Client SDK로는 전체 컬렉션 조회가 제한적이므로 빈 배열 반환
  console.log('⚠️ 모든 쇼핑몰 데이터 조회는 Admin SDK가 필요합니다.');
  return [];
}

/**
 * 갱신이 필요한 쇼핑몰 조회
 */
export async function getShopsNeedingRefresh(): Promise<ShopData[]> {
  const allShops = await getAllShopsData();
  const shopsNeedingRefresh: ShopData[] = [];

  for (const shop of allShops) {
    const tokenStatus = await checkTokenStatus(shop.mall_id);
    
    if (tokenStatus.valid && tokenStatus.needsRefresh) {
      shopsNeedingRefresh.push(shop);
    }
  }

  return shopsNeedingRefresh;
}

/**
 * 만료 임박 쇼핑몰 조회
 */
export async function getShopsExpiringSoon(thresholdMinutes: number = 60): Promise<ShopData[]> {
  const allShops = await getAllShopsData();
  const expiringSoon: ShopData[] = [];

  for (const shop of allShops) {
    const tokenStatus = await checkTokenStatus(shop.mall_id);
    
    if (tokenStatus.valid && tokenStatus.minutesLeft <= thresholdMinutes) {
      expiringSoon.push(shop);
    }
  }

  return expiringSoon;
}

/**
 * 토큰 통계 조회
 */
export async function getTokenStatistics(): Promise<{
  total: number;
  ready: number;
  expired: number;
  error: number;
  expiringSoon: number;
  needsRefresh: number;
}> {
  const allShops = await getAllShopsData();
  
  const stats = {
    total: allShops.length,
    ready: 0,
    expired: 0,
    error: 0,
    expiringSoon: 0,
    needsRefresh: 0
  };

  for (const shop of allShops) {
    // 상태별 카운트
    switch (shop.status) {
      case 'ready':
        stats.ready++;
        break;
      case 'expired':
        stats.expired++;
        break;
      case 'error':
        stats.error++;
        break;
    }

    // 토큰 상태별 카운트
    const tokenStatus = await checkTokenStatus(shop.mall_id);
    
    if (tokenStatus.valid) {
      if (tokenStatus.minutesLeft <= 60) {
        stats.expiringSoon++;
      }
      if (tokenStatus.needsRefresh) {
        stats.needsRefresh++;
      }
    }
  }

  return stats;
}

// ===== 유틸리티 함수 =====

/**
 * 토큰 만료 시간 포맷팅
 */
export function formatExpiryTime(expiresAt: number): string {
  try {
    if (!expiresAt || isNaN(expiresAt)) {
      return '유효하지 않은 시간';
    }
    
    const date = new Date(expiresAt);
    
    // 유효하지 않은 날짜인지 확인
    if (isNaN(date.getTime())) {
      return '유효하지 않은 시간';
    }
    
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return '시간 포맷 오류';
  }
}

/**
 * 토큰 상태 텍스트 변환
 */
export function getStatusText(status: TokenStatus): string {
  if (!status.valid) {
    return status.error || '토큰 무효';
  }

  if (status.needsRefresh) {
    return `갱신 필요 (${status.minutesLeft}분 남음)`;
  }

  if (status.minutesLeft <= 60) {
    return `만료 임박 (${status.minutesLeft}분 남음)`;
  }

  return `정상 (${status.minutesLeft}분 남음)`;
}

/**
 * 토큰 상태 색상 클래스
 */
export function getStatusColor(status: TokenStatus): string {
  if (!status.valid) {
    return 'text-red-600';
  }

  if (status.needsRefresh) {
    return 'text-orange-600';
  }

  if (status.minutesLeft <= 60) {
    return 'text-yellow-600';
  }

  return 'text-green-600';
} 