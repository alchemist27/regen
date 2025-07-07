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
const TOKENS_COLLECTION = 'cafe24_tokens';
const SHOPS_COLLECTION = 'cafe24_shops';

// ===== 통합 토큰 관리 시스템 =====

/**
 * 토큰 데이터 저장 (통합 방식)
 */
export async function saveTokenData(
  mallId: string,
  tokenData: TokenData,
  userInfo?: {
    userId?: string;
    userName?: string;
    userType?: string;
  }
): Promise<void> {
  if (!db) {
    throw new Error('Firebase가 초기화되지 않았습니다.');
  }

  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (tokenData.expires_in * 1000));

    // 토큰 컬렉션에 저장
    const tokenDocRef = doc(db, TOKENS_COLLECTION, mallId);
    const tokenDoc = {
      mall_id: mallId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || '',
      token_type: tokenData.token_type || 'Bearer',
      expires_in: tokenData.expires_in,
      expires_at: expiresAt.toISOString(),
      scope: tokenData.scope || 'mall.read_community,mall.write_community',
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    await setDoc(tokenDocRef, tokenDoc);

    // 쇼핑몰 정보 컬렉션에 저장
    const shopDocRef = doc(db, SHOPS_COLLECTION, mallId);
    const shopDoc = {
      mall_id: mallId,
      user_id: userInfo?.userId || 'oauth_user',
      user_name: userInfo?.userName || 'OAuth 사용자',
      user_type: userInfo?.userType || 'oauth',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || '',
      token_type: tokenData.token_type || 'Bearer',
      expires_in: tokenData.expires_in,
      expires_at: expiresAt.toISOString(),
      scope: tokenData.scope || 'mall.read_community,mall.write_community',
      status: 'ready' as const,
      app_type: 'oauth' as const,
      client_id: process.env.CAFE24_CLIENT_ID || '',
      installed_at: now.toISOString(),
      updated_at: now.toISOString(),
      last_refresh_at: now.toISOString()
    };

    await setDoc(shopDocRef, shopDoc, { merge: true });

    console.log(`✅ 토큰 데이터 저장 완료: ${mallId}`);
    console.log(`✅ 토큰 만료 시간: ${expiresAt.toLocaleString('ko-KR')}`);

  } catch (error) {
    console.error('❌ 토큰 저장 실패:', error);
    throw new Error(`토큰 저장 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 저장된 액세스 토큰 조회
 */
export async function getStoredAccessToken(mallId: string): Promise<StoredToken | null> {
  if (!db) {
    throw new Error('Firebase가 초기화되지 않았습니다.');
  }

  try {
    const tokenDocRef = doc(db, TOKENS_COLLECTION, mallId);
    const docSnap = await getDoc(tokenDocRef);

    if (!docSnap.exists()) {
      console.log(`⚠️ 토큰 문서가 존재하지 않음: ${mallId}`);
      return null;
    }

    const data = docSnap.data();
    
    if (!data.access_token) {
      console.log(`⚠️ 액세스 토큰이 없음: ${mallId}`);
      return null;
    }

    // 만료 시간 확인
    const expiresAt = new Date(data.expires_at).getTime();
    const now = Date.now();

    if (now >= expiresAt) {
      console.log(`⚠️ 토큰 만료: ${mallId}, 만료 시간: ${new Date(expiresAt).toLocaleString('ko-KR')}`);
      return null;
    }

    return {
      access_token: data.access_token,
      expires_at: expiresAt,
      refresh_token: data.refresh_token,
      token_type: data.token_type,
      scope: data.scope
    };

  } catch (error) {
    console.error('❌ 토큰 조회 실패:', error);
    return null;
  }
}

/**
 * 저장된 리프레시 토큰 조회
 */
export async function getStoredRefreshToken(mallId: string): Promise<string | null> {
  if (!db) {
    throw new Error('Firebase가 초기화되지 않았습니다.');
  }

  try {
    const tokenDocRef = doc(db, TOKENS_COLLECTION, mallId);
    const docSnap = await getDoc(tokenDocRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return data.refresh_token || null;

  } catch (error) {
    console.error('❌ 리프레시 토큰 조회 실패:', error);
    return null;
  }
}

/**
 * 쇼핑몰 데이터 조회
 */
export async function getShopData(mallId: string): Promise<ShopData | null> {
  if (!db) {
    throw new Error('Firebase가 초기화되지 않았습니다.');
  }

  try {
    const shopDocRef = doc(db, SHOPS_COLLECTION, mallId);
    const docSnap = await getDoc(shopDocRef);

    if (!docSnap.exists()) {
      console.log(`⚠️ 쇼핑몰 데이터가 존재하지 않음: ${mallId}`);
      return null;
    }

    const data = docSnap.data();
    
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

  } catch (error) {
    console.error('❌ 쇼핑몰 데이터 조회 실패:', error);
    return null;
  }
}

/**
 * 토큰 데이터 업데이트
 */
export async function updateTokenData(
  mallId: string, 
  tokenData: Partial<TokenData>
): Promise<void> {
  if (!db) {
    throw new Error('Firebase가 초기화되지 않았습니다.');
  }

  try {
    const now = new Date();
    const updateData: any = {
      updated_at: now.toISOString(),
      last_refresh_at: now.toISOString()
    };

    if (tokenData.access_token) {
      updateData.access_token = tokenData.access_token;
    }

    if (tokenData.refresh_token) {
      updateData.refresh_token = tokenData.refresh_token;
    }

    if (tokenData.expires_in) {
      const expiresAt = new Date(now.getTime() + (tokenData.expires_in * 1000));
      updateData.expires_at = expiresAt.toISOString();
      updateData.expires_in = tokenData.expires_in;
    }

    if (tokenData.token_type) {
      updateData.token_type = tokenData.token_type;
    }

    if (tokenData.scope) {
      updateData.scope = tokenData.scope;
    }

    updateData.status = 'ready';

    // 토큰 컬렉션 업데이트
    const tokenDocRef = doc(db, TOKENS_COLLECTION, mallId);
    await setDoc(tokenDocRef, updateData, { merge: true });

    // 쇼핑몰 컬렉션 업데이트
    const shopDocRef = doc(db, SHOPS_COLLECTION, mallId);
    await setDoc(shopDocRef, updateData, { merge: true });

    console.log(`✅ 토큰 데이터 업데이트 완료: ${mallId}`);

  } catch (error) {
    console.error('❌ 토큰 업데이트 실패:', error);
    throw new Error(`토큰 업데이트 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 토큰 상태 확인
 */
export async function checkTokenStatus(mallId: string): Promise<TokenStatus> {
  try {
    const tokenData = await getStoredAccessToken(mallId);
    
    if (!tokenData) {
      return {
        valid: false,
        expiresAt: null,
        minutesLeft: 0,
        needsRefresh: false,
        error: '토큰이 없습니다.'
      };
    }

    const now = Date.now();
    const expiresAt = tokenData.expires_at;
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
      needsRefresh: needsRefresh,
      error: undefined
    };

  } catch (error) {
    return {
      valid: false,
      expiresAt: null,
      minutesLeft: 0,
      needsRefresh: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 토큰 삭제
 */
export async function deleteStoredToken(mallId: string): Promise<void> {
  if (!db) {
    throw new Error('Firebase가 초기화되지 않았습니다.');
  }

  try {
    // 토큰 컬렉션에서 삭제
    const tokenDocRef = doc(db, TOKENS_COLLECTION, mallId);
    await deleteDoc(tokenDocRef);

    // 쇼핑몰 컬렉션에서 토큰 정보만 제거
    const shopDocRef = doc(db, SHOPS_COLLECTION, mallId);
    await setDoc(shopDocRef, {
      access_token: '',
      refresh_token: '',
      status: 'expired',
      updated_at: new Date().toISOString()
    }, { merge: true });

    console.log(`✅ 토큰 삭제 완료: ${mallId}`);

  } catch (error) {
    console.error('❌ 토큰 삭제 실패:', error);
    throw new Error(`토큰 삭제 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ===== 레거시 호환성 함수들 =====

/**
 * @deprecated saveTokenData 사용 권장
 */
export async function saveAccessToken(
  mallId: string,
  accessToken: string,
  expiresIn: number,
  refreshToken?: string,
  tokenType?: string
): Promise<void> {
  const tokenData: TokenData = {
    access_token: accessToken,
    expires_in: expiresIn,
    refresh_token: refreshToken,
    token_type: tokenType || 'Bearer'
  };

  await saveTokenData(mallId, tokenData);
}

/**
 * 만료된 토큰 정리 (단순 로그만 출력)
 */
export async function cleanupExpiredTokens(): Promise<number> {
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