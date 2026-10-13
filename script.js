(() => {
  const board = document.querySelector('#board');
  const startButton = document.querySelector('#start-btn');
  const restartButton = document.querySelector('#restart-btn');
  const overlay = document.querySelector('#overlay');
  const roundDisplay = document.querySelector('#round');
  const accuracyDisplay = document.querySelector('#accuracy');
  const bestDisplay = document.querySelector('#best');
  const message = document.querySelector('#message');
  const messageIndex = document.querySelector('#message-index');
  const status = document.querySelector('#status');
  const fieldNote = document.querySelector('#field-note');

  const TILE_COUNT = 16;
  let sequence = [];
  let selected = new Set();
  let round = 1;
  let totalPicks = 0;
  let correctPicks = 0;
  let best = 0;
  let locked = true;
  let runActive = false;
  let roundToken = 0;
  let tiles = [];

  try { best = Number(localStorage.getItem('afterimage-best') || 0); } catch (_) {}
  bestDisplay.textContent = String(best).padStart(2, '0');

  function createBoard() {
    board.innerHTML = '';
    tiles = [];
    for (let i = 0; i < TILE_COUNT; i++) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'tile';
      tile.setAttribute('aria-label', `Tile ${i + 1}`);
      tile.disabled = true;
      tile.addEventListener('click', () => chooseTile(i));
      board.appendChild(tile);
      tiles.push(tile);
    }
  }

  function setMessage(text, index = 'PLAY / 01') {
    message.textContent = text;
    messageIndex.textContent = index;
  }

  function updateStats() {
    roundDisplay.textContent = String(round).padStart(2, '0');
    accuracyDisplay.textContent = totalPicks ? `${Math.round((correctPicks / totalPicks) * 100)}%` : '—';
    bestDisplay.textContent = String(best).padStart(2, '0');
  }

  function randomTile(excluded = new Set()) {
    const available = [];
    for (let i = 0; i < TILE_COUNT; i++) if (!excluded.has(i)) available.push(i);
    return available[Math.floor(Math.random() * available.length)];
  }

  function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  async function beginRun() {
    roundToken++;
    sequence = [];
    selected = new Set();
    round = 1;
    totalPicks = 0;
    correctPicks = 0;
    runActive = true;
    overlay.classList.add('hidden');
    status.textContent = 'OBSERVE';
    updateStats();
    await showRound(roundToken);
  }

  async function showRound(token) {
    if (token !== roundToken) return;
    locked = true;
    selected.clear();
    tiles.forEach(tile => {
      tile.disabled = true;
      tile.classList.remove('lit', 'correct', 'wrong');
    });
    sequence.push(randomTile(new Set(sequence)));
    setMessage('Memorise the illuminated tiles.', `ROUND / ${String(round).padStart(2, '0')}`);
    status.textContent = 'OBSERVE';
    await delay(450);
    for (const index of sequence) {
      if (token !== roundToken) return;
      tiles[index].classList.add('lit');
      await delay(Math.max(260, 650 - round * 12));
      tiles[index].classList.remove('lit');
      await delay(150);
    }
    if (token !== roundToken) return;
    locked = false;
    status.textContent = 'RECALL';
    setMessage('Now select the tiles you remember.', `RECALL / ${String(sequence.length).padStart(2, '0')} TILES`);
    tiles.forEach((tile, i) => tile.disabled = sequence.includes(i) ? false : false);
  }

  async function chooseTile(index) {
    if (locked || !runActive || selected.has(index)) return;
    totalPicks++;
    if (!sequence.includes(index)) {
      tiles[index].classList.add('wrong');
      locked = true;
      runActive = false;
      status.textContent = 'RUN ENDED';
      updateStats();
      setMessage('Not quite. The pattern fades here.', 'EXPERIMENT / END');
      fieldNote.textContent = `You reached round ${String(round).padStart(2, '0')}. Every attempt leaves a different afterimage.`;
      await delay(500);
      if (round - 1 > best) {
        best = round - 1;
        try { localStorage.setItem('afterimage-best', String(best)); } catch (_) {}
      }
      updateStats();
      overlay.querySelector('.overlay-mark').innerHTML = ` ${String(round - 1).padStart(2, '0')}<span>/</span> ${String(best).padStart(2, '0')}`;
      overlay.querySelector('p').textContent = 'ROUND REACHED / PERSONAL BEST';
      startButton.innerHTML = 'Try again <span>↗</span>';
      overlay.classList.remove('hidden');
      return;
    }
    selected.add(index);
    correctPicks++;
    tiles[index].classList.add('correct');
    updateStats();
    if (selected.size === sequence.length) {
      locked = true;
      status.textContent = 'RETAINED';
      setMessage('Pattern retained. Increasing complexity…', 'SUCCESS / +01');
      await delay(700);
      round++;
      updateStats();
      await showRound(roundToken);
    } else {
      setMessage(`${selected.size} of ${sequence.length} tiles recovered.`, `RECALL / ${String(selected.size).padStart(2, '0')}`);
    }
  }

  function reset() {
    roundToken++;
    locked = true;
    runActive = false;
    sequence = [];
    selected.clear();
    round = 1;
    totalPicks = 0;
    correctPicks = 0;
    createBoard();
    updateStats();
    status.textContent = 'STANDBY';
    setMessage('Memorise the sequence.', 'READY / 00');
    overlay.querySelector('.overlay-mark').innerHTML = 'A<span>/</span>I';
    overlay.querySelector('p').textContent = 'YOUR ATTENTION IS THE CONTROLLER.';
    startButton.innerHTML = 'Begin experiment <span>↗</span>';
    overlay.classList.remove('hidden');
  }

  startButton.addEventListener('click', beginRun);
  restartButton.addEventListener('click', reset);
  createBoard();
  updateStats();
})();
