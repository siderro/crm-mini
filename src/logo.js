// ASCII logo variants – add new states here
// Each key is a state name, value is the HTML string

const B = 'black', R = 'brown', D = 'dgray', W = 'white';
const s = (cls, n) => `<span class="${cls}">${'\u2593'.repeat(n)}</span>`;

export const logos = {
  default: [
    s(B,2)+s(R,2)+s(B,2)+s(R,2)+s(B,10),
    s(B,2)+s(R,6)+s(B,10),
    s(B,2)+s(D,2)+s(W,2)+s(D,2)+s(B,10),
    s(B,2)+s(R,6)+s(B,10),
    s(B,2)+s(R,6)+s(B,10),
    s(B,2)+s(R,12)+s(B,4),
    s(B,2)+s(R,14)+s(B,2),
    s(B,2)+s(R,2)+s(B,2)+s(R,2)+s(B,4)+s(R,2)+s(B,4),
    s(B,2)+s(R,2)+s(B,2)+s(R,2)+s(B,4)+s(R,2)+s(B,4),
  ].join('\n'),

  // Future states go here, e.g.:
  // blink: ...,
  // happy: ...,
  // loading: ...,
};

let currentState = 'default';

export function getLogo(state) {
  return logos[state || currentState] || logos.default;
}

export function setLogoState(state) {
  currentState = state;
}
