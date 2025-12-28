use std::collections::VecDeque;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

/// TCP輻輳制御アルゴリズム
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CongestionControlAlgorithm {
    /// Reno - 伝統的なアルゴリズム
    Reno,
    /// CUBIC - Linux標準
    Cubic,
    /// BBR - Bottleneck Bandwidth and RTT
    Bbr,
}

/// TCP輻輳制御の状態
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CongestionState {
    SlowStart,
    CongestionAvoidance,
    FastRecovery,
    LossRecovery,
}

/// RTT（Round Trip Time）測定
#[derive(Debug, Clone)]
pub struct RttEstimator {
    srtt: Option<Duration>,  // Smoothed RTT
    rttvar: Duration,         // RTT variation
    min_rtt: Duration,
    max_rtt: Duration,
    samples: VecDeque<Duration>,
    max_samples: usize,
}

impl RttEstimator {
    pub fn new() -> Self {
        RttEstimator {
            srtt: None,
            rttvar: Duration::from_millis(100),
            min_rtt: Duration::from_secs(u64::MAX),
            max_rtt: Duration::from_millis(0),
            samples: VecDeque::new(),
            max_samples: 100,
        }
    }

    /// RTTサンプルを追加
    pub fn add_sample(&mut self, rtt: Duration) {
        self.samples.push_back(rtt);
        if self.samples.len() > self.max_samples {
            self.samples.pop_front();
        }

        // 最小/最大を更新
        if rtt < self.min_rtt {
            self.min_rtt = rtt;
        }
        if rtt > self.max_rtt {
            self.max_rtt = rtt;
        }

        // SRTT (Smoothed RTT)とRTTVARの計算 (RFC 6298)
        if let Some(srtt) = self.srtt {
            let alpha = 0.125;
            let beta = 0.25;

            let rtt_diff = if rtt > srtt {
                rtt - srtt
            } else {
                srtt - rtt
            };

            self.rttvar = Duration::from_secs_f64(
                (1.0 - beta) * self.rttvar.as_secs_f64() + beta * rtt_diff.as_secs_f64()
            );

            self.srtt = Some(Duration::from_secs_f64(
                (1.0 - alpha) * srtt.as_secs_f64() + alpha * rtt.as_secs_f64()
            ));
        } else {
            self.srtt = Some(rtt);
            self.rttvar = rtt / 2;
        }
    }

    /// 現在のRTTを取得
    pub fn current_rtt(&self) -> Option<Duration> {
        self.srtt
    }

    /// 最小RTTを取得
    pub fn min_rtt(&self) -> Duration {
        self.min_rtt
    }

    /// RTOタイムアウトを計算 (Retransmission Timeout)
    pub fn calculate_rto(&self) -> Duration {
        if let Some(srtt) = self.srtt {
            let rto = srtt + Duration::from_secs_f64(4.0 * self.rttvar.as_secs_f64());
            // 最小1秒、最大60秒
            rto.max(Duration::from_secs(1)).min(Duration::from_secs(60))
        } else {
            Duration::from_secs(3) // デフォルト
        }
    }
}

impl Default for RttEstimator {
    fn default() -> Self {
        Self::new()
    }
}

/// TCP BBR (Bottleneck Bandwidth and RTT)輻輳制御
#[derive(Debug)]
pub struct BbrCongestionControl {
    /// 輻輳ウィンドウ (bytes)
    pub cwnd: u32,
    /// スロースタート閾値 (bytes)
    pub ssthresh: u32,
    /// 推定ボトルネック帯域幅 (bytes/sec)
    pub btlbw: f64,
    /// RTT測定
    pub rtt_estimator: RttEstimator,
    /// 状態
    pub state: CongestionState,
    /// プローブ状態
    pub probe_rtt_time: Option<Instant>,
    pub cycle_index: usize,
    pub pacing_gain: f64,
    pub cwnd_gain: f64,
}

impl BbrCongestionControl {
    pub fn new(initial_cwnd: u32) -> Self {
        BbrCongestionControl {
            cwnd: initial_cwnd,
            ssthresh: u32::MAX,
            btlbw: 0.0,
            rtt_estimator: RttEstimator::new(),
            state: CongestionState::SlowStart,
            probe_rtt_time: None,
            cycle_index: 0,
            pacing_gain: 1.0,
            cwnd_gain: 2.0,
        }
    }

    /// ACKを受信した時の処理
    pub fn on_ack(&mut self, acked_bytes: u32, rtt: Duration, now: Instant) {
        // RTT測定を更新
        self.rtt_estimator.add_sample(rtt);

        // 帯域幅を推定
        let delivery_rate = (acked_bytes as f64) / rtt.as_secs_f64();
        if delivery_rate > self.btlbw {
            self.btlbw = delivery_rate;
        }

        match self.state {
            CongestionState::SlowStart => {
                self.cwnd += acked_bytes;

                // BBRのスロースタート終了条件
                if let Some(min_rtt) = self.rtt_estimator.current_rtt() {
                    let bdp = (self.btlbw * min_rtt.as_secs_f64()) as u32;
                    if self.cwnd >= bdp * 2 {
                        self.state = CongestionState::CongestionAvoidance;
                        self.ssthresh = self.cwnd;
                        self.cwnd_gain = 1.0;
                    }
                }
            }
            CongestionState::CongestionAvoidance => {
                // BBR ProbeBW phase - サイクリックゲインを使用
                let gains = [1.25, 0.75, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
                self.pacing_gain = gains[self.cycle_index % gains.len()];

                if let Some(min_rtt) = self.rtt_estimator.current_rtt() {
                    let bdp = (self.btlbw * min_rtt.as_secs_f64()) as u32;
                    let target_cwnd = (bdp as f64 * self.cwnd_gain) as u32;

                    if self.cwnd < target_cwnd {
                        self.cwnd += acked_bytes.min(1460);
                    }
                }

                // ProbeRTTの定期的なトリガー (10秒ごと)
                if let Some(probe_time) = self.probe_rtt_time {
                    if now.duration_since(probe_time) > Duration::from_secs(10) {
                        self.enter_probe_rtt(now);
                    }
                } else {
                    self.probe_rtt_time = Some(now);
                }
            }
            _ => {}
        }
    }

    /// パケットロスを検出した時の処理
    pub fn on_loss(&mut self) {
        self.state = CongestionState::LossRecovery;
        self.ssthresh = self.cwnd / 2;
        self.cwnd = self.ssthresh.max(2 * 1460); // 最低2セグメント
        self.btlbw *= 0.9; // 帯域幅推定を減少
    }

    /// ProbeRTT状態に入る
    fn enter_probe_rtt(&mut self, now: Instant) {
        self.cwnd = 4 * 1460; // 最小ウィンドウサイズ
        self.probe_rtt_time = Some(now);
    }

    /// 現在のペーシングレート (bytes/sec)
    pub fn pacing_rate(&self) -> f64 {
        self.btlbw * self.pacing_gain
    }

    /// 送信可能バイト数を取得
    pub fn bytes_in_flight_limit(&self) -> u32 {
        self.cwnd
    }
}

/// CUBIC輻輳制御
#[derive(Debug)]
pub struct CubicCongestionControl {
    pub cwnd: u32,
    pub ssthresh: u32,
    pub rtt_estimator: RttEstimator,
    pub state: CongestionState,

    // CUBIC固有のパラメータ
    pub w_max: f64,           // 最後のロス時のウィンドウサイズ
    pub k: f64,               // 時刻の調整パラメータ
    pub epoch_start: Option<Instant>,
    pub origin_point: f64,
    pub c: f64,               // CUBICパラメータ (デフォルト 0.4)
    pub beta: f64,            // 乗算的減少係数 (デフォルト 0.7)
}

impl CubicCongestionControl {
    pub fn new(initial_cwnd: u32) -> Self {
        CubicCongestionControl {
            cwnd: initial_cwnd,
            ssthresh: u32::MAX,
            rtt_estimator: RttEstimator::new(),
            state: CongestionState::SlowStart,
            w_max: 0.0,
            k: 0.0,
            epoch_start: None,
            origin_point: 0.0,
            c: 0.4,
            beta: 0.7,
        }
    }

    pub fn on_ack(&mut self, acked_bytes: u32, rtt: Duration, now: Instant) {
        self.rtt_estimator.add_sample(rtt);

        match self.state {
            CongestionState::SlowStart => {
                self.cwnd += acked_bytes;

                if self.cwnd >= self.ssthresh {
                    self.state = CongestionState::CongestionAvoidance;
                    self.epoch_start = Some(now);
                }
            }
            CongestionState::CongestionAvoidance => {
                if self.epoch_start.is_none() {
                    self.epoch_start = Some(now);

                    if self.cwnd < (self.w_max as u32) {
                        self.k = ((self.w_max - self.cwnd as f64) / self.c).powf(1.0 / 3.0);
                        self.origin_point = self.w_max;
                    } else {
                        self.k = 0.0;
                        self.origin_point = self.cwnd as f64;
                    }
                }

                let t = now.duration_since(self.epoch_start.unwrap()).as_secs_f64();
                let target = self.origin_point + self.c * (t - self.k).powi(3);

                if target > self.cwnd as f64 {
                    let delta = (target - self.cwnd as f64) as u32;
                    self.cwnd += delta.min(acked_bytes);
                } else {
                    self.cwnd += acked_bytes / self.cwnd;
                }
            }
            CongestionState::FastRecovery => {
                self.cwnd += acked_bytes;
                if self.cwnd >= self.ssthresh {
                    self.state = CongestionState::CongestionAvoidance;
                }
            }
            _ => {}
        }
    }

    pub fn on_loss(&mut self) {
        self.w_max = self.cwnd as f64;
        self.ssthresh = (self.cwnd as f64 * self.beta) as u32;
        self.cwnd = self.ssthresh;
        self.state = CongestionState::FastRecovery;
        self.epoch_start = None;
    }
}

/// 輻輳制御マネージャー
pub struct CongestionControlManager {
    algorithm: CongestionControlAlgorithm,
    bbr: Option<Arc<Mutex<BbrCongestionControl>>>,
    cubic: Option<Arc<Mutex<CubicCongestionControl>>>,
}

impl CongestionControlManager {
    pub fn new(algorithm: CongestionControlAlgorithm, initial_cwnd: u32) -> Self {
        let (bbr, cubic) = match algorithm {
            CongestionControlAlgorithm::Bbr => {
                (Some(Arc::new(Mutex::new(BbrCongestionControl::new(initial_cwnd)))), None)
            }
            CongestionControlAlgorithm::Cubic => {
                (None, Some(Arc::new(Mutex::new(CubicCongestionControl::new(initial_cwnd)))))
            }
            CongestionControlAlgorithm::Reno => (None, None),
        };

        CongestionControlManager {
            algorithm,
            bbr,
            cubic,
        }
    }

    pub fn on_ack(&self, acked_bytes: u32, rtt: Duration, now: Instant) {
        match self.algorithm {
            CongestionControlAlgorithm::Bbr => {
                if let Some(bbr) = &self.bbr {
                    bbr.lock().unwrap().on_ack(acked_bytes, rtt, now);
                }
            }
            CongestionControlAlgorithm::Cubic => {
                if let Some(cubic) = &self.cubic {
                    cubic.lock().unwrap().on_ack(acked_bytes, rtt, now);
                }
            }
            CongestionControlAlgorithm::Reno => {
                // Reno実装（簡略版）
            }
        }
    }

    pub fn on_loss(&self) {
        match self.algorithm {
            CongestionControlAlgorithm::Bbr => {
                if let Some(bbr) = &self.bbr {
                    bbr.lock().unwrap().on_loss();
                }
            }
            CongestionControlAlgorithm::Cubic => {
                if let Some(cubic) = &self.cubic {
                    cubic.lock().unwrap().on_loss();
                }
            }
            CongestionControlAlgorithm::Reno => {}
        }
    }

    pub fn current_cwnd(&self) -> u32 {
        match self.algorithm {
            CongestionControlAlgorithm::Bbr => {
                self.bbr.as_ref().map(|b| b.lock().unwrap().cwnd).unwrap_or(10 * 1460)
            }
            CongestionControlAlgorithm::Cubic => {
                self.cubic.as_ref().map(|c| c.lock().unwrap().cwnd).unwrap_or(10 * 1460)
            }
            CongestionControlAlgorithm::Reno => 10 * 1460,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rtt_estimator() {
        let mut estimator = RttEstimator::new();

        estimator.add_sample(Duration::from_millis(100));
        estimator.add_sample(Duration::from_millis(110));
        estimator.add_sample(Duration::from_millis(90));

        assert!(estimator.current_rtt().is_some());
        assert_eq!(estimator.min_rtt(), Duration::from_millis(90));
    }

    #[test]
    fn test_bbr_slow_start() {
        let mut bbr = BbrCongestionControl::new(10 * 1460);
        let now = Instant::now();

        assert_eq!(bbr.state, CongestionState::SlowStart);

        bbr.on_ack(1460, Duration::from_millis(50), now);
        assert!(bbr.cwnd > 10 * 1460);
    }

    #[test]
    fn test_cubic_on_loss() {
        let mut cubic = CubicCongestionControl::new(100 * 1460);

        cubic.on_loss();

        assert!(cubic.cwnd < 100 * 1460);
        assert_eq!(cubic.state, CongestionState::FastRecovery);
    }
}
