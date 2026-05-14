# E.L.I.S.I.A. Mark LXXXV Stage 1: Status Badge Build Guide

## Summary

Stage 1 is the **Mark85 Status Badge**, a no-tools, no-soldering, no-hazardous-power beginner project. In the Mark XLVII / Mark 47 direction, the same safe implementation is interpreted as the **Mark XLVII Remote Link Badge**.

The goal is to experience the logic-board idea safely: button input, LED display, state transitions, virtual sensors, and event logs. The badge does not perform hazardous physical output.

First completion target:

```text
A button: ONLINE / OFFLINE
B button: ALERT
Tilt: MOTION STABLE / MOVING
Display: 5x5 LED or browser HUD
Log: boot, alert, safe mode
```

## 1. What This Builds

| Item | Value |
| --- | --- |
| Name | E.L.I.S.I.A. Mark85 Status Badge |
| Difficulty | Beginner |
| Tools | Not required |
| Soldering | Not required |
| Power | USB power |
| Physical output | LED display only |
| Hazardous capability | None |
| Skills | Input, state, display, logs, safety boundary |

Mark XLVII translation:

| Mark85 Name | Mark XLVII Name |
| --- | --- |
| Mark85 Status Badge | Mark XLVII Remote Link Badge |
| ONLINE | LINK ONLINE |
| ALERT | RELAY ALERT |
| SAFE_MODE | LOCAL SAFE MODE |
| Event Stream | Relay Log |

## 2. Route Options

| Route | Required | Recommendation | Comment |
| --- | --- | --- | --- |
| PC browser version | Existing PC only | Start here | Try the control loop before buying hardware |
| micro:bit version | micro:bit and USB cable | Best first hardware | Buttons, LEDs, and sensors are built in |
| M5Stack version | M5Stack-class device and USB cable | Next step | Strong small-HUD feeling |
| Raspberry Pi Pico version | Pico, breadboard, LED, resistor, button | Later | Better for schematic-reading practice |

The cleanest path is **PC browser version -> micro:bit version**.

## 3. PC Browser Version

Added simulator:

- `public/standalone/mark85-status-badge/index.html`

Capabilities:

- `A ONLINE` toggles online/offline.
- `B ALERT` enters alert state.
- `MOTION` toggles posture state.
- `SAFE` returns to safe mode.
- `RESET` returns to standby.
- Virtual temperature and distance sensors are visible.
- Event stream is visible.

This stage does not move any physical device. First, learn how state changes, displays update, and logs remain visible.

## 4. micro:bit Version

### Parts

| Part | Purpose |
| --- | --- |
| micro:bit | Logic board, LED display, buttons, sensors |
| USB cable | Power and flashing |
| PC | Program creation |
| Case | Optional, recommended for carrying |

Do not add external LEDs, motors, or batteries at the beginning. The micro:bit alone is enough.

### State Design

```text
OFFLINE
  -> A button -> ONLINE

ONLINE
  -> A button -> OFFLINE
  -> B button -> ALERT
  -> shake    -> MOTION

ALERT
  -> A+B      -> SAFE_MODE

SAFE_MODE
  -> A button -> ONLINE
```

### micro:bit MicroPython Example

This safe example uses only the built-in LED display and buttons.

```python
from microbit import *

mode = "OFFLINE"

IMAGES = {
    "OFFLINE": Image.SAD,
    "ONLINE": Image.DIAMOND,
    "ALERT": Image.NO,
    "MOTION": Image.ARROW_N,
    "SAFE_MODE": Image.HAPPY,
}

def show_mode():
    display.show(IMAGES[mode])

show_mode()

while True:
    if button_a.is_pressed() and button_b.is_pressed():
        mode = "SAFE_MODE"
        show_mode()
        sleep(500)
    elif button_a.was_pressed():
        mode = "OFFLINE" if mode == "ONLINE" else "ONLINE"
        show_mode()
    elif button_b.was_pressed():
        mode = "ALERT"
        show_mode()

    if accelerometer.was_gesture("shake") and mode == "ONLINE":
        mode = "MOTION"
        show_mode()
        sleep(700)
        mode = "ONLINE"
        show_mode()

    sleep(50)
```

## 5. Safety Rules

Do:

- Start with USB power only.
- Do not add external parts at first.
- Do not power the micro:bit on a metal surface.
- Keep it away from water, sweat, metal dust, and conductive surfaces.
- Do not mount it to the neck or body for operation.
- If batteries are used later, keep testing short and tabletop-only.

Avoid:

- Motors, heaters, bright external LEDs, or lasers.
- Reused power supplies, appliances, or batteries.
- Direct wiring into a PC motherboard.
- Wearing a powered bare board on the body.

## 6. Acceptance Criteria

Stage 1 is complete when:

- Buttons switch between `ONLINE`, `ALERT`, and `SAFE_MODE`.
- Current state is visible on the LED display or browser HUD.
- The PC browser version keeps an event log.
- The micro:bit button-to-display relationship can be explained.
- No hazardous external output is used.
- One next feature can be chosen intentionally.

## 7. Next Branch

After Stage 1, choose by goal.

| Direction | Next Build |
| --- | --- |
| More cinematic | M5Stack small HUD terminal |
| Start tools and soldering | Stage 1.5 Safe Soldering Starter |
| Better schematic reading | Pico + breadboard + LED/button |
| E.L.I.S.I.A. integration | Connect browser HUD to local API |
| Helmet-style direction | Display-only non-worn mock |

My recommendation for Stage 2 is to **connect browser HUD state with micro:bit state**. Learn communication, logging, and state synchronization before adding more physical output.
