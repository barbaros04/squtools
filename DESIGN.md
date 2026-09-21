---
name: SQU Tools
description: A concise, bilingual directory for SQU student planning tools.
colors:
  ink: "#15171b"
  paper: "#f4f1ea"
  muted: "#b9bcb8"
  lavender: "#c7b7ff"
  lime: "#d9f05b"
  coral: "#f0a57c"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, Segoe UI, Arial, sans-serif"
    fontSize: "clamp(3.4rem, 9vw, 8.4rem)"
    fontWeight: 750
    lineHeight: 0.86
    letterSpacing: "-0.065em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Display, Segoe UI, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  tool-feature: "12px"
spacing:
  page-inline: "3rem"
  menu-gap: "0.55rem"
components:
  tool-row:
    backgroundColor: "{colors.lavender}"
    textColor: "{colors.ink}"
    padding: "1.5rem 1.75rem"
  language-switch:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
---

# Design System: SQU Tools

## Overview

**Creative North Star: "The Night Noticeboard"**

SQU Tools is a dark, direct utility surface: a small set of high-contrast choices arranged like notices that can be recognized at a glance. It is not a dashboard, a marketing page, or a collection of floating cards. Color carries tool identity; typography supplies the hierarchy.

The interface should feel decisive and composed on a phone between classes and on a larger study screen. Copy remains plain and factual. English and Arabic are equal layouts, not translations squeezed into an English composition.

**Key Characteristics:**
- Near-black field with three distinct, opaque tool colors.
- Oversized, compact system typography.
- Full-width tool bands rather than card grids.
- Almost no decoration: no gradients, blur, borders, or shadows.

## Colors

The palette uses an ink field, warm light text, and one opaque color per tool; color identifies a destination rather than decorating a surface.

### Primary
- **Night Ink**: the application field and all dark text on colored tool rows.
- **Warm Paper**: primary text on the ink field and focus-ring color.

### Secondary
- **Schedule Lavender**: reserved for Schedule Builder.
- **Room Lime**: reserved for Empty Room Finder and small availability accents.
- **Plan Coral**: reserved for Academic Plan Helper.

### Neutral
- **Soft Ash**: supporting text, metadata, and inactive utility controls.

### Named Rules
**The One-Band Rule.** A tool gets one solid color band. Do not scatter its color across unrelated controls or sections.

## Typography

**Display Font:** Apple system UI stack, falling back to Segoe UI and Arial.
**Body Font:** The same system UI stack.

**Character:** Dense, familiar system type keeps the application useful rather than branded for its own sake. Arabic uses the platform’s Arabic system face through the same stack.

### Hierarchy
- **Display** (750, `clamp(3.4rem, 9vw, 8.4rem)`, 0.86): the home directory heading only.
- **Headline** (750, `clamp(1.8rem, 4vw, 3.5rem)`, 0.94): tool names in the directory.
- **Title** (750, `clamp(3rem, 7vw, 6.5rem)`, 0.9): tool-page heading.
- **Body** (400, 1rem, 1.45): one-line tool descriptions.
- **Label** (600, 0.78–0.95rem): availability and utility actions.

### Named Rules
**The Big Name Rule.** Tool names carry the visual weight; do not add icons, kicker labels, or slogan copy above them.

## Layout

The desktop canvas is centered at 1240px with 3rem side breathing room. A compact header sits above a deliberately large opening gap, followed by a single-column stack of tool bands. Each band pairs content on the left with availability and action text on the right.

At 650px and below, the canvas reduces to 2rem side room, bands become vertically ordered, and their metadata becomes a readable horizontal row. Use `min-height: 100vh` so laptop and tablet screens retain a complete frame; use touch-sized controls and never rely on hover to expose information. Arabic switches the document direction to RTL and mirrors alignment naturally.

## Elevation & Depth

The system is intentionally flat. Depth comes from the contrast between the ink canvas and fully opaque colored bands, not shadows, blur, translucent panels, or layered cards.

### Named Rules
**The Flat Field Rule.** Do not add shadows, glass effects, gradients, or hairline borders as visual substitutes for hierarchy.

## Shapes

Tool bands are square and structural, with no rounded-card treatment. The only softly rounded form is a featured tool band (`12px`) when it needs to separate the main route from the ink field. Header utility actions are compact rectangular controls, not pills.

## Components

### Navigation
- **Style:** wordmark at one edge; language switch and contextual back link at the other. Both actions use the same compact dark utility-control treatment.
- **State:** utility controls shift from `#22262b` to `#2e343c` on hover; keyboard focus uses a 3px warm-paper outline with a 4px offset.
- **Mobile:** navigation remains a single row; do not add a drawer for this small set of actions.

### Tool Directory Row
- **Shape:** a full-width colored band, never a floating card.
- **Content:** name and one direct description; metadata sits opposite on wider screens and below on phones.
- **State:** hover may use a small brightness change only. Do not underline or translate the row.

### Language Switch
- **Style:** compact rectangular utility control shared with the back link.
- **State:** the selected locale is stored locally; content uses a short fade-and-settle transition that respects reduced-motion preferences.

### Empty Room Finder
- **Style:** a feature workspace keeps the ink field and oversized title, then places a three-option mode control ahead of a building filter, custom time-selection trigger, and flat results.
- **State:** the active mode is lime. From and range modes expose an inline, bilingual 15-minute time rail; range selection explicitly switches between start and end. Standard results group rooms by building. From-mode results use flat room runways, with proportional bars rather than cards.
- **Responsive:** filters stack on phones, mode controls share the available width, result groups or runways collapse to one column, and the time rail scrolls horizontally.

## Do's and Don'ts

### Do:
- **Do** keep a single-column tool menu with large, readable type.
- **Do** reserve lavender, lime, and coral for their assigned tools.
- **Do** keep English and Arabic copy concise and let RTL control the layout direction.
- **Do** preserve the flat ink-and-band contrast at every breakpoint.

### Don't:
- **Don't** bring back card grids, glass panels, gradients, borders, or shadow stacks.
- **Don't** use underlines, bouncy transforms, or novelty motion for tool-row hover states.
- **Don't** add promotional headlines, institutional-affiliation claims, or generic dashboard metrics.
- **Don't** make a tablet layout a scaled desktop screenshot; preserve touch targets and readable metadata.
