# Dexa Assessment — design

Updated 4 November 2026, when the product owner approved a warmer, illustrated workspace. The PRD remains the functional baseline.

## Direction
Behind login the workspace is friendly and rounded, aimed at students and lecturers who use it daily: soft cards, one illustration on each home page, a class shown as a book on a shelf. Illustration stays on the home pages. Working pages (review, tables, analytics, rubrics) only take the palette and shapes, because the work itself is the focal point. No fabricated metrics, unverifiable trust badges, or controls that do nothing.

## Workspace tokens
`app/globals.css` sets the palettes on `body:has([data-workspace][data-role=…])`, so they reach portalled dialogs and never touch the landing or auth screens. Use the semantic utilities (`background`, `card`, `foreground`, `muted-foreground`, `primary`, `secondary`, `border`, `success-*`, `warning-*`, `danger-*`), never raw Tailwind colours.

- Student: canvas #e9ebf2, text #1b2233, action #c8441f, tint #fce3d8.
- Lecturer: ground #d9ccbd, canvas #fbf8f3, text #2a2433, action #6f4dc2, tint #e2d9f3.
- Both have dark variants. Class covers (`--cover-*`) carry white text; tiles (`--tile-*`) carry `--tile-ink`.

Plus Jakarta Sans is the workspace face, loaded only behind login. Radii come from `--radius: 1rem`; main cards use 24px. Actions keep at least 44px targets and 4.5:1 contrast. Keyboard focus is blue.

## Navigation and behavior
Lecturers get an icon rail with captions inside a rounded frame; students get pills in the top bar. On small screens a native modal drawer provides focus containment and Escape dismissal. No pretend search or notification actions. The default theme is light; a saved preference is respected.

Moving between pages must feel immediate: the pressed menu item reacts at once (`useLinkStatus`). There is deliberately no route-level `loading.tsx`: React holds a skeleton on screen for at least 300 ms, which made fast pages slower. Target under 200 ms normally and under 1 s on a slow phone connection. AI drafts are the exception: they run in the background with visible progress.

## Public and auth screens
These keep the forest-green tokens and are separate from the workspace, by request of the product owner: the landing page keeps its existing expressive design (`landing.css`), and login/register are locked to the viewport on desktop (no scrolling), with a cursor-reactive dot grid, a frosted floating form card and the Dexa owl mascot (an original SVG in `components/auth/auth-illustration.tsx`, coloured by the `--illus-*` tokens). Honesty rules below still apply: no social or SSO buttons until those sign-ins exist.

## Honesty and content
Public workflow examples must be labeled as illustrations. AI suggestions are drafts; only lecturer-released grades are final. Never imply RAG is fully implemented or promise zero hallucinations. Empty states explain the next real action. Auth forms keep working credentials and registration; demo credentials are explicitly optional. Placeholder SSO claims and nonfunctional session switches are removed from presentation, not treated as implemented features.

## Responsive and accessibility
Use semantic main, nav and forms; persistent labels, proper autocomplete, error announcements, visible focus, contrast in both themes and reduced-motion support. Tables may scroll inside their own container. Avoid hiding essential actions on mobile. Validate desktop and mobile screenshots when browser access is available.
