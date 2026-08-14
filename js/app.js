/**
 * app.js — Frederic runs the lesson.
 *
 * A tiny, framework-free state machine that walks a five-year-old through
 * four screens:  Hello → The Colors (flash cards) → The Game → Great Job.
 *
 * The child has no French, so every instruction is in ENGLISH — spoken and
 * shown. The only French is the four colour words, which are always
 * pronounced in French (that is the thing being taught).
 *
 * Design rules for this audience:
 *   • Nothing can go "wrong". A wrong tap is a gentle "try again", never a fail.
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

  // ----- audio: English instructions + French colour words + fun sounds -----
  var Audio = {
    voiceFr: null,
    voiceEn: null,
    ready: false,
    enabled: true,
    ctx: null,

    init: function () {
      if (!('speechSynthesis' in window)) return;
      var pick = function () {
        var voices = window.speechSynthesis.getVoices() || [];
        Audio.voiceFr =
          voices.filter(function (v) { return /^fr/i.test(v.lang); })[0] ||
          voices.filter(function (v) { return /fr/i.test(v.name); })[0] || null;
        Audio.voiceEn =
          voices.filter(function (v) { return /^en/i.test(v.lang); })[0] ||
          voices[0] || null;
        Audio.ready = true;
      };
      pick();
      window.speechSynthesis.onvoiceschanged = pick;
    },

    _utter: function (text, lang) {
      var u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = 0.82;   // slow and clear for little ears
      u.pitch = 1.12;  // a touch bright and friendly
      var v = lang.slice(0, 2) === 'fr' ? Audio.voiceFr : Audio.voiceEn;
      if (v) u.voice = v;
      return u;
    },

    // Speak an English instruction. Cancels anything mid-sentence.
    sayEn: function (text) { Audio._speak([{ text: text, lang: 'en-US' }]); },

    // Speak a French colour word (this is the lesson content).
    sayFr: function (text) { Audio._speak([{ text: text, lang: 'fr-FR' }]); },

    // Speak a mix, in order — e.g. English lead-in then the French colour.
    // parts: [{text, lang}, ...]
    sayMix: function (parts) { Audio._speak(parts); },

    _speak: function (parts) {
      if (!Audio.enabled) return;
      if (!('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        parts.forEach(function (p) {
          window.speechSynthesis.speak(Audio._utter(p.text, p.lang));
        });
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

  // ----- Frederic the guide: shows a message + speaks it --------------------
  // speak can be a plain English string, or an array of {text, lang} parts
  // when we want an English lead-in followed by the French colour word.
  function guideSay(bubbleText, speak) {
    var bubble = $('#guide-bubble');
    if (bubble) bubble.textContent = bubbleText;
    var avatar = $('#guide-avatar');
    if (avatar && !prefersReducedMotion()) {
      avatar.classList.remove('guide-bounce');
      void avatar.offsetWidth; // reflow to restart the animation
      avatar.classList.add('guide-bounce');
    }
    if (Array.isArray(speak)) Audio.sayMix(speak);
    else if (speak) Audio.sayEn(speak);
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
      Audio.sayEn("Hi! I'm Frederic. Let's learn colors!");
      this.show('cards');
    },

    // ---- step 2: flash cards ----------------------------------------------
    onEnter_cards: function () {
      guideSay('Tap a card to see the color! 🎨',
        'Tap a card to see the color.');
      this._checkCardsComplete();
    },

    buildCards: function () {
      var deck = $('#deck');
      if (!deck) return;
      deck.innerHTML = '';
      var self = this;
      COLORS.forEach(function (color) {
        var inner = el('div', { class: 'card-inner' }, [
          // FRONT — what the child sees first: only the French colour word.
          el('div', { class: 'card-face card-front' }, [
            el('span', { class: 'card-hint', text: 'What color?' }),
            el('span', { class: 'card-word', text: color.fr }),
            el('span', { class: 'card-tap', text: '👆 Tap!' })
          ]),
          // BACK — the reveal: the real colour, a picture, the word again.
          el('div', {
            class: 'card-face card-back',
            style: 'background:' + color.hex + ';color:' + color.ink + ';'
          }, [
            el('span', { class: 'card-emoji', text: color.emoji }),
            el('span', { class: 'card-word', text: color.fr }),
            el('span', { class: 'card-thing', text: color.thing })
          ])
        ]);

        var card = el('button', {
          class: 'card',
          type: 'button',
          'data-color': color.id,
          'aria-pressed': 'false',
          'aria-label': color.fr + ' (' + color.en + '). Tap to reveal the color.'
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
        // Say the colour word in French — that's the thing to learn.
        Audio.sayFr(color.fr);
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
        guideSay('Great! You know all 4 colors! 🌈',
          'Great! You know all four colors!');
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
          'aria-label': color.fr + ' (' + color.en + ')'
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
      if (prompt) {
        prompt.innerHTML = '';
        prompt.appendChild(document.createTextNode('Find '));
        prompt.appendChild(el('span', { class: 'prompt-color', text: g.target.fr }));
        prompt.appendChild(document.createTextNode('!'));
      }
      this._updateStars();
      // English instruction, then the French colour word.
      guideSay('Find ' + g.target.fr + '!',
        [{ text: 'Find', lang: 'en-US' }, { text: g.target.fr, lang: 'fr-FR' }]);
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
        guideSay('Yes! That\'s ' + g.target.fr + '! 🎉',
          [{ text: 'Yes! That is', lang: 'en-US' }, { text: g.target.fr, lang: 'fr-FR' }]);
        g.index++;
        setTimeout(function () { app._askQuestion(); }, 1200);
      } else {
        // Gentle nudge, no penalty, let them try again.
        if (swatch) {
          swatch.classList.add('is-wrong');
          setTimeout(function () { swatch.classList.remove('is-wrong'); }, 600);
        }
        Audio.oops();
        guideSay('Try again! 💪', 'Try again!');
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
      guideSay('Great job! You are a color champion! 🏆🌈',
        'Great job! You are a color champion!');
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
          Audio.enabled ? 'Turn sound off' : 'Turn sound on');
      }
      if (Audio.enabled) Audio.pop();
      return Audio.enabled;
    },

    // Small hook so tests can speak a colour on demand.
    sayColor: function (id) {
      var c = window.LESSON.getColor(id);
      if (c) Audio.sayFr(c.fr);
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
