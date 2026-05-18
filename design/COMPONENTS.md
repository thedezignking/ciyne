# Ciyne component specification

Design direction: Lönar-inspired split-panel invoicing UI with **green/lemon** accent (`--accent-500`) replacing pink. Primary CTAs remain **neutral dark** (`--btn-primary-bg`), not accent-colored.

**Static reference:** open [`primitives.html`](primitives.html) in a browser.  
**Tokens:** [`tokens.css`](tokens.css) · **Layout:** [`layout.css`](layout.css)

---

## Layout primitives (CSS classes)

| Class | Role |
|-------|------|
| `.ciyne-app` | Full-height app shell, page background |
| `.ciyne-header` | Top bar: brand, breadcrumb, actions |
| `.ciyne-header__left` | Brand + breadcrumb group |
| `.ciyne-header__brand` | Logo link |
| `.ciyne-header__crumb` | Muted page title (prefixed with `/`) |
| `.ciyne-header__actions` | Right-aligned button group |
| `.ciyne-main` | Centered content, max-width 1280px |
| `.ciyne-split` | Two-column grid (`1fr` / `1.4fr`); stacks below 1024px |
| `.ciyne-surface` | White card with shadow and border |
| `.ciyne-surface__header` | Title + step progress row |
| `.ciyne-form-footer` | Bottom-aligned actions inside form surface |
| `.ciyne-preview` | Preview column layout and skeleton structure |
| `.ciyne-step-progress` | Three-segment progress bar container |
| `.ciyne-step-progress__bar` | Single segment; `.is-active` / `.is-complete` |

---

## Components (future React implementation)

### BrandMark

Circular logo with lemon-to-lime gradient (`--brand-gradient`) and optional white glyph.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'md'` | `'md'` | 24px or 32px diameter |
| `glyph` | `ReactNode` | crescent SVG | Icon inside circle |
| `ariaLabel` | `string` | — | Required if not decorative |

**CSS:** `.ciyne-brand-mark`, `.ciyne-brand-mark--sm`, `.ciyne-brand-mark--md`

**A11y:** Use `aria-hidden="true"` when adjacent text provides the product name.

---

### PageHeader

Global header for create/edit flows.

| Prop | Type | Description |
|------|------|-------------|
| `productName` | `string` | e.g. `"Ciyne"` |
| `breadcrumb` | `string` | e.g. `"Create Invoice"` |
| `actions` | `ReactNode` | Preview, Continue, account icon |

**Anatomy:** `PageHeader` → `BrandMark` + title + `actions` slot.

**A11y:** Wrap in `<header>`. Breadcrumb should be in a `<nav aria-label="Breadcrumb">` when multiple levels exist.

---

### Button

| Variant | Use | Token |
|---------|-----|-------|
| `primary` | Continue, Next | `--btn-primary-bg` |
| `secondary` | Preview, Browse files | outline `--btn-secondary-border` |
| `ghost` | Tertiary text actions | transparent |
| `icon` | Account / settings | circular 40px |

| Prop | Type | Description |
|------|------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'icon'` | Visual style |
| `disabled` | `boolean` | Muted bg, `cursor: not-allowed` |

**CSS:** `.ciyne-btn`, `.ciyne-btn--primary`, etc.

**A11y:**
- Native `<button>` with visible `:focus-visible` ring (`--focus-ring`, accent-colored).
- `disabled` attribute when inactive; do not rely on color alone.
- Icon buttons require `aria-label`.

**Do not** use accent green for primary CTAs.

---

### StepProgress

Three-step wizard indicator. Accent only on active (and optionally completed) segments.

| Prop | Type | Description |
|------|------|-------------|
| `current` | `1 \| 2 \| 3` | Active step (1-indexed) |
| `total` | `number` | Default `3` |

**States per segment:**
- Before `current`: `.is-complete` → `--step-complete` (`--accent-400`)
- At `current`: `.is-active` → `--step-active` (`--accent-500`)
- After `current`: default → `--step-inactive`

**A11y:**
- Container: `role="group"` with `aria-label="Progress"` or linked via `aria-labelledby`.
- When implemented in JS, set `aria-current="step"` on the active step label (if step names are exposed).
- Do not rely on color alone; expose step number in visible text (e.g. “Step 1 of 3”) for screen readers.

---

### Surface

Card wrapper for form and preview columns.

| Prop | Type | Default |
|------|------|---------|
| `padding` | `'sm' \| 'md' \| 'lg'` | `'lg'` (32px) |
| `as` | element tag | `'article'` |
| `children` | `ReactNode` | — |

**CSS:** `.ciyne-surface`

---

### SplitWorkspace

Two-column create flow layout.

| Prop | Type | Description |
|------|------|-------------|
| `formSlot` | `ReactNode` | Left: stepped form |
| `previewSlot` | `ReactNode` | Right: live preview |

**CSS:** `.ciyne-split` inside `.ciyne-main`

**Responsive:** Single column below 1024px; preview follows form.

---

### FieldLabel

| Prop | Type | Default |
|------|------|---------|
| `htmlFor` | `string` | — |
| `children` | `ReactNode` | — |

**Styles:** 13px semibold (`--font-size-sm`, `--font-weight-semibold`), `--text-primary`.

**A11y:** Always associate with control via `htmlFor` / `id`.

---

### TextInput

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Rendered via `FieldLabel` |
| `placeholder` | `string` | — |
| `error` | `string` | Shows error message + `aria-invalid` |

**Styles:** 14px medium, `--radius-md`, border `--border`, focus `--border-strong` + `--focus-ring`.

**A11y:** `aria-describedby` for errors and hints.

---

### DateField

Extends `TextInput` with calendar affordance (icon button or native `type="date"`).

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string` | ISO date or locale string |
| `onChange` | `(value: string) => void` | — |

**A11y:** Calendar trigger must be keyboard-operable; prefer native date input where supported for built-in a11y.

---

### FileUploadZone

Upload area for invoice logo (JPG/PNG, max 5MB per Lönar reference).

| Prop | Type | Description |
|------|------|-------------|
| `accept` | `string` | `image/jpeg,image/png` |
| `maxSizeMb` | `number` | Default `5` |
| `onFile` | `(file: File) => void` | — |

**Anatomy:** dashed/light background (`--accent-50` on hover), cloud icon, helper text, `Button variant="secondary"` (“Browse files”).

**A11y:** Hidden `<input type="file">` focused via label/button; announce file name and errors.

---

### PreviewSkeleton

Placeholder bars inside preview column before data binds.

**CSS:** `.ciyne-skeleton`, `.ciyne-skeleton-stack`, preview BEM blocks in `layout.css`.

**A11y:** Wrap preview in `aria-label="Invoice preview"`; use `aria-busy="true"` while loading.

---

### InvoicePreview (later phase)

Replaces `PreviewSkeleton` when form state is wired.

| Prop | Type | Description |
|------|------|-------------|
| `invoiceNumber` | `string` | — |
| `dateIssued` | `string` | — |
| `dueDate` | `string` | — |
| `from` | `Address` | Sender |
| `to` | `Address` | Client |
| `lineItems` | `LineItem[]` | — |
| `logoUrl` | `string` | Optional uploaded logo |

Updates in real time from left-column form state (lifted state or context).

---

## Accent usage rules

| Element | Accent? |
|---------|---------|
| Brand mark circle | Yes (gradient) |
| Step progress (active / complete) | Yes |
| Focus rings | Yes (`--accent-500`) |
| Primary buttons (Continue, Next) | **No** — neutral dark |
| Preview skeleton bars | **No** — `--border` gray |

---

## Porting to Tailwind / Next.js

1. Import `tokens.css` in `app/globals.css` before Tailwind.
2. Map `@theme inline` block to Tailwind v4 utilities (already stubbed in `tokens.css`).
3. Import `layout.css` or reimplement primitives as React components using the same token names.
4. Load **Plus Jakarta Sans** via `next/font/google`.

---

## File index

| File | Purpose |
|------|---------|
| `tokens.css` | Colors, type, spacing, shadows, focus |
| `layout.css` | App shell, split layout, buttons, preview skeleton |
| `primitives.html` | Visual QA and Lönar shell mock |
| `COMPONENTS.md` | This specification |
