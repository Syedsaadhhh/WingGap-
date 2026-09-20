# WingGap Video Demonstration Script

**Target Duration**: 3:05 – 3:15  
**Hackathon Compliance**: NextStep Hacks (Strict 3–5 minute requirement)  
**Hardware Setup**: Mobile device pointing at a real reflective window pane, tape measure on hand.

---

### Sequence & Timing

#### 0:00 – 0:10 | Cold Open: The Real Window
- **Visual**: Live camera moving slightly in front of a real, reflective glass pane. Tap `Capture pane`. The feed freezes instantly and displays the `CAPTURED FRAME` tag.
- **Voiceover**: "Every year, millions of birds collide with architectural glass because it reflects open sky and vegetation. This is WingGap running on a real window pane."

#### 0:10 – 0:28 | The Problem & The Mission
- **Visual**: Pan across the frozen pane showing reflections.
- **Voiceover**: "Published standards—like the American Bird Conservancy and CSA A460—recommend clear spacing between exterior markers not exceed two inches (50.8 millimeters). But turning that into an accurate, inspectable layout for a specific piece of glass usually requires custom CAD or manual math. WingGap converts field measurements into an inspectable physical treatment plan."

#### 0:28 – 1:00 | Corner Definition
- **Visual**: Drag amber corner handles smoothly to the four corners of the glass daylight opening.
- **Voiceover**: "We define the pane boundaries by selecting the four corners of the glass frame. WingGap uses projective homography to calculate the perspective transformation directly from these four control points."

#### 1:00 – 1:25 | Measured Physical Dimensions
- **Visual**: Briefly show a real physical tape measure held across the pane. Switch to the dimension input fields. Enter measured Width (e.g. 75 cm) and Height (e.g. 110 cm). Toggle unit once to show that 75 cm cleanly converts to 29.53 inches without mutating physical dimensions.
- **Voiceover**: "WingGap never guesses scale from pixels. Real-world physical dimensions must be measured with a tape measure. We enter 75 centimeters by 110 centimeters. Notice that toggling units preserves the exact physical dimensions."

#### 1:25 – 1:50 | Plan Generation & Science Metrics
- **Visual**: Tap `Generate plan`. The perspective grid projects onto the pane. Point out the metric HUD: 6.35 mm dot diameter, columns × rows, marker count, horizontal and vertical pitch. Status badge: `Planning target met · Guidance spacing check met`.
- **Voiceover**: "Here is the computed plan. Each dot is locked at 6.35 millimeters—one quarter inch—applied to Surface 1, the exterior glass. WingGap calculates the canonical cell-centered grid targeting a maximum center pitch of 45 millimeters, leaving built-in headroom below the 50.8 millimeter clear-gap threshold."

#### 1:50 – 2:32 | UNCUT HERO PROOF: Interactive Inspection & Repair
- **Visual**: Keep camera uncut. Tap a specific marker in the grid. The Inspector sheet opens. Tap `Remove marker from plan`.
- **Visual**: Observe the metric card update immediately to red. The affected clear opening jumps above 50.8 mm. Status badge updates to: `Guidance spacing check not met · Clear gap exceeded`.
- **Visual**: Tap `Repair layout`.
- **Visual**: The omitted marker reappears, the clear opening recalculates to under 50.8 mm, and the badge returns to green `Guidance spacing check met`.
- **Voiceover**: "This is what makes WingGap unique. The layout is fully inspectable. If an installer skips or removes a planned marker, WingGap's independent validator immediately recalculates the affected clear opening. When the gap exceeds 50.8 millimeters, the guidance check fails. Tapping 'Repair layout' invokes our idempotent repair core, restoring canonical spacing."

#### 2:32 – 2:48 | Second Input Anti-Hardcode Proof
- **Visual**: Tap `Edit dimensions` or jump to manual planner. Enter distinctly different dimensions: 48 cm by 72 cm. Tap `Generate plan`. Show the new grid: 11 columns × 16 rows, 176 markers, with completely distinct pitch values.
- **Voiceover**: "Nothing in WingGap is hardcoded. Changing the pane dimensions immediately alters the row and column count, marker density, and center pitches."

#### 2:48 – 3:08 | Installation Guide & Field Export
- **Visual**: Tap `Continue to installation guide`. Scroll through the practical guide: first-dot offset measurements, rows and columns, step-by-step physical installation sequence. Tap `Export printable plan (PNG)`. Open the downloaded image, showing the clear `NOT TO SCALE` stamp and disclaimer.
- **Voiceover**: "The installation guide provides exact first-dot offset measurements from the glass edge, so an installer can snap chalk lines or place alignment marks. The exported schematic is stamped 'NOT TO SCALE' to prevent stretching printed sheets across glass."

#### 3:08 – 3:14 | Closing Truth
- **Visual**: Return to camera or summary screen.
- **Voiceover**: "WingGap turns bird-friendly window guidance into an inspectable physical plan for a real pane."
