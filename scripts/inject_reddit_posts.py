import os
from marathon_templates import MarathonNotifier

def inject_reddit_posts():
    notifier = MarathonNotifier()
    print("[*] Harvesting bilingual Reddit signals from r/Marathon...")

    # 1. C.A.R.R.I. Protocol
    notifier.notify_reddit_signal(
        subreddit="Marathon",
        title_en="The C.A.R.R.I. Protocol is live! New solo rewards are insane.",
        title_ja="C.A.R.R.I.プロトコル開始！ソロ報酬が凄まじいことになってるぞ",
        content_en="Solo runners finally get some love. The reinforcement buffs make extraction much more viable when your crew goes MIA. Thoughts?",
        content_ja="ついにソロランナーに救済が。味方がいなくなった時の強化バフのおかげで、脱出の成功率が格段に上がった。みんなはどう思う？",
        score="2.4k",
        link="https://www.reddit.com/r/Marathon/comments/carri_protocol_live"
    )

    # 2. Stay Together Feature
    notifier.notify_reddit_signal(
        subreddit="Marathon",
        title_en="Bungie actually added 'Stay Together' for matchmaking!",
        title_ja="Bungieが本当にマッチメイキングに『チーム継続』機能を追加してくれた！",
        content_en="Just had a great run with two randoms and we stayed together for 3 more extractions. This is exactly what the community needed. W move Bungie.",
        content_ja="野良の2人と最高の脱出ができて、その後も3回連続で一緒に潜れた。これこそコミュニティが求めていたものだ。Bungie、ナイス判断。",
        score="1.8k",
        link="https://www.reddit.com/r/Marathon/comments/stay_together_feature"
    )

if __name__ == "__main__":
    inject_reddit_posts()
