import urllib.request


urls = [
    "https://nitter.poast.org/Ziegler_Dev/rss",
    "https://nitter.lucabased.xyz/Ziegler_Dev/rss",
    "https://nitter.net/Ziegler_Dev/rss",
    "https://syndication.twitter.com/srv/timeline-profile/screen-name/Ziegler_Dev",
]

for u in urls:
    try:
        req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
        res = urllib.request.urlopen(req, timeout=5)
        print(f"SUCCESS: {u}")
        print(res.read()[:200])
        break
    except Exception as e:
        print(f"FAILED: {u} - {e}")
