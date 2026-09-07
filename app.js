const TABLE_COLORS = [
    '#E74C3C', '#2ECC71', '#3498DB', '#E67E22', '#9B59B6',
    '#F1C40F', '#E84393', '#00CEC9', '#D63031', '#00B894', '#6C5CE7'
];

const SPANISH_NUMBER_MAP = {
    "cero": 0, "uno": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10,
    "once": 11, "doce": 12, "trece": 13, "catorce": 14, "quince": 15, "dieciséis": 16, "diecisiete": 17, "dieciocho": 18, "diecinueve": 19, "veinte": 20,
    "veintiuno": 21, "veintidós": 22, "veintitrés": 23, "veinticuatro": 24, "veinticinco": 25, "veintiséis": 26, "veintisiete": 27, "veintiocho": 28, "veintinueve": 29, "treinta": 30,
    "treinta y uno": 31, "treinta y dos": 32, "treinta y tres": 33, "treinta y cuatro": 34, "treinta y cinco": 35, "treinta y seis": 36, "treinta y siete": 37, "treinta y ocho": 38, "treinta y nueve": 39, "cuarenta": 40,
    "cuarenta y uno": 41, "cuarenta y dos": 42, "cuarenta y tres": 43, "cuarenta y cuatro": 44, "cuarenta y cinco": 45, "cuarenta y seis": 46, "cuarenta y siete": 47, "cuarenta y ocho": 48, "cuarenta y nueve": 49, "cincuenta": 50,
    "cincuenta y uno": 51, "cincuenta y dos": 52, "cincuenta y tres": 53, "cincuenta y cuatro": 54, "cincuenta y cinco": 55, "cincuenta y seis": 56, "cincuenta y siete": 57, "cincuenta y ocho": 58, "cincuenta y nueve": 59, "sesenta": 60,
    "sesenta y uno": 61, "sesenta y dos": 62, "sesenta y tres": 63, "sesenta y cuatro": 64, "sesenta y cinco": 65, "sesenta y seis": 66, "sesenta y siete": 67, "sesenta y ocho": 68, "sesenta y nueve": 69, "setenta": 70,
    "setenta y uno": 71, "setenta y dos": 72, "setenta y tres": 73, "setenta y cuatro": 74, "setenta y cinco": 75, "setenta y seis": 76, "setenta y siete": 77, "setenta y ocho": 78, "setenta y nueve": 79, "ochenta": 80,
    "ochenta y uno": 81, "ochenta y dos": 82, "ochenta y tres": 83, "ochenta y cuatro": 84, "ochenta y cinco": 85, "ochenta y seis": 86, "ochenta y siete": 87, "ochenta y ocho": 88, "ochenta y nueve": 89, "noventa": 90,
    "noventa y uno": 91, "noventa y dos": 92, "noventa y tres": 93, "noventa y cuatro": 94, "noventa y cinco": 95, "noventa y seis": 96, "noventa y siete": 97, "noventa y ocho": 98, "noventa y nueve": 99, "cien": 100
};

let selectedStudyTable = 1;
let selectedPracticeTables = [];
let difficultyTime = 10;
let isAutoNextEnabled = false;

let currentDeck = [];
let currentCardIndex = 0;
let timerInterval = null;
let autoNextTimeout = null;
let timeLeft = 0;

let recognition = null;
let audioCtx = null;
let isAudioReading = false;

let matchHistory = [];
let failedCards = [];

document.addEventListener('DOMContentLoaded', () => {
    initStudySection();
    initGameSetupSection();
});

function switchSection(sectionId) {
    stopTableAudio();
    if (autoNextTimeout) clearTimeout(autoNextTimeout);
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.btn-nav').forEach(b => b.classList.remove('active'));

    document.getElementById(`section-${sectionId}`).classList.add('active');
    
    if (sectionId === 'learn') {
        document.getElementById('nav-learn').classList.add('active');
        showLearnStep('selector');
    } else if (sectionId === 'game-setup') {
        document.getElementById('nav-game').classList.add('active');
    }
}

/* ==========================================
   1. ESTUDIAR TABLAS
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
    stopTableAudio();
    document.querySelectorAll('.learn-subview').forEach(v => v.classList.remove('active'));

    if (step === 'selector') {
        document.getElementById('learn-step-selector').classList.add('active');
    } else if (step === 'complete') {
        document.getElementById('learn-step-complete').classList.add('active');
    } else if (step === 'practice') {
        document.getElementById('learn-step-practice').classList.add('active');
    }
}

function renderStudyContent(num) {
    const listComplete = document.getElementById('list-complete');
    const listPractice = document.getElementById('list-practice');

    document.getElementById('complete-title').innerText = `Tabla del ${num}`;
    document.getElementById('practice-title').innerText = `Pruébate: Tabla del ${num}`;

    document.getElementById('card-complete-container').style.borderColor = TABLE_COLORS[num];
    document.getElementById('card-practice-container').style.borderColor = TABLE_COLORS[num];

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

function stopTableAudio() {
    isAudioReading = false;
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    const activeBtn = document.getElementById('btn-audio-single');
    if (activeBtn) activeBtn.classList.remove('playing');
}

async function toggleTableAudio() {
    if (isAudioReading) {
        stopTableAudio();
        return;
    }

    stopTableAudio();
    await new Promise(res => setTimeout(res, 100));

    isAudioReading = true;
    const activeBtn = document.getElementById('btn-audio-single');
    if (activeBtn) activeBtn.classList.add('playing');

    const num = selectedStudyTable;
    const pauseSeconds = 0.5;

    for (let i = 0; i <= 10; i++) {
        if (!isAudioReading) break;

        const textToSpeak = `${num} por ${i}... ${num * i}`;
        await speakPromise(textToSpeak);

        if (!isAudioReading) break;
        await new Promise(res => setTimeout(res, pauseSeconds * 1000));
    }

    stopTableAudio();
}

function speakPromise(text) {
    return new Promise((resolve) => {
        if (!('speechSynthesis' in window)) {
            resolve();
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.95;

        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();

        window.speechSynthesis.speak(utterance);
    });
}

/* ==========================================
   2. CONFIGURACIÓN REPASO
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
        selectedPracticeTables.push(num);
        label.classList.add('selected');
    } else {
        selectedPracticeTables = selectedPracticeTables.filter(t => t !== num);
        label.classList.remove('selected');
    }
}

/* ==========================================
   3. MODO REPASO Y JUEGO
   ========================================== */
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function startGame() {
    if (selectedPracticeTables.length === 0) {
        alert('Selecciona al menos 1 tabla para repasar.');
        return;
    }

    initAudio();
    difficultyTime = parseInt(document.querySelector('input[name="difficulty"]:checked').value);
    isAutoNextEnabled = document.getElementById('auto-next-check').checked;
    
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
    if (autoNextTimeout) clearTimeout(autoNextTimeout);

    if (currentCardIndex >= currentDeck.length) {
        finishGame();
        return;
    }

    const cardData = currentDeck[currentCardIndex];

    document.getElementById('flashcard').classList.remove('flipped');
    document.getElementById('user-input').value = '';
    document.getElementById('current-index').innerText = currentCardIndex + 1;
    document.getElementById('total-cards').innerText = currentDeck.length;
    
    document.getElementById('card-question').innerText = `${cardData.num1} x ${cardData.num2}`;
    document.getElementById('card-front-element').style.backgroundColor = TABLE_COLORS[cardData.table];

    document.getElementById('btn-submit').disabled = true;
    document.getElementById('btn-next').disabled = true;

    speakText(`${cardData.num1} por ${cardData.num2}`, () => {
        startTimer();
        startListening();
    });
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
            submitAnswer(true);
        }
    }, 1000);
}

function pressKey(num) {
    if (timerInterval === null) return;
    
    const input = document.getElementById('user-input');
    if (input.value.length < 3) {
        input.value += num;
        document.getElementById('btn-submit').disabled = false;
    }
}

function clearInput() {
    document.getElementById('user-input').value = '';
    document.getElementById('btn-submit').disabled = true;
}

function submitAnswer(isTimeout = false) {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    stopListening();

    const cardData = currentDeck[currentCardIndex];
    const inputVal = document.getElementById('user-input').value;
    const userAnswer = (isTimeout && inputVal === '') ? null : parseInt(inputVal);
    const isCorrect = (userAnswer === cardData.answer);

    matchHistory.push({ ...cardData, userAnswer, isCorrect });
    if (!isCorrect) failedCards.push(cardData);

    const flashcard = document.getElementById('flashcard');
    document.getElementById('card-answer').innerText = cardData.answer;
    document.getElementById('card-feedback-text').innerText = isCorrect ? "¡Correcto! 🎉" : "¡Vaya! 😅";
    document.getElementById('card-back-element').style.backgroundColor = isCorrect ? '#2ecc71' : '#e74c3c';
    
    flashcard.classList.add('flipped');

    playAudioFeedback(isCorrect);

    document.getElementById('btn-submit').disabled = true;
    
    // Si pasar automáticamente está activado, salta la tarjeta sin necesidad del botón Siguiente
    if (isAutoNextEnabled) {
        document.getElementById('btn-next').disabled = true;
        autoNextTimeout = setTimeout(() => {
            nextCard();
        }, 1200);
    } else {
        document.getElementById('btn-next').disabled = false;
    }
}

function nextCard() {
    if (autoNextTimeout) clearTimeout(autoNextTimeout);
    currentCardIndex++;
    loadCard();
}

/* ==========================================
   4. AUDIO Y RECONOCIMIENTO DE VOZ
   ========================================== */
function speakText(text, onEndCallback) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.95;
        
        utterance.onend = () => { if (onEndCallback) onEndCallback(); };
        utterance.onerror = () => { if (onEndCallback) onEndCallback(); };

        window.speechSynthesis.speak(utterance);
    } else {
        if (onEndCallback) onEndCallback();
    }
}

function parseSpokenNumber(transcript) {
    const cleanStr = transcript.toLowerCase().trim();
    
    const directMatch = cleanStr.match(/\d+/);
    if (directMatch) {
        return parseInt(directMatch[0]);
    }

    for (const [key, val] of Object.entries(SPANISH_NUMBER_MAP)) {
        if (cleanStr.includes(key)) {
            return val;
        }
    }
    return null;
}

function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        document.getElementById('mic-status').innerText = '🎙️ Usar teclado';
        return;
    }

    if (!recognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = true;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            if (timerInterval === null) return;

            const lastIndex = event.results.length - 1;
            const transcript = event.results[lastIndex][0].transcript;
            const numberFound = parseSpokenNumber(transcript);

            if (numberFound !== null) {
                document.getElementById('user-input').value = numberFound;
                document.getElementById('btn-submit').disabled = false;
            }
        };

        recognition.onerror = () => {
            document.getElementById('mic-status').innerText = '🎙️ Teclado listo';
        };
    }

    try {
        recognition.start();
        document.getElementById('mic-status').innerText = '🎙️ Escuchando...';
    } catch (e) {}
}

function stopListening() {
    if (recognition) {
        try { recognition.stop(); } catch (e) {}
    }
}

function playAudioFeedback(isCorrect) {
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (isCorrect) {
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
    } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        osc.frequency.setValueAtTime(180, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    }
}

/* ==========================================
   5. RESULTADOS
   ========================================== */
function finishGame() {
    switchSection('results');
    
    const total = matchHistory.length;
    const corrects = matchHistory.filter(m => m.isCorrect).length;
    const finalScore = total > 0 ? Math.round((corrects / total) * 100) : 0;

    document.getElementById('final-score').innerText = `${finalScore} / 100`;

    const statsContainer = document.getElementById('table-stats-container');
    statsContainer.innerHTML = '';

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
