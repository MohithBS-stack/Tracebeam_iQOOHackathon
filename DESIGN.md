# Tracebeam: Design System (v0.1, 4 Oct 2026)

## 1. Decision in one paragraph

**Style: signal-flag neo-brutalism.** Thick black outlines, hard zero-blur shadows, flat fields of colour taken from the International Code of Signals flags (red, yellow, blue, black, white). The product is about a person raising a flag so a helper across the room can answer, so every error gets its own generated flag. That flag is the one memorable element. Everything around it stays quiet and consistent.

## 2. Style options considered

| Style | Fit with the subject | Build speed in 1 day | Risk to the 30% product-quality score | Verdict |
|---|---|---|---|---|
| Maximalism | Low. Dense and ornamental fights a 60-second demo | Slow | High: busy screens hide the loop | No |
| Pure brutalism (raw, unstyled) | Medium | Fast | Medium: reads as unfinished to judges | No |
| Glass or aurora gradients | Low. Generic dev-tool look | Medium | Low | No |
| Swiss minimal | Medium | Fast | Low, but forgettable on novelty | No |
| Dark dev-tool with neon accent | Medium. Very common among hackathon entries | Fast | Low, but blends in | No |
| **Signal-flag neo-brutalism** | **High. Flags are literally how people ask for help at a distance** | **Fast: borders, flat fills, hard shadows** | **Low: high contrast, big touch targets** | **Yes** |

Research notes behind the choice:
- Neo-brutalism is defined by borders of roughly 2 to 5 px, hard offset shadows with zero blur, and flat saturated fills. It keeps normal product usability, unlike early raw brutalism.
- Flat black on saturated colour is hard to make inaccessible on the colour axis, though clashing colour blocks can cause visual fatigue, so colours are used with discipline (section 4).
- Press interaction: the control moves by its shadow offset and the shadow collapses, so it feels pushed into the page. Focus is shown by recolouring the shadow, avoiding layout shift.
- Wide use of the style by hackathon and indie products means a plain version would not stand out. The generated flag and the signal-flag palette are what make this one specific.

## 3. What this design deliberately avoids

Cream background with terracotta accent. Near-black screen with one acid-green accent. Newspaper hairline columns. Identical rounded cards with soft grey shadows. Tracked-out ALL-CAPS eyebrow labels. Arrow glyphs on buttons. Gradient washes. Emoji as icons.

## 4. Colour palette

Five flag colours plus one sunken surface. Pure black for outlines and text on light fields.

| Token | Hex | Role |
|---|---|---|
| `--hoist-blue` | `#1B3FD8` | Brand, primary buttons, solved state, links |
| `--distress-red` | `#E8262B` | Stuck state, active flag. Fill only, never text on white |
| `--pennant-yellow` | `#FFC72C` | Helper match, highlights, focus shadow |
| `--black` | `#000000` | Outlines, hard shadows, text on light fields |
| `--flag-white` | `#F5F7FA` | App background and cards |
| `--sea-mist` | `#DCE3F1` | Sunken areas (trace paste box, ledger rows) |

Contrast (computed from WCAG luminance, so recheck with a tool before shipping):

| Pair | Ratio | Use |
|---|---|---|
| Black on flag white | about 19:1 | Body text |
| White on hoist blue | about 7.6:1 | Button labels |
| Black on pennant yellow | about 13.5:1 | Match card text |
| Black on distress red | about 4.8:1 | Stuck card text (passes 4.5:1) |
| Hoist blue on flag white | about 7:1 | Link text |
| White on distress red | about 4.4:1 | **Do not use for small text** |

State is never colour-only: stuck uses a square flag with an X glyph, a helper match uses a pennant (triangle) shape, and solved uses a blue tile with a check. Each also has a text label.

## 5. Typography

| Role | Family | Settings | Why |
|---|---|---|---|
| Display and flag codes | **Archivo** (variable) | width 125 (expanded), weight 900, tracking -0.5% | Chunky expanded grotesque with signage weight. The variable font has width 62 to 125 and weight 100 to 900, OFL licence |
| Body and UI | **Atkinson Hyperlegible Next** (variable) | weight 400 and 700 | Built for legibility, good in a noisy, bright hall. Variable 200 to 800, OFL |
| Traces and code only | **Martian Mono** | weight 400, standard width | Distinct monospace used only for real code, not for decorative labels. OFL |

Scale (mobile, sp, line height in brackets): Display 40 (44), Heading 28 (32), Subheading 22 (28), Body 16 (24), Small 13 (18), Trace 13 (20). Keep line length under 80 characters. Sentence case everywhere.

Fonts are bundled as TTF in the app (`res/font`) so nothing loads from the network. Phase 1 web can use Google Fonts links.

## 6. Tokens

CSS (Phase 1):

```css
:root {
  --hoist-blue: #1B3FD8;
  --distress-red: #E8262B;
  --pennant-yellow: #FFC72C;
  --black: #000000;
  --flag-white: #F5F7FA;
  --sea-mist: #DCE3F1;

  --border: 3px solid var(--black);
  --shadow: 4px 4px 0 var(--black);     /* zero blur, always */
  --shadow-press: 0 0 0 var(--black);
  --radius: 0;                           /* squares; flags are rectangles */
  --space: 4px;                          /* scale: 4 8 12 16 24 32 48 */

  --font-display: "Archivo", sans-serif;
  --font-body: "Atkinson Hyperlegible Next", system-ui, sans-serif;
  --font-mono: "Martian Mono", ui-monospace, monospace;
}
.display { font-family: var(--font-display); font-weight: 900; font-stretch: 125%; }
```

Compose (finale), same values:

```kotlin
object Tb {
  val HoistBlue = Color(0xFF1B3FD8); val DistressRed = Color(0xFFE8262B)
  val PennantYellow = Color(0xFFFFC72C); val Black = Color(0xFF000000)
  val FlagWhite = Color(0xFFF5F7FA); val SeaMist = Color(0xFFDCE3F1)
  val Border = 3.dp; val ShadowOffset = 4.dp; val Radius = 0.dp
}
```

## 7. Components

| Component | Spec |
|---|---|
| Button | 3 px black outline, flat fill (blue primary with white label, yellow secondary with black label), 4 px hard shadow. Pressed: translate by 4 px and drop the shadow. Minimum height 56 dp |
| Flag tile | Generated flag, 3 px outline, 4 px hard shadow, 3-character code in Archivo below it. Sizes: 64, 160, full width |
| Match sheet | Bottom sheet, yellow field, pennant shape at the top edge, flag, one reason line, fix-note preview, Accept and Not now |
| Trace box | Sea-mist field, 3 px outline, Martian Mono. Redacted spans shown as solid black bars |
| Chip | 2 px outline, flat fill, text label plus shape |
| Bottom bar | Two tabs (Listening, Ledger) with a large centred "Raise a flag" button that breaks the bar |
| Focus | Shadow recolours to yellow with a 3 px black outline. No layout shift |
| Touch targets | At least 48 dp, primary actions 56 dp |

## 8. Screens (five, plus ledger)

```
1 Listening            2 Raise a flag          3 Flag raised
┌──────────────┐       ┌──────────────┐        ┌──────────────┐
│ Lagnarok     │       │ Paste a trace│        │  ┌────────┐  │
│ ┌──────────┐ │       │ ┌──────────┐ │        │  │  FLAG  │  │
│ │ 7 devs   │ │       │ │ trace… ██│ │        │  └────────┘  │
│ │ nearby   │ │       │ └──────────┘ │        │     K7R      │
│ └──────────┘ │       │ We will send │        │ Looking for  │
│              │       │ only this:   │        │ a helper…    │
│ [Raise a flag]       │ ndk, abi ... │        │ [Cancel]     │
│ Ledger  Hist │       │ [Raise it]   │        └──────────────┘
└──────────────┘       └──────────────┘
4 Match (helper)       5 Solved
┌──────────────┐       ┌──────────────┐
│ ◣ Someone    │       │ Fixed.       │
│ nearby has   │       │ Say what     │
│ this error   │       │ worked (20s) │
│ ┌────┐ ndk,  │       │ [Hold to     │
│ │FLAG│ abi   │       │  record]     │
│ └────┘       │       │ [Save fix card]
│ [Accept][Not now]    └──────────────┘
└──────────────┘
```

Alignment: left-aligned text, flags centred. Navigation depth is one level: no modal stacks.

## 9. Motion and haptics

- **One orchestrated moment: the hoist.** When you raise a flag, it climbs a mast from the bottom of the screen to centre in about 600 ms with a hard stop and a single 250 ms vibration. On the helper phone the pennant slides in from the edge with the match pattern (see `TECHNICAL.md` section 9).
- Everything else is response to touch: press-in on buttons, sheet slide on open.
- Reduced motion: replace the climb with a cut and keep the haptic.

## 10. Copy rules

Plain verbs, sentence case, active voice, same name for an action everywhere.

| Moment | Copy |
|---|---|
| Home button | Raise a flag |
| Preview | We will send only this. Your code stays on your phone. |
| Waiting | Looking for someone nearby who has fixed this |
| Match | Someone nearby has fixed this error |
| Accept | Accept |
| Decline | Not now |
| Meet | Find the matching flag |
| Solved | Mark solved |
| Voice note | Hold to say what worked |
| Empty ledger | No fixes yet. Mark your next fix as solved and it shows up here. |
| Permission denied | Tracebeam needs Nearby devices to find helpers. Open settings to allow it. |

Errors say what happened and what to do, with no apology.

## 11. Accessibility

Contrast table in section 4. Touch targets 48 dp or more. Haptic plus visual plus label for every state. TalkBack labels describe flags in words ("Flag K7R, red and yellow quarters"). Respect reduced motion and system font scaling up to 200%.

## 12. Mobbin research status

The Mobbin connector returned "requires a paid plan" on 4 Oct 2026, so no Mobbin screens were used and nothing here is copied from them. Use these queries when access is available (iOS and web are the platforms Mobbin offers; patterns translate to Android):

1. Nearby people screen with a distance indicator
2. Incoming request bottom sheet with accept and decline
3. Permission primer for Bluetooth and nearby devices
4. Voice note recorder with hold-to-record
5. Empty state for a personal saved-items list
6. Success confirmation after resolving an item

## 13. Sources

- Neo-brutalism rules and accessibility notes: theplusaddons.com (neo-brutalism web design, 2026), superdesign.dev brutalism components, trends.daisyui.com neubrutalism, pub.dev brutalist_ui
- Archivo axes and licence: Google Fonts METADATA (Omnibus-Type, OFL)
- Atkinson Hyperlegible Next variable weights: Google Fonts, fontalternatives.com
- Martian Mono: github.com/evilmartians/mono
