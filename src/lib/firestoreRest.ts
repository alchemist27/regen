import type { ShopData } from './types';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

/**
 * Firestore REST API를 사용하여 쇼핑몰 데이터 저장
 */
export async function saveShopDataViaRest(mallId: string, shopData: ShopData): Promise<boolean> {
  if (!PROJECT_ID || !API_KEY) {
    console.warn('Firebase 프로젝트 ID 또는 API 키가 없습니다.');
    return false;
  }

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/shops/${mallId}?key=${API_KEY}`;
    
    // Firestore 문서 형식으로 변환
    const firestoreDoc = {
      fields: {
        mall_id: { stringValue: shopData.mall_id },
        user_id: { stringValue: shopData.user_id },
        user_name: { stringValue: shopData.user_name },
        user_type: { stringValue: shopData.user_type },
        timestamp: { stringValue: shopData.timestamp },
        hmac: { stringValue: shopData.hmac },
        access_token: { stringValue: shopData.access_token },
        refresh_token: { stringValue: shopData.refresh_token },
        token_type: { stringValue: shopData.token_type },
        expires_in: { integerValue: (shopData.expires_in || 7200).toString() },
        expires_at: { stringValue: shopData.expires_at },
        token_error: { stringValue: shopData.token_error },
        installed_at: { stringValue: shopData.installed_at },
        updated_at: { stringValue: shopData.updated_at },
        last_refresh_at: { stringValue: shopData.last_refresh_at },
        status: { stringValue: shopData.status },
        app_type: { stringValue: shopData.app_type },
        auth_code: { stringValue: shopData.auth_code },
        client_id: { stringValue: shopData.client_id },
        scope: { stringValue: shopData.scope }
      }
    };

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(firestoreDoc)
    });

    if (response.ok) {
      console.log('✅ Firestore REST API로 쇼핑몰 데이터 저장 성공:', mallId);
      return true;
    } else {
      const errorData = await response.text();
      console.error('❌ Firestore REST API 저장 실패:', response.status, errorData);
      return false;
    }
  } catch (error) {
    console.error('❌ Firestore REST API 저장 오류:', error);
    return false;
  }
}

/**
 * Firestore REST API를 사용하여 쇼핑몰 데이터 조회
 */
export async function getShopDataViaRest(mallId: string): Promise<ShopData | null> {
  if (!PROJECT_ID || !API_KEY) {
    console.warn('Firebase 프로젝트 ID 또는 API 키가 없습니다.');
    return null;
  }

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/shops/${mallId}?key=${API_KEY}`;
    
    const response = await fetch(url);

    if (response.status === 404) {
      console.log('📋 Firestore에서 문서를 찾을 수 없음:', mallId);
      return null;
    }

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Firestore REST API 조회 실패:', response.status, errorData);
      return null;
    }

    const doc = await response.json();
    
    if (!doc.fields) {
      console.log('📋 Firestore 문서에 필드가 없음:', mallId);
      return null;
    }

    // Firestore 문서 형식에서 일반 객체로 변환
    const shopData: ShopData = {
      mall_id: doc.fields.mall_id?.stringValue || mallId,
      user_id: doc.fields.user_id?.stringValue || '',
      user_name: doc.fields.user_name?.stringValue || '',
      user_type: doc.fields.user_type?.stringValue || '',
      timestamp: doc.fields.timestamp?.stringValue || '',
      hmac: doc.fields.hmac?.stringValue || '',
      access_token: doc.fields.access_token?.stringValue || '',
      refresh_token: doc.fields.refresh_token?.stringValue || '',
      token_type: doc.fields.token_type?.stringValue || 'Bearer',
      expires_in: parseInt(doc.fields.expires_in?.integerValue || '7200'),
      expires_at: doc.fields.expires_at?.stringValue || '',
      token_error: doc.fields.token_error?.stringValue || '',
      installed_at: doc.fields.installed_at?.stringValue || '',
      updated_at: doc.fields.updated_at?.stringValue || '',
      last_refresh_at: doc.fields.last_refresh_at?.stringValue || '',
      status: doc.fields.status?.stringValue as 'ready' | 'error' | 'pending' | 'expired' || 'pending',
      app_type: doc.fields.app_type?.stringValue as 'oauth' | 'private' || 'oauth',
      auth_code: doc.fields.auth_code?.stringValue || '',
      client_id: doc.fields.client_id?.stringValue || '',
      scope: doc.fields.scope?.stringValue || 'mall.read_community,mall.write_community'
    };

    console.log('✅ Firestore REST API로 쇼핑몰 데이터 조회 성공:', mallId);
    return shopData;
  } catch (error) {
    console.error('❌ Firestore REST API 조회 오류:', error);
    return null;
  }
}

/**
 * Firestore REST API를 사용하여 쇼핑몰 데이터 업데이트
 */
export async function updateShopDataViaRest(mallId: string, updates: Partial<ShopData>): Promise<boolean> {
  if (!PROJECT_ID || !API_KEY) {
    console.warn('Firebase 프로젝트 ID 또는 API 키가 없습니다.');
    return false;
  }

  try {
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/shops/${mallId}?key=${API_KEY}`;
    const updateMasks = ['updated_at', 'last_refresh_at'];
    
    // 업데이트할 필드만 포함
    const updateFields: Record<string, { stringValue?: string; integerValue?: string }> = {
      updated_at: { stringValue: new Date().toISOString() },
      last_refresh_at: { stringValue: new Date().toISOString() }
    };

    // 업데이트 필드 추가
    if (updates.access_token) {
      updateFields.access_token = { stringValue: updates.access_token };
      updateMasks.push('access_token');
    }

    if (updates.refresh_token) {
      updateFields.refresh_token = { stringValue: updates.refresh_token };
      updateMasks.push('refresh_token');
    }

    if (updates.expires_at) {
      updateFields.expires_at = { stringValue: updates.expires_at };
      updateMasks.push('expires_at');
    }

    if (updates.expires_in) {
      updateFields.expires_in = { integerValue: updates.expires_in.toString() };
      updateMasks.push('expires_in');
    }

    if (updates.status) {
      updateFields.status = { stringValue: updates.status };
      updateMasks.push('status');
    }

    const url = baseUrl + '&' + updateMasks.map(field => `updateMask.fieldPaths=${field}`).join('&');

    const firestoreDoc = { fields: updateFields };

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(firestoreDoc)
    });

    if (response.ok) {
      console.log('✅ Firestore REST API로 쇼핑몰 데이터 업데이트 성공:', mallId);
      return true;
    } else {
      const errorData = await response.text();
      console.error('❌ Firestore REST API 업데이트 실패:', response.status, errorData);
      return false;
    }
  } catch (error) {
    console.error('❌ Firestore REST API 업데이트 오류:', error);
    return false;
  }
} 