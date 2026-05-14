# E.L.I.S.I.A. Mark XLVII Remote Link Indicator Style, Cost, and Build Plan

## Summary

This document turns the **Mark XLVII Remote Link Indicator** into a safe, stylish tabletop link terminal rather than only a working electronics exercise.

The goal is a small, low-voltage, readable, tidy **local-only support HUD accessory**.

This plan does not include flight, propulsion, weapons, body-moving machinery, high-power systems, or WAN-exposed admin panels.

## 1. Concept

Mark XLVII style comes from four ideas.

| Element | Expression |
| --- | --- |
| Remote Link | Receive HUD state through a small LED indicator |
| Relay Log | Keep state changes visible in logs |
| Standby Beauty | Look calm and intentional even while idle |
| Local Only | Stay on LAN/localhost, never public by default |

Design image:

```text
Browser HUD
  -> LINK ONLINE / LOCAL SAFE / RELAY ALERT
  -> Remote Link Indicator
  -> low-brightness LED + clean enclosure
```

## 2. Visual Design

The recommended look is a **small black communication beacon**.

Palette:

| Color | Use |
| --- | --- |
| Matte black | Main enclosure |
| Gunmetal | Label, screws, edge trim |
| Cyan | LINK ONLINE |
| Amber | LOCAL SAFE MODE |
| Red | RELAY ALERT |
| White | Small text and labels |

Avoid:

- Making the whole object red and gold.
- Making the LED too bright.
- Adding too many labels.
- Leaving cables messy.
- Leaving bare boards exposed.

## 3. Enclosure Design

Use a tabletop enclosure:

```text
+------------------------------------------------+
| MARK XLVII REMOTE LINK                         |
|                                                |
|        [ diffused LED window ]                 |
|                                                |
| LINK ONLINE / LOCAL SAFE / RELAY ALERT         |
|                                                |
| USB IN                         LOCAL ONLY      |
+------------------------------------------------+
```

Suggested size:

| Item | Target |
| --- | --- |
| Width | 70 to 110 mm |
| Depth | 45 to 75 mm |
| Height | 20 to 40 mm |
| LED window | 8 to 20 mm |
| Cable exit | Rear or side |

Visual details:

- Show the LED through a white or milky diffuser.
- Add rubber feet so it sits slightly above the desk.
- Make `MARK XLVII REMOTE LINK` the main label and keep other labels smaller.
- Use a short black or gray USB cable.
- Use heat-shrink tubing to make internal wiring look intentional.

## 4. Materials

| Category | Item | Purpose |
| --- | --- | --- |
| Core | micro:bit / Pico / M5Stack | Indicator brain |
| Display | Low-brightness LED | Shows link state |
| Protection | Resistor | Protects LED |
| Input | Tactile switch | Optional manual input |
| Board | Practice board / perfboard | Mount LED and resistor |
| Insulation | Heat-shrink tubing | Reduce exposed metal |
| Enclosure | Small case | Make it a tabletop terminal |
| Visual finish | Labels, stickers, diffuser | Mark XLVII feeling |
| Cable management | Cable ties, cable sleeve | Keep wiring tidy |
| Feet | Rubber feet | Desk stability |

## 5. Cost Estimate

Prices change. These are broad estimates using public prices checked on 2026-05-14.

| Route | Contents | Estimate |
| --- | --- | --- |
| PC only | Browser HUD only | 0 JPY |
| micro:bit minimal | micro:bit V2 + USB cable/simple case | 5,000 to 7,000 JPY |
| Pico budget | Raspberry Pi Pico W + LED/resistor/switch/board | 2,500 to 5,000 JPY |
| Soldering practice | Starter tool set + practice parts | 7,000 to 12,000 JPY |
| Better soldering iron | Temperature-controlled iron + tools | 16,000 to 25,000+ JPY |
| M5Stack small HUD | M5Stack Core2-class device + cable/case | 9,000 to 13,000 JPY |
| Styled finish | Enclosure, diffuser, labels, cable management | Add 1,500 to 5,000 JPY |

Reference prices:

- micro:bit V2: RobotShop showed `¥4,687`.
- Raspberry Pi Pico W: Switch Science showed `¥1,342`, but it was sold out when checked.
- M5Stack Core2 v1.3: Switch Science showed `¥8,030`.
- DFRobot Soldering Starter Tool Set: RobotShop showed `¥6,531`.
- HAKKO FX600D-class temperature-controlled soldering iron: WAFUU JAPAN showed `¥15,680`.

## 6. Recommended Builds

### A. Safest And Cheapest

```text
PC browser HUD
  + Mark XLVII Remote Link Indicator simulator
```

Cost:

- 0 JPY.

Best for:

- Deciding the visual language first.
- Trying state transitions before buying hardware.

### B. micro:bit Route

```text
micro:bit
  + built-in LED matrix
  + A/B buttons
  + simple case
```

Cost:

- 5,000 to 7,000 JPY.

Benefits:

- Works without soldering.
- LEDs, buttons, and sensors are built in.
- Maps directly to Stage 2 link-state display.

### C. Soldering Practice Route

```text
development board
  + practice board
  + LED
  + resistor
  + switch
  + small enclosure
```

Cost:

- Parts only: 2,000 to 5,000 JPY.
- With tools: 8,000 to 20,000+ JPY.

Benefits:

- Teaches schematic reading, continuity checks, and enclosure work.
- Becomes a physical Mark XLVII link terminal.

### D. Visual-First Route

```text
M5Stack Core2
  + small screen HUD
  + no enclosure fabrication
  + browser-HUD-like UI
```

Cost:

- 9,000 to 13,000 JPY.

Benefits:

- Screen gives an immediate sci-fi terminal feeling.
- Existing case keeps the finish clean.
- Strong before moving into soldering.

## 7. Build Order

```text
1. Decide colors and state behavior in the browser
2. Sketch enclosure size and labels on paper
3. Test display only on micro:bit or M5Stack
4. Draw the LED + resistor + switch schematic
5. Solder LED + resistor on a practice board
6. Check for shorts with a multimeter
7. Mount in a small enclosure and secure the cable
8. Add final labels and diffuser
```

## 8. Label Text

Main label:

```text
MARK XLVII REMOTE LINK
```

Small labels:

```text
LOCAL ONLY
LOW VOLTAGE
LINK ONLINE
LOCAL SAFE MODE
RELAY ALERT
NO PHYSICAL ACTUATION
```

Optional Japanese labels:

```text
ローカル専用
低電圧
安全待機
中継警告
物理駆動なし
```

## 9. Finish Checklist

| Item | Pass Condition |
| --- | --- |
| LED | Not too bright, state is readable |
| Enclosure | Corners are comfortable, stable on desk |
| Cable | Pulling the cable does not stress the board directly |
| Labels | Readable up close, not overcrowded |
| Inside | Exposed metal is reduced |
| Power | USB or safe development-board range |
| Operation | Tabletop demo, not body-mounted |

## 10. Sources And Price Check

Check prices again before purchasing. Prices above were checked on 2026-05-14.

- [RobotShop: Cytron BBC micro:bit Mainboard V2](https://jp.robotshop.com/products/cytron-bbc-microbit-mainboard-v2)
- [Switch Science: Raspberry Pi Pico W](https://www.switch-science.com/products/8171)
- [Switch Science: M5Stack Core](https://www.switch-science.com/collections/lp-m5stack-core)
- [RobotShop: DFRobot Soldering Starter Tool Set](https://jp.robotshop.com/en/products/dfrobot-soldering-starter-tool-set)
- [WAFUU JAPAN: HAKKO FX600D-813](https://wafuu.com/products/hakko-digital-temperature-controlled-soldering-iron-fx600d-813-temperature-range-200-540-c-flat-plug-ac100v)

## 11. Evaluation

The best first path is: **design the look in the PC browser version, then move into a micro:bit or low-brightness LED enclosure**.

Mark XLVII style is not about size or power. It is about a clean link state: a small enclosure, a quiet LED, a short cable, and readable labels. That is enough to make a real tabletop remote-link terminal.
