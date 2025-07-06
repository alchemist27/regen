import { db } from './firebase';
import { collection, addDoc, serverTimestamp, FieldValue } from 'firebase/firestore';

export interface ApiLogEntry {
  mall_id: string;
  api_type: 'cafe24_articles' | 'cafe24_comments' | 'openai_gpt';
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  request_data?: Record<string, unknown>;
  response_data?: Record<string, unknown>;
  status_code: number;
  error_message?: string;
  execution_time_ms: number;
  timestamp: FieldValue;
  tokens_used?: number; // GPT API용
  cost_estimate?: number; // 비용 추정용
}

export async function logApiRequest(logEntry: Omit<ApiLogEntry, 'timestamp'>) {
  try {
    const docRef = await addDoc(collection(db, 'api_logs'), {
      ...logEntry,
      timestamp: serverTimestamp()
    });
    
    console.log('API 로그 저장 완료:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('API 로그 저장 실패:', error);
    throw error;
  }
}

export async function logCafe24Request(
  mallId: string,
  apiType: 'cafe24_articles' | 'cafe24_comments',
  endpoint: string,
  method: 'GET' | 'POST',
  requestData: Record<string, unknown>,
  responseData: Record<string, unknown>,
  statusCode: number,
  executionTime: number,
  errorMessage?: string
) {
  return await logApiRequest({
    mall_id: mallId,
    api_type: apiType,
    endpoint,
    method,
    request_data: requestData,
    response_data: responseData,
    status_code: statusCode,
    error_message: errorMessage,
    execution_time_ms: executionTime
  });
}

export async function logGptRequest(
  mallId: string,
  endpoint: string,
  requestData: Record<string, unknown>,
  responseData: Record<string, unknown>,
  statusCode: number,
  executionTime: number,
  tokensUsed: number,
  costEstimate: number,
  errorMessage?: string
) {
  return await logApiRequest({
    mall_id: mallId,
    api_type: 'openai_gpt',
    endpoint,
    method: 'POST',
    request_data: requestData,
    response_data: responseData,
    status_code: statusCode,
    error_message: errorMessage,
    execution_time_ms: executionTime,
    tokens_used: tokensUsed,
    cost_estimate: costEstimate
  });
} 