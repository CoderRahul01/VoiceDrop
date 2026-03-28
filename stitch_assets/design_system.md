# The Design System: Editorial Precision & Tonal Depth

## 1. Overview & Creative North Star
**Creative North Star: The Sonic Architect**

To elevate a "flat and minimal" request into a high-end digital experience, we move away from generic templates toward **The Sonic Architect**—a philosophy that treats interface design like a well-mastered audio track: clean, intentional, and layered. 

This design system avoids the "cheapness" of standard flat design by utilizing an editorial layout style. We favor high-contrast typography scales and "Atmospheric Depth" over traditional drop shadows. By breaking the grid with intentional asymmetry and using subtle background shifts instead of structural lines, we create an interface that feels less like a website and more like a premium, tech-forward tool.

---

## 2. Color & Surface Philosophy

While the core aesthetic is flat, we achieve "premium" through **Tonal Layering**. We use the `primary` token (#68dbae) as a surgical accent to highlight efficiency.

### The "No-Line" Rule
Traditional 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined solely through background color shifts. To separate content:
- Use `surface_container_low` for secondary sections.
- Use `surface_container_highest` for primary interactive elements.
- **Exception:** If a container requires a boundary for accessibility, use a **Ghost Border**: a 0.5px line using the `outline_variant` token at 20% opacity.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the surface-container tiers to create a "nested" depth:
1.  **Base Layer:** `surface` (#0f1512)
2.  **Navigation/Content Blocks:** `surface_container_low` (#171d1a)
3.  **Active Interactive Cards:** `surface_container_high` (#252b28)

### Signature Textures (The Editorial Exception)
To provide "visual soul" to a flat system, main CTAs may use a subtle linear gradient transitioning from `primary` (#68dbae) to `primary_container` (#26a37a) at a 135-degree angle. This prevents the teal-green from appearing "plastic" on high-density mobile screens.

---

## 3. Typography
We utilize **Inter** (System Sans-Serif) to maintain a "Tech-Forward" personality. The hierarchy is driven by extreme scale contrast to mirror high-end editorial magazines.

- **Display-LG (3.5rem):** Used for atmospheric branding or hero headers. Set with tight letter-spacing (-0.02em).
- **Headline-SM (1.5rem):** Used for page titles. Bold, authoritative, and always sitting on `on_surface`.
- **Body-MD (0.875rem):** The workhorse for all user data. Ensure line-height is set to 1.5x for maximum legibility during rapid scanning.
- **Label-SM (0.6875rem):** Used for "metadata" (timestamps, file sizes). Set in uppercase with +0.05em letter-spacing to convey a professional, "engineered" look.

---

## 4. Elevation & Depth: Tonal Layering
We do not use traditional structural lines. Depth is achieved by "stacking" the surface-container tiers.

- **The Layering Principle:** Place a `surface_container_lowest` card on a `surface_container_low` section to create a soft, natural lift.
- **Glassmorphism:** For floating elements (like a bottom-docked navigation bar), use `surface` at 80% opacity with a `backdrop-blur` of 12px. This integrates the component into the environment rather than making it feel "pasted on."
- **Ambient Shadows:** Only when a floating "drop" effect is required for UX clarity, use a shadow with a 24px blur, 0% spread, and 6% opacity of `on_secondary_fixed`. It should be a "whisper" of a shadow, not a structural element.

---

## 5. Components

### Buttons
- **Primary:** Background `primary` (#68dbae), text `on_primary`. 12px (`md`) border radius. No shadows.
- **Secondary:** Background `surface_container_highest`, 0.5px `outline_variant` ghost border.
- **Tertiary/Ghost:** No background. Text `primary`. Used for low-emphasis actions like "Cancel" or "Settings."

### Cards & Lists
- **Rule:** Forbid the use of divider lines. 
- Use vertical white space from the **Spacing Scale** (e.g., `8` (1.75rem) between sections) or a subtle shift from `surface` to `surface_container_low` to separate different content types.
- **Border Radius:** Always use `md` (0.75rem / 12px) for a modern, handheld feel.

### Input Fields
- **Background:** `surface_container_highest`. 
- **Border:** 0.5px `outline_variant` (Ghost Border).
- **Focus State:** Border changes to 1px `primary`. No glow/outer shadow.
- **Typography:** Placeholder text uses `on_surface_variant` in `body-md`.

### Voice-Specific Components
- **Waveform Visualizers:** Use `primary` for active frequencies and `surface_variant` for background frequencies.
- **The "Drop" Action:** A primary-colored floating action button (FAB) using `primary_container` with a `primary` icon to ensure the most important action is unmistakable.

---

## 6. Do’s and Don’ts

### Do:
- **Use Asymmetry:** Place a `label-sm` timestamp in the top-right of a card while the `headline-sm` sits in the bottom-left. This feels custom and intentional.
- **Embrace Negative Space:** Use the `12` (2.75rem) and `16` (3.5rem) spacing tokens to let the "voice" of the app breathe.
- **Stick to the 0.5px Rule:** If a line is needed, keep it razor-thin. It communicates precision engineering.

### Don’t:
- **Don’t use 100% Black:** Always use `surface` (#0f1512) for the dark theme base; it provides a much more premium, "ink-like" depth than #000000.
- **Don’t use Standard Shadows:** Avoid any shadow that looks "dirty." If you can see the shadow clearly, it’s too dark. 
- **Don’t use Dividers:** Never use a horizontal line to separate list items. Use a 1px gap of the background color or a change in surface-container tone instead.
