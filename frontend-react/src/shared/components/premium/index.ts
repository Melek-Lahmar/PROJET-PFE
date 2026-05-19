/**
 * Premium component kit — React mirror of flutter/lib/ui/widgets/premium/.
 *
 * These components share the same design language (radii, shadows, status
 * palette, animation curves) as the Flutter app so the two clients feel
 * like one product.
 */

export { StatusPill } from "./StatusPill";
export { statusVisual, type StatusVariant, type StatusVisual } from "./statusPalette";
export { PremiumHero } from "./PremiumHero";
export { PremiumCard } from "./PremiumCard";
export { SectionHeader } from "./SectionHeader";
export { EmptyView } from "./EmptyView";
export { Skeleton, SkeletonLines } from "./Skeleton";
export { AnimatedEntry, StaggeredColumn } from "./AnimatedEntry";

/* Ajouts 2026-05-13 — animations & visuels premium "Flutter-like". */
export { FloatingOrbs } from "./FloatingOrbs";
export { AnimatedCounter } from "./AnimatedCounter";
export { GradientText } from "./GradientText";
export { TiltCard } from "./TiltCard";
export { ScrollReveal } from "./ScrollReveal";
export { AnimatedProgress } from "./AnimatedProgress";

/* Ajouts 2026-05-13 (refonte large) — interactions premium. */
export { PremiumButton } from "./PremiumButton";
export { ToastProvider, useToast } from "./Toast";
export { PageTransition } from "./PageTransition";
export { PremiumModal } from "./PremiumModal";
export { Confetti } from "./Confetti";
export { CursorEffect } from "./CursorEffect";
export { ParallaxHero } from "./ParallaxHero";
export { ThemeSwitcherPremium } from "./ThemeSwitcherPremium";
