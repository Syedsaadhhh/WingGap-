# WingGap Second-Input Anti-Hardcode Proof

## Verification Purpose
To prove that WingGap computes plan topology, marker counts, and pitch values dynamically from measured physical dimensions, and does not hardcode results.

$$\text{Input A} \ne \text{Input B} \implies \text{Columns}_A \ne \text{Columns}_B, \; \text{Rows}_A \ne \text{Rows}_B, \; \text{Count}_A \ne \text{Count}_B, \; \text{Pitch}_A \ne \text{Pitch}_B$$

## Input Comparison Data

### Input A (Residential Sash Lite)
- Width: $480\text{ mm}$ ($48.0\text{ cm}$)
- Height: $720\text{ mm}$ ($72.0\text{ cm}$)
- Columns: $\lceil 480 / 45 \rceil = 11$
- Rows: $\lceil 720 / 45 \rceil = 16$
- Total Markers: $11 \times 16 = 176$
- Horizontal Center Pitch: $480 / 11 \approx 43.636\text{ mm}$ ($\le 45.0\text{ mm}$)
- Vertical Center Pitch: $720 / 16 = 45.000\text{ mm}$ ($\le 45.0\text{ mm}$)
- Max Clear Gap: $45.0 - 6.35 = 38.65\text{ mm}$ ($\le 50.8\text{ mm}$)
- Status: Target Met (`TRUE`), Guidance Check Met (`TRUE`)

### Input B (Storefront Vision Lite)
- Width: $1250\text{ mm}$ ($125.0\text{ cm}$)
- Height: $1850\text{ mm}$ ($185.0\text{ cm}$)
- Columns: $\lceil 1250 / 45 \rceil = 28$
- Rows: $\lceil 1850 / 45 \rceil = 42$
- Total Markers: $28 \times 42 = 1176$
- Horizontal Center Pitch: $1250 / 28 \approx 44.643\text{ mm}$ ($\le 45.0\text{ mm}$)
- Vertical Center Pitch: $1850 / 42 \approx 44.048\text{ mm}$ ($\le 45.0\text{ mm}$)
- Max Clear Gap: $44.643 - 6.35 = 38.293\text{ mm}$ ($\le 50.8\text{ mm}$)
- Status: Target Met (`TRUE`), Guidance Check Met (`TRUE`)

## Differentiation Matrix

| Metric | Input A | Input B | Match / Differentiated |
| :--- | :--- | :--- | :--- |
| **Pane Width** | $480\text{ mm}$ | $1250\text{ mm}$ | $\ne$ Differentiated |
| **Pane Height** | $720\text{ mm}$ | $1850\text{ mm}$ | $\ne$ Differentiated |
| **Columns** | $11$ | $28$ | $\ne$ Differentiated |
| **Rows** | $16$ | $42$ | $\ne$ Differentiated |
| **Total Marker Count** | $176$ | $1176$ | $\ne$ Differentiated |
| **Horizontal Pitch** | $43.636\text{ mm}$ | $44.643\text{ mm}$ | $\ne$ Differentiated |
| **Vertical Pitch** | $45.000\text{ mm}$ | $44.048\text{ mm}$ | $\ne$ Differentiated |

Automated regression suite: `test/anti-hardcode.test.ts` passes as part of `npm run test`.
