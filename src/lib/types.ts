// 카페24 토큰 관리 시스템 타입 정의

// ===== 토큰 관련 타입 =====
export interface StoredToken {
  access_token: string;
  expires_at: number; // Unix timestamp
  refresh_token?: string;
  token_type?: string;
  scope?: string;
}

export interface TokenData {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  issued_at?: number;
}

export interface TokenStatus {
  valid: boolean;
  expiresAt: number | null;
  minutesLeft: number;
  needsRefresh: boolean;
  error?: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  access_token?: string;
  expires_in?: number;
  expires_at?: number;
  error?: string;
}

// ===== 쇼핑몰 정보 타입 =====
export interface ShopData {
  mall_id: string;
  user_id: string;
  user_name: string;
  user_type: string;
  timestamp: string;
  hmac: string;
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  expires_at: string;
  token_error?: string;
  installed_at: Date | string;
  updated_at?: Date | string;
  last_refresh_at?: Date | string;
  status: 'ready' | 'error' | 'pending' | 'expired';
  app_type: 'oauth' | 'private';
  auth_code?: string;
  client_id?: string;
  scope?: string;
}

// ===== API 요청/응답 타입 =====
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  data?: any;
  params?: Record<string, string>;
  timeout?: number;
}

export interface Cafe24ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface Cafe24ApiError {
  error: string;
  error_description?: string;
  error_code?: string;
  error_type?: string;
}

// ===== OAuth 인증 타입 =====
export interface AuthUrlParams {
  mall_id: string;
  client_id: string;
  redirect_uri: string;
  scope: string;
  state: string;
  response_type?: string;
}

export interface AuthUrlResponse {
  success: boolean;
  auth_url?: string;
  params?: AuthUrlParams;
  expires_in?: number;
  created_at?: string;
  error?: string;
}

// ===== 게시판 API 타입 =====
export interface BoardListResponse {
  boards: BoardInfo[];
  links?: any[];
}

export interface BoardInfo {
  shop_no: number;
  board_no: number;
  board_id: string;
  board_name: string;
  board_skin: string;
  board_type: string;
  board_category: string;
  board_list_type: string;
  board_use: string;
  board_sort: string;
  board_write_member_class: string;
  board_read_member_class: string;
  board_comment_member_class: string;
  board_attach_file_use: string;
  board_attach_file_size: string;
  board_attach_file_count: number;
  board_attach_image_use: string;
  board_attach_image_size: string;
  board_attach_image_count: number;
  board_use_comment: string;
  board_use_secret: string;
  board_use_notice: string;
  board_use_html: string;
  board_use_category: string;
  board_category_list: string[];
  board_use_list_category: string;
  board_use_list_secret: string;
  board_use_list_attach_file: string;
  board_use_list_attach_image: string;
  board_use_list_hit: string;
  board_use_list_recommend: string;
  board_use_list_comment: string;
  board_use_list_date: string;
  board_use_list_name: string;
  board_use_list_ip: string;
  board_use_list_point: string;
  board_use_list_member_icon: string;
  board_use_list_member_level: string;
  board_use_list_member_group: string;
  board_use_list_member_id: string;
  board_use_list_member_name: string;
  board_use_list_member_nick: string;
  board_use_list_member_email: string;
  board_use_list_member_phone: string;
  board_use_list_member_mobile: string;
  board_use_list_member_birthday: string;
  board_use_list_member_gender: string;
  board_use_list_member_join_date: string;
  board_use_list_member_last_login: string;
  board_use_list_member_point: string;
  board_use_list_member_accumulate: string;
  board_use_list_member_mileage: string;
  board_use_list_member_deposit: string;
  board_use_list_member_group_name: string;
  board_use_list_member_group_color: string;
  board_use_list_member_group_icon: string;
  board_use_list_member_group_image: string;
  board_use_list_member_group_discount: string;
  board_use_list_member_group_mileage: string;
  board_use_list_member_group_point: string;
  board_use_list_member_group_accumulate: string;
  board_use_list_member_group_deposit: string;
  board_use_list_member_group_order_count: string;
  board_use_list_member_group_order_amount: string;
  board_use_list_member_group_order_product_count: string;
  board_use_list_member_group_order_product_amount: string;
  board_use_list_member_group_order_cancel_count: string;
  board_use_list_member_group_order_cancel_amount: string;
  board_use_list_member_group_order_return_count: string;
  board_use_list_member_group_order_return_amount: string;
  board_use_list_member_group_order_exchange_count: string;
  board_use_list_member_group_order_exchange_amount: string;
  board_use_list_member_group_order_refund_count: string;
  board_use_list_member_group_order_refund_amount: string;
  board_use_list_member_group_review_count: string;
  board_use_list_member_group_review_point: string;
  board_use_list_member_group_qna_count: string;
  board_use_list_member_group_qna_point: string;
  board_use_list_member_group_board_count: string;
  board_use_list_member_group_board_point: string;
  board_use_list_member_group_comment_count: string;
  board_use_list_member_group_comment_point: string;
  board_use_list_member_group_visit_count: string;
  board_use_list_member_group_visit_point: string;
  board_use_list_member_group_login_count: string;
  board_use_list_member_group_login_point: string;
  board_use_list_member_group_signup_point: string;
  board_use_list_member_group_recommend_point: string;
  board_use_list_member_group_recommend_count: string;
  board_use_list_member_group_recommend_limit: string;
  board_use_list_member_group_recommend_limit_day: string;
  board_use_list_member_group_recommend_limit_month: string;
  board_use_list_member_group_recommend_limit_year: string;
  board_use_list_member_group_recommend_limit_total: string;
  board_use_list_member_group_sms_use: string;
  board_use_list_member_group_email_use: string;
  board_use_list_member_group_push_use: string;
  board_use_list_member_group_kakao_use: string;
  board_use_list_member_group_line_use: string;
  board_use_list_member_group_facebook_use: string;
  board_use_list_member_group_twitter_use: string;
  board_use_list_member_group_instagram_use: string;
  board_use_list_member_group_youtube_use: string;
  board_use_list_member_group_blog_use: string;
  board_use_list_member_group_homepage_use: string;
  board_use_list_member_group_etc_use: string;
  created_date: string;
  updated_date: string;
}

export interface BoardArticle {
  shop_no: number;
  article_no: number;
  board_no: number;
  article_code: string;
  article_title: string;
  article_content: string;
  article_summary: string;
  article_author: string;
  article_reply_type: string;
  article_parent_no: number;
  article_answer_status: string;
  article_category: string;
  article_use_notice: string;
  article_use_secret: string;
  article_use_html: string;
  article_use_reply: string;
  article_use_comment: string;
  article_use_list_main: string;
  article_use_list_category: string;
  article_use_list_board: string;
  article_attach_file_urls: string[];
  article_attach_file_names: string[];
  article_attach_image_urls: string[];
  article_attach_image_names: string[];
  article_hit: number;
  article_recommend: number;
  article_comment_count: number;
  article_member_id: string;
  article_member_name: string;
  article_member_nick: string;
  article_member_email: string;
  article_member_phone: string;
  article_member_mobile: string;
  article_member_ip: string;
  article_member_point: number;
  article_member_level: number;
  article_member_group: string;
  article_member_group_name: string;
  article_member_group_color: string;
  article_member_group_icon: string;
  article_member_group_image: string;
  article_write_date: string;
  article_update_date: string;
  created_date: string;
  updated_date: string;
}

export interface BoardComment {
  shop_no: number;
  comment_no: number;
  article_no: number;
  board_no: number;
  comment_content: string;
  comment_author: string;
  comment_member_id: string;
  comment_member_name: string;
  comment_member_nick: string;
  comment_member_email: string;
  comment_member_phone: string;
  comment_member_mobile: string;
  comment_member_ip: string;
  comment_member_point: number;
  comment_member_level: number;
  comment_member_group: string;
  comment_member_group_name: string;
  comment_member_group_color: string;
  comment_member_group_icon: string;
  comment_member_group_image: string;
  comment_write_date: string;
  comment_update_date: string;
  created_date: string;
  updated_date: string;
}

// ===== 스케줄러 타입 =====
export interface SchedulerConfig {
  intervalMinutes: number;
  enableAutoRefresh: boolean;
  refreshThresholdMinutes: number;
  enableNotifications: boolean;
  notificationThresholdMinutes: number;
  maxRetryAttempts: number;
  retryDelaySeconds: number;
}

export interface SchedulerLog {
  timestamp: string;
  type: 'check' | 'refresh' | 'notification' | 'error';
  mall_id?: string;
  message: string;
  details?: any;
  success: boolean;
  duration_ms?: number;
}

export interface SchedulerStatus {
  isRunning: boolean;
  lastRun: string | null;
  nextRun: string | null;
  totalChecks: number;
  totalRefreshes: number;
  totalErrors: number;
  config: SchedulerConfig;
}

// ===== 헬스 체크 타입 =====
export interface HealthCheckResult {
  success: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
  timestamp: string;
}

// ===== 로그 타입 =====
export interface ApiLog {
  timestamp: string;
  mall_id: string;
  api_name: string;
  endpoint: string;
  method: string;
  request_data: Record<string, unknown>;
  response_data: Record<string, unknown>;
  status_code: number;
  response_time: number;
  error_message?: string;
  success: boolean;
}

// ===== 유틸리티 타입 =====
export type AppType = 'oauth' | 'private';
export type TokenGrantType = 'authorization_code' | 'refresh_token' | 'client_credentials';
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type ShopStatus = 'ready' | 'error' | 'pending' | 'expired';

// ===== 환경 변수 타입 =====
export interface Cafe24Config {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
  apiVersion: string;
}

// ===== 에러 타입 =====
export class Cafe24TokenError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'Cafe24TokenError';
  }
}

export class Cafe24ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'Cafe24ApiError';
  }
}

// ===== 상수 =====
export const TOKEN_EXPIRY_BUFFER_MINUTES = 5;
export const DEFAULT_SCHEDULER_INTERVAL_MINUTES = 360; // 6시간
export const DEFAULT_NOTIFICATION_THRESHOLD_MINUTES = 60; // 1시간
export const DEFAULT_API_TIMEOUT_MS = 30000; // 30초
export const DEFAULT_RETRY_ATTEMPTS = 3;
export const DEFAULT_RETRY_DELAY_SECONDS = 5;

// ===== 컬렉션 이름 =====
export const COLLECTIONS = {
  SHOPS: 'shops',
  TOKENS: 'cafe24_tokens',
  LOGS: 'cafe24_logs',
  SCHEDULER_LOGS: 'scheduler_logs'
} as const;

// ===== Firebase 문서 ID =====
export const DOCUMENT_IDS = {
  TOKENS: 'tokens',
  CONFIG: 'config',
  STATUS: 'status'
} as const; 