class _Keyboard:
    def __init__(self) -> None:
        self.scancodes: list[int] = []

    def handle_scancode(self, scancode: int) -> None:
        self.scancodes.append(scancode)


keyboard = _Keyboard()
