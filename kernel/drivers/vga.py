class _VGA:
    def __init__(self) -> None:
        self._lines: list[str] = []

    def clear(self) -> None:
        self._lines.clear()

    def write_string(self, value: str, color: int | None = None) -> None:
        del color
        self._lines.append(value)

    def get_screen(self) -> str:
        return "".join(self._lines)


vga = _VGA()
