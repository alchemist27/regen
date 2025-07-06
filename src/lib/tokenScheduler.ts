import { createCafe24Client } from './cafe24Client';
import { 
  getShopsExpiringSoon, 
  getShopsNeedingRefresh,
  getTokenStatistics,
  cleanupExpiredTokens 
} from './tokenStore';
import { getAdminDb } from './firebase';
import { 
  SchedulerConfig,
  SchedulerLog, 
  SchedulerStatus,
  COLLECTIONS,
  DEFAULT_SCHEDULER_INTERVAL_MINUTES,
  DEFAULT_NOTIFICATION_THRESHOLD_MINUTES,
  DEFAULT_RETRY_ATTEMPTS,
  DEFAULT_RETRY_DELAY_SECONDS
} from './types';

/**
 * 토큰 스케줄러 클래스
 */
export class TokenScheduler {
  private config: SchedulerConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private stats = {
    totalChecks: 0,
    totalRefreshes: 0,
    totalErrors: 0,
    lastRun: null as string | null,
    nextRun: null as string | null
  };

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = {
      intervalMinutes: DEFAULT_SCHEDULER_INTERVAL_MINUTES,
      enableAutoRefresh: true,
      refreshThresholdMinutes: 5,
      enableNotifications: true,
      notificationThresholdMinutes: DEFAULT_NOTIFICATION_THRESHOLD_MINUTES,
      maxRetryAttempts: DEFAULT_RETRY_ATTEMPTS,
      retryDelaySeconds: DEFAULT_RETRY_DELAY_SECONDS,
      ...config
    };
  }

  /**
   * 스케줄러 시작
   */
  public start(): void {
    if (this.isRunning) {
      console.log('⚠️ 스케줄러가 이미 실행 중입니다.');
      return;
    }

    this.isRunning = true;
    console.log(`🚀 토큰 스케줄러 시작 (${this.config.intervalMinutes}분 간격)`);

    // 즉시 한 번 실행
    this.runScheduledCheck();

    // 주기적 실행 설정
    this.intervalId = setInterval(() => {
      this.runScheduledCheck();
    }, this.config.intervalMinutes * 60 * 1000);

    // 다음 실행 시간 계산
    this.updateNextRunTime();
  }

  /**
   * 스케줄러 중지
   */
  public stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ 스케줄러가 실행 중이 아닙니다.');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    this.stats.nextRun = null;
    
    console.log('🛑 토큰 스케줄러 중지');
  }

  /**
   * 스케줄러 상태 조회
   */
  public getStatus(): SchedulerStatus {
    return {
      isRunning: this.isRunning,
      lastRun: this.stats.lastRun,
      nextRun: this.stats.nextRun,
      totalChecks: this.stats.totalChecks,
      totalRefreshes: this.stats.totalRefreshes,
      totalErrors: this.stats.totalErrors,
      config: this.config
    };
  }

  /**
   * 설정 업데이트
   */
  public updateConfig(newConfig: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 실행 중인 경우 재시작
    if (this.isRunning) {
      this.stop();
      this.start();
    }
    
    console.log('⚙️ 스케줄러 설정 업데이트:', this.config);
  }

  /**
   * 수동 토큰 확인 실행
   */
  public async runManualCheck(): Promise<void> {
    console.log('🔍 수동 토큰 확인 시작...');
    await this.runScheduledCheck();
  }

  /**
   * 스케줄된 토큰 확인 실행
   */
  private async runScheduledCheck(): Promise<void> {
    const startTime = Date.now();
    this.stats.lastRun = new Date().toISOString();
    this.stats.totalChecks++;

    try {
      console.log('🔍 스케줄된 토큰 확인 시작...');

      // 1. 만료된 토큰 정리
      await this.cleanupExpiredTokens();

      // 2. 토큰 상태 확인 및 갱신
      await this.checkAndRefreshTokens();

      // 3. 만료 임박 알림
      if (this.config.enableNotifications) {
        await this.checkExpiringTokens();
      }

      // 4. 통계 로그
      await this.logStatistics();

      const duration = Date.now() - startTime;
      console.log(`✅ 스케줄된 토큰 확인 완료 (${duration}ms)`);

      // 성공 로그 저장
      await this.saveLog({
        timestamp: new Date().toISOString(),
        type: 'check',
        message: '스케줄된 토큰 확인 완료',
        success: true,
        duration_ms: duration
      });

    } catch (error) {
      this.stats.totalErrors++;
      const duration = Date.now() - startTime;
      
      console.error('❌ 스케줄된 토큰 확인 실패:', error);

      // 오류 로그 저장
      await this.saveLog({
        timestamp: new Date().toISOString(),
        type: 'error',
        message: '스케줄된 토큰 확인 실패',
        details: error instanceof Error ? error.message : '알 수 없는 오류',
        success: false,
        duration_ms: duration
      });
    }

    this.updateNextRunTime();
  }

  /**
   * 만료된 토큰 정리
   */
  private async cleanupExpiredTokens(): Promise<void> {
    try {
      const cleanedCount = await cleanupExpiredTokens();
      
      if (cleanedCount > 0) {
        console.log(`🧹 만료된 토큰 정리: ${cleanedCount}개`);
        
        await this.saveLog({
          timestamp: new Date().toISOString(),
          type: 'check',
          message: `만료된 토큰 정리 완료: ${cleanedCount}개`,
          success: true
        });
      }
    } catch (error) {
      console.error('❌ 만료된 토큰 정리 실패:', error);
    }
  }

  /**
   * 토큰 상태 확인 및 자동 갱신
   */
  private async checkAndRefreshTokens(): Promise<void> {
    if (!this.config.enableAutoRefresh) {
      console.log('⚠️ 자동 갱신이 비활성화되어 있습니다.');
      return;
    }

    const shopsNeedingRefresh = await getShopsNeedingRefresh();
    
    if (shopsNeedingRefresh.length === 0) {
      console.log('✅ 갱신이 필요한 토큰이 없습니다.');
      return;
    }

    console.log(`🔄 토큰 갱신 필요: ${shopsNeedingRefresh.length}개 쇼핑몰`);

    for (const shop of shopsNeedingRefresh) {
      await this.refreshTokenWithRetry(shop.mall_id);
    }
  }

  /**
   * 재시도 로직이 포함된 토큰 갱신
   */
  private async refreshTokenWithRetry(mallId: string): Promise<void> {
    let attempts = 0;
    const maxAttempts = this.config.maxRetryAttempts;

    while (attempts < maxAttempts) {
      try {
        const client = createCafe24Client(mallId);
        await client.refreshAccessToken();
        
        this.stats.totalRefreshes++;
        
        console.log(`✅ 토큰 갱신 성공: ${mallId}`);
        
        await this.saveLog({
          timestamp: new Date().toISOString(),
          type: 'refresh',
          mall_id: mallId,
          message: '토큰 갱신 성공',
          success: true
        });

        return; // 성공 시 반복 중단
        
      } catch (error) {
        attempts++;
        const isLastAttempt = attempts >= maxAttempts;
        
        console.error(`❌ 토큰 갱신 실패 (${attempts}/${maxAttempts}): ${mallId}`, error);
        
        if (isLastAttempt) {
          this.stats.totalErrors++;
          
          await this.saveLog({
            timestamp: new Date().toISOString(),
            type: 'error',
            mall_id: mallId,
            message: `토큰 갱신 실패 (${attempts}회 시도)`,
            details: error instanceof Error ? error.message : '알 수 없는 오류',
            success: false
          });
        } else {
          // 재시도 대기
          await this.delay(this.config.retryDelaySeconds * 1000);
        }
      }
    }
  }

  /**
   * 만료 임박 토큰 알림
   */
  private async checkExpiringTokens(): Promise<void> {
    const expiringShops = await getShopsExpiringSoon(this.config.notificationThresholdMinutes);
    
    if (expiringShops.length === 0) {
      return;
    }

    console.log(`⚠️ 만료 임박 토큰: ${expiringShops.length}개 쇼핑몰`);

    for (const shop of expiringShops) {
      await this.saveLog({
        timestamp: new Date().toISOString(),
        type: 'notification',
        mall_id: shop.mall_id,
        message: `토큰 만료 임박 (${this.config.notificationThresholdMinutes}분 이내)`,
        details: {
          expires_at: shop.expires_at,
          user_name: shop.user_name,
          app_type: shop.app_type
        },
        success: true
      });
    }
  }

  /**
   * 토큰 통계 로그
   */
  private async logStatistics(): Promise<void> {
    const stats = await getTokenStatistics();
    
    console.log('📊 토큰 통계:', {
      전체: stats.total,
      정상: stats.ready,
      만료: stats.expired,
      오류: stats.error,
      만료임박: stats.expiringSoon,
      갱신필요: stats.needsRefresh
    });

    await this.saveLog({
      timestamp: new Date().toISOString(),
      type: 'check',
      message: '토큰 통계 확인',
      details: stats,
      success: true
    });
  }

  /**
   * 로그 저장
   */
  private async saveLog(log: SchedulerLog): Promise<void> {
    try {
      const adminDb = getAdminDb();
      if (!adminDb) {
        console.warn('⚠️ Firebase Admin DB를 사용할 수 없어 로그를 저장하지 못했습니다.');
        return;
      }

      await adminDb.collection(COLLECTIONS.SCHEDULER_LOGS).add(log);
    } catch (error) {
      console.error('❌ 스케줄러 로그 저장 실패:', error);
    }
  }

  /**
   * 다음 실행 시간 업데이트
   */
  private updateNextRunTime(): void {
    if (this.isRunning) {
      const nextRun = new Date(Date.now() + (this.config.intervalMinutes * 60 * 1000));
      this.stats.nextRun = nextRun.toISOString();
    }
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ===== 글로벌 스케줄러 인스턴스 =====
let globalScheduler: TokenScheduler | null = null;

/**
 * 스케줄러 시작
 */
export function startTokenScheduler(config?: Partial<SchedulerConfig>): TokenScheduler {
  if (globalScheduler) {
    console.log('⚠️ 스케줄러가 이미 실행 중입니다.');
    return globalScheduler;
  }

  globalScheduler = new TokenScheduler(config);
  globalScheduler.start();
  
  return globalScheduler;
}

/**
 * 스케줄러 중지
 */
export function stopTokenScheduler(): void {
  if (globalScheduler) {
    globalScheduler.stop();
    globalScheduler = null;
  }
}

/**
 * 스케줄러 상태 조회
 */
export function getSchedulerStatus(): SchedulerStatus | null {
  return globalScheduler ? globalScheduler.getStatus() : null;
}

/**
 * 스케줄러 설정 업데이트
 */
export function updateSchedulerConfig(config: Partial<SchedulerConfig>): void {
  if (globalScheduler) {
    globalScheduler.updateConfig(config);
  }
}

/**
 * 수동 토큰 확인 실행
 */
export async function runManualTokenCheck(): Promise<void> {
  if (globalScheduler) {
    await globalScheduler.runManualCheck();
  } else {
    // 일회성 실행
    const tempScheduler = new TokenScheduler();
    await tempScheduler.runManualCheck();
  }
}

/**
 * 스케줄러 로그 조회
 */
export async function getSchedulerLogs(limit: number = 100): Promise<SchedulerLog[]> {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      throw new Error('Firebase Admin DB를 사용할 수 없습니다.');
    }

    const logsSnapshot = await adminDb
      .collection(COLLECTIONS.SCHEDULER_LOGS)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const logs: SchedulerLog[] = [];
    logsSnapshot.forEach(doc => {
      logs.push(doc.data() as SchedulerLog);
    });

    return logs;
  } catch (error) {
    console.error('❌ 스케줄러 로그 조회 실패:', error);
    return [];
  }
}

/**
 * 스케줄러 로그 정리 (오래된 로그 삭제)
 */
export async function cleanupSchedulerLogs(daysToKeep: number = 30): Promise<number> {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      throw new Error('Firebase Admin DB를 사용할 수 없습니다.');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const oldLogsSnapshot = await adminDb
      .collection(COLLECTIONS.SCHEDULER_LOGS)
      .where('timestamp', '<', cutoffDate.toISOString())
      .get();

    let deletedCount = 0;
    const batch = adminDb.batch();

    oldLogsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
      deletedCount++;
    });

    if (deletedCount > 0) {
      await batch.commit();
      console.log(`🧹 오래된 스케줄러 로그 정리: ${deletedCount}개`);
    }

    return deletedCount;
  } catch (error) {
    console.error('❌ 스케줄러 로그 정리 실패:', error);
    return 0;
  }
}

// ===== 환경별 자동 시작 =====
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  // 서버 환경에서 프로덕션 모드일 때만 자동 시작
  console.log('🚀 프로덕션 환경에서 토큰 스케줄러 자동 시작');
  startTokenScheduler();
}

export default TokenScheduler; 