/* ==========================================================================
   ¡Tabla Aventura! - Lógica Completa con Animación y Opciones de Audio
   ========================================================================== */

const TABLE_COLORS = {
    1: '#2ECC71', 2: '#3498DB', 3: '#E67E22', 4: '#9B59B6', 5: '#F1C40F',
    6: '#E84393', 7: '#00CEC9', 8: '#D63031', 9: '#00B894', 10: '#6C5CE7'
};

const SPANISH_DECENAS = {
    "diez": 10, "veinte": 20, "treinta": 30, "cuarenta": 40, "cincuenta": 50,
    "sesenta": 60, "setenta": 70, "ochenta": 80, "noventa": 90
};

const SPANISH_UNIDADES = {
    "cero": 0, "uno": 1, "un": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5,
    "seis": 6, "siete": 7, "ocho": 8, "nueve": 9
};

const SPANISH_ESPECIALES = {
    "once": 11, "doce": 12, "trece": 13, "catorce": 14, "quince": 15,
    "dieciseis": 16, "diecisiete": 17, "dieciocho": 18, "diecinueve": 19,
    "veintiuno": 21, "veintidos": 22, "veintitres": 23, "veinticuatro": 24, "veinticinco": 25,
    "veintiseis": 26, "veintisiete": 27, "veintiocho": 28, "veintinueve": 29, "cien": 100
};

// Variables de Estado
let selectedStudyTable = 1;
let revealIndex = 0;
let selectedPracticeTables = [];
let difficultyTime = 10;
let isAutoNextEnabled = false;

let currentDeck = [];
let currentCardIndex = 0;
let timerInterval = null;
let autoNextTimeout = null;
let speechDebounceTimer = null;
let gracePeriodTimeout = null;
let timeLeft = 0;
let isGracePeriod = false;

let recognition = null;
let audioCtx = null;
let isAudioReading = false;

let matchHistory = [];
let failedCards = [];

document.addEventListener('DOMContentLoaded', () => {
    initStudySection();
    initGameSetupSection();
    
    const enableAudioContext = () => {
        if (!audioCtx) {
            const AudioClass = window.AudioContext || window.webkitAudioContext;
            if (AudioClass) audioCtx = new AudioClass();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    };

    document.addEventListener('touchstart', enableAudioContext, { passive: true });
    document.addEventListener('click', enableAudioContext, { passive: true });
});

function fullResetState() {
    isAudioReading = false;
    isGracePeriod = false;

    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (autoNextTimeout) { clearTimeout(autoNextTimeout); autoNextTimeout = null; }
    if (speechDebounceTimer) { clearTimeout(speechDebounceTimer); speechDebounceTimer = null; }
    if (gracePeriodTimeout) { clearTimeout(gracePeriodTimeout); gracePeriodTimeout = null; }

    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }

    stopMicListening();
}

function switchSection(sectionId) {
    fullResetState();

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
   1. SECCIÓN ESTUDIAR TABLAS
   ========================================== */
function initStudySection() {
    const navContainer = document.getElementById('learn-buttons');
    navContainer.innerHTML = '';

    for (let i = 1; i <= 9; i++) {
        const btn = document.createElement('button');
        btn.className = 'btn-table-select';
        btn.style.backgroundColor = TABLE_COLORS[i];
        btn.innerText = i;
        btn.onclick = () => selectStudyTable(i);
        navContainer.appendChild(btn);
    }

    const btn10 = document.createElement('button');
    btn10.className = 'btn-table-select btn-table-10';
    btn10.style.backgroundColor = TABLE_COLORS[10];
    btn10.innerText = 'Tabla del 10';
    btn10.onclick = () => selectStudyTable(10);
    navContainer.appendChild(btn10);
}

function selectStudyTable(num) {
    selectedStudyTable = num;
    renderStudyCard(num);
    showLearnStep('study');
}

function changeStudyTable(delta) {
    stopTableAudio();
    const newTable = selectedStudyTable + delta;
    if (newTable >= 1 && newTable <= 10) {
        selectStudyTable(newTable);
    }
}

function showLearnStep(step) {
    fullResetState();
    document.querySelectorAll('.learn-subview').forEach(v => v.classList.remove('active'));

    if (step === 'selector') {
        document.getElementById('learn-step-selector').classList.add('active');
    } else if (step === 'study') {
        document.getElementById('learn-step-study').classList.add('active');
    }
}

function renderStudyCard(num) {
    revealIndex = 0;
    const card = document.getElementById('card-study-container');
    const list = document.getElementById('list-study');

    card.style.backgroundColor = TABLE_COLORS[num];
    document.getElementById('study-title').innerText = `Tabla del ${num}`;

    document.getElementById('btn-prev-table').disabled = (num === 1);
    document.getElementById('btn-next-table').disabled = (num === 10);
    document.getElementById('btn-check-next').disabled = true;

    list.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
        const li = document.createElement('li');
        li.id = `study-row-${i}`;
        li.innerHTML = `${num} x ${i} = <strong>${num * i}</strong>`;
        list.appendChild(li);
    }
}

function startSelfTest() {
    stopTableAudio();
    revealIndex = 0;
    const num = selectedStudyTable;
    const list = document.getElementById('list-study');

    list.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
        const li = document.createElement('li');
        li.id = `study-row-${i}`;
        li.innerHTML = `${num} x ${i} = <span class="val-revealed">?</span>`;
        list.appendChild(li);
    }

    document.getElementById('btn-check-next').disabled = false;
}

function revealNextAnswer() {
    if (revealIndex < 10) {
        revealIndex++;
        const num = selectedStudyTable;
        const resultValue = num * revealIndex;
        const row = document.getElementById(`study-row-${revealIndex}`);

        if (!row) return;

        const holder = row.querySelector('.val-revealed');
        if (!holder) return;

        // 1. Crear el elemento flotante en el centro
        const flyEl = document.createElement('div');
        flyEl.className = 'flying-number';
        flyEl.innerText = resultValue;
        document.body.appendChild(flyEl);

        // 2. Calcular coordenadas del destino
        const targetRect = holder.getBoundingClientRect();
        const targetX = targetRect.left + (targetRect.width / 2) - (window.innerWidth / 2);
        const targetY = targetRect.top + (targetRect.height / 2) - (window.innerHeight / 2);

        flyEl.style.setProperty('--target-x', `${targetX}px`);
        flyEl.style.setProperty('--target-y', `${targetY}px`);

        // 3. Ejecutar animación
        setTimeout(() => {
            flyEl.classList.add('shrink');
        }, 100);

        // 4. Fijar resultado al terminar la animación
        setTimeout(() => {
            holder.innerText = resultValue;
            holder.style.background = '#2ecc71';
            holder.style.color = 'white';
            if (flyEl.parentNode) {
                flyEl.parentNode.removeChild(flyEl);
            }
        }, 600);

        if (revealIndex === 10) {
            document.getElementById('btn-check-next').disabled = true;
        }
    }
}

function stopTableAudio() {
    fullResetState();
    const activeBtn = document.getElementById('btn-audio-single');
    if (activeBtn) activeBtn.classList.remove('playing');
}

async function toggleTableAudio() {
    if (isAudioReading) {
        stopTableAudio();
        return;
    }

    fullResetState();
    await new Promise(res => setTimeout(res, 80));

    isAudioReading = true;
    const activeBtn = document.getElementById('btn-audio-single');
    if (activeBtn) activeBtn.classList.add('playing');

    const num = selectedStudyTable;

    while (isAudioReading) {
        for (let i = 1; i <= 10; i++) {
            if (!isAudioReading) break;

            const textToSpeak = `${num} por ${i}... ${num * i}`;
            await speakFastPromise(textToSpeak);

            if (!isAudioReading) break;
        }

        if (!isAudioReading) break;
        await new Promise(res => setTimeout(res, 2000));
    }

    stopTableAudio();
}

function speakFastPromise(text) {
    return new Promise((resolve) => {
        if (!('speechSynthesis' in window) || !isAudioReading) {
            resolve();
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 1.30;

        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();

        window.speechSynthesis.speak(utterance);
    });
}

/* ==========================================
   2. CONFIGURACIÓN MODO REPASO
   ========================================== */
function initGameSetupSection() {
    const container = document.getElementById('tables-selection');
    container.innerHTML = '';

    for (let i = 1; i <= 10; i++) {
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
   3. MODO REPASO / JUEGO
   ========================================== */
function startGame() {
    if (selectedPracticeTables.length === 0) {
        alert('Selecciona al menos 1 tabla para repasar.');
        return;
    }

    difficultyTime = parseInt(document.querySelector('input[name="difficulty"]:checked').value);
    isAutoNextEnabled = document.getElementById('auto-next-check').checked;
    const playOrder = document.querySelector('input[name="play-order"]:checked').value;
    
    currentDeck = [];
    selectedPracticeTables.sort((a,b) => a - b);

    selectedPracticeTables.forEach(table => {
        for (let i = 1; i <= 10; i++) {
            currentDeck.push({ table, num1: table, num2: i, answer: table * i });
        }
    });

    if (playOrder === 'random') {
        currentDeck.sort(() => Math.random() - 0.5);
    }

    currentCardIndex = 0;
    matchHistory = [];
    failedCards = [];

    switchSection('gameplay');
    loadCard();
}

function loadCard() {
    fullResetState();

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

    const isVoiceEnabled = document.getElementById('voice-read-check').checked;
    const isMicEnabled = document.getElementById('mic-listen-check').checked;

    const startTurn = () => {
        if (document.getElementById('section-gameplay').classList.contains('active')) {
            startTimer();
            if (isMicEnabled) {
                startMicListening();
            } else {
                document.getElementById('mic-status').innerText = '⌨️ Usar teclado';
            }
        }
    };

    if (isVoiceEnabled) {
        speakText(`${cardData.num1} por ${cardData.num2}`, startTurn);
    } else {
        startTurn();
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timeLeft = difficultyTime;
    document.getElementById('timer-display').innerText = timeLeft;

    timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft > 0) {
            document.getElementById('timer-display').innerText = timeLeft;
        } else {
            clearInterval(timerInterval);
            timerInterval = null;
            enterGracePeriod();
        }
    }, 1000);
}

function enterGracePeriod() {
    isGracePeriod = true;
    document.getElementById('timer-display').innerText = "0";

    const isMicEnabled = document.getElementById('mic-listen-check').checked;
    if (isMicEnabled && recognition) {
        document.getElementById('mic-status').innerText = '✍️ Transcribiendo...';
        try { recognition.stop(); } catch (e) {}
    }

    gracePeriodTimeout = setTimeout(() => {
        if (isGracePeriod) {
            isGracePeriod = false;
            submitAnswer(true);
        }
    }, 1500);
}

function pressKey(num) {
    if (timerInterval === null && !isGracePeriod) return;
    
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
    fullResetState();

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
   4. RECONOCIMIENTO DE VOZ ASÍNCRONO
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

function parseSpokenPhraseToNumber(phrase) {
    if (!phrase) return null;

    let text = phrase.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .trim();

    const explicitDigits = text.match(/\b\d+\b/g);
    if (explicitDigits) {
        let sum = 0;
        explicitDigits.forEach(d => sum += parseInt(d));
        return sum;
    }

    const words = text.split(/\s+/);
    for (const w of words) {
        if (SPANISH_ESPECIALES[w] !== undefined) {
            return SPANISH_ESPECIALES[w];
        }
    }

    let sumDecena = 0;
    let sumUnidad = 0;
    let foundNumber = false;

    for (const w of words) {
        if (SPANISH_DECENAS[w] !== undefined) {
            sumDecena = SPANISH_DECENAS[w];
            foundNumber = true;
        }
        if (SPANISH_UNIDADES[w] !== undefined) {
            sumUnidad = SPANISH_UNIDADES[w];
            foundNumber = true;
        }
    }

    if (foundNumber) {
        return sumDecena + sumUnidad;
    }

    return null;
}

function startMicListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        document.getElementById('mic-status').innerText = '🎙️ Usar teclado';
        return;
    }

    stopMicListening();

    recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
        if (timerInterval === null && !isGracePeriod) return;

        let accumulatedSpeech = '';
        for (let i = 0; i < event.results.length; i++) {
            accumulatedSpeech += ' ' + event.results[i][0].transcript;
        }

        const handleResultProcess = () => {
            const parsedNumber = parseSpokenPhraseToNumber(accumulatedSpeech);
            if (parsedNumber !== null) {
                document.getElementById('user-input').value = parsedNumber;
                document.getElementById('btn-submit').disabled = false;

                if (isGracePeriod) {
                    isGracePeriod = false;
                    submitAnswer(false);
                }
            }
        };

        if (isGracePeriod) {
            handleResultProcess();
        } else {
            if (speechDebounceTimer) clearTimeout(speechDebounceTimer);
            speechDebounceTimer = setTimeout(handleResultProcess, 500);
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

function stopMicListening() {
    if (recognition) {
        try { recognition.abort(); } catch (e) {}
        recognition = null;
    }
}

/* ==========================================
   5. EFECTOS DE SONIDO SINTÉTICOS
   ========================================== */
function playAudioFeedback(isCorrect) {
    if (!audioCtx) {
        const AudioClass = window.AudioContext || window.webkitAudioContext;
        if (AudioClass) audioCtx = new AudioClass();
    }

    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (isCorrect) {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.1);
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
        console.error("Error al reproducir audio:", e);
    }
}

/* ==========================================
   6. PANTALLA DE RESULTADOS
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
    
    currentCardIndex = 0;
    matchHistory = [];
    failedCards = [];

    switchSection('gameplay');
    loadCard();
}
