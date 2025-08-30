# Tutoria Platform Design System (2025)

This document outlines the design system for the SpeakShire English Learning Platform, providing guidelines for consistent UI/UX implementation across all modules.

## 🎨 Color Palette

### Primary Colors
- **Primary Blue**: `#2573ff` - Main brand color, used for primary actions, links, and key UI elements
  - Light: `#5a94ff`
  - Dark: `#1a5cd1`

### Secondary Colors
- **Mint**: `#00d7c2` - Secondary accent color, used for complementary elements and highlights
  - Light: `#4de4d4`
  - Dark: `#00b3a1`

### Semantic Colors
- **Success**: `#22c55e` - Used for success states, completed actions
- **Error**: `#ef4444` - Used for error states, destructive actions
- **Warning**: `#f59e0b` - Used for warning states, cautionary elements
- **Info**: `#3b82f6` - Used for informational elements

### Neutral Colors
- **Background**: `#fafbfd` - Main background color
- **Paper**: `#ffffff` - Card and surface background
- **Text Primary**: `#1f2937` - Main text color
- **Text Secondary**: `#4b5563` - Secondary text color
- **Divider**: `rgba(0, 0, 0, 0.08)` - Used for dividers and borders

## 📝 Typography

### Font Family
- Primary: `'Inter', 'Roboto', sans-serif`

### Type Scale
- **H1**: 2.5rem, 700 weight, 1.2 line height
- **H2**: 2rem, 700 weight, 1.2 line height
- **H3**: 1.75rem, 600 weight, 1.3 line height
- **H4**: 1.5rem, 600 weight, 1.3 line height
- **H5**: 1.25rem, 600 weight, 1.4 line height
- **H6**: 1rem, 600 weight, 1.4 line height
- **Subtitle1**: 1rem, 500 weight, 1.5 line height
- **Subtitle2**: 0.875rem, 500 weight, 1.5 line height
- **Body1**: 1rem, 400 weight, 1.5 line height
- **Body2**: 0.875rem, 400 weight, 1.5 line height
- **Button**: 0.875rem, 600 weight, no text transform
- **Caption**: 0.75rem, 400 weight, 1.5 line height
- **Overline**: 0.75rem, 500 weight, uppercase, 0.08em letter spacing

## 🧩 Components

### Buttons
- **Border Radius**: 12px
- **Padding**: 8px 16px
- **Hover Effect**: Slight elevation (translateY(-1px)) and shadow
- **Variants**:
  - **Contained**: Solid background with hover shadow
  - **Outlined**: 1.5px border width
  - **Text**: Subtle hover background

### Cards
- **Border Radius**: 16px
- **Border**: 1px solid rgba(0, 0, 0, 0.08)
- **Shadow**: 0px 2px 8px rgba(0, 0, 0, 0.05)
- **Hover Effect**: Enhanced shadow (0px 4px 16px rgba(0, 0, 0, 0.08))
- **Padding**: 24px (standard)

### Paper
- **Border Radius**: 16px
- **Elevation Levels**: Custom shadows for each level
- **Background**: #ffffff

### Form Elements
- **Text Fields**:
  - Border Radius: 12px
  - Transition effects on focus
  - Hover border color enhancement
- **Sliders**:
  - Height: 6px
  - Thumb size: 16px
  - Hover effect on thumb

### Navigation
- **List Items**:
  - Border Radius: 12px
  - Hover effect: translateX(4px)
  - Selected state: Custom background color
- **Tabs**:
  - Indicator height: 3px with rounded corners
  - No text transform
  - Font weight change on selected state

### Feedback
- **Alerts**:
  - Border Radius: 12px
  - Box Shadow: 0px 4px 12px rgba(0, 0, 0, 0.1)
- **Dialogs**:
  - Border Radius: 16px
  - Box Shadow: 0px 8px 24px rgba(0, 0, 0, 0.15)

## 📏 Spacing System

The spacing system uses a consistent scale based on 8px units:

- **xs**: 4px (0.5x)
- **sm**: 8px (1x)
- **md**: 16px (2x)
- **lg**: 24px (3x)
- **xl**: 32px (4x)
- **xxl**: 48px (6x)

Apply these spacings consistently for:
- Margins between components
- Padding within containers
- Gap between related elements
- Grid spacing

## ✨ Animations & Micro-interactions

### Transitions
- **Duration**: 0.2s - 0.5s (faster for micro-interactions, slower for larger elements)
- **Easing**: ease, ease-in-out, or spring animations for natural movement
- **Properties**: transform, opacity, background-color

### Hover Effects
- Subtle elevation (translateY(-2px))
- Background color lightening
- Shadow enhancement
- Scale increase (1.02-1.05x)

### Page Transitions
- Fade in (opacity: 0 → 1)
- Slight upward movement (y: 20px → 0)
- Staggered animations for list items

### Feedback Animations
- Button press effect (slight scale down)
- Success/error state transitions
- Loading indicators with subtle motion

## 📱 Responsive Design

### Breakpoints
- **xs**: 0px - 599px (mobile)
- **sm**: 600px - 899px (tablet)
- **md**: 900px - 1199px (small desktop)
- **lg**: 1200px - 1535px (desktop)
- **xl**: 1536px and above (large desktop)

### Responsive Patterns
- Single column layouts on mobile
- Two-column layouts on tablet
- Multi-column layouts on desktop
- Increased spacing on larger screens
- Adjusted typography sizes for readability

## 🧠 Implementation Guidelines

### CSS-in-JS Best Practices
- Use theme variables for colors, spacing, and typography
- Leverage the alpha utility for transparency
- Apply consistent border-radius and shadows
- Use responsive breakpoints for adaptive layouts

### Component Structure
- Keep components modular and reusable
- Maintain consistent prop patterns
- Document component usage and variations
- Ensure accessibility compliance

### Animation Implementation
- Use Framer Motion for complex animations
- Leverage Material-UI's transition helpers for simple effects
- Ensure animations are performant and don't cause layout shifts
- Respect user preferences for reduced motion

---

This design system should be treated as a living document and updated as the platform evolves. All UI components should adhere to these guidelines to maintain consistency and quality across the SpeakShire platform.