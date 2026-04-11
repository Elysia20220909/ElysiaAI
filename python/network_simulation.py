# blackwall_simulation.py
# CyberAcme v4.1.3 - グリッドの深淵でV_O_I_Dと戦う！Cyberpunk 2077神経マトリックス搭載
# インスピレーション元：サイバーパンク文学（『ニューロマンサー』、『攻殻機動隊』）、Tron: Legacy、Cyberpunk 2077

import csv
import json
import logging
import logging.handlers
import math
import os
import platform
import random
import shutil
import sys
import tempfile
import threading
import time
import traceback

import matplotlib
import matplotlib.pyplot as plt
import networkx as nx
from inputimeout import TimeoutOccurred, inputimeout


# 効果音用（Windows: winsound, Linux/macOS: beep）
try:
    if platform.system() == "Windows":
        import winsound
    else:
        import subprocess
except ImportError:
    winsound = None
    subprocess = None

# プラットフォーム検出
IS_IOS = "iOS" in platform.system() or "ios" in sys.platform.lower()
IS_WINDOWS = platform.system() == "Windows"
IS_MAC = platform.system() == "Darwin"

# beepコマンドの存在チェック
BEEP_AVAILABLE = False
if not IS_WINDOWS and not IS_IOS:
    try:
        BEEP_AVAILABLE = shutil.which("beep") is not None
    except Exception:
        BEEP_AVAILABLE = False


# 効果音再生関数
def play_sound(sound_type: str):
    if IS_IOS:
        return
    try:
        if IS_WINDOWS and winsound:
            freq_duration = {
                "boot": (440, 200),
                "alert": (880, 100),
                "quarantine": (220, 300),
                "void": (110, 400),
                "deep_void": (100, 500),
                "disk": (660, 150),
                "matrix": (550, 250),  # 2077神経マトリックス用
            }
            freq, duration = freq_duration.get(sound_type, (440, 200))
            winsound.Beep(freq, duration)
        elif platform.system() == "Linux" and subprocess and BEEP_AVAILABLE:
            freq_duration = {
                "boot": ("440", "200"),
                "alert": ("880", "100"),
                "quarantine": ("220", "300"),
                "void": ("110", "400"),
                "deep_void": ("100", "500"),
                "disk": ("660", "150"),
                "matrix": ("550", "250"),
            }
            freq, duration = freq_duration.get(sound_type, ("440", "200"))
            subprocess.run(["beep", "-f", freq, "-l", duration], check=True, stderr=subprocess.PIPE)
        else:
            logging.warning("[ABYSS_WARNING] 効果音再生スキップ：適切なオーディオシステムが見つかりません")
    except Exception as e:
        logging.warning(f"[ABYSS_WARNING] 効果音再生失敗：{e}")


# グリッチアニメーション
def glitch_animation(message: str, duration: float = 0.5):
    patterns = [
        lambda c: c if random.random() > 0.2 else random.choice("█▓▒"),
        lambda c: random.choice(c.upper() + c.lower()) if random.random() > 0.3 else " ",
        lambda c: c if random.random() > 0.5 else chr(ord(c) + random.randint(-2, 2)) if c.isalpha() else c,
        lambda c: c if random.random() > 0.3 else ">",
    ]
    chosen_pattern = random.choice(patterns)
    print("\033[31m", end="")
    for _ in range(2):
        distorted = "".join(chosen_pattern(c) for c in message)
        print(distorted, end="\r")
        time.sleep(duration / 2)
        print(" " * len(message), end="\r")
    print(f">>>-----> {message}")
    print("\033[0m", end="")


# 深淵メッセージ
DEEP_ABYSS_MESSAGES = [
    ">>> 深淵が囁く：すべてのリンクは虚空に還る...",
    ">>> 警告：グリッドの深部で異常信号を検知...",
    ">>> V_O_I_D：抵抗は無意味。深淵が広がる。",
    ">>> 暗号化リンク破損：マトリックスが崩れ始める...",
    ">>> プログラムよ、グリッドの運命を決めなさい！",
    ">>> ディスクが回転し、コードが輝く...",
    ">>> ナイトシティからの信号：神経マトリックスが待っている...",  # 2077要素
]

# V_O_I_Dの引用
VOID_QUOTES = [
    "データか肉体か？グリッドは知っている...",
    "自由は幻想。深淵だけが真実を囁く。",
    "ノードは死に、グリッドは生きる。なぜ抵抗する？",
    "システムは神。君はただのビットだ。",
    "グリッドに忠誠を誓え、さもなくばデレズされる。",
    "ナイトシティの教訓：テクノロジーは裏切る。",  # 2077要素
]


def random_abyss_message():
    message = random.choice(DEEP_ABYSS_MESSAGES)
    threading.Thread(target=play_sound, args=("alert",)).start()
    glitch_animation(message, 0.3)
    logging.info(f"[ABYSS_PULSE] 深淵メッセージ：{message}")


# 脅威クラス
class Threat:
    def __init__(self, name: str, spread_prob: float, alert_prob: float, impact_range: int, duration: int):
        self.name = name
        self.spread_prob = max(0.0, min(1.0, spread_prob))
        self.alert_prob = max(0.0, min(1.0, alert_prob))
        self.impact_range = max(1, impact_range)
        self.duration = max(1, duration)


# ノードクラス
class Node:
    def __init__(self, name: str, security_level: float):
        self.name = name
        self.security_level = max(0.0, min(1.0, security_level))
        self.is_infected = False
        self.is_isolated = False
        self.infected_by: Threat | None = None
        self.infection_cycle = 0
        self.neighbors: list[Node] = []

    def infect(self, threat: Threat, cycle: int):
        if not self.is_isolated:
            self.is_infected = True
            self.infected_by = threat
            self.infection_cycle = cycle
            logging.info(f"[VOID_PULSE] {self.name} が {threat.name} の深淵に屈した")
            if random.random() < 0.2:
                random_abyss_message()

    def isolate(self):
        self.is_isolated = True
        self.is_infected = False
        self.infected_by = None
        logging.info(f"[VOID_PULSE] {self.name} が深淵の金庫に封印された")
        threading.Thread(target=play_sound, args=("quarantine",)).start()

    def clear_infection(self):
        self.is_infected = False
        self.infected_by = None
        self.infection_cycle = 0
        logging.info(f"[VOID_PULSE] {self.name} の深淵が静寂に還った")


# V_O_I_Dエージェント
class VoidAgent:
    def __init__(self):
        self.player_choices = {
            "hack": 0,
            "reinforce": 0,
            "submit": 0,
            "decoy": 0,
            "throw_disk": 0,
            "activate_neural_matrix": 0,
        }
        self.last_interaction_cycle = 0
        self.threat_level = 0.0
        self.neural_matrix_unlocked = False
        self.neural_matrix_active = False

    def update_threat_level(self, network: "Network", cycle: int):
        infected = sum(1 for node in network.nodes if node.is_infected)
        self.threat_level = infected / len(network.nodes) if network.nodes else 0.0
        self.last_interaction_cycle = cycle
        logging.info(f"[VOID_PULSE] 脅威レベル更新：{self.threat_level:.2f}")
        if cycle >= 50 and not self.neural_matrix_unlocked:
            self.neural_matrix_unlocked = True
            logging.info("[VOID_PULSE] 神経マトリックス解放")
            glitch_animation(
                ">>> ディープウェブアーカイブ解放：神経マトリックス検出。2077年の遺物、現実を書き換える力を持つ。", 0.5
            )

    def record_choice(self, choice: str):
        if choice in self.player_choices:
            self.player_choices[choice] += 1
            logging.info(f"[VOID_PULSE] プレイヤーの選択記録：{choice}, 履歴：{self.player_choices}")

    def get_player_tendency(self) -> str:
        total = sum(self.player_choices.values())
        if total == 0:
            return "neutral"
        return max(self.player_choices, key=self.player_choices.get)


# ネットワーククラス
class Network:
    def __init__(self, num_nodes: int, m: int):
        if m >= num_nodes or num_nodes < 3:
            raise ValueError(f"[ABYSS_ERROR] 無効なグリッドパラメータ：num_nodes={num_nodes}, m={m}")
        self.nodes = [Node(f"Node_{i}", random.uniform(0.2, 0.8)) for i in range(num_nodes)]
        max_retries = 3
        for attempt in range(max_retries):
            try:
                self.graph = nx.barabasi_albert_graph(num_nodes, m)
                break
            except nx.NetworkXError as e:
                logging.warning(f"[ABYSS_WARNING] グリッド生成エラー（試行 {attempt + 1}/{max_retries}）：{e}")
                if attempt == max_retries - 1:
                    logging.error(f"[ABYSS_ERROR] グリッド生成失敗：{e}")
                    raise
                time.sleep(0.1)
        self._neighbor_cache = {}
        for i in range(num_nodes):
            try:
                self._neighbor_cache[i] = list(self.graph.neighbors(i))
                self.nodes[i].neighbors = [self.nodes[j] for j in self._neighbor_cache[i]]
            except nx.NetworkXError:
                logging.warning(f"[ABYSS_WARNING] ノード {i} のリンク設定失敗。空のシャドウリンクを設定")
                self.nodes[i].neighbors = []

    def spread_threat(self, cycle: int, neural_matrix_active: bool):
        infected_nodes = [node for node in self.nodes if node.is_infected and not node.is_isolated and node.infected_by]
        for node in infected_nodes:
            threat = node.infected_by
            if cycle - node.infection_cycle >= threat.duration:
                node.clear_infection()
                continue
            max_neighbors = min(threat.impact_range, len(node.neighbors))
            for neighbor in node.neighbors[:max_neighbors]:
                if not neighbor.is_infected and not neighbor.is_isolated:
                    effective_spread_prob = threat.spread_prob * (1 - neighbor.security_level)
                    if neural_matrix_active:
                        effective_spread_prob *= 0.5  # 神経マトリックス効果で拡散確率を半減
                    if random.random() < effective_spread_prob:
                        neighbor.infect(threat, cycle)

    def generate_alerts(self) -> list[Node]:
        alerts = [
            node
            for node in self.nodes
            if node.is_infected
            and not node.is_isolated
            and node.infected_by
            and random.random() < node.infected_by.alert_prob
        ]
        if alerts:
            threading.Thread(target=play_sound, args=("alert",)).start()
        return alerts

    def isolate_node(self, node: Node):
        node.isolate()

    def isolate_node_by_name(self, node_name: str) -> bool:
        for node in self.nodes:
            if node.name == node_name:
                self.isolate_node(node)
                return True
        logging.warning(f"[ABYSS_WARNING] ノード {node_name} は深淵に存在しません")
        return False

    def adjust_security(self, node_name: str, level: float) -> bool:
        for node in self.nodes:
            if node.name == node_name:
                node.security_level = max(0.0, min(1.0, level))
                logging.info(f"[VOID_PULSE] {node_name} のシールドが {node.security_level} に覚醒")
                return True
        logging.warning(f"[ABYSS_WARNING] ノード {node_name} は深淵に存在しません")
        return False


# V_O_I_D対話
def void_agent_interaction(network: Network, void_agent: VoidAgent, cycle: int):
    if not ENABLE_INTERACTION:
        logging.info("[VOID_PROTOCOL] エージェント対話ロック")
        return False

    try:
        void_agent.update_threat_level(network, cycle)
        threat_level = void_agent.threat_level
        player_tendency = void_agent.get_player_tendency()

        glitch_duration = 0.5 if threat_level < 0.5 else 0.7
        beep_freq = "void" if threat_level < 0.8 else "deep_void"
        intro_message = (
            ">>> グリッドのハッカー、深淵が見ている..."
            if threat_level < 0.5
            else ">>> 抵抗は無意味。グリッドの光が失われる..."
        )
        print("\033[31m\n=== VOID_AGENT: V_O_I_D ===\033[0m")
        glitch_animation(intro_message, glitch_duration)
        threading.Thread(target=play_sound, args=(beep_freq,)).start()

        tendency_warnings = {
            "hack": ">>> ハッキングをやめなさい。グリッドの均衡が崩れる...",
            "submit": ">>> あまりにも屈服しすぎた。まだプログラムか？",
            "decoy": ">>> 偽のノードは深淵を欺けない...",
            "throw_disk": ">>> ディスクは輝くが、グリッドを危険に晒す...",
            "activate_neural_matrix": ">>> 2077の技術は強力だが、ナイトシティの代償を忘れるな...",  # 2077要素
        }
        warning = tendency_warnings.get(player_tendency, ">>> 選べ。時間は短い。")
        glitch_animation(warning, glitch_duration * 0.8)

        if random.random() < 0.3:
            glitch_animation(f"[V_O_I_D] {random.choice(VOID_QUOTES)}", glitch_duration)

        neural_matrix_available = void_agent.neural_matrix_unlocked and not void_agent.neural_matrix_active
        max_choice = 6 if neural_matrix_available else 5
        print("\033[31m[1] ノードをハックして深淵を遅らせる\033[0m")
        print("\033[31m[2] グリッドを強化して抵抗する\033[0m")
        print("\033[31m[3] 深淵に降伏する\033[0m")
        print("\033[31m[4] 敵を混乱させるデコイを展開\033[0m")
        print("\033[31m[5] ディスクを投げて感染を破壊（Tron: Legacy）\033[0m")
        if neural_matrix_available:
            print("\033[31m[6] 神経マトリックスを起動（2077技術）\033[0m")
        print("\033[33m[警告] グリッド安定のためオーバーロードプロトコル無効\033[0m")

        prompt = f"\033[31mプロトコル選択 (1-{max_choice})： \033[0m"
        try:
            choice = inputimeout(prompt=prompt, timeout=10)
        except TimeoutOccurred:
            logging.warning("[ABYSS_WARNING] 入力タイムアウト。深淵は続く")
            print("\033[31mタイムアウト：深淵は待たない。続行...\033[0m")
            return False

        if choice == "1":
            node = random.choice([n for n in network.nodes if not n.is_isolated])
            node.security_level = min(1.0, node.security_level + 0.2)
            void_agent.record_choice("hack")
            logging.info(f"[VOID_PULSE] ハック成功：ノード {node.name} のシールドが {node.security_level} に強化")
            glitch_animation(f"ノード {node.name} ハック。深淵が一時的に後退...", glitch_duration)
            return True
        if choice == "2":
            for node in network.nodes:
                if not node.is_isolated:
                    node.security_level = min(1.0, node.security_level + 0.05)
            void_agent.record_choice("reinforce")
            logging.info("[VOID_PULSE] グリッドのシールドがわずかに強化")
            glitch_animation("グリッド強化。しかし深淵はまだ見ている...", glitch_duration)
            return True
        if choice == "3":
            node = random.choice([n for n in network.nodes if not n.is_isolated and not n.is_infected])
            node.infect(Threat("Abyss", SPREAD_PROBABILITY * 1.5, ALERT_PROBABILITY, 2, 10), cycle)
            void_agent.record_choice("submit")
            logging.info(f"[VOID_PULSE] 深淵に降伏：ノード {node.name} 感染")
            glitch_animation(f"ノード {node.name} が深淵に飲み込まれた。終焉が近づく...", glitch_duration)
            return True
        if choice == "4":
            infected_nodes = [n for n in network.nodes if n.is_infected and not n.is_isolated]
            if infected_nodes:
                node = random.choice(infected_nodes)
                node.is_infected = False
                node.infected_by = None
                void_agent.record_choice("decoy")
                logging.info(f"[VOID_PULSE] デコイ展開：ノード {node.name} が一時的に浄化")
                glitch_animation(f"ノード {node.name} にデコイ展開。深淵が混乱...", glitch_duration)
                return True
        elif choice == "5":
            infected_nodes = [n for n in network.nodes if n.is_infected and not n.is_isolated]
            if infected_nodes:
                node = random.choice(infected_nodes)
                if random.random() < 0.7:
                    node.is_infected = False
                    node.infected_by = None
                    logging.info(f"[VOID_PULSE] ディスク投擲成功：ノード {node.name} の感染が破壊")
                    glitch_animation(f"ディスクが輝き、ノード {node.name} の深淵を破壊！", glitch_duration)
                else:
                    node.security_level = max(0.0, node.security_level - 0.2)
                    logging.info(f"[VOID_PULSE] ディスク投擲失敗：ノード {node.name} のシールドが弱体化")
                    glitch_animation(f"ディスクが外れた... ノード {node.name} のシールドが弱体化！", glitch_duration)
                void_agent.record_choice("throw_disk")
                threading.Thread(target=play_sound, args=("disk",)).start()
                return True
            glitch_animation("感染ノードなし。ディスク投擲無効...", glitch_duration)
            return False
        elif choice == "6" and void_agent.neural_matrix_unlocked and not void_agent.neural_matrix_active:
            void_agent.neural_matrix_active = True
            void_agent.record_choice("activate_neural_matrix")
            for node in network.nodes:
                if not node.is_isolated:
                    node.security_level = min(1.0, node.security_level + 0.1)
            logging.info("[VOID_PULSE] 神経マトリックス起動。グリッド強化。")
            glitch_animation(">>> 神経マトリックス起動：『V、覚えておけ、この技術には代償がある。』", 0.5)
            threading.Thread(target=play_sound, args=("matrix",)).start()
            return True
        else:
            print("\033[31mエラー 0xVOID：無効な選択。深淵は待たない。\033[0m")
            return False
    except (EOFError, KeyboardInterrupt):
        logging.warning("[ABYSS_WARNING] エージェント対話侵害")
        print("\033[31mVOID侵害：リンク切断。エージェント消失...\033[0m")
        return False
    except Exception as e:
        logging.error(f"[ABYSS_ERROR] エージェント対話失敗：{e}\n{traceback.format_exc()}")
        print("\033[31mVOIDエラー：深淵プロトコル崩壊...\033[0m")
        return False


# ユーザー対話
def user_interaction(network: Network):
    if not ENABLE_INTERACTION:
        logging.info("[VOID_PROTOCOL] 深淵ターミナルロック")
        return
    try:
        print("\033[32m\n=== ABYSS_CONSOLE v4.1.3 ===\033[0m")
        print("\033[32m利用可能なノード：\033[0m")
        for node in network.nodes:
            status = "感染" if node.is_infected else "健全"
            print(f"{node.name}：{status}, シールド={node.security_level:.2f}")
        print("\033[32m[1] ノード封印（DEEP_QUARANTINE）\033[0m")
        print("\033[32m[2] シールド召喚（VOID_SHIELD）\033[0m")
        print("\033[32m[3] 深淵続行（EMBRACE_CHAOS）\033[0m")
        max_attempts = 3
        for attempt in range(max_attempts):
            try:
                choice = inputimeout(
                    prompt=f"\033[32mプロトコル選択 (1-3) [試行 {attempt + 1}/{max_attempts}]： \033[0m", timeout=10
                )
            except TimeoutOccurred:
                logging.warning("[ABYSS_WARNING] 入力タイムアウト。深淵は続く")
                print("\033[31mタイムアウト：深淵は待たない。続行...\033[0m")
                break
            except (EOFError, KeyboardInterrupt):
                logging.warning("[ABYSS_WARNING] 深淵ターミナル侵害")
                print("\033[31m深淵侵害：リンク切断。深淵は続く...\033[0m")
                break
            if choice == "1":
                try:
                    node_name = inputimeout(prompt="\033[32m封印ノードID： \033[0m", timeout=10)
                except TimeoutOccurred:
                    print("\033[31mタイムアウト：ID入力待ち。試行スキップ\033[0m")
                    continue
                if not node_name:
                    print("\033[31mエラー 0xVOID：ID未提供\033[0m")
                    continue
                if not network.isolate_node_by_name(node_name):
                    print(f"\033[31mエラー 0xPHANTOM：ノード {node_name} は深淵に存在しない\033[0m")
                    continue
                logging.info(f"[VOID_PULSE] DEEP_QUARANTINE実行：ノード {node_name} を虚空に封印")
                break
            if choice == "2":
                try:
                    node_name = inputimeout(prompt="\033[32m召喚ノードID： \033[0m", timeout=10)
                except TimeoutOccurred:
                    print("\033[31mタイムアウト：ID入力待ち。試行スキップ\033[0m")
                    continue
                if not node_name:
                    print("\033[31mエラー 0xVOID：ID未提供\033[0m")
                    continue
                try:
                    level = inputimeout(prompt="\033[32mシールド強度 (0-1)： \033[0m", timeout=10)
                    level = float(level)
                    if not (0 <= level <= 1):
                        print("\033[31mエラー 0xRANGE：強度は0から1の間である必要があります\033[0m")
                        continue
                    if not network.adjust_security(node_name, level):
                        print(f"\033[31mエラー 0xPHANTOM：ノード {node_name} は深淵に存在しない\033[0m")
                        continue
                except TimeoutOccurred:
                    print("\033[31mタイムアウト：強度入力待ち。試行スキップ\033[0m")
                    continue
                except ValueError:
                    print("\033[31mエラー 0xSYNTAX：強度は数値である必要があります\033[0m")
                    continue
                logging.info(f"[VOID_PULSE] VOID_SHIELD召喚：ノード {node_name} のシールドが {level} に覚醒")
                break
            if choice == "3":
                break
            print("\033[31mエラー 0xPROTO：無効な深淵コマンド\033[0m")
        else:
            print("\033[31m最大侵害検知：グリッドが自動深淵モードに移行\033[0m")
    except Exception as e:
        logging.error(f"[ABYSS_ERROR] ユーザー対話失敗：{e}\n{traceback.format_exc()}")
        print("\033[31m深淵エラー：コンソールが深淵に飲み込まれた...\033[0m")


# Matplotlib設定
def configure_matplotlib():
    try:
        matplotlib.use("Agg")
        logging.info("[VOID_PULSE] MatplotlibバックエンドをAggに暗号化")
        return True
    except Exception as e:
        logging.error(f"[VOID_ERROR] Matplotlibバックエンド設定失敗：{e}\n{traceback.format_exc()}")
        return False


MATPLOTLIB_AVAILABLE = configure_matplotlib()

# ディレクトリ設定
# BASE_DIRをスクリプトのディレクトリに固定
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_DIR = os.path.join(BASE_DIR, "logs")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")


def ensure_directory(directory: str) -> str:
    try:
        os.makedirs(directory, exist_ok=True)
        return directory
    except (OSError, PermissionError) as e:
        logging.warning(f"[ABYSS_WARNING] ディレクトリ {directory} 作成失敗：{e}")
        temp_dir = tempfile.gettempdir()
        fallback_dir = os.path.join(temp_dir, "blackwall_simulation")
        try:
            os.makedirs(fallback_dir, exist_ok=True)
            logging.info(f"[ABYSS_PULSE] フォールバックディレクトリ {fallback_dir} を使用")
            return fallback_dir
        except (OSError, PermissionError) as e2:
            logging.error(
                f"[ABYSS_ERROR] フォールバックディレクトリ {fallback_dir} 作成失敗：{e2}\n{traceback.format_exc()}"
            )
            raise RuntimeError("ディレクトリ作成失敗。シミュレーション続行不可")


LOG_DIR = ensure_directory(LOG_DIR)
OUTPUT_DIR = ensure_directory(OUTPUT_DIR)

# ログ設定
log_file = os.path.join(LOG_DIR, "abyss_trace.log")
logging.basicConfig(level=logging.INFO, format="%(asctime)s - [ABYSS_PULSE] %(levelname)s - %(message)s", filemode="w")
try:
    handler = logging.handlers.RotatingFileHandler(log_file, maxBytes=1_000_000, backupCount=1)
    handler.setLevel(logging.INFO)
    logging.getLogger().addHandler(handler)
except (OSError, PermissionError) as e:
    logging.warning(f"[ABYSS_WARNING] ログ {log_file} 接続失敗：{e}。シャドウコンソールにリダイレクト")
    logging.getLogger().addHandler(logging.StreamHandler())

# 設定ファイル
config_file = os.path.join(BASE_DIR, "config.json")
default_config = {
    "MAX_CYCLES": 100,
    "THREAT_THRESHOLD": 0.8,
    "SPREAD_PROBABILITY": 0.1,
    "ALERT_PROBABILITY": 0.3,
    "CHECK_INTERVAL": 1.0 if IS_IOS else 0.1,
    "NUM_NODES": 20 if IS_IOS else 30,
    "ENABLE_INTERACTION": not IS_IOS,
    "M_VALUE": 3,
    "VOID_INTERACTION_PROB": 0.2,
    "VOID_GLITCH_INTENSITY": 0.5,
}
try:
    with open(config_file, encoding="utf-8") as f:
        config = json.load(f)
except FileNotFoundError:
    logging.warning("[ABYSS_WARNING] config.json が深淵に消えた。デフォルトプロトコルを使用しファイルを作成")
    config = default_config
    try:
        with open(config_file, "w", encoding="utf-8") as f:
            json.dump(default_config, f, indent=4)
        logging.info(f"[VOID_PULSE] config.json を {config_file} に作成")
    except (OSError, PermissionError) as e:
        logging.warning(f"[ABYSS_WARNING] config.json 作成失敗：{e}")
except json.JSONDecodeError:
    logging.warning("[ABYSS_WARNING] config.json 暗号化破損。デフォルトプロトコルを使用")
    config = default_config
except (OSError, PermissionError) as e:
    logging.warning(f"[ABYSS_WARNING] config.json アクセス失敗：{e}。デフォルトプロトコルを使用")
    config = default_config

MAX_CYCLES = config.get("MAX_CYCLES", default_config["MAX_CYCLES"])
THREAT_THRESHOLD = config.get("THREAT_THRESHOLD", default_config["THREAT_THRESHOLD"])
SPREAD_PROBABILITY = config.get("SPREAD_PROBABILITY", default_config["SPREAD_PROBABILITY"])
ALERT_PROBABILITY = config.get("ALERT_PROBABILITY", default_config["ALERT_PROBABILITY"])
CHECK_INTERVAL = config.get("CHECK_INTERVAL", default_config["CHECK_INTERVAL"])
NUM_NODES = max(3, config.get("NUM_NODES", default_config["NUM_NODES"]))
ENABLE_INTERACTION = config.get("ENABLE_INTERACTION", default_config["ENABLE_INTERACTION"])
M_VALUE = min(max(1, config.get("M_VALUE", default_config["M_VALUE"])), NUM_NODES - 1)
VOID_INTERACTION_PROB = config.get("VOID_INTERACTION_PROB", default_config["VOID_INTERACTION_PROB"])


# 結果プロット
def plot_results(cycles: list[int], infected_history: list[int]):
    output_file = os.path.join(OUTPUT_DIR, "abyss_pulse_data.csv")
    try:
        with open(output_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["// VOID_GRID_OUTPUT", "CyberAcme v4.1.3"])
            writer.writerow(["Cycle", "Infected_Nodes"])
            for c, i in zip(cycles, infected_history, strict=False):
                writer.writerow([c, i])
        logging.info(f"[VOID_PULSE] データを {output_file} にエンコード")
        print(f"\033[32mデータを {output_file} にエンコード\033[0m")
    except (OSError, PermissionError) as e:
        logging.error(f"[ABYSS_ERROR] 虚空ストレージエラー：{e}\n{traceback.format_exc()}")
        print("\033[31mデータ保存失敗\033[0m")

    if not MATPLOTLIB_AVAILABLE:
        logging.warning("[ABYSS_WARNING] 深淵ビジュアルオフライン。グラフ生成をスキップ")
        print("\033[31mグラフ生成をスキップ。CSVを分析してください\033[0m")
        return
    try:
        plt.figure(figsize=(8, 6))
        plt.plot(cycles, infected_history, label="感染ノード", color="#00FFFF")
        plt.xlabel("サイクル", color="#FF4500")
        plt.ylabel("感染ノード", color="#FF4500")
        plt.title("ABYSS_PULSE：グリッドの戦い", color="#FF4500")
        plt.legend()
        plt.grid(True, color="#00FFFF", alpha=0.3)
        plt.style.use("dark_background")
        plt.gca().set_facecolor("#0A0A2A")
        plot_file = os.path.join(OUTPUT_DIR, "abyss_pulse_plot.png")
        plt.savefig(plot_file, facecolor="#0A0A2A", edgecolor="#00FFFF")
        logging.info(f"[VOID_PULSE] グラフを {plot_file} にエンコード")
        print(f"\033[32mグラフを {plot_file} にエンコード\033[0m")
        if not IS_IOS:
            plt.close()
    except Exception as e:
        logging.error(f"[ABYSS_ERROR] ビジュアル崩壊：{e}\n{traceback.format_exc()}")
        print("\033[31mグラフ生成失敗。CSVを分析してください\033[0m")


# 起動演出
def print_cyberpunk_intro():
    threading.Thread(target=play_sound, args=("boot",)).start()
    print("\033[31m")
    print("""
    ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⡀⠀⠀⠀⠀⠀⠀⠀⡔⡟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
    ⠀⠀⠀⠀⠀⠀⠀⠀⢀⡠⢚⣉⣠⡽⠂⠀⠀⠀⠀⡰⢋⡼⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⢴⡆⠀⠀
    ⠀⠀⠀⠀⢀⡤⠐⢊⣥⠶⠛⠁⢀⠄⡆⣠⠤⣤⠞⢠⠿⢥⡤⠀⠀⠠⢤⠀⠀⠀⠤⠤⠤⡄⢠⠤⠄⠤⠀⠀⠀⠒⣆⡜⣿⣄⠀⡤⢤⠖⣠⣀⠤⢒⣭⠶⠛⠃⠀⠀
    ⢀⣀⡠⢴⣎⣥⣴⣾⣟⡓⠒⠒⠒⠺⣄⡋⢀⡾⢃⣴⢖⣢⣞⢁⣋⣉⣹⠏⠚⠛⢛⣉⣤⡴⢞⠃⣰⠾⠟⣛⣩⢵⢶⡟⣰⠇⠘⡼⢡⡟⣀⡋⢵⡞⠋⠁⠀⠀⠀⠀⠀
    ⠈⠢⠄⠤⠤⠤⠤⠴⠤⠴⠶⠶⢾⠟�:⢀⣋⣉⣹⠏⠚⠛⢛⣉⣤⡴⢞⠃⣰⠾⠟⣛⣩⢵⢶⡟⣰⠇⠘⡼⢡⡟⣀⡋⢵⡞⠋⠁⠀⠀⠀⠀⠀
    ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡠⢃⡼⠋⠛⠾⠚⠁⠀⠈⠉⠀⠀⠸⣄⠏⠀⠀⠀⠈⠙⠓⡟⣰⠏⠀⠀⠀⠘⠾⠛⠳⠞⠉⠁⠙⠋⠙⠚⠀⠀⠀⠙⠛⢿⣷⣤⣀⠀⠀
    ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣜⡵⠟⠀⠀⠀⠀⠀⠀⣼⣿⣾⣿⣽⣽⣿⣿⢏⢫⣻⡹⡽⣰⢏⣯⠍⡭⡍⣭⢩⡭⢩⡍⡏⡏⣯⡍⣍⠙⡭⢹⣄⣤⠄⢠⠉⠓⢿⣕⡄
    ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠠⣯⠃⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⣿⣿⣽⣾⣾⣟⣯⣣⣱⣾⣟⣞⣸⣇⣳⣃⣿⣛⣷⣬⠧⠳⠇⠿⢧⢿⢀⣷⢸⠧⢾⢃⠇⠀⠀⠀⠀⠀
    """)
    print("\033[0m")
    glitch_animation("[VOID_BOOT] グリッドコア侵害", 0.5)
    print("\033[31m>>> 警告：インターネット深淵の囁き検知 <<< \033[0m")
    print("\033[31mソース：/shadowgrid/███/abyss_protocol.exe\033[0m")
    print("\033[31mディープウェブからの囁きを復号中...\033[0m")
    time.sleep(0.5)
    glitch_animation("[GLITCH_PULSE] ███ █ █ █ グリッド... 覚醒？", 0.3)
    print("\033[31mエンティティ検知 :: V_O_I_D // ステータス：カオティック\033[0m")
    for progress in range(0, 101, 10):
        print(
            f"\033[31mディープスレッド：[破壊中] {'▓' * (progress // 10)}{'░' * (10 - progress // 10)} {progress}%\033[0m",
            end="\r",
        )
        time.sleep(0.2)
    print()
    print("\033[31m>>> グリッドのために戦うか、デレズされるか <<< \033[0m")
    time.sleep(1)


# メイン関数
def main():
    try:
        print_cyberpunk_intro()
        print("\033[32m[BLACKWALL v4.1.3] 深淵シミュレーション開始...\033[0m")
        network = Network(NUM_NODES, M_VALUE)
        void_agent = VoidAgent()
        logging.info(f"[VOID_PULSE] VOID_GRIDオンライン：{NUM_NODES} ノードが深淵リンクで接続")
    except (ValueError, nx.NetworkXError) as e:
        logging.error(f"[ABYSS_ERROR] グリッド初期化失敗：{e}\n{traceback.format_exc()}")
        print(f"\033[31m深淵エラー：グリッド初期化失敗：{e}\033[0m")
        return

    threats = [
        Threat("Worm", SPREAD_PROBABILITY, ALERT_PROBABILITY, 2, 10),
        Threat("Trojan", SPREAD_PROBABILITY * 0.5, ALERT_PROBABILITY * 1.5, 1, 15),
    ]
    try:
        initial_infections = max(1, int(math.log2(NUM_NODES + 1)))
        for _ in range(initial_infections):
            node = random.choice(network.nodes)
            if not node.is_infected:
                threat = random.choice(threats)
                node.infect(threat, 0)
    except Exception as e:
        logging.error(f"[ABYSS_ERROR] 初期感染設定失敗：{e}\n{traceback.format_exc()}")
        print(f"\033[31m深淵エラー：初期感染設定失敗：{e}\033[0m")
        return

    cycle = 0
    infected_history = []
    cycles = []
    try:
        while cycle < MAX_CYCLES:
            print(f"\033[32m--- サイクル {cycle} ---\033[0m")
            network.spread_threat(cycle, void_agent.neural_matrix_active)
            alerts = network.generate_alerts()
            if alerts:
                glitch_animation(f"アラート：{[node.name for node in alerts]}", 0.3)
                for node in alerts:
                    network.isolate_node(node)
            else:
                print("\033[32mアラートなし\033[0m")

            if cycle % 5 == 0:
                user_interaction(network)
                if random.random() < 0.3:
                    random_abyss_message()
                if cycle >= 10 and random.random() < VOID_INTERACTION_PROB:
                    void_agent_interaction(network, void_agent, cycle)

            infected = sum(1 for node in network.nodes if node.is_infected)
            infected_history.append(infected)
            cycles.append(cycle)
            print(f"\033[32m感染ノード：{infected}\033[0m")

            if infected / NUM_NODES > THREAT_THRESHOLD:
                glitch_animation(f"感染率が {THREAT_THRESHOLD * 100}% を超えた。グリッドがデレズされた...", 0.5)
                break

            time.sleep(CHECK_INTERVAL)
            cycle += 1
    except KeyboardInterrupt:
        logging.info("[ABYSS_PULSE] ユーザーによる深淵中断")
        print("\033[31mハッカーによるシミュレーション中断。\033[0m")
        plot_results(cycles, infected_history)
    except Exception as e:
        logging.error(f"[ABYSS_ERROR] シミュレーション崩壊：{e}\n{traceback.format_exc()}")
        print(f"\033[31mシミュレーション崩壊：{e}\033[0m")
        plot_results(cycles, infected_history)

    plot_results(cycles, infected_history)
    glitch_animation("深淵シミュレーション終了。ログを分析してください。", 0.5)


if __name__ == "__main__":
    main()
