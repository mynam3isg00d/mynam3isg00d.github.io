(function () {
  'use strict';

  var originalInput = document.getElementById('original-input');
  var loadBtn = document.getElementById('load-btn');
  var resetBtn = document.getElementById('reset-btn');
  var display = document.getElementById('display');
  var copyBtn = document.getElementById('copy-btn');
  var backspaceBtn = document.getElementById('backspace-btn');
  var enterBtn = document.getElementById('enter-btn');
  var toast = document.getElementById('toast');
  var mobileKeyboard = document.getElementById('mobile-keyboard');

  var history = [];
  var toastTimer = null;
  var mobileBackspaceBtn = null;
  var mobileEnterBtn = null;

  function resetState(text) {
    history = [{ prefix: '', remainder: text }];
    render();
  }

  function current() {
    return history[history.length - 1];
  }

  function render() {
    var state = current();
    display.textContent = '';

    var prefixSpan = document.createElement('span');
    prefixSpan.className = 'seg-prefix';
    prefixSpan.textContent = state.prefix;

    var cursorSpan = document.createElement('span');
    cursorSpan.className = 'cursor';

    var remainderSpan = document.createElement('span');
    remainderSpan.className = 'seg-remainder';
    remainderSpan.textContent = state.remainder;

    display.appendChild(prefixSpan);
    display.appendChild(cursorSpan);
    display.appendChild(remainderSpan);

    var canUndo = history.length > 1;
    var canCutRest = state.remainder.length > 0;

    backspaceBtn.disabled = !canUndo;
    enterBtn.disabled = !canCutRest;
    if (mobileBackspaceBtn) mobileBackspaceBtn.disabled = !canUndo;
    if (mobileEnterBtn) mobileEnterBtn.disabled = !canCutRest;
  }

  function cut(char) {
    var state = current();
    var idx = state.remainder.toLowerCase().indexOf(char.toLowerCase());
    if (idx === -1) {
      flashError();
      return;
    }
    var matched = state.remainder[idx];
    history.push({
      prefix: state.prefix + matched,
      remainder: state.remainder.slice(idx + 1)
    });
    render();
  }

  function cutRest() {
    var state = current();
    if (state.remainder.length === 0) return;
    history.push({ prefix: state.prefix, remainder: '' });
    render();
  }

  function undoCut() {
    if (history.length > 1) {
      history.pop();
      render();
    }
  }

  function flashError() {
    display.classList.remove('shake');
    void display.offsetWidth; // restart animation
    display.classList.add('shake');
  }

  display.addEventListener('animationend', function () {
    display.classList.remove('shake');
  });

  function showToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.hidden = true;
    }, 1500);
  }

  function copyResult() {
    var state = current();
    var text = state.prefix + state.remainder;

    function done(ok) {
      showToast(ok ? 'Copied to clipboard!' : 'Could not copy — select the text manually.');
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        done(true);
      }, function () {
        legacyCopy(text, done);
      });
    } else {
      legacyCopy(text, done);
    }
  }

  function legacyCopy(text, cb) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(ta);
    cb(ok);
  }

  // --- controls ---

  loadBtn.addEventListener('click', function () {
    resetState(originalInput.value);
    display.focus();
  });

  resetBtn.addEventListener('click', function () {
    resetState(originalInput.value);
  });

  display.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      undoCut();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      cutRest();
    } else if (e.key.length === 1) {
      e.preventDefault();
      cut(e.key);
    }
  });

  copyBtn.addEventListener('click', copyResult);
  backspaceBtn.addEventListener('click', function () {
    undoCut();
    display.focus();
  });
  enterBtn.addEventListener('click', function () {
    cutRest();
    display.focus();
  });

  // --- custom mobile keyboard (letters only shown on small screens via CSS) ---

  var ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  ROWS.forEach(function (row) {
    var rowEl = document.createElement('div');
    rowEl.className = 'kb-row';
    row.forEach(function (letter) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'kb-key';
      btn.textContent = letter;
      btn.addEventListener('click', function () {
        cut(letter);
      });
      rowEl.appendChild(btn);
    });
    mobileKeyboard.appendChild(rowEl);
  });

  var bottomRow = document.createElement('div');
  bottomRow.className = 'kb-row';

  mobileBackspaceBtn = document.createElement('button');
  mobileBackspaceBtn.type = 'button';
  mobileBackspaceBtn.className = 'kb-key kb-wide';
  mobileBackspaceBtn.textContent = '⌫';
  mobileBackspaceBtn.setAttribute('aria-label', 'Undo last cut');
  mobileBackspaceBtn.addEventListener('click', undoCut);

  var spaceBtn = document.createElement('button');
  spaceBtn.type = 'button';
  spaceBtn.className = 'kb-key kb-space';
  spaceBtn.textContent = 'space';
  spaceBtn.addEventListener('click', function () {
    cut(' ');
  });

  mobileEnterBtn = document.createElement('button');
  mobileEnterBtn.type = 'button';
  mobileEnterBtn.className = 'kb-key kb-wide';
  mobileEnterBtn.textContent = '⏎';
  mobileEnterBtn.setAttribute('aria-label', 'Cut the remainder');
  mobileEnterBtn.addEventListener('click', cutRest);

  bottomRow.appendChild(mobileBackspaceBtn);
  bottomRow.appendChild(spaceBtn);
  bottomRow.appendChild(mobileEnterBtn);
  mobileKeyboard.appendChild(bottomRow);

  // --- init ---
  resetState(originalInput.value);
})();
