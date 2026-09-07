// 11 Colores perfectamente diferenciados para las tablas 0 a 10
const TABLE_COLORS = [
    '#E74C3C', // 0: Rojo
    '#2ECC71', // 1: Verde
    '#3498DB', // 2: Azul
    '#E67E22', // 3: Naranja
    '#9B59B6', // 4: Morado
    '#F1C40F', // 5: Amarillo
    '#E84393', // 6: Rosa
    '#00CEC9', // 7: Turquesa
    '#D63031', // 8: Rojo Oscuro
    '#00B894', // 9: Menta
    '#6C5CE7'  // 10: Violeta
];

const DEFAULT_BG = '#eef5fc';

let selectedStudyTable = 1;
let selectedPracticeTables = [];
let difficultyTime = 10;

let currentDeck = [];
let currentCardIndex = 0;
let timerInterval = null;
let timeLeft = 0;
let recognition = null;

let matchHistory = [];
let failedCards = [];

document.addEventListener('DOMContentLoaded', () => {
    initStudySection();
    initGameSetupSection();
    initSpeechRecognition();
});

// Cambiar de sección principal
function switchSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.btn-nav').forEach(b => b.classList.remove('active'));

    document.getElementById(`section-${sectionId}`).classList.add('active');
    
    if (sectionId === 'learn') {
        document.getElementById('nav-learn').classList.add('active');
        showLearnStep('selector');
    } else {
        setBgColor(DEFAULT_BG);
    }
    
    if (sectionId === 'game-setup') {
        document.getElementById('nav-game').classList.add('active');
    }
}

function setBgColor(color) {
    document.getElementById('app-body').style.backgroundColor = color;
}

/* ==========================================
   1. ESTUDIAR TABLAS (3 VISTAS)
   ========================================== */
function initStudySection() {
    const navContainer = document.getElementById('learn-buttons');
    navContainer.innerHTML = '';

    for (let i = 0; i <= 10; i++) {
        const btn = document.createElement('button');
        btn.className = 'btn-table-select';
        btn.style.backgroundColor = TABLE_COLORS[i];
        btn.innerText = `Tabla ${i}`;
        btn.onclick = () => selectStudyTable(i);
        navContainer.appendChild(btn);
    }
}

function selectStudyTable(num) {
    selectedStudyTable = num;
    renderStudyContent(num);
    showLearnStep('complete');
}

function showLearnStep(step) {
    document.querySelectorAll('.learn-subview').forEach(v => v.classList.remove('active'));

    if (step === 'selector') {
        document.getElementById('learn-step-selector').classList.add('active');
        setBgColor(DEFAULT_BG);
    } else if (step === 'complete') {
        document.getElementById('learn-step-complete').classList.add('active');
        setBgColor(TABLE_COLORS[selectedStudyTable]);
    } else if (step === 'practice') {
        document.getElementById('learn-step-practice').classList.add('active');
        setBgColor(TABLE_COLORS[selectedStudyTable]);
    }
}

function renderStudyContent(num) {
    const listComplete = document.getElementById('list-complete');
    const listPractice = document.getElementById('list-practice');

    document.getElementById('complete-title').innerText = `Tabla del ${num}`;
    document.getElementById('practice-title').innerText = `Pruébate: Tabla del ${num}`;

    listComplete.innerHTML = '';
    listPractice.innerHTML = '';

    for (let i = 0; i <= 10; i++) {
        const liFull = document.createElement('li');
        liFull.innerHTML = `${num} x ${i} = <strong>${num * i}</strong>`;
        listComplete.appendChild(liFull);

        const liEmpty = document.createElement('li');
        liEmpty.innerHTML = `${num} x ${i} = <span class="answer-holder" style="color:${TABLE_COLORS[num]}">?</span>`;
        liEmpty.dataset.val = num * i;
        listPractice.appendChild(liEmpty);
    }
}

function togglePracticeAnswers() {
    const holders = document.querySelectorAll('.answer-holder');
    holders.forEach(h => {
        h.innerText = (h.innerText === '?') ? h.parentElement.dataset.val : '?';
    });
}

/* ==========================================
   2. CONFIGURACIÓN DEL MODO REPASO
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
            alert('Puedes seleccionar como máximo 3 tablas.');
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
   3. JUEGO / GAMEPLAY
   ========================================== */
function startGame() {
    if (selectedPracticeTables.length === 0) {
        alert('Selecciona al menos 1 tabla para repasar.');
        return;
    }

    difficultyTime = parseInt(document.querySelector('input[name="difficulty"]:checked').value);
    
    currentDeck = [];
    selectedPracticeTables.forEach(table => {
        for (let i = 0; i <= 10; i++) {
            currentDeck.push({ table, num1: table, num2: i, answer: table * i });
        }
    });

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
    
    // Cambiar color de fondo dinámicamente según la tabla que sale
    setBgColor(TABLE_COLORS[cardData.table]);

    // Resetear UI de la Ficha
    document.getElementById('flashcard').classList.remove('flipped');
    document.getElementById('user-input').value = '';
    document.getElementById('current-index').innerText = currentCardIndex + 1;
    document.getElementById('total-cards').innerText = currentDeck.length;
    
    document.getElementById('card-question').innerText = `${cardData.num1} x ${cardData.num2}`;
    
    // Estado de los botones de acción
    document.getElementById('btn-submit').disabled = true;
    document.getElementById('btn-next').disabled = true;

    // Reproducir voz de la operación
    speakText(`${cardData.num1} por ${cardData.num2}`);

    // Iniciar Tiempo y Micro
    startTimer();
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
            submitAnswer(true); // Tiempo agotado
        }
    }, 1000);
}

function pressKey(num) {
    const input = document.getElementById('user-input');
    if (input.value.length < 3 && timerInterval !== null) {
        input.value += num;
        document.getElementById('btn-submit').disabled = false;
    }
}

function clearInput() {
    document.getElementById('user-input').value = '';
    document.getElementById('btn-submit').disabled = true;
}

function submitAnswer(isTimeout = false) {
    clearInterval(timerInterval);
    timerInterval = null;
    stopListening();

    const cardData = currentDeck[currentCardIndex];
    const inputVal = document.getElementById('user-input').value;
    const userAnswer = isTimeout ? null : parseInt(inputVal);
    const isCorrect = (userAnswer === cardData.answer);

    // Registrar en histórico
    matchHistory.push({ ...cardData, userAnswer, isCorrect });
    if (!isCorrect) failedCards.push(cardData);

    // Girar Ficha y mostrar respuesta
    const flashcard = document.getElementById('flashcard');
    document.getElementById('card-answer').innerText = cardData.answer;
    document.getElementById('card-feedback-text').innerText = isCorrect ? "¡Correcto! 🎉" : "¡Vaya! 😅";
    document.querySelector('.card-back').style.backgroundColor = isCorrect ? '#2ecc71' : '#e74c3c';
    flashcard.classList.add('flipped');

    // Sonido
    playAudioFeedback(isCorrect);

    // Ajuste de botones
    document.getElementById('btn-submit').disabled = true;
    document.getElementById('btn-next').disabled = false;
}

function nextCard() {
    currentCardIndex++;
    loadCard();
}

/* ==========================================
   4. VOZ Y AUDIO
   ========================================== */
function speakText(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.95;
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
            if (!isNaN(parsedNum) && timerInterval !== null) {
                document.getElementById('user-input').value = parsedNum;
                document.getElementById('btn-submit').disabled = false;
                submitAnswer();
            }
        };

        recognition.onerror = () => {
            document.getElementById('mic-status').innerText = '🎙️ Usa el teclado';
        };
    } else {
        document.getElementById('mic-status').innerText = '🎙️ Teclado en pantalla';
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

function playAudioFeedback(isCorrect) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isCorrect) {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
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
   5. RESUMEN Y REPETICIÓN DE FALLOS
   ========================================== */
function finishGame() {
    setBgColor(DEFAULT_BG);
    switchSection('results');
    
    const total = matchHistory.length;
    const corrects = matchHistory.filter(m => m.isCorrect).length;
    const finalScore = Math.round((corrects / total) * 100);

    document.getElementById('final-score').innerText = `Puntuación Total: ${finalScore} / 100`;

    const statsContainer = document.getElementById('table-stats-container');
    statsContainer.innerHTML = '';

    // Agrupar por tabla seleccionada
    const tablesInMatch = [...new Set(matchHistory.map(m => m.table))];

    tablesInMatch.forEach(tbl => {
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

    const btnRetry = document.getElementById('btn-retry-fails');
    if (failedCards.length > 0) {
        btnRetry.style.display = 'inline-block';
        btnRetry.innerText = `🔄 Repasar solo fallos (${failedCards.length})`;
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
