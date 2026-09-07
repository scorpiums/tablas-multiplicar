// Colores asignados a cada tabla del 0 al 10
const TABLE_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7D794', '#778BEB', '#E15F41', '#3DC1D3', '#63C2DE', '#E77F67'
];

let selectedStudyTable = 1;
let selectedPracticeTables = [];
let difficultyTime = 10;

let currentDeck = [];
let currentCardIndex = 0;
let timerInterval = null;
let timeLeft = 0;
let recognition = null;
let isListening = false;

let matchHistory = []; // { table, num1, num2, answer, userAnswer, correct }
let failedCards = [];

// Inicialización de la App
document.addEventListener('DOMContentLoaded', () => {
    initStudySection();
    initGameSetupSection();
    initSpeechRecognition();
});

// Navegación de pestañas
function switchSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.btn-nav').forEach(b => b.classList.remove('active'));

    document.getElementById(`section-${sectionId}`).classList.add('active');
    
    if (sectionId === 'learn') document.getElementById('nav-learn').classList.add('active');
    if (sectionId === 'game-setup') document.getElementById('nav-game').classList.add('active');
}

/* ==========================================
   1. SECCIÓN: ESTUDIAR Y APRENDER
   ========================================== */
function initStudySection() {
    const navContainer = document.getElementById('learn-buttons');
    navContainer.innerHTML = '';

    for (let i = 0; i <= 10; i++) {
        const btn = document.createElement('button');
        btn.className = 'btn-table-select';
        btn.style.backgroundColor = TABLE_COLORS[i];
        btn.innerText = `Tabla del ${i}`;
        btn.onclick = () => renderStudyTable(i);
        navContainer.appendChild(btn);
    }
    renderStudyTable(1);
}

function renderStudyTable(num) {
    selectedStudyTable = num;
    const listComplete = document.getElementById('list-complete');
    const listPractice = document.getElementById('list-practice');

    listComplete.innerHTML = '';
    listPractice.innerHTML = '';

    const color = TABLE_COLORS[num];
    document.getElementById('card-complete').style.borderColor = color;
    document.getElementById('card-practice').style.borderColor = color;

    for (let i = 0; i <= 10; i++) {
        const liFull = document.createElement('li');
        liFull.innerHTML = `${num} x ${i} = <strong>${num * i}</strong>`;
        listComplete.appendChild(liFull);

        const liEmpty = document.createElement('li');
        liEmpty.innerHTML = `${num} x ${i} = <span class="answer-holder" style="color: ${color}">?</span>`;
        liEmpty.dataset.val = num * i;
        listPractice.appendChild(liEmpty);
    }
}

function togglePracticeAnswers() {
    const holders = document.querySelectorAll('.answer-holder');
    holders.forEach(h => {
        if (h.innerText === '?') {
            h.innerText = h.parentElement.dataset.val;
        } else {
            h.innerText = '?';
        }
    });
}

/* ==========================================
   2. SECCIÓN: CONFIGURACIÓN DE PARTE
   ========================================== */
function initGameSetupSection() {
    const container = document.getElementById('tables-selection');
    container.innerHTML = '';

    for (let i = 0; i <= 10; i++) {
        const label = document.createElement('label');
        label.className = 'tbl-check';
        label.style.backgroundColor = TABLE_COLORS[i];
        label.innerHTML = `
            <input type="checkbox" value="${i}" onchange="toggleTableSelection(this, ${i})">
            ${i}
        `;
        container.appendChild(label);
    }
}

function toggleTableSelection(checkbox, num) {
    const label = checkbox.parentElement;
    if (checkbox.checked) {
        if (selectedPracticeTables.length >= 3) {
            checkbox.checked = false;
            alert('Solo puedes seleccionar un máximo de 3 tablas.');
            return;
        }
        selectedPracticeTables.push(num);
        label.classList.add('selected');
    } else {
        selectedPracticeTables = selectedPracticeTables.filter(t => t !== num);
        label.classList.remove('selected');
    }
}

/* ==========================================
   3. MODO BUCLE DE JUEGO (GAMEPLAY)
   ========================================== */
function startGame() {
    if (selectedPracticeTables.length === 0) {
        alert('Por favor, selecciona al menos 1 tabla para repasar.');
        return;
    }

    difficultyTime = parseInt(document.querySelector('input[name="difficulty"]:checked').value);
    
    // Generar mazo de cartas de las tablas seleccionadas
    currentDeck = [];
    selectedPracticeTables.forEach(table => {
        for (let i = 0; i <= 10; i++) {
            currentDeck.push({ table, num1: table, num2: i, answer: table * i });
        }
    });

    // Barajar aleatoriamente
    currentDeck.sort(() => Math.random() - 0.5);

    currentCardIndex = 0;
    matchHistory = [];
    failedCards = [];

    switchSection('gameplay');
    loadCard();
}

function loadCard() {
    if (currentCardIndex >= currentDeck.length) {
        finishGame();
        return;
    }

    const cardData = currentDeck[currentCardIndex];
    
    // UI reset
    document.getElementById('flashcard').classList.remove('flipped');
    document.getElementById('user-input').value = '';
    document.getElementById('current-index').innerText = currentCardIndex + 1;
    document.getElementById('total-cards').innerText = currentDeck.length;
    
    const cardFront = document.querySelector('.card-front');
    cardFront.style.backgroundColor = TABLE_COLORS[cardData.table];
    document.getElementById('card-question').innerText = `${cardData.num1} x ${cardData.num2}`;
    
    // Reproducir voz
    speakText(`${cardData.num1} por ${cardData.num2}`);

    // Iniciar Tiempo
    startTimer();

    // Iniciar Reconocimiento de Voz
    startListening();
}

function startTimer() {
    clearInterval(timerInterval);
    timeLeft = difficultyTime;
    document.getElementById('timer-display').innerText = timeLeft;

    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timer-display').innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitAnswer(true); // Se acabó el tiempo
        }
    }, 1000);
}

function pressKey(num) {
    const input = document.getElementById('user-input');
    if (input.value.length < 3) input.value += num;
}

function clearInput() {
    document.getElementById('user-input').value = '';
}

function submitAnswer(isTimeout = false) {
    clearInterval(timerInterval);
    stopListening();

    const cardData = currentDeck[currentCardIndex];
    const inputVal = document.getElementById('user-input').value;
    const userAnswer = isTimeout ? null : parseInt(inputVal);
    const isCorrect = (userAnswer === cardData.answer);

    // Guardar resultado
    matchHistory.push({ ...cardData, userAnswer, isCorrect });
    if (!isCorrect) failedCards.push(cardData);

    // Girar Ficha
    const flashcard = document.getElementById('flashcard');
    document.getElementById('card-answer').innerText = cardData.answer;
    document.getElementById('card-feedback-text').innerText = isCorrect ? "¡Correcto! 🎉" : "¡Vaya! 😅";
    document.querySelector('.card-back').style.backgroundColor = isCorrect ? '#2ecc71' : '#e74c3c';
    flashcard.classList.add('flipped');

    // Efecto de Sonido Synthetico
    playAudioFeedback(isCorrect);

    // Pasar a la siguiente tras animación
    setTimeout(() => {
        currentCardIndex++;
        loadCard();
    }, 2200);
}

/* ==========================================
   4. RECONOCIMIENTO Y SÍNTESIS DE VOZ
   ========================================== */
function speakText(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }
}

function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.trim();
            const parsedNum = parseInt(transcript);
            if (!isNaN(parsedNum)) {
                document.getElementById('user-input').value = parsedNum;
                submitAnswer();
            }
        };

        recognition.onerror = () => {
            document.getElementById('mic-status').innerText = '🎙️ Escribe el resultado';
        };
    } else {
        document.getElementById('mic-status').innerText = '🎙️ Usa el teclado';
    }
}

function startListening() {
    if (recognition) {
        try {
            recognition.start();
            document.getElementById('mic-status').innerText = '🎙️ Escuchando...';
        } catch (e) {}
    }
}

function stopListening() {
    if (recognition) {
        try { recognition.stop(); } catch (e) {}
    }
}

/* ==========================================
   5. AUDIOS SINTÉTICOS (WEB AUDIO API)
   ========================================== */
function playAudioFeedback(isCorrect) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isCorrect) {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        gain.gain.fadeOut(ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(180, ctx.currentTime + 0.15);
        gain.gain.fadeOut(ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
    }
}

/* ==========================================
   6. ESTADÍSTICAS Y REPETICIÓN DE FALLOS
   ========================================== */
function finishGame() {
    switchSection('results');
    
    const total = matchHistory.length;
    const corrects = matchHistory.filter(m => m.isCorrect).length;
    const finalScore = Math.round((corrects / total) * 100);

    document.getElementById('final-score').innerText = `Puntuación Final: ${finalScore} / 100`;

    // Desglosar estadísticas por tabla
    const statsContainer = document.getElementById('table-stats-container');
    statsContainer.innerHTML = '';

    selectedPracticeTables.forEach(tbl => {
        const tableMatches = matchHistory.filter(m => m.table === tbl);
        const tableCorrects = tableMatches.filter(m => m.isCorrect).length;

        const statCard = document.createElement('div');
        statCard.className = 'stat-item';
        statCard.style.borderColor = TABLE_COLORS[tbl];
        statCard.innerHTML = `
            <strong>Tabla del ${tbl}</strong><br>
            ✅ Aciertos: ${tableCorrects} / ${tableMatches.length}<br>
            ❌ Errores: ${tableMatches.length - tableCorrects}
        `;
        statsContainer.appendChild(statCard);
    });

    // Controlar botón de reintentar fallos
    const btnRetry = document.getElementById('btn-retry-fails');
    if (failedCards.length > 0) {
        btnRetry.style.display = 'inline-block';
        btnRetry.innerText = `🔄 Repasar solo los fallos (${failedCards.length})`;
    } else {
        btnRetry.style.display = 'none';
    }
}

function retryFailedOnly() {
    currentDeck = [...failedCards];
    currentDeck.sort(() => Math.random() - 0.5);
    
    currentCardIndex = 0;
    matchHistory = [];
    failedCards = [];

    switchSection('gameplay');
    loadCard();
}