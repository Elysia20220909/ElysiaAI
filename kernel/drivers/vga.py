import logging


logger = logging.getLogger("AbyssRTOS_VGA")


class VGAConsole:
    """
    Simulates the x86 0xB8000 text-mode video buffer.
    Based on pritamzope/OS vga.c / console.c logic.
    """

    def __init__(self, width: int = 80, height: int = 25):
        self.width = width
        self.height = height
        # Buffer of (char, attribute)
        self.buffer = [[" " for _ in range(width)] for _ in range(height)]
        self.attr_buffer = [[0x07 for _ in range(width)] for _ in range(height)]  # Light Grey on Black
        self.cursor_x = 0
        self.cursor_y = 0

        self.clear()
        self.write_string("AbyssRTOS Kernel Console Initialized.\n")

    def clear(self):
        self.buffer = [[" " for _ in range(self.width)] for _ in range(self.height)]
        self.cursor_x = 0
        self.cursor_y = 0

    def write_string(self, text: str, attr: int = 0x07):
        """Standard kprint-like implementation."""
        for char in text:
            if char == "\n":
                self.cursor_x = 0
                self.cursor_y += 1
            else:
                if self.cursor_y < self.height and self.cursor_x < self.width:
                    self.buffer[self.cursor_y][self.cursor_x] = char
                    self.attr_buffer[self.cursor_y][self.cursor_x] = attr
                    self.cursor_x += 1

            # Auto-wrap
            if self.cursor_x >= self.width:
                self.cursor_x = 0
                self.cursor_y += 1

            # Simple Scroll
            if self.cursor_y >= self.height:
                self._scroll()

    def _scroll(self):
        self.buffer.pop(0)
        self.buffer.append([" " for _ in range(self.width)])
        self.attr_buffer.pop(0)
        self.attr_buffer.append([0x07 for _ in range(self.width)])
        self.cursor_y = self.height - 1

    def get_screen(self) -> list[str]:
        """Returns the screen content for the UI."""
        return ["".join(row) for row in self.buffer]


# Global Instance
vga = VGAConsole()
