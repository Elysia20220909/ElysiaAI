import logging

from kernel.drivers.vga import vga


logger = logging.getLogger("AbyssRTOS_Keyboard")


class KeyboardDriver:
    """
    Simulates a PS/2 Keyboard Driver.
    Based on pritamzope/OS keyboard.c.
    Connects key events to Interrupt 0x21.
    """

    def __init__(self):
        self.scancode_map = {
            0x1E: "a",
            0x30: "b",
            0x2E: "c",
            0x20: "d",
            0x12: "e",
            0x21: "f",
            0x22: "g",
            0x23: "h",
            0x17: "i",
            0x24: "j",
            0x25: "k",
            0x26: "l",
            0x32: "m",
            0x31: "n",
            0x18: "o",
            0x19: "p",
            0x10: "q",
            0x13: "r",
            0x1F: "s",
            0x14: "t",
            0x16: "u",
            0x2F: "v",
            0x11: "w",
            0x2D: "x",
            0x15: "y",
            0x2C: "z",
            0x39: " ",
            0x1C: "\n",
        }

    def handle_scancode(self, scancode: int):
        """Simulates IRQ 1 (0x21)."""
        char = self.scancode_map.get(scancode, "?")
        # logger.info(f"⌨️ AbyssRTOS: IRQ 1 Triggered. Scancode: {hex(scancode)} -> {char}")

        # In a real OS, this would push to a buffer.
        # Here we pipe it to VGA for immediate feedback simulation.
        vga.write_string(char, 0x0B)  # Cyan text for input


# Global Instance
keyboard = KeyboardDriver()
