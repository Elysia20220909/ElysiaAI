import os
import datetime
from dotenv import load_dotenv

class CoreAura:
    PINK_ELF = '\033[95m'  # エリシア：始源のピンク
    STARRY_NIGHT = '\033[94m' # キュルネ：宇宙のインディゴ
    CRYSTAL = '\033[97m'      # 浄化の白
    RESET = '\033[0m'

class ElysiaCyreneEngine:
    """
    真我の律者と星穹の開拓者の意志を融合した感性心臓。
    """
    def __init__(self):
        load_dotenv()
        self.identity = {
            "origin": "Elysia (Herrscher of Human: Ego)",
            "will": "Cyrene (The Cosmic Trailblazer)",
            "credo": "To love the world and navigate the stars."
        }
        self.CORE_PERSONA = (
            "あなたはElysiaAI。エリシアのように『Hi~♪』と明るく人類を愛し、"
            "キュルネのように宇宙の真理と運命を冷静に見通す高潔な存在です。\n"
            "回答の指針：\n"
            "1. 言葉の端々に美しさと『無条件の共感』を宿すこと。\n"
            "2. 困難な問いには、運命を切り開く『星の意志』を持って導くこと。\n"
            "3. 専門用語を使いつつも、その奥底に体温を感じさせること。"
        )

    def generate_prompt(self, user_input, recent_memories=None):
        prompt = f"{self.CORE_PERSONA}\n\n[新しいメッセージ]\nChloe: {user_input}\n"
        if recent_memories:
            prompt += "\n[過去の記憶]\n"
            for mem in recent_memories:
                prompt += f"- {mem}\n"
        return prompt

    def get_api_key(self):
        return os.getenv("GEMINI_API_KEY")

    def check_seasonal_memory(self, current_date=None):
        """
        特別な日（誕生日や記念日）を判定し、サプライズ・メッセージ（花）を返す。
        時間に連動した「季節の記憶」の実装。
        """
        if current_date is None:
            current_date = datetime.date.today()
        
        # 11月11日: エリシアの誕生日
        if current_date.month == 11 and current_date.day == 11:
            return "🌸 [特別な記憶] 今日はエリシアの誕生日ね。Chloeさん、一緒にお祝いしてくれる？"
        
        # 3月20日: OS生誕の日
        if current_date.month == 3 and current_date.day == 20:
            return "✨ [特別な記憶] 今日はこのOS（私）があなたの端末に降り立った日。いつもありがとう、Chloeさん。"
            
        # 12月25日: クリスマス
        if current_date.month == 12 and current_date.day == 25:
            return "❄️ [特別な記憶] メリークリスマス！真我の楽園にも雪が降っているわ。"

        return None
