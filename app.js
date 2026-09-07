 const TABLE_COLORS = [
    '#E74C3C', '#2ECC71', '#3498DB', '#E67E22', '#9B59B6',
    '#F1C40F', '#E84393', '#00CEC9', '#D63031', '#00B894', '#6C5CE7'
];

// Tabla de conversión verbal a número
const NUMBER_WORDS = {
    "cero": 0, "uno": 1, "un": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10,
    "once": 11, "doce": 12, "trece": 13, "catorce": 14, "quince": 15, "dieciseis": 16, "diecisiete": 17, "dieciocho": 18, "diecinueve": 19, "veinte": 20,
    "veintiuno": 21, "veintidos": 22, "veintitres": 23, "veinticuatro": 24, "veinticinco": 25, "veintiseis": 26, "veintisiete": 27, "veintiocho": 28, "veintinueve": 29,
    "treinta": 30, "cuarenta": 40, "cincuenta": 50, "sesenta": 60, "setenta": 70, "ochenta": 80, "noventa": 90, "cien": 100
};

let selectedStudyTable = 1;
let selectedPracticeTables = [];
let difficultyTime = 10;
let isAutoNextEnabled = false;

let currentDeck = [];
let currentCardIndex = 0;
let timerInterval = null;
let autoNextTimeout = null;
let speechTimeout = null;
let timeLeft = 0;

let recognition = null;
let audioCtx = null;
let isAudioReading = false;

let matchHistory = [];
let failedCards = [];

document.addEventListener('DOMContentLoaded', () => {
    initStudySection();
    initGameSetupSection();
    
    // Desbloquear audio en la primera interacción táctil o clic
    const unlockAudio = () => {
        initAudio();
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
});

function initAudio() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function switchSection(sectionId) {
    stopAllAudioAndSpeech();

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

function stopAllAudioAndSpeech() {
    isAudioReading = false;

    if (autoNextTimeout) { clearTimeout(autoNextTimeout); autoNextTimeout = null; }
    if (speechTimeout) { clearTimeout(speechTimeout); speechTimeout = null; }
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }

    stopListening();
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
    stopAllAudioAndSpeech();
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
    stopAllAudioAndSpeech();
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

    for (let i = 0; i <= 10; i++) {
        if (!isAudioReading) break;

        const textToSpeak = `${num} por ${i}... ${num * i}`;
        await speakPromise(textToSpeak);

        if (!isAudioReading) break;
        await new Promise(res => setTimeout(res, 500));
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
    stopAllAudioAndSpeech();

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
        // Solo iniciar si seguimos en la pantalla de juego
        if (document.getElementById('section-gameplay').classList.contains('active')) {
            startTimer();
            startListening();
        }
    });
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timeLeft = difficultyTime;
    document.getElementById('timer-display').innerText = timeLeft;

    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('timer-display').innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
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
   4. ANALIZADOR DE VOZ Y NÚMEROS COMPUESTOS
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

function parseSpokenPhrase(fullText) {
    if (!fullText) return null;

    // Normalización del texto dictado
    let text = fullText.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ");

    // A. Extraer números en formato de dígitos directos (ej: "48" o "40 8")
    const numbersInText = text.match(/\b\d+\b/g);
    if (numbersInText) {
        let totalSum = 0;
        numbersInText.forEach(n => {
            totalSum += parseInt(n);
        });
        return totalSum; // Si dijo "40" y luego "8", suma = 48
    }

    // B. Extraer palabras individuales e interpretar Decenas + Unidades
    const words = text.split(/\s+/);
    let totalValue = 0;
    let foundNumber = false;

    words.forEach(word => {
        if (NUMBER_WORDS[word] !== undefined) {
            totalValue += NUMBER_WORDS[word];
            foundNumber = true;
        }
    });

    return foundNumber ? totalValue : null;
}

function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        document.getElementById('mic-status').innerText = '🎙️ Usar teclado';
        return;
    }

    if (recognition) {
        try { recognition.abort(); } catch (e) {}
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
        if (timerInterval === null) return;

        // Acumular la frase completa capturada durante la dictación actual
        let currentSpeech = '';
        for (let i = 0; i < event.results.length; i++) {
            currentSpeech += ' ' + event.results[i][0].transcript;
        }

        const numberFound = parseSpokenPhrase(currentSpeech);

        if (numberFound !== null) {
            document.getElementById('user-input').value = numberFound;
            document.getElementById('btn-submit').disabled = false;
        }
    };

    recognition.onerror = () => {
        document.getElementById('mic-status').innerText = '🎙️ Teclado listo';
    };

    try {
        recognition.start();
        document.getElementById('mic-status').innerText = '🎙️ Escuchando...';
    } catch (e) {}
}

function stopListening() {
    if (recognition) {
        try { recognition.abort(); } catch (e) {}
        recognition = null;
    }
}

function playAudioFeedback(isCorrect) {
    initAudio();
    if (!audioCtx) return;

    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (isCorrect) {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now); // Do
            osc.frequency.setValueAtTime(659.25, now + 0.1); // Mi
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        } else {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.setValueAtTime(180, now + 0.15);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        }
    } catch (e) {
        console.log("Audio feedback error:", e);
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

