// Unit tests for the lesson data module (js/colors.js).
// These run in Node — no browser — because the module is dual-published.
const { test, expect } = require('@playwright/test');
const path = require('path');

const { colors, getColor, shuffle } = require(path.join(__dirname, '..', 'js', 'colors.js'));

test.describe('lesson data · js/colors.js', () => {
  test('teaches exactly four colours', () => {
    expect(colors).toHaveLength(4);
    expect(colors.map((c) => c.id)).toEqual(['rouge', 'bleu', 'jaune', 'vert']);
  });

  test('every colour is complete and well-formed', () => {
    for (const c of colors) {
      expect(c.fr, 'French word').toBeTruthy();
      expect(c.en, 'English word').toBeTruthy();
      expect(c.say, 'pronunciation hint').toBeTruthy();
      expect(c.emoji, 'picture emoji').toBeTruthy();
      expect(c.thingFr, 'French noun').toBeTruthy();
      // Hex must be a valid 6-digit colour.
      expect(c.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(c.ink).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  test('colours are visually distinct from one another', () => {
    const hexes = colors.map((c) => c.hex.toLowerCase());
    expect(new Set(hexes).size).toBe(hexes.length);
  });

  test('getColor finds a colour by id and is safe on misses', () => {
    expect(getColor('bleu').fr).toBe('Bleu');
    expect(getColor('rouge').en).toBe('Red');
    expect(getColor('mauve')).toBeUndefined();
  });

  test('shuffle keeps every element and never mutates the input', () => {
    const original = colors.slice();
    // Deterministic rng so the test is stable.
    let seed = 42;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const out = shuffle(colors, rng);
    expect(out).toHaveLength(colors.length);
    expect(new Set(out)).toEqual(new Set(colors)); // same members
    expect(colors).toEqual(original);              // input untouched
  });
});
