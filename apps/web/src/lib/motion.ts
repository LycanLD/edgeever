import type { MotionProps, Transition } from "motion/react";

/* Material 3 motion curves (mirrors --motion-ease-* in globals.css). */
const standardEase = [0.2, 0, 0, 1] as const;
const decelerateEase = [0.05, 0.7, 0.1, 1] as const;
const accelerateEase = [0.3, 0, 0.8, 0.15] as const;

const transition = (duration: number, ease: Transition["ease"] = standardEase): Transition => ({
  duration,
  ease,
});

export const paneEnterMotion: MotionProps = {
  initial: { opacity: 0, y: 5 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4, transition: transition(0.15, accelerateEase) },
  transition: transition(0.2, decelerateEase),
};

export const contentEnterMotion: MotionProps = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, transition: transition(0.1, accelerateEase) },
  transition: transition(0.15, decelerateEase),
};

export const treeEnterMotion: MotionProps = {
  initial: { opacity: 0, y: -3 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, transition: transition(0.1, accelerateEase) },
  transition: transition(0.15, standardEase),
};

export const statusSettleMotion: MotionProps = {
  initial: { opacity: 0.35, scale: 0.88 },
  animate: { opacity: 1, scale: 1 },
  transition: transition(0.2, decelerateEase),
};

export const selectionSettleMotion: MotionProps = {
  initial: { opacity: 0, scaleY: 0.35 },
  animate: { opacity: 1, scaleY: 1 },
  transition: transition(0.18, decelerateEase),
};
