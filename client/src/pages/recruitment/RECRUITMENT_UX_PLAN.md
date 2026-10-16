# Recruitment Tracker Revamp Plan

> **Superseded:** This older proposal does not describe the current recruitment stages or interface. Follow [the current recruitment UI and scheduling guide](../../../../docs/designs/recruitment-lifecycle.md) for the implemented workflow.

This document outlines a comprehensive plan to redesign the Recruitment Tracker (Kanban board) to significantly improve user experience (UX), visual design (UI), and accessibility (a11y) without losing any existing functionality.

## 1. Drag & Drop Experience (UX)
**Current Issue:** The persistent dashed "Drop here" boxes take up unnecessary vertical space, clutter the interface, and look unpolished when empty.
**Proposed Solution:**
*   **Remove Persistent Drop Zones:** Hide the dashed "Drop here" boxes by default.
*   **Dynamic Hover States:** Instead, when a user drags a candidate card, the entire target column's background should slightly darken or highlight with a subtle border to indicate it is a valid drop zone.
*   **Smooth Animations:** Add smooth transition animations for cards entering and leaving columns.

## 2. Layout & Visual Hierarchy (UI)
**Current Issue:** Columns look like disjointed floating boxes, arrows (`->`) waste horizontal space, and the native horizontal scrollbar is obtrusive. The bottom tags ("Approved", "Wishlist") feel disconnected.
**Proposed Solution:**
*   **Lane Design:** Convert the columns into cohesive "lanes" with a very light gray/tinted background (similar to Trello or Jira). This creates a clearer visual container for the cards.
*   **Remove Arrows:** Remove the `->` arrows between columns. The left-to-right flow is implicitly understood in a Kanban board, saving valuable horizontal space.
*   **Custom Scrollbar:** Replace the thick native gray scrollbar with a sleek, thin custom scrollbar (using `scrollbar-hide` or custom WebKit scrollbar styles).
*   **Card Redesign:** Elevate candidate cards with a clean white background, soft shadow, and clear typography. Add a small avatar/initials circle for the candidate.
*   **Header Reorganization:** Move the status tags (e.g., "Approved", "In Progress") up into the column header, pairing them with the stage count (e.g., "Screening (3)").

## 3. Accessibility & Usability (a11y)
**Current Issue:** Drag-and-drop is often mouse-only, making it inaccessible for keyboard users or those using screen readers.
**Proposed Solution:**
*   **Keyboard Navigation:** Ensure the drag-and-drop library supports keyboard sensors (using `Space` to pick up, `Arrows` to move, `Enter` to drop).
*   **Action Menus (Click-to-Move):** Add a small `...` (kebab) menu on each candidate card with options like "Move to Screening", "Move to Telephonic", etc. This allows users to move candidates with simple clicks.
*   **Aria Labels:** Add descriptive `aria-labels` to columns and cards (e.g., "Candidate John Doe in Sourcing stage").

## 4. Workspace Organization (Information Architecture)
**Current Issue:** Showing both the Kanban Board and the Candidates Pipeline Table on the same screen vertically cramps the viewport.
**Proposed Solution:**
*   **View Toggles:** Introduce a "View Toggle" at the top right of the tracker (near "Export Register"). Allow the user to switch between **Board View** (Kanban) and **List View** (Table).
*   **Full Height:** Whichever view is selected should take up the full available height of the page, eliminating double-scrollbars and giving the user maximum context.

---

### Implementation Phasing

*   **Phase 1: Structure & Styling** - Convert columns to lanes, remove arrows, style custom scrollbars, and build the View Toggle (Board vs. List).
*   **Phase 2: Drag & Drop Refinement** - Remove static drop zones, implement drag-over highlight states, and polish card UI.
*   **Phase 3: Accessibility Injection** - Add keyboard sensors, focus states, and the "Click-to-Move" context menu on cards.
