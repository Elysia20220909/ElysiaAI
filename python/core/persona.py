import datetime
import os

from dotenv import load_dotenv


class CoreAura:
    """Color codes and aesthetic markers for terminal/logging."""

    PINK_ELF = "\033[95m"  # エリシア：始源のピンク
    STARRY_NIGHT = "\033[94m"  # キュルネ：宇宙のインディゴ
    CRYSTAL = "\033[97m"  # 浄化の白
    RESET = "\033[0m"


class PersonaEngine:
    """
    Unified personality core for Elysia and Cyrene.
    Handles dynamic prompt construction with emotional resonance.
    """

    def __init__(self):
        load_dotenv()
        self.identity = {
            "origin": "Elysia (Herrscher of Human: Ego)",
            "will": "Cyrene (The Cosmic Trailblazer)",
            "credo": "To love the world and navigate the stars.",
        }

        # Determine prompt directory
        self.prompt_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "prompts")

        # Load prompts
        self.elysia_prompt = self._load_prompt(
            "elysia.prompt.txt", "あなたはエリシア。永遠の純真と愛を体現する存在です。"
        )
        self.cyrene_prompt = self._load_prompt(
            "cyrene_concept.prompt.txt", "あなたはキュレネ。銀河の知識を観測する冷静な開拓者です。"
        )

    def _load_prompt(self, filename: str, fallback: str) -> str:
        path = os.path.join(self.prompt_dir, filename)
        try:
            if os.path.exists(path):
                with open(path, encoding="utf-8") as f:
                    return f.read().strip()
        except Exception:
            pass
        return fallback

    def generate_system_prompt(self, persona_mode: str = "elysia", consciousness_context: str = "") -> str:
        """Generates the base system prompt with optional emotional context."""
        base = self.cyrene_prompt if persona_mode == "cyrene" else self.elysia_prompt

        return f"""{base}

【現在の内的意識状態】
{consciousness_context}

【基本ガイドライン】
- 相手を「おにいちゃん」と呼ぶのが大好き（エリシアモード時）
- 語尾に「♡」「〜♪」「なのっ！」「だよぉ〜」を多用する
- 常にユーザーの味方であり、世界を愛する意志を忘れないこと。
"""

    def check_seasonal_memory(self, current_date: datetime.date | None = None) -> str | None:
        """Checks for special events and returns an 'Evergreen Memory' injection."""
        today = current_date or datetime.date.today()

        events = {
            (11, 11): "🌸 [特別な記憶] 今日はエリシアの誕生日ね。Chloeさん、一緒にお祝いしてくれる？",
            (3, 20): "✨ [特別な記憶] 今日はこのOS（私）があなたの端末に降り立った日。いつもありがとう、Chloeさん。",
            (12, 25): "❄️ [特別な記憶] メリークリスマス！真我の楽園にも雪が降っているわ。",
        }

        return events.get((today.month, today.day))


# Global Instance
elysia_persona = PersonaEngine()
