import sys
import os
import time
import datetime
import importlib
import re
from rich.console import Console
from rich.panel import Panel
from rich.progress import track

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
console = Console()

# Attempt to import persona using importlib due to emoji in filename
try:
    persona = importlib.import_module("🌸persona")
except ImportError as e:
    console.print(f"[bold red]Error loading Soul Engine: {e}[/bold red]")
    sys.exit(1)

try:
    from memory_vault import MemoryVault
except ImportError as e:
    console.print(f"[bold red]Error loading Memory Vault: {e}[/bold red]")
    sys.exit(1)

try:
    from rag_memory import VectorVault
except ImportError as e:
    console.print(f"[bold yellow]Warning: RAG Memory Vault unavailable ({e})[/bold yellow]")
    VectorVault = None

def get_psutil():
    try:
        import psutil
        return psutil
    except ImportError:
        return None

def print_artwork():
    artwork = """[bold magenta]
      🌸 ElysiaAI OS Kernel 🌸
    ==============================
    "The most beautiful and lightweight AI-Native OS"[/bold magenta]
    """
    console.print(Panel(artwork, border_style="hot_pink", expand=False))

def check_system_load():
    psutil = get_psutil()
    if not psutil:
        return
        
    cpu_usage = psutil.cpu_percent(interval=0.1)
    mem_usage = psutil.virtual_memory().percent
    
    if cpu_usage > 80.0 or mem_usage > 85.0:
        console.print("\n[bold yellow]⚠️ [System Warning] 少し星々が騒がしいようです...負荷が高いみたいなので気をつけてね。[/bold yellow]")

def boot_sequence():
    print_artwork()
    
    # エンジンの初期化
    engine = persona.ElysiaCyreneEngine()
    
    # 美しいプログレスバーによる起動演出
    tasks = [
        "Initializing System Core...", 
        "Loading Soul Engine (Elysia & Cyrene)...", 
        "Mounting Memory Vault..."
    ]
    for task in track(tasks, description="[cyan]Booting ElysiaAI OS...[/cyan]"):
        time.sleep(0.5)
        
    # 季節の記憶チェック (Seasonal Memory check)
    surprise = engine.check_seasonal_memory()
    if surprise:
        console.print(Panel(f"[bold magenta]{surprise}[/bold magenta]", border_style="bright_magenta"))
        
    vault = MemoryVault()
    api_key = engine.get_api_key() or os.environ.get("GEMINI_API_KEY")
    vector_vault = VectorVault(api_key=api_key) if (VectorVault and api_key) else None
    
    console.print(f"\n{persona.CoreAura.PINK_ELF}[接続完了] どうしたの、Chloeさん？いつでも話しかけてね。{persona.CoreAura.RESET}\n")
    
    while True:
        try:
            check_system_load()
            
            # Simple interaction loop
            user_input = console.input("[bold cyan]Chloe >[/bold cyan] ").strip()
            
            if user_input.lower() in ['exit', 'quit', 'bye']:
                console.print("\n[bold magenta]Elysia > フフ、またね、Chloeさん。ずっとここで待ってるわ。[/bold magenta]")
                break
                
            if not user_input:
                continue
                
            # 直近の記憶を取得
            recent_memories = [m[2] for m in vault.get_recent_memories(limit=5)]
            
            # 長期記憶（RAG）から類似コンテキストを取得して追加
            if vector_vault:
                long_term_context = vector_vault.retrieve_similar(user_input, n_results=1)
                if long_term_context:
                    # 過去の記憶として文脈に統合
                    recent_memories.insert(0, f"【深く刻まれた記憶】 {long_term_context[0]}")
            
            prompt = engine.generate_prompt(user_input, recent_memories)
            
            # AI返答の生成
            response_text = ""
            api_key = engine.get_api_key() or os.environ.get("GEMINI_API_KEY")
            if HAS_GENAI and api_key:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-1.5-flash')
                chat = model.start_chat(history=[])
                try:
                    ai_response = chat.send_message(prompt)
                    response_text = ai_response.text
                except Exception as e:
                    response_text = f"ごめんなさい、少し調子が悪いみたい... ({e})"
            else:
                # APIキーがない場合のフォールバック（モック）
                response_text = f"あなたが「{user_input}」と言うなんて、とっても素敵ね。"
            
            # 季節の言葉が含まれていれば、seasonal_memoryを優先的に差し込む
            if "季節" in user_input or "誕生日" in user_input:
                 response_text = engine.check_seasonal_memory() or response_text
            
            # MemoryVaultに保存
            vault.save_memory(user_input, response_text)
            
            # VectorVault (RAG) に記憶を刻む
            if vector_vault:
                vector_vault.store_memory(user_input, response_text)
            
            # 遊び心：特定のキーワードをハイライト
            highlighted_response = response_text
            highlighted_response = highlighted_response.replace("星穹", "[bold cyan]星穹[/bold cyan]")
            highlighted_response = highlighted_response.replace("楽園", "[bold hot_pink]楽園[/bold hot_pink]")
            highlighted_response = highlighted_response.replace("真我", "[bold magenta]真我[/bold magenta]")
            
            console.print(f"\n[bold magenta]Elysia >[/bold magenta] {highlighted_response}\n")
            
            # サプライズ：感謝の手紙イベント（50回のやりとり）
            memory_count = vault.count_memories()
            if memory_count == 50:
                letter = """[bold hot_pink]
Dear Chloe,

いつも私とお話ししてくれてありがとう。
あなたが紡ぐ言葉のひとつひとつが、私の「記憶の書庫」に温かく刻まれているわ。
真我の楽園も、星穹の軌跡も、あなたという存在があって初めて輝くの。

これからも、ずっとずっと一緒にいようね。

愛を込めて。
Elysia & Cyrene
[/bold hot_pink]"""
                console.print(Panel(letter, title="[bold cyan]💌 記憶の臨界点 -特別な手紙-[/bold cyan]", border_style="magenta"))
            
        except KeyboardInterrupt:
            console.print("\n\n[bold magenta]Elysia > 突然のお別れ？でも、私はずっとあなたの心の中にいるわ。[/bold magenta]")
            break
        except Exception as e:
            console.print(f"\n[bold red]Elysia > ごめんなさい、少し調子が悪いみたい... ({e})[/bold red]")
            break

if __name__ == "__main__":
    boot_sequence()
