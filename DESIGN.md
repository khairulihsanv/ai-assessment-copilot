# Dexa Assessment — academic workbench

Updated 4 October 2026. This specification reconciles the earlier Dribbble exploration with `docs/03_Spesifikasi_UI_UX_Dexa_Assessment`. The PRD remains the functional baseline.

## Direction
Warm off-white canvas, white working surfaces, forest green actions, crisp borders and clear typography. The work itself is the focal point: a submission, the relevant criteria, an AI draft and the lecturer's decision. No decorative spheres, glow navigation, fabricated metrics or unverifiable trust badges.

## Shared tokens
`app/globals.css` owns the light and dark semantic palettes. Use `background`, `card`, `foreground`, `muted-foreground`, `primary`, `secondary` and `border` utilities. Light canvas #f7f8f5, text #17251d, action #214c3e, border #d8dfda. Inputs use stronger boundaries and keyboard focus is blue. Dark mode uses #111815 canvas and #a5d6b8 primary with dark text.

Inter is the main face; numbers and technical identifiers may use the existing monospace face. Page titles are approximately 32px, content 14–16px, metadata 12px. Keep primary action targets at least 44px. Use 8–12px radii and essentially no shadows.

## Navigation and behavior
The desktop sidebar is 232px with a compact option. On small screens a native modal drawer provides focus containment and Escape dismissal. The top bar has context navigation, functional theme toggle and account settings; no pretend search or notification actions. Role-sensitive routes are preserved. The default theme is light; a saved user preference remains respected.

## Honesty and content
Public workflow examples must be labeled as illustrations. AI suggestions are drafts; only lecturer-released grades are final. Never imply RAG is fully implemented or promise zero hallucinations. Empty states explain the next real action. Auth forms keep working credentials and registration; demo credentials are explicitly optional. Placeholder SSO claims and nonfunctional session switches are removed from presentation, not treated as implemented features.

## Responsive and accessibility
Use semantic main, nav and forms; persistent labels, proper autocomplete, error announcements, visible focus, contrast in both themes and reduced-motion support. Tables may scroll inside their own container. Avoid hiding essential actions on mobile. Validate desktop and mobile screenshots when browser access is available.
