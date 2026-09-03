(function () {
  'use strict';

  var originalInput = document.getElementById('original-input');
  var loadBtn = document.getElementById('load-btn');
  var resetBtn = document.getElementById('reset-btn');
  var display = document.getElementById('display');
  var copyBtn = document.getElementById('copy-btn');
  var backspaceBtn = document.getElementById('backspace-btn');
  var cancBtn = document.getElementById('canc-btn');
  var enterBtn = document.getElementById('enter-btn');
  var toast = document.getElementById('toast');
  var mobileKeyboard = document.getElementById('mobile-keyboard');

  var history = [];
  var toastTimer = null;
  var mobileBackspaceBtn = null;
  var mobileCancBtn = null;
  var mobileEnterBtn = null;

  function resetState(text) {
    history = [{ prefix: '', remainder: text }];
    render();
  }

  function current() {
    return history[history.length - 1];
  }

  function appendChars(container, text, onCharClick) {
    for (var i = 0; i < text.length; i++) {
      var charSpan = document.createElement('span');
      charSpan.className = 'char';
      charSpan.textContent = text[i];
      charSpan.addEventListener('click', makeCharClickHandler(onCharClick, i));
      container.appendChild(charSpan);
    }
  }

  function makeCharClickHandler(onCharClick, index) {
    return function (e) {
      e.stopPropagation();
      onCharClick(index);
      display.focus();
    };
  }

  function render() {
    var state = current();
    display.textContent = '';

    var prefixSpan = document.createElement('span');
    prefixSpan.className = 'seg-prefix';
    appendChars(prefixSpan, state.prefix, function (idx) {
      rewindTo(idx + 1);
    });

    var cursorSpan = document.createElement('span');
    cursorSpan.className = 'cursor';

    var remainderSpan = document.createElement('span');
    remainderSpan.className = 'seg-remainder';
    appendChars(remainderSpan, state.remainder, moveCursorTo);

    display.appendChild(prefixSpan);
    display.appendChild(cursorSpan);
    display.appendChild(remainderSpan);

    var canUndo = history.length > 1;
    var canCutRest = state.remainder.length > 0;

    backspaceBtn.disabled = !canUndo;
    cancBtn.disabled = !canCutRest;
    enterBtn.disabled = !canCutRest;
    if (mobileBackspaceBtn) mobileBackspaceBtn.disabled = !canUndo;
    if (mobileCancBtn) mobileCancBtn.disabled = !canCutRest;
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

  // Clicca su una lettera del resto per accettare tutto il testo fino a lì
  // (compresa la lettera cliccata), utile per saltare simboli assenti dalla
  // tastiera mobile (es. ":"). A differenza di cut(), non scarta nulla.
  // Ogni carattere accettato genera una voce di history separata, così
  // "Annulla" torna sempre indietro di un carattere alla volta.
  function moveCursorTo(idx) {
    var state = current();
    if (idx < 0 || idx >= state.remainder.length) return;
    for (var i = 0; i <= idx; i++) {
      var s = current();
      history.push({
        prefix: s.prefix + s.remainder[0],
        remainder: s.remainder.slice(1)
      });
    }
    render();
  }

  // Torna allo stato più recente in cui il prefisso aveva esattamente
  // prefixLen caratteri. Non si può assumere history[k].prefix.length === k:
  // cutRest() aggiunge una voce di history senza far crescere il prefisso.
  function rewindTo(prefixLen) {
    for (var k = history.length - 1; k >= 0; k--) {
      if (history[k].prefix.length === prefixLen) {
        if (k < history.length - 1) {
          history.length = k + 1;
          render();
        }
        return;
      }
    }
  }

  function cutRest() {
    var state = current();
    if (state.remainder.length === 0) return;
    history.push({ prefix: state.prefix, remainder: '' });
    render();
  }

  // Elimina il carattere subito dopo il cursore senza accettarlo nel prefisso.
  function deleteNext() {
    var state = current();
    if (state.remainder.length === 0) return;
    history.push({ prefix: state.prefix, remainder: state.remainder.slice(1) });
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
      showToast(ok ? 'Copiato negli appunti!' : 'Impossibile copiare — seleziona il testo manualmente.');
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

  // --- controlli ---

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
    } else if (e.key === 'Delete') {
      e.preventDefault();
      deleteNext();
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
  cancBtn.addEventListener('click', function () {
    deleteNext();
    display.focus();
  });
  enterBtn.addEventListener('click', function () {
    cutRest();
    display.focus();
  });

  // --- tastiera mobile personalizzata (le lettere si vedono solo su schermi piccoli tramite CSS) ---

  var ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  // Come sulla tastiera dell'iPhone: ⌫ chiude la riga ZXCVBNM, mentre la riga
  // inferiore ha uno spazio grande al centro e ⏎ come tasto d'azione finale.
  ROWS.forEach(function (row, rowIndex) {
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

    if (rowIndex === ROWS.length - 1) {
      mobileBackspaceBtn = document.createElement('button');
      mobileBackspaceBtn.type = 'button';
      mobileBackspaceBtn.className = 'kb-key kb-wide';
      mobileBackspaceBtn.textContent = '⌫';
      mobileBackspaceBtn.setAttribute('aria-label', 'Annulla l\'ultimo taglio');
      mobileBackspaceBtn.addEventListener('click', undoCut);
      rowEl.appendChild(mobileBackspaceBtn);
    }

    mobileKeyboard.appendChild(rowEl);
  });

  var bottomRow = document.createElement('div');
  bottomRow.className = 'kb-row';

  mobileCancBtn = document.createElement('button');
  mobileCancBtn.type = 'button';
  mobileCancBtn.className = 'kb-key kb-wide';
  mobileCancBtn.textContent = '⌦';
  mobileCancBtn.setAttribute('aria-label', 'Elimina il carattere dopo il cursore');
  mobileCancBtn.addEventListener('click', deleteNext);

  var spaceBtn = document.createElement('button');
  spaceBtn.type = 'button';
  spaceBtn.className = 'kb-key kb-space';
  spaceBtn.textContent = 'spazio';
  spaceBtn.addEventListener('click', function () {
    cut(' ');
  });

  mobileEnterBtn = document.createElement('button');
  mobileEnterBtn.type = 'button';
  mobileEnterBtn.className = 'kb-key kb-wide';
  mobileEnterBtn.textContent = '⏎';
  mobileEnterBtn.setAttribute('aria-label', 'Taglia il resto');
  mobileEnterBtn.addEventListener('click', cutRest);

  bottomRow.appendChild(mobileCancBtn);
  bottomRow.appendChild(spaceBtn);
  bottomRow.appendChild(mobileEnterBtn);
  mobileKeyboard.appendChild(bottomRow);

  // --- init ---
  resetState(originalInput.value);
})();
