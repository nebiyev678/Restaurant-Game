// Guided beginner tutorial: one action per step, each step finishes when the player actually does it.
import type { GuideTargetKind } from './worldEngine';

export const TUTORIAL_DONE = 99;

export type GuideAdvance =
  /** Player taps the card's button. */
  | 'button'
  /** Pick the joystick side (touch screens only; skipped with a keyboard). */
  | 'choose_side'
  /** Walk a few steps. */
  | 'move'
  /** Button unlocks once a guest has placed an order. */
  | 'order'
  /** Start cooking at a machine. */
  | 'cook'
  /** Have a finished dish in your hands. */
  | 'hold'
  /** Serve an order. */
  | 'serve'
  /** Clean a dirty table. */
  | 'clean';

export interface GuideStep {
  id: string;
  icon: string;
  title: string;
  /** Text for touch screens and for keyboard/mouse. */
  body: { touch: string; desktop: string };
  advance: GuideAdvance;
  /** What the 3D arrow points at. */
  target: GuideTargetKind | null;
  /** Guests allowed while on this step (0 = none yet). */
  maxCustomers: number;
  buttonLabel?: string;
  /** Shown under the text while the step waits for something. */
  waitingHint?: string;
}

export const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'welcome',
    icon: '👨‍🍳',
    title: 'Welcome, Chef!',
    body: {
      touch: 'You run a little bistro. Guests come in and order. You cook their dish, bring it to their table, and get paid. Let’s try it once together.',
      desktop: 'You run a little bistro. Guests come in and order. You cook their dish, bring it to their table, and get paid. Let’s try it once together.',
    },
    advance: 'button',
    target: null,
    maxCustomers: 0,
    buttonLabel: 'Let’s cook!',
  },
  {
    id: 'joystick',
    icon: '👍',
    title: 'Which thumb do you walk with?',
    body: {
      touch: 'Choose where your joystick goes. The Cook and Serve button will sit on the other side. You can change this later in Settings.',
      desktop: '',
    },
    advance: 'choose_side',
    target: null,
    maxCustomers: 0,
  },
  {
    id: 'move',
    icon: '🕹️',
    title: 'Walk around',
    body: {
      touch: 'Put your thumb anywhere on the {side} side of the screen and drag to walk. You can also tap the floor to walk there.',
      desktop: 'Walk with W A S D or the arrow keys. You can also click the floor to walk there.',
    },
    advance: 'move',
    target: null,
    maxCustomers: 0,
    waitingHint: 'Walk a few steps…',
  },
  {
    id: 'customer',
    icon: '🙋',
    title: 'A guest is here',
    body: {
      touch: 'Follow the yellow arrow. The bubble above the guest shows the dish they want. The bar is their patience: serve them before it runs out.',
      desktop: 'Follow the yellow arrow. The bubble above the guest shows the dish they want. The bar is their patience: serve them before it runs out.',
    },
    advance: 'order',
    target: 'customer',
    maxCustomers: 1,
    buttonLabel: 'Got it',
    waitingHint: 'Your first guest is walking in…',
  },
  {
    id: 'cook',
    icon: '🔥',
    title: 'Cook the dish',
    body: {
      touch: 'Each dish has its own machine. Walk to the machine under the arrow, stand in its circle and tap Cook. Tapping the sign above a machine works too.',
      desktop: 'Each dish has its own machine. Walk to the machine under the arrow, stand in its circle and press Space (or click Cook). Clicking the sign above a machine works too.',
    },
    advance: 'cook',
    target: 'station',
    maxCustomers: 1,
    waitingHint: 'Start cooking at the glowing machine',
  },
  {
    id: 'collect',
    icon: '⏳',
    title: 'Collect it from the machine',
    body: {
      touch: 'The machine is cooking. Stay in its circle and the dish goes straight into your hands. If you walk away, come back when it shows “Take!”.',
      desktop: 'The machine is cooking. Stay in its circle and the dish goes straight into your hands. If you walk away, come back when it shows “Take!”.',
    },
    advance: 'hold',
    target: 'station',
    maxCustomers: 1,
    waitingHint: 'Wait for the dish…',
  },
  {
    id: 'serve',
    icon: '🍽️',
    title: 'Serve the guest',
    body: {
      touch: 'Carry the dish to the guest under the arrow and tap Serve. Fast service earns tips, and serving orders in a row builds a tip streak.',
      desktop: 'Carry the dish to the guest under the arrow and press Space (or click Serve). Fast service earns tips, and serving orders in a row builds a tip streak.',
    },
    advance: 'serve',
    target: 'serve',
    maxCustomers: 1,
    waitingHint: 'Bring the dish to the table',
  },
  {
    id: 'clean',
    icon: '🧽',
    title: 'Clean the table',
    body: {
      touch: 'When guests finish eating they leave a dirty table, and nobody sits there until it’s clean. Walk to it and tap Clean. A clean restaurant earns bigger tips.',
      desktop: 'When guests finish eating they leave a dirty table, and nobody sits there until it’s clean. Walk to it and press Space (or click Clean). A clean restaurant earns bigger tips.',
    },
    advance: 'clean',
    target: 'dirty_table',
    maxCustomers: 1,
    waitingHint: 'Waiting for the guest to finish eating…',
  },
  {
    id: 'money',
    icon: '💰',
    title: 'Money & new menus',
    body: {
      touch: 'Green money is the restaurant’s: spend it in Kitchen on new dishes. As you level up, new menus unlock one by one: Cafe upgrades (Lv 2), Staff (Lv 3), the Album (Lv 4), City and the Bank (Lv 5) and the Shop (Lv 6). Tap a locked menu to see what’s inside.',
      desktop: 'Green money is the restaurant’s: spend it in Kitchen on new dishes. As you level up, new menus unlock one by one: Cafe upgrades (Lv 2), Staff (Lv 3), the Album (Lv 4), City and the Bank (Lv 5) and the Shop (Lv 6). Tap a locked menu to see what’s inside.',
    },
    advance: 'button',
    target: null,
    maxCustomers: 1,
    buttonLabel: 'Next',
  },
  {
    id: 'done',
    icon: '🎉',
    title: 'You’re ready!',
    body: {
      touch: 'More guests will come now. Short goals in the top right give quick rewards, and each new level unlocks more. You can open “How to play” in Settings any time.',
      desktop: 'More guests will come now. Short goals in the top right give quick rewards, and each new level unlocks more. You can open “How to play” in Settings any time.',
    },
    advance: 'button',
    target: null,
    maxCustomers: 1,
    buttonLabel: 'Start playing',
  },
];

export function isTutorialActive(guideStep: number): boolean {
  return guideStep >= 0 && guideStep < GUIDE_STEPS.length;
}
