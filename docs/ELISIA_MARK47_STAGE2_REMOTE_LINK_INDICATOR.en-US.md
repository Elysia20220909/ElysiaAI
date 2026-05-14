# E.L.I.S.I.A. Mark XLVII Stage 2: Remote Link Indicator

## Summary

This document defines the **Mark XLVII Remote Link Indicator** as the next safe build after Stage 1.5.

It combines four directions into one safe build route.

| Direction | Stage 2 Work |
| --- | --- |
| More Mark XLVII feeling | Sync Remote Link Indicator with browser HUD |
| Better schematic reading | Draw the LED + resistor + switch schematic |
| Better physical finish | Add enclosure, labels, and cable organization |
| Continue from micro:bit | Move from built-in LED to external low-brightness LED |

This project is only a low-voltage, low-current, tabletop display device. It does not include flight, propulsion, weapons, body-moving machinery, high-power systems, or WAN-exposed admin panels.

## 1. Stage 2 Target

```text
Browser HUD
  -> Remote Link State
  -> Relay Log
  -> Indicator Preview
  -> Optional micro:bit / low-brightness LED indicator
```

States:

| State | HUD Meaning | LED Meaning |
| --- | --- | --- |
| `LINK ONLINE` | Connected | On |
| `LOCAL SAFE MODE` | Safe standby | Slow blink |
| `RELAY ALERT` | Alert | Short blink pattern |
| `LINK STANDBY` | Standby | Off |

## 2. Browser HUD Sync

Start by experiencing sync in the browser.

Added lab surface:

- `public/standalone/mark47-remote-link-indicator/index.html`

Capabilities:

- Switch HUD state.
- Sync the Remote Link Indicator preview.
- Write a Relay Log.
- Show the schematic and enclosure plan on the same screen.

This stage passes even without a real LED. First learn that HUD state and indicator state must mean the same thing.

Visual finish, enclosure, labels, and cost planning are split into `docs/ELISIA_MARK47_REMOTE_LINK_INDICATOR_STYLE_COST_PLAN.en-US.md`.

## 3. LED + Resistor + Switch Schematic

This is a learning schematic. Use only safe low-voltage outputs from development boards or learning kits.

### 3.1 LED Output Side

```text
[Safe board output pin]
        |
        v
   [Resistor]
        |
        v
      [LED]
        |
        v
      [GND]
```

How to read it:

- When the output pin is High, current passes through the resistor and the LED lights.
- The resistor is required to protect the LED.
- The LED has polarity.
- GND is the return path.

Notes:

- Do not connect an LED without a resistor.
- Do not connect directly to PC motherboard power, USB power wires, or AC mains.
- Start with a learning kit or micro:bit breakout.

### 3.2 Switch Input Side

```text
[Safe input pin] --- [Switch] --- [GND]

Input pin uses board-side pull-up or pull-down setting.
```

How to read it:

- The switch is manual human input.
- The input pin needs a stable state when not pressed.
- `pull-up` and `pull-down` are ways to stabilize the default input state.

At the beginning, the switch can remain virtual. Use micro:bit A/B buttons or browser buttons first.

## 4. From micro:bit to External Low-Brightness LED

Recommended order:

```text
micro:bit built-in LED
  -> show LINK state on the micro:bit display
  -> external low-brightness LED through a breakout
  -> solder LED + resistor to practice board
  -> place it in a small enclosure
```

Rules:

- Do not solder directly to the micro:bit board.
- Use crocodile clips or a breakout for edge connections.
- Always include a resistor for an external LED.
- Stay within USB power or the safe learning-kit power range.
- Do not attach it to the neck or body. Keep it as a tabletop demo.

## 5. Enclosure, Labels, and Cable Organization

The Mark XLVII feeling comes less from brightness and more from never losing link state.

Enclosure sketch:

```text
+----------------------------------+
| MARK XLVII REMOTE LINK           |
|                                  |
|  [ LED WINDOW ]   LINK INDICATOR |
|                                  |
|  USB IN          CABLE STRAIN    |
|  LABEL           RELIEF          |
+----------------------------------+
```

Label ideas:

- `MARK XLVII REMOTE LINK`
- `LOCAL ONLY`
- `LOW VOLTAGE`
- `LINK ONLINE`
- `SAFE MODE`
- `RELAY ALERT`

Cable organization:

- Add strain relief for the cable.
- Cover exposed metal leads with heat-shrink tubing.
- Fix the board so it does not move inside the enclosure.
- Route the USB cable so it does not press on LEDs or switches.

## 6. Work Order

```text
1. Try state sync in the browser HUD
2. Copy the schematic into a notebook
3. Show the same state on the micro:bit built-in LED
4. Solder LED + resistor on a practice board
5. Check for shorts with a multimeter
6. Run a short low-voltage light test
7. Place it in a small enclosure and add labels
```

## 7. Acceptance Criteria

Stage 2 is complete when:

- Browser HUD and indicator show the same state.
- `LINK ONLINE`, `LOCAL SAFE MODE`, `RELAY ALERT`, and `LINK STANDBY` can be explained.
- The LED + resistor + GND concept can be drawn.
- The switch input concept can be explained.
- State display works on the micro:bit built-in LED or an external low-brightness LED.
- A multimeter continuity check can confirm no short circuit.
- Exposed metal inside the enclosure is reduced.
- No high-power parts, hazardous power, body mounting, or WAN exposure are used.

## 8. Next Stage

Stage 3 can branch into:

| Direction | Work |
| --- | --- |
| Software | Persist HUD state through a local API |
| Electronics | Add a low-risk button input |
| Visual finish | Refine a tabletop Mark XLVII enclosure |
| Learning | Combine schematic and physical layout into one design sheet |

The beauty of this stage is not brighter light. It is aligned state. The HUD changes, the small LED means the same thing, and the log quietly remembers it. That agreement is the first real Remote Link.
