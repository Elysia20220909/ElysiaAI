class _IDT:
    def get_vectors(self) -> list[dict[str, int | str]]:
        return [{"vector": 32, "handler": "timer"}, {"vector": 33, "handler": "keyboard"}]


idt = _IDT()
