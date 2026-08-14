/**
 * app.js — Léo le Renard runs the lesson.
 *
 * A tiny, framework-free state machine that walks a five-year-old through
 * four screens:  Bonjour → Les Couleurs (flash cards) → Le Jeu (game) → Bravo.
 *
 * Design rules for this audience:
 *   • Nothing can go "wrong". A wrong tap is a gentle "try again", never a fail.
 *   • Every important thing is said out loud (French) as well as shown.
 *   • Big targets, big feedback, lots of celebration.
 *
 * Testability: the whole controller is exposed as `window.app` with plain
 * methods and readable state, so Playwright can drive and inspect it without
 * fighting animations or audio.
 */
(function () {
  'use strict';

  var COLORS = window.LESSON.colors;
  var shuffle = window.LESSON.shuffle;

  // ----- helpers ------------------------------------------------------------
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };
  function el(tag, attrs, kids) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on' && typeof attrs[k] === 'function') {
        node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      } else node.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) {
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }
  function prefersReducedMotion() {
    return window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ----- audio: French voice + happy/gentle sound effects -------------------
  var Audio = {
    voice: null,
    ready: false,
    enabled: true,
    ctx: null,

    init: function () {
      if (!('speechSynthesis' in window)) return;
      var pick = function () {
        var voices = window.speechSynthesis.getVoices() || [];
        // Prefer a French voice; fall back to anything so the demo still speaks.
        Audio.voice =
          voices.filter(function (v) { return /^fr/i.test(v.lang); })[0] ||
          voices.filter(function (v) { return /fr/i.test(v.name); })[0] ||
          voices[0] || null;
        Audio.ready = true;
      };
      pick();
      window.speechSynthesis.onvoiceschanged = pick;
    },

    // Speak a French phrase. Cancels anything mid-sentence so taps feel instant.
    say: function (text, opts) {
      opts = opts || {};
      if (!Audio.enabled) return;
      if (!('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = 'fr-FR';
        u.rate = opts.rate || 0.82;   // slow and clear for little ears
        u.pitch = opts.pitch || 1.12; // a touch bright and friendly
        if (Audio.voice) u.voice = Audio.voice;
        window.speechSynthesis.speak(u);
      } catch (e) { /* audio is a nicety, never a blocker */ }
    },

    // A short synthesised tone so feedback works even with no voices installed.
    tone: function (freq, dur, type) {
      if (!Audio.enabled) return;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        Audio.ctx = Audio.ctx || new AC();
        var ctx = Audio.ctx;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + dur);
      } catch (e) { /* ignore */ }
    },

    happy: function () { // rising major arpeggio = "yes!"
      Audio.tone(523, 0.14, 'triangle');
      setTimeout(function () { Audio.tone(659, 0.14, 'triangle'); }, 120);
      setTimeout(function () { Audio.tone(784, 0.22, 'triangle'); }, 240);
    },
    oops: function () { // soft two-note "hmm, try again" — never harsh
      Audio.tone(392, 0.16, 'sine');
      setTimeout(function () { Audio.tone(330, 0.2, 'sine'); }, 130);
    },
    pop: function () { Audio.tone(660, 0.09, 'triangle'); }
  };

  // ----- confetti (tiny canvas, respects reduced-motion) --------------------
  var Confetti = {
    burst: function (count) {
      if (prefersReducedMotion()) return;
      var canvas = $('#confetti');
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      var W = canvas.width = window.innerWidth;
      var H = canvas.height = window.innerHeight;
      var palette = COLORS.map(function (c) { return c.hex; })
        .concat(['#FF7AD5', '#B06BFF', '#FFFFFF']);
      var pieces = [];
      var n = count || 140;
      for (var i = 0; i < n; i++) {
        pieces.push({
          x: Math.random() * W,
          y: -20 - Math.random() * H * 0.4,
          r: 5 + Math.random() * 8,
          c: palette[(Math.random() * palette.length) | 0],
          vx: -2 + Math.random() * 4,
          vy: 2 + Math.random() * 4,
          rot: Math.random() * Math.PI,
          vr: -0.2 + Math.random() * 0.4,
          shape: Math.random() < 0.5 ? 'rect' : 'circle'
        });
      }
      var frames = 0;
      (function tick() {
        ctx.clearRect(0, 0, W, H);
        frames++;
        pieces.forEach(function (p) {
          p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rot += p.vr;
          ctx.save();
          ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = p.c;
          if (p.shape === 'rect') ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
          else { ctx.beginPath(); ctx.arc(0, 0, p.r / 2, 0, Math.PI * 2); ctx.fill(); }
          ctx.restore();
        });
        if (frames < 220) requestAnimationFrame(tick);
        else ctx.clearRect(0, 0, W, H);
      })();
    }
  };

  // ----- Léo the fox mascot: shows a message + speaks it --------------------
  function leoSay(bubbleText, speakText) {
    var bubble = $('#leo-bubble');
    if (bubble) bubble.textContent = bubbleText;
    var leo = $('#leo');
    if (leo && !prefersReducedMotion()) {
      leo.classList.remove('leo-bounce');
      // reflow to restart the animation
      void leo.offsetWidth;
      leo.classList.add('leo-bounce');
    }
    if (speakText) Audio.say(speakText);
  }

  // =========================================================================
  //  The controller
  // =========================================================================
  var app = {
    STEPS: ['welcome', 'cards', 'game', 'finish'],
    step: 'welcome',
    started: false,

    // flash-card progress: ids the child has flipped at least once
    revealed: {},

    // game state
    game: {
      order: [],      // shuffled colours = the questions, in order
      index: 0,       // which question we're on
      target: null,   // the colour to find right now
      correct: 0,     // how many first-try successes
      done: false
    },

    // ---- navigation -------------------------------------------------------
    show: function (step) {
      if (this.STEPS.indexOf(step) === -1) return;
      this.step = step;
      $$('.screen').forEach(function (s) {
        s.classList.toggle('is-active', s.getAttribute('data-step') === step);
        s.setAttribute('aria-hidden', s.getAttribute('data-step') === step ? 'false' : 'true');
      });
      this._updateProgress();
      window.scrollTo(0, 0);
      var handler = this['onEnter_' + step];
      if (handler) handler.call(this);
    },

    _updateProgress: function () {
      var i = this.STEPS.indexOf(this.step);
      $$('.progress-dot').forEach(function (dot, idx) {
        dot.classList.toggle('is-done', idx < i);
        dot.classList.toggle('is-current', idx === i);
      });
    },

    // ---- step 1: welcome --------------------------------------------------
    start: function () {
      this.started = true;
      // A user gesture unlocks audio on most browsers — greet them right away.
      Audio.say('Bonjour! Je m\'appelle Léo. On apprend les couleurs!');
      this.show('cards');
    },

    // ---- step 2: flash cards ----------------------------------------------
    onEnter_cards: function () {
      leoSay(
        'Clique sur une carte pour voir la couleur ! 🎨',
        'Clique sur une carte pour voir la couleur.'
      );
      this._checkCardsComplete();
    },

    buildCards: function () {
      var deck = $('#deck');
      if (!deck) return;
      deck.innerHTML = '';
      var self = this;
      COLORS.forEach(function (color) {
        var inner = el('div', { class: 'card-inner' }, [
          // FRONT — what the child sees first: only the French word.
          el('div', { class: 'card-face card-front' }, [
            el('span', { class: 'card-hint', text: 'Quelle couleur ?' }),
            el('span', { class: 'card-word', text: color.fr }),
            el('span', { class: 'card-tap', text: '👆 Clique !' })
          ]),
          // BACK — the reveal: the real colour, a picture, the word again.
          el('div', {
            class: 'card-face card-back',
            style: 'background:' + color.hex + ';color:' + color.ink + ';'
          }, [
            el('span', { class: 'card-emoji', text: color.emoji }),
            el('span', { class: 'card-word', text: color.fr }),
            el('span', { class: 'card-thing', text: color.thingFr })
          ])
        ]);

        var card = el('button', {
          class: 'card',
          type: 'button',
          'data-color': color.id,
          'aria-pressed': 'false',
          'aria-label': color.fr + '. Clique pour révéler la couleur.'
        }, [inner]);

        card.addEventListener('click', function () { self.flipCard(color.id); });
        deck.appendChild(card);
      });
    },

    flipCard: function (id) {
      var card = $('.card[data-color="' + id + '"]');
      var color = window.LESSON.getColor(id);
      if (!card || !color) return;
      var nowRevealed = !card.classList.contains('is-flipped');
      card.classList.toggle('is-flipped', nowRevealed);
      card.setAttribute('aria-pressed', nowRevealed ? 'true' : 'false');
      if (nowRevealed) {
        this.revealed[id] = true;
        Audio.pop();
        // Say the colour, then the little bonus noun.
        Audio.say(color.fr + '. ' + color.thingFr + '.');
        this._checkCardsComplete();
      }
    },

    _checkCardsComplete: function () {
      var all = COLORS.every(function (c) { return app.revealed[c.id]; });
      var btn = $('#to-game');
      if (btn) {
        btn.classList.toggle('is-ready', all);
        btn.disabled = false; // always allow moving on; ready state just celebrates
      }
      if (all && !this._cardsCelebrated) {
        this._cardsCelebrated = true;
        leoSay('Bravo ! Tu connais les 4 couleurs ! 🌈',
          'Bravo! Tu connais les quatre couleurs!');
      }
      return all;
    },

    // ---- step 3: the game -------------------------------------------------
    onEnter_game: function () {
      this.startGame();
    },

    startGame: function () {
      this.game = {
        order: shuffle(COLORS),
        index: 0,
        target: null,
        correct: 0,
        done: false
      };
      this._renderGameBoard();
      this._askQuestion();
    },

    _renderGameBoard: function () {
      var board = $('#game-board');
      if (!board) return;
      board.innerHTML = '';
      var self = this;
      // Show all four colours (no words) as big tappable swatches.
      shuffle(COLORS).forEach(function (color) {
        var swatch = el('button', {
          class: 'swatch',
          type: 'button',
          'data-color': color.id,
          style: 'background:' + color.hex + ';',
          'aria-label': color.fr
        }, [ el('span', { class: 'swatch-check', text: '✓' }) ]);
        swatch.addEventListener('click', function () { self.answer(color.id); });
        board.appendChild(swatch);
      });
    },

    _askQuestion: function () {
      var g = this.game;
      if (g.index >= g.order.length) return this._finishGame();
      g.target = g.order[g.index];
      g.locked = false;
      $$('.swatch').forEach(function (s) {
        s.classList.remove('is-wrong', 'is-right');
        s.disabled = false;
      });
      var prompt = $('#game-prompt');
      if (prompt) prompt.textContent = 'Trouve… ' + g.target.fr + ' !';
      this._updateStars();
      leoSay('Trouve le ' + g.target.fr + ' !', 'Trouve… ' + g.target.fr + '.');
    },

    answer: function (id) {
      var g = this.game;
      if (g.done || g.locked || !g.target) return;
      var swatch = $('.swatch[data-color="' + id + '"]');
      if (id === g.target.id) {
        g.locked = true;
        g.correct++;
        if (swatch) swatch.classList.add('is-right');
        Audio.happy();
        Confetti.burst(70);
        leoSay('Oui ! C\'est ' + g.target.fr + ' ! 🎉',
          'Oui! C\'est ' + g.target.fr + '!');
        g.index++;
        setTimeout(function () { app._askQuestion(); }, 1200);
      } else {
        // Gentle nudge, no penalty, let them try again.
        if (swatch) {
          swatch.classList.add('is-wrong');
          setTimeout(function () { swatch.classList.remove('is-wrong'); }, 600);
        }
        Audio.oops();
        leoSay('Essaie encore ! 💪', 'Essaie encore!');
      }
    },

    _updateStars: function () {
      var wrap = $('#game-stars');
      if (!wrap) return;
      wrap.innerHTML = '';
      for (var i = 0; i < this.game.order.length; i++) {
        wrap.appendChild(el('span', {
          class: 'star' + (i < this.game.correct ? ' is-lit' : ''),
          text: '⭐'
        }));
      }
    },

    _finishGame: function () {
      this.game.done = true;
      this._updateStars();
      this.show('finish');
    },

    // ---- step 4: celebration ----------------------------------------------
    onEnter_finish: function () {
      var score = $('#final-score');
      if (score) {
        score.textContent = this.game.correct + ' / ' + COLORS.length;
      }
      leoSay('Bravo ! Tu es un champion des couleurs ! 🏆🌈',
        'Bravo! Tu es un champion des couleurs!');
      Audio.happy();
      Confetti.burst(220);
    },

    replay: function () {
      this.revealed = {};
      this._cardsCelebrated = false;
      $$('.card').forEach(function (c) {
        c.classList.remove('is-flipped');
        c.setAttribute('aria-pressed', 'false');
      });
      this.show('welcome');
    },

    toggleSound: function () {
      Audio.enabled = !Audio.enabled;
      if (!Audio.enabled && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      var btn = $('#sound-toggle');
      if (btn) {
        btn.setAttribute('aria-pressed', Audio.enabled ? 'true' : 'false');
        btn.textContent = Audio.enabled ? '🔊' : '🔇';
        btn.setAttribute('aria-label',
          Audio.enabled ? 'Couper le son' : 'Activer le son');
      }
      if (Audio.enabled) Audio.pop();
      return Audio.enabled;
    },

    // Small hook so tests can speak a colour on demand.
    sayColor: function (id) {
      var c = window.LESSON.getColor(id);
      if (c) Audio.say(c.fr);
    }
  };

  // Expose the audio module for tests / debugging.
  app._audio = Audio;

  // ----- wire up the page ---------------------------------------------------
  function boot() {
    Audio.init();
    app.buildCards();

    $('#start-btn') && $('#start-btn').addEventListener('click', function () {
      app.start();
    });
    $('#to-game') && $('#to-game').addEventListener('click', function () {
      app.show('game');
    });
    $('#replay-btn') && $('#replay-btn').addEventListener('click', function () {
      app.replay();
    });
    $('#again-btn') && $('#again-btn').addEventListener('click', function () {
      app.show('game');
    });
    $('#sound-toggle') && $('#sound-toggle').addEventListener('click', function () {
      app.toggleSound();
    });

    // Keyboard: Space/Enter already work on <button>. Add left/right roving
    // between cards for a nicer keyboard experience.
    var deck = $('#deck');
    if (deck) {
      deck.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var cards = $$('.card', deck);
        var i = cards.indexOf(document.activeElement);
        if (i === -1) return;
        e.preventDefault();
        var next = e.key === 'ArrowRight'
          ? (i + 1) % cards.length
          : (i - 1 + cards.length) % cards.length;
        cards[next].focus();
      });
    }

    app.show('welcome');
    window.app = app; // for tests + curious grown-ups
    document.documentElement.setAttribute('data-ready', 'true');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
