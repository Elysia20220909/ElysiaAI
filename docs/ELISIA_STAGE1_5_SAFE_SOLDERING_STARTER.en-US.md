# E.L.I.S.I.A. Stage 1.5: Safe Soldering Starter

## Summary

This document defines the first safe route for using tools and soldering in the E.L.I.S.I.A. Safe Mini Lab.

The goal is not to build hazardous equipment. It is to learn tool handling, soldering, continuity checks, LED indication, and case mounting through low-voltage, low-current, tabletop practice.

First build:

```text
E.L.I.S.I.A. / Mark XLVII Safe Link Indicator

Input: manual switch or development-board state
Output: one low-brightness LED
Power: USB or safe low-voltage development-board output
Purpose: show LINK ONLINE / SAFE MODE with light
```

## 1. Safety Boundary

Covered:

- Low-voltage development boards.
- Practice perfboard.
- LED, resistor, pin header, switch, connector.
- Continuity checks.
- Heat-shrink tubing, enclosure mounting, cable organization.

Not covered:

- AC mains, wall outlets, or power-supply disassembly.
- DIY large battery packs.
- Motors, heaters, bright LEDs, or lasers.
- Flight, propulsion, weapons, projectiles, or body-moving machinery.
- Direct soldering onto PC motherboards.
- Wearing powered bare boards on the body.

## 2. First Tools

| Tool | Purpose | Selection Note |
| --- | --- | --- |
| Temperature-controlled soldering iron | Solder joints | Use one with a stand and temperature control |
| Iron stand | Holds hot iron | Stable and hard to tip over |
| Tip cleaner | Cleans iron tip | Brass wool or dedicated cleaner |
| Solder | Mechanical and electrical joint | Thin electronics solder |
| Flux | Helps solder flow | Electronics flux, small amount |
| Flush cutter | Trims leads | Small electronics type |
| Tweezers | Holds small parts | Fine tip |
| Multimeter | Continuity and voltage checks | Continuity beeper recommended |
| Heat-resistant mat | Protects desk | Prevents scorching |
| Eye protection | Protects eyes | For trimmed component leads |
| Ventilation | Keeps fumes away | Window, fan, or extractor |

You do not need luxury tools at the start. The essentials are the iron stand, heat-resistant mat, ventilation, and multimeter.

## 3. First Parts

| Part | Purpose | Comment |
| --- | --- | --- |
| Practice PCB | Soldering practice | A board that can be sacrificed |
| Perfboard | Small circuits | Hole-grid board |
| LED | Status display | Low brightness is enough |
| Resistor | LED protection | Always pair with LED |
| Pin header | Development-board connection | Also useful for practice |
| Tactile switch | Manual input | Simple safe input |
| Jumper wire | Connection | Useful with breadboards |
| Heat-shrink tubing | Insulation | Reduces exposed metal |
| Small enclosure | Protection | Avoid carrying bare boards |

## 4. Workbench Layout

```text
[Ventilation]
   |
[Heat-resistant mat]
   |-- soldering iron + stand
   |-- practice board
   |-- flush cutter
   |-- multimeter
   |-- parts tray
```

Pre-work checklist:

- Remove food and drink from the desk.
- Keep cables from catching on chairs or feet.
- Fix the soldering iron location.
- Decide the shutdown routine before starting.
- Do not leave the hot tip unattended.

## 5. First Practice

### Practice 1: Make Solder Dots

Purpose:

- Learn how heat and solder behave.
- Observe common failures such as blobs, poor flow, and bridges.

Steps:

- Make small solder dots on empty practice-board pads.
- Keep neighboring pads separate.
- Observe shine, shape, and amount.

Pass:

- No accidental bridge to the next pad.
- The iron tip never touches the desk or cable.
- The iron returns safely to its stand.

### Practice 2: Solder Pin Headers

Purpose:

- Learn how to hold parts straight.

Steps:

- Insert a pin header into a practice board.
- Tack one pin first.
- Check alignment, then solder the rest.

Pass:

- Pins are not heavily tilted.
- Neighboring pins are not bridged.
- Header does not fall out with light handling.

### Practice 3: Read LED and Resistor

Purpose:

- Understand that LEDs have polarity and need a resistor.

Concept:

```text
Safe development-board output
  -> resistor
  -> LED
  -> GND
```

Notes:

- Do not connect an LED directly without a resistor.
- Do not work directly on PC motherboard power or USB power wires.
- Start with safe terminals on a development board or learning kit.

## 6. Stage 1.5 Build

### Safe Link Indicator

For Mark XLVII, treat this as a `Remote Link` state indicator.

```text
LINK ONLINE  -> LED ON
LOCAL SAFE   -> LED slow blink
RELAY ALERT  -> LED short blink pattern
```

The first implementation does not need a real LED.

Build order:

1. Simulate LED state in the browser version.
2. Show the same state on a micro:bit or development-board built-in LED.
3. Solder LED and resistor onto a practice board.
4. Put it in an enclosure and reduce exposed metal.

## 7. What to Check With a Multimeter

At the beginning, continuity checks are enough.

Check:

- Neighboring pins are not accidentally connected.
- Intended GND connections are connected.
- Connector orientation is correct.
- Soldered parts do not wiggle.

Avoid:

- Making live measurement the first exercise.
- Measuring AC mains or power supplies.
- Measuring inside batteries or charger circuits.

## 8. Acceptance Criteria

Stage 1.5 is complete when:

- The soldering iron can be placed safely.
- Clean solder dots can be made on a practice board.
- One row of pin headers can be soldered straight.
- LED, resistor, and GND can be explained.
- A multimeter can confirm no short circuit.
- The work stays low-voltage, low-current, and tabletop-only.
- Dangerous power, motors, and heating parts have not been added.

## 9. Next Stage

After Stage 1.5, choose a path:

| Direction | Next Step |
| --- | --- |
| More Mark XLVII feeling | Sync Remote Link Indicator with browser HUD |
| Better schematic reading | Draw the LED + resistor + switch schematic |
| Better physical finish | Add enclosure, labels, and cable organization |
| Continue from micro:bit | Move from built-in LED to external low-brightness LED |

To combine all four directions, use `docs/ELISIA_MARK47_STAGE2_REMOTE_LINK_INDICATOR.en-US.md`.

Picking up tools does not mean entering a dangerous world. It means learning small heat, small light, and small verification. When the first calm solder joint holds and the first little LED glows, the real workshop begins.
