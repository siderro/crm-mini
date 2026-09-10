// Wordmark logo. Kept as a small state machine so a future logo/animation can slot in.
// Values are HTML strings rendered into .brand-logo / .hub-logo / .lp-logo.

export const logos = {
  default: 'Brevis',

  // Future states go here, e.g.:
  // loading: ...,
};

let currentState = 'default';

export function getLogo(state) {
  return logos[state || currentState] || logos.default;
}

export function setLogoState(state) {
  currentState = state;
}
