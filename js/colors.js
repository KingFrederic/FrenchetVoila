/**
 * colors.js — The single source of truth for the lesson.
 *
 * The child is 5 and has no French background, so the ONLY French on the whole
 * page is the four colour words themselves (Rouge, Bleu, Jaune, Vert). Every
 * label, hint and picture-word is in English so the directions are understood;
 * the French words are the one new thing to learn.
 *
 * This module works in two worlds:
 *   • the browser  — attaches `LESSON` (and helpers) to the global
 *   • Node / tests — exports the same values via `module.exports`
 * so the exact data the child sees is the data the tests check.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api; // Node / Playwright test runner
  }
  // Always expose on the global for the browser and for page.evaluate() in tests.
  root.LESSON = root.LESSON || {};
  root.LESSON.colors = api.colors;
  root.LESSON.getColor = api.getColor;
  root.LESSON.shuffle = api.shuffle;
})(typeof globalThis !== 'undefined' ? globalThis
   : typeof self !== 'undefined' ? self
   : typeof window !== 'undefined' ? window
   : this, function () {
  'use strict';

  /**
   * Each colour carries everything the UI and the audio need:
   *  id     stable key used in code + tests
   *  fr     the French colour word the child is learning (spoken in French)
   *  en     the English colour name (for the grown-up helping out)
   *  say    a gentle "sound it out" hint for the teacher / parent
   *  hex    the exact colour revealed on the back of the card
   *  ink    readable text colour to sit on top of `hex`
   *  emoji  a real-world thing of that colour
   *  thing  the English name for that thing (kept English on purpose)
   */
  var colors = [
    {
      id: 'rouge',
      fr: 'Rouge',
      en: 'Red',
      say: 'roozh',
      hex: '#EF3D3D',
      ink: '#ffffff',
      emoji: '🍓',
      thing: 'a strawberry'
    },
    {
      id: 'bleu',
      fr: 'Bleu',
      en: 'Blue',
      say: 'bluh',
      hex: '#2E86FF',
      ink: '#ffffff',
      emoji: '🐳',
      thing: 'a whale'
    },
    {
      id: 'jaune',
      fr: 'Jaune',
      en: 'Yellow',
      say: 'zhohn',
      hex: '#FFC932',
      ink: '#5a3b00',
      emoji: '☀️',
      thing: 'the sun'
    },
    {
      id: 'vert',
      fr: 'Vert',
      en: 'Green',
      say: 'vair',
      hex: '#37C871',
      ink: '#ffffff',
      emoji: '🐸',
      thing: 'a frog'
    }
  ];

  /** Look a colour up by its id. Returns undefined if unknown. */
  function getColor(id) {
    for (var i = 0; i < colors.length; i++) {
      if (colors[i].id === id) return colors[i];
    }
    return undefined;
  }

  /**
   * Fisher–Yates shuffle on a *copy* of the array (never mutates the input),
   * so the game can show the colours in a fresh order every round while the
   * canonical `colors` list stays put. An optional rng makes it testable.
   */
  function shuffle(list, rng) {
    var random = rng || Math.random;
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(random() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  return { colors: colors, getColor: getColor, shuffle: shuffle };
});
