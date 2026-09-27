"""A deliberately finite Japanese request grammar, not language-model inference."""

import unicodedata
from dataclasses import dataclass


GOAL = "elysia:document-classifier:v0001"
REQUESTS = frozenset(("カーネル開発の資料を探して", "独自カーネルの資料を探して", "カーネル開発の資料を探してください"))


@dataclass(frozen=True)
class Intent:
    goal: str = GOAL
    task: str = "find-native-document-candidates"
    proposed_action: str = "save-candidate-report"
    target: str = "dedicated-journal-sector-17"
    requires_fresh_approval: bool = True


def parse(request):
    if not isinstance(request, str) or not 1 <= len(request.encode("utf-8")) <= 256:
        raise ValueError("request length outside supported range")
    text = unicodedata.normalize("NFKC", request).strip()
    if any(unicodedata.category(c).startswith("C") for c in text):
        raise ValueError("control characters are not supported")
    for greeting in ("こんにちは、", "こんにちは "):
        if text.startswith(greeting):
            text = text[len(greeting) :].strip()
            break
    text = text.rstrip("。.!！").strip()
    if text not in REQUESTS:
        raise ValueError("unsupported request; specify カーネル開発の資料を探して")
    return Intent()
