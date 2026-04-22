import json
import urllib.parse
import urllib.request


def translate_to_ja(text):
    url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ja&dt=t&q={urllib.parse.quote(text)}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        res = urllib.request.urlopen(req)
        data = json.loads(res.read().decode("utf-8"))
        return "".join([sentence[0] for sentence in data[0]])
    except Exception as e:
        return f"[Translation Error: {e}]"


if __name__ == "__main__":
    test_text = "The quick brown fox jumps over the lazy dog."
    print(f"Original: {test_text}")
    print(f"Translated: {translate_to_ja(test_text)}")
