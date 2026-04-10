# UX and UI rules

## General direction
This app should feel like:
- a plain text mode interface
- an old-school web utility
- a practical working tool, not a marketing product
- dense, direct, explicit, and easy to scan

Do not make it feel:
- soft
- trendy
- app-store polished
- animated for effect
- visually decorative

## Typography
This is a hard rule.

- Use monospace everywhere.
- All text must have the same font size.
- Headings must not be larger than body text.
- Hierarchy may be expressed only through:
  - color
  - shade
  - bold
- Do not introduce typographic scale.
- Do not use large headings, hero text, oversized labels, or display text.

## Allowed colors only
Only these colors are allowed in the app:

- Black
- Blue
- Green
- Cyan
- Red
- Magenta
- Brown
- Light Grey / White
- Dark Grey / Bright Black
- Light Blue
- Light Green
- Light Cyan
- Light Red / Pink
- Light Magenta
- Yellow
- Bright White

Do not introduce colors outside this set.

## Links and buttons
Links are the default action UI.
Use buttons only for primary actions.

Rules:
- prefer links over buttons
- use buttons only for the main action on a screen or in a form
- hyperlinks should be blue and underlined
- dangerous actions must be red links
- do not hide actions behind hover-only UI if the action can be shown explicitly

## Interaction style
Prefer literal control over implicit interaction.

Rules:
- explicit visible actions are better than hover-discovered actions
- it is acceptable to show action links at the end of rows
- do not depend on hover as the main way to reveal important actions
- avoid fancy microinteractions
- avoid UI cleverness

## Layout
- Desktop-first web app
- Prefer compact layout
- Avoid unnecessary whitespace
- Keep related information grouped tightly
- Use the available width well
- Prefer practical alignment over visual looseness

## Information density
High information density is a core requirement.

Rules:
- keep important information visible
- prefer inline metadata when useful
- reduce unnecessary vertical height
- avoid large empty areas
- do not oversimplify screens by hiding essential information

## Tables, lists, and detail pages
Because the product is a working CRM utility:

- prefer lists and table-like structures over decorative cards
- prefer scanning over presentation
- prefer direct row actions where useful
- keep metadata close to the record it belongs to
- detail pages should stay compact and practical
- preserve a text-oriented structure where possible

## Components
- edit existing components before creating new ones
- reuse existing patterns
- do not create parallel components without a strong reason
- prefer consistency over novelty

## States and feedback
Avoid modal warnings where possible.

Prefer:
- small fixed-position feedback boxes in the top-right corner
- short status messages
- undo where appropriate

Rules:
- prefer lightweight notifications over interruptive modals
- use modals only when truly necessary
- after an action, feedback should be quick and clear
- when possible, allow undo instead of forcing confirmation first

## Dangerous actions
- destructive actions must be explicit
- destructive actions must be visually distinct
- use red links for delete-like actions
- avoid accidental clicks
- do not disguise dangerous actions as neutral controls