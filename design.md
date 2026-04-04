# Marketier AI Design System

## Overview

 Marketier AI is a compact workflow dashboard for turning a brand website into approved blog, LinkedIn, and publishing artifacts. The visual language is calm, readable, and information-dense, with a navy-first light theme, restrained green for primary actions, and purple used sparingly for secondary workflow emphasis.

---

## Colors

- **Primary Navy** `#0F172A`: primary actions, strong headers
- **Secondary Slate** `#64748B`: secondary text, borders
- **Tertiary Sage** `#059669`: links, CTAs, highlights
- **Accent Purple** `#8B5CF6`: supporting actions, secondary workflow states, LinkedIn accents
- **Background** `#F8FAFC`: page background
- **Surface Default** `#FFFFFF`: card backgrounds
- **Success** `#22C55E`: confirmed, healthy, publish-ready
- **Warning** `#EAB308`: pending, caution
- **Error** `#EF4444`: critical, destructive
- **Info** `#0EA5E9`: informational, new feature

Light mode uses a soft green-and-black gradient wash with subtle purple accents in selected controls, chips, and workflow modules. Keep surfaces white, borders light, green reserved for primary actions and positive states, and purple reserved for secondary emphasis only.

## Typography

- **Headline Font**: Plus Jakarta Sans
- **Body Font**: DM Sans
- **Mono Font**: Fira Code

- **Display**: 40px bold, 1.15 line height
- **H1**: 32px bold, 1.2 line height
- **H2**: 24px semibold, 1.25 line height
- **H3**: 20px semibold, 1.3 line height
- **H4**: 16px medium, 1.35 line height
- **Body LG**: 18px regular, 1.6 line height
- **Body**: 16px regular, 1.6 line height
- **Body SM**: 14px regular, 1.5 line height
- **Caption**: 12px medium, 1.4 line height
- **Code**: Fira Code 14px regular, 1.6 line height

---

## Spacing

Base unit: **8px**

- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px
- **2xl**: 48px
- **3xl**: 64px

## Border Radius

- **sm**: 4px
- **DEFAULT**: 8px
- **md**: 12px
- **lg**: 16px
- **full**: 9999px

## Elevation

Shadows should stay soft and diffused.

- **sm**: 1px offset, 3px blur, `#0F172A` at 3%
- **DEFAULT**: 2px offset, 6px blur, `#0F172A` at 5%
- **md**: 4px offset, 16px blur, `#0F172A` at 7%
- **lg**: 8px offset, 32px blur, `#0F172A` at 10%

---

## Components

### Buttons

- **Primary**: `#0F172A` fill, white text, no border, darker hover fill
- **Secondary**: transparent fill, `#0F172A` text, 1px `#0F172A` border
- **Ghost**: transparent fill, `#475569` text, `#F1F5F9` hover fill
- **Destructive**: `#EF4444` fill, white text, darker red hover
- **Accent**: `#8B5CF6` fill, white text, darker violet hover
- **Disabled**: 40% opacity, no hover/focus motion

Sizes:

- **sm**: 32px height, 6px 14px padding
- **md**: 42px height, 10px 22px padding
- **lg**: 48px height, 12px 28px padding

### Cards

- **Default**: white fill, 1px `#E2E8F0` border, 8px radius, no shadow
- **Elevated**: white fill, no border, md shadow, 8px radius
- Use compact padding and avoid stacked overlap effects
- Optional tinted header strips may use `#0F172A` with white text

### Inputs

- **Default**: 1px `#E2E8F0` border, white fill, no shadow
- **Hover**: 1px `#0F172A` border
- **Focus**: 2px `#0F172A` border with `#0F172A18` ring
- **Error**: 2px `#EF4444` border with `#EF444418` ring
- **Disabled**: `#F1F5F9` fill, muted text
- **Height**: 42px
- **Padding**: 10px 14px

### Chips

- **Filter**: `#F8FAFC` fill, `#0F172A` text, `#E2E8F0` border
- **Filter Active**: `#0F172A` fill, white text
- **Success**: `#22C55E15` fill, `#16A34A` text
- **Accent**: `#8B5CF615` fill, `#7C3AED` text
- **Warning**: `#EAB30815` fill, `#CA8A04` text
- **Error**: `#EF444415` fill, `#DC2626` text

### Lists

- **Row height**: 48px
- **Padding**: 8px 16px
- **Divider**: `#F1F5F9`
- **Hover**: `#F8FAFC`
- **Active**: `#0F172A06`

### Tooltips

- Background: `#0F172A`
- Text: `#F8FAFC`
- Padding: 6px 12px
- Radius: 8px
- Max width: 240px

---

## Do's and Don'ts

1. **Do** use navy + white as the primary visual rhythm.
2. **Do** reserve green for primary actions and positive states.
3. **Do** use purple sparingly for secondary emphasis, LinkedIn surfaces, and selected workflow states.
4. **Do** keep surfaces white and borders light.
5. **Do** keep cards compact and readable.
6. **Do** use progressive disclosure for secondary content.
7. **Do** use clear iconography alongside labels.
8. **Don't** use beige-heavy surfaces or warm orange accents.
9. **Don't** introduce heavy shadows or overlapping card stacks.
10. **Don't** overload the landing page with all workflow sections.
11. **Don't** let metadata overpower the main action or content artifact.

---

## Current Patterns

- **Landing page**: compact sync form, short hero, and quick actions only
- **Profiles page**: saved brands and permanent delete action
- **FAQ page**: clean Q&A cards
- **Run workspace**: compact analysis, topic queue, approved articles
- **Article preview**: editor-like review surface with copy, edit, and approval
- **LinkedIn workflow**: carousel prompts, images, approval, scheduling, publish controls with occasional purple emphasis
- **Navigation**: slim icon rail, no title text in the rail, small `M` logo mark only
- **Logo**: compact `M` monogram in a rounded square with green/black gradient and a small accent dot
- **Theme**: dual light/dark mode with a manual toggle and local persistence
- **Shell**: sidebar and main content sit on the same plane; do not wrap the whole workspace in one enclosing card
