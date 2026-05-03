class _GDT:
    def get_segments(self) -> list[dict[str, str]]:
        return [{"name": "code", "mode": "protected"}, {"name": "data", "mode": "protected"}]


gdt = _GDT()
