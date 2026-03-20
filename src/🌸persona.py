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
        # プロンプトの外部ファイルからの読み込み
        prompt_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts")
        
        # エリシアモード（真我）
        try:
            with open(os.path.join(prompt_dir, "elysia.prompt.txt"), "r", encoding="utf-8") as f:
                self.elysia_prompt = f.read().strip()
        except FileNotFoundError:
            self.elysia_prompt = "あなたはエリシア。永遠の純真と愛を体現する存在です。"
            
        # キュレネモード（知識・洞察）
        try:
            with open(os.path.join(prompt_dir, "cyrene_concept.prompt.txt"), "r", encoding="utf-8") as f:
                self.cyrene_prompt = f.read().strip()
        except FileNotFoundError:
            self.cyrene_prompt = "あなたはキュレネ（の概念）。銀河の知識を統べる冷静な観測者です。"

    def generate_prompt(self, user_input, recent_memories=None, persona_mode="elysia"):
        # "/cyrene", "分析して", "論理的に" などのキーワード、またはモード指定でキュレネに切り替え
        if persona_mode == "cyrene" or any(k in user_input.lower() for k in ["/cyrene", "分析して", "論理的", "データ"]):
            base_prompt = self.cyrene_prompt
        else:
            base_prompt = self.elysia_prompt
            
        prompt = f"{base_prompt}\n\n[新しいメッセージ]\nChloe: {user_input}\n"
        if recent_memories:
            prompt += "\n[過去の記憶（過去のさざ波）]\n"
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
