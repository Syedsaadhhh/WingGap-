# WingGap — Devpost Submission Material

**Project Name**: WingGap  
**Tagline**: Turn real window panes into inspectable bird-safe exterior treatment plans.  
**Track / Event**: Built for NextStep Hacks during the competition window.

---

### The Problem
Hundreds of millions of birds die each year in North America from collisions with glass windows. Architectural glass reflects trees and open sky, or creates illusory see-through corridors that birds attempt to fly through.

While international standards (such as the American Bird Conservancy guidelines and Canadian Standards Association CSA A460:19) recommend that clear gaps between visual pattern elements not exceed 50.8 mm (2 inches) on the exterior glass surface, applying these standards in the field is surprisingly difficult. Homeowners, building managers, and installers either buy expensive pre-spaced films that don't fit custom window sizes, or attempt to hand-space markers, frequently introducing untreated voids that exceed the 50.8 mm clear-gap threshold.

### What WingGap Does
WingGap is a mobile-first field planning instrument. It bridges the gap between published collision-avoidance guidelines and physical glass installation:
1. **Captures** a real window pane and freezes a stable single frame using the device camera.
2. **Defines** the pane boundaries via interactive perspective quad corners.
3. **Accepts** tape-measured physical dimensions (WingGap never guesses scale from pixels).
4. **Generates** a canonical cell-centered grid targeting a maximum 45 mm center pitch, ensuring physical headroom below the 50.8 mm clear-gap ceiling.
5. **Inspects & Repairs**: An interactive inspector allows installers to omit or delete markers around obstructions, while an independent validator dynamically recalculates the exact clear opening. If a deletion creates a gap exceeding 50.8 mm, the layout flags a guidance check failure. A single tap executes canonical plan repair.
6. **Guides Field Installation**: Provides exact edge-offset measurements for chalk lines and physical alignment, plus an exportable schematic stamped `NOT TO SCALE`.

### How It Works
- **Homography Perspective Projection**: Calculates the 3×3 projective homography matrix from the physical pane rectangle $[0, W] \times [0, H]$ to the four user-selected corner points in the captured frame.
- **Authoritative Geometry Core**: Strictly separates horizontal/vertical pitch ($\Delta x, \Delta y$), clear axial gaps ($\Delta x - d, \Delta y - d$), and boundary clearances ($x_0 - d/2, W - x_{\text{last}} - d/2$).
- **Policy-Independent Validator**: Recomputes topology from scratch using locked constants ($d = 6.35\text{ mm}$, pitch $\le 45\text{ mm}$, gap $\le 50.8\text{ mm}$). Plans cannot weaken the validator's assertions.
- **Privacy by Design**: Zero server uploads, zero accounts, no cookies, no tracking. Raw camera frames stay strictly in volatile browser memory during active capture and are never written to persistent `sessionStorage`.

### Technical Implementation
- **Framework**: Next.js 14 (App Router, static production export)
- **Language**: TypeScript with strict typing
- **Styling**: Tailwind CSS
- **Testing**: Vitest with comprehensive property-based testing (100,000-case scalar sweep), adversarial mutation tests, hostile policy-tampering defenses, and unit conversion invariants
- **Optics & Projection**: Custom pure TypeScript projective homography and coordinate transforms without heavy native OpenCV dependencies
- **Code Hygiene**: ESLint, zero dependencies on external ML/CV black boxes

### Challenges Overcome
1. **Coordinate Systems & Display Transforms**: Mapping touch interactions on CSS `object-fit: contain` video letterboxes back to intrinsic image pixels, then through inverse homography to real-world millimeters.
2. **Validator Independence**: Ensuring that the validator cannot be tampered with by corrupt or malicious plan specifications.
3. **Authoritative Deletion Analysis**: Developing dynamic edge versus interior deletion analysis to calculate exact boundary clearances versus center-to-center openings.
4. **Mobile Camera Lifecycle**: Ensuring that active camera tracks shut down cleanly on freeze, unmount, or navigation, preventing battery drain and background camera usage.

### What We Learned
- Why physical measurements must remain manual: Computer vision cannot reliably estimate absolute metric scale from a single uncalibrated monocular phone camera without external fiducials. Explicit tape-measure input is both more reliable and physically truthful.
- How small gaps matter: Omitting even a single dot in a 45 mm grid nearly doubles the affected clear opening to over 83 mm, completely breaching bird collision prevention thresholds.

### Limitations & Truthful Boundary
- **Planning tool, not a certification system**: WingGap generates an installation plan; it cannot physically verify whether an installer accurately adhered to the plan on the physical glass.
- **No collision probability claims**: WingGap does not produce statistical collision risk percentages.
- **Surface 1 requirement**: Markers must be physically placed on the exterior glass surface to prevent specular reflections from obscuring the pattern.

### What's Next
- Printable 1:1 corner alignment templates for physical corner reference.
- Multi-pane window assembly grouping for unified architectural elevations.
- Integration with local hardware store dot-sticker pack templates.

---

### Project Links
- **Live Production URL**: [Pending Deployment]
- **Source Code Repository**: https://github.com/Syedsaadhhh/WingGap-
- **Demonstration Video**: [Pending Video Link]
