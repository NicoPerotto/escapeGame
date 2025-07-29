// --- UTILIDADES DE CODIFICACIÓN BASE 36 ---
const BASE_36_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CODE_LENGTH = 6;

function numToBase36(num, length = 0) {
    if (num < 0) {
        throw new Error("Número no puede ser negativo para la conversión a base 36.");
    }
    let base36Str = '';
    if (num === 0) {
        base36Str = BASE_36_CHARS[0];
    } else {
        while (num > 0) {
            base36Str = BASE_36_CHARS[num % 36] + base36Str;
            num = Math.floor(num / 36);
        }
    }
    while (base36Str.length < length) {
        base36Str = BASE_36_CHARS[0] + base36Str;
    }
    return base36Str;
}

function base36ToNum(str) {
    let num = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str[i].toUpperCase();
        const value = BASE_36_CHARS.indexOf(char);
        if (value === -1) {
            throw new Error(`Carácter inválido en base 36: ${char}`);
        }
        num = num * 36 + value;
    }
    return num;
}

// --- LÓGICA DE CODIFICACIÓN / DECODIFICACIÓN UNIFICADA ---
const BIT_PLAYER_COUNT_START = 0;
const BIT_PLAYER_COUNT_LENGTH = 3;

const BIT_END_MINUTE_START = BIT_PLAYER_COUNT_START + BIT_PLAYER_COUNT_LENGTH;
const BIT_END_MINUTE_LENGTH = 6;

const BIT_PUZZLE_MASK_START = BIT_END_MINUTE_START + BIT_END_MINUTE_LENGTH;
const BIT_PUZZLE_MASK_LENGTH = 8;

const BIT_SOLUTION_MASK_START = BIT_PUZZLE_MASK_START + BIT_PUZZLE_MASK_LENGTH;
const BIT_SOLUTION_MASK_LENGTH = 8;

const BIT_CURRENT_PLAYER_ID_START = BIT_SOLUTION_MASK_START + BIT_SOLUTION_MASK_LENGTH;
const BIT_CURRENT_PLAYER_ID_LENGTH = 3;

const BIT_CONTROL_NUMBER_START = BIT_CURRENT_PLAYER_ID_START + BIT_CURRENT_PLAYER_ID_LENGTH;
const BIT_CONTROL_NUMBER_LENGTH = 2;

const TOTAL_USED_BITS = BIT_CONTROL_NUMBER_START + BIT_CONTROL_NUMBER_LENGTH;

const MAX_CODE_VALUE = Math.pow(36, CODE_LENGTH) - 1;

function encodeGameCode({ numPlayers, endMinute, puzzleMask, solutionMask, currentPlayerId, controlNumber }) {
    if (numPlayers < 2 || numPlayers > 8) throw new Error("Número de jugadores debe ser entre 2 y 8.");
    if (endMinute < 0 || endMinute > 59) throw new Error("Minuto de finalización debe ser entre 0 y 59.");
    if (puzzleMask < 0 || puzzleMask > 255) throw new Error("Máscara de puzzles debe ser entre 0 y 255.");
    if (solutionMask < 0 || solutionMask > 255) throw new Error("Máscara de soluciones debe ser entre 0 y 255.");
    if (currentPlayerId < 0 || currentPlayerId > 7) throw new Error("ID de jugador actual debe ser entre 0 y 7.");
    if (controlNumber < 0 || controlNumber > 3) throw new Error("Número de control debe ser entre 0 y 3.");

    let combinedValue = 0;
    combinedValue |= ((numPlayers - 2) << BIT_PLAYER_COUNT_START);
    combinedValue |= (endMinute << BIT_END_MINUTE_START);
    combinedValue |= (puzzleMask << BIT_PUZZLE_MASK_START);
    combinedValue |= (solutionMask << BIT_SOLUTION_MASK_START);
    combinedValue |= (currentPlayerId << BIT_CURRENT_PLAYER_ID_START);
    combinedValue |= (controlNumber << BIT_CONTROL_NUMBER_START);

    if (combinedValue > MAX_CODE_VALUE) {
        console.warn(`Valor combinado (${combinedValue}) excede la capacidad de ${CODE_LENGTH} caracteres en base 36 (${MAX_CODE_VALUE}). Posible pérdida de datos.`);
        throw new Error("El valor combinado excede la capacidad del código. Revisar la asignación de bits o aumentar CODE_LENGTH.");
    }
    return numToBase36(combinedValue, CODE_LENGTH);
}

function decodeGameCode(code) {
    if (typeof code !== 'string' || code.length !== CODE_LENGTH) {
        throw new Error(`El código debe ser una cadena de ${CODE_LENGTH} caracteres.`);
    }

    const combinedValue = base36ToNum(code);
    const decodedNumPlayers = ((combinedValue >> BIT_PLAYER_COUNT_START) & ((1 << BIT_PLAYER_COUNT_LENGTH) - 1)) + 2;
    const decodedEndMinute = (combinedValue >> BIT_END_MINUTE_START) & ((1 << BIT_END_MINUTE_LENGTH) - 1);
    const decodedPuzzleMask = (combinedValue >> BIT_PUZZLE_MASK_START) & ((1 << BIT_PUZZLE_MASK_LENGTH) - 1);
    const decodedSolutionMask = (combinedValue >> BIT_SOLUTION_MASK_START) & ((1 << BIT_SOLUTION_MASK_LENGTH) - 1);
    const decodedCurrentPlayerId = (combinedValue >> BIT_CURRENT_PLAYER_ID_START) & ((1 << BIT_CURRENT_PLAYER_ID_LENGTH) - 1);
    const decodedControlNumber = (combinedValue >> BIT_CONTROL_NUMBER_START) & ((1 << BIT_CONTROL_NUMBER_LENGTH) - 1);

    return {
        numPlayers: decodedNumPlayers,
        endMinute: decodedEndMinute,
        puzzleMask: decodedPuzzleMask,
        solutionMask: decodedSolutionMask,
        currentPlayerId: decodedCurrentPlayerId,
        controlNumber: decodedControlNumber
    };
}


// --- LÓGICA DE JUEGO Y UI ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos de UI - Pantallas Principales ---
    const startScreen = document.getElementById('start-screen');
    const creatorSection = document.getElementById('creator-section');
    const dynamicPlayerSectionContainer = document.getElementById('dynamic-player-section-container');
    const creatorFinalCheckSection = document.getElementById('creator-final-check');
    const playerSectionTemplate = document.getElementById('player-section-template');

    // --- Variables de Estado del Juego Globales ---
    let originalGameConfig = null; // Configuración inicial del creador para validación
    let currentGameData = null; // { numPlayers, endMinute, puzzleMask, solutionMask, controlNumber }
    let currentPlayerTurnId = 0; // ID interno del jugador que está procesando el código (0=creador, 1=jugador2...)
    let totalPlayers = 0; // Cantidad total de jugadores (2-8)

    // --- Funciones para mostrar/ocultar secciones ---
    function showSection(section) {
        document.querySelectorAll('.game-section').forEach(sec => sec.style.display = 'none');
        section.style.display = 'block';
    }

    function resetGame() {
        originalGameConfig = null;
        currentGameData = null;
        currentPlayerTurnId = 0;
        totalPlayers = 0;
        dynamicPlayerSectionContainer.innerHTML = ''; // Limpia las secciones de jugadores dinámicas
        creatorFinalCheckSection.style.display = 'none'; // Oculta la validación final
        document.getElementById('creator-generated-code-display').style.display = 'none'; // Oculta el código del creador
        // Resetear inputs del creador
        document.getElementById('creator-num-players').value = 4;
        document.getElementById('creator-game-duration').value = 15;
        // Limpiar displays de puzzles/soluciones del creador
        document.getElementById('creator-puzzle-display').innerHTML = '';
        document.getElementById('creator-solution-display').innerHTML = '';

        // Resetear inputs de validación final
        document.getElementById('final-room-code-input').value = '';
        document.getElementById('final-control-number-input').value = '';
        document.getElementById('final-validation-info').style.display = 'none';

        showSection(startScreen); // Volver a la pantalla de inicio
    }

    // --- Manejo de la pantalla de inicio ---
    document.getElementById('creator-mode-btn').addEventListener('click', () => {
        showSection(creatorSection);
        // Generar puzzles/soluciones iniciales del creador al entrar a esta sección
        generateCreatorInitialPuzzlesSolutions();
    });
    document.getElementById('player-mode-btn').addEventListener('click', () => {
        // En este flujo de prueba, un jugador siempre es el "siguiente" en la secuencia.
        // Por lo tanto, si un usuario elige "Unirse a Sala", asumimos que está esperando un código.
        // Para simplificar esta demo, mostraremos directamente la plantilla del jugador 2.
        // En una app real, aquí habría un input para pegar el código y unirse.
        dynamicPlayerSectionContainer.innerHTML = ''; // Limpiar cualquier sección anterior
        currentPlayerTurnId = 1; // Para esta demo, el que elige "Unirse" es el JUGADOR 2 (ID 1)
        createPlayerSection(currentPlayerTurnId, ''); // Se creará la sección vacía, a la espera del código

        // Ocultamos la sección del creador para que no haya ambigüedad,
        // aunque un jugador "real" no vería la sección del creador.
        document.getElementById('creator-section').style.display = 'none';
        showSection(dynamicPlayerSectionContainer);

        alert("Modo Jugador: Por favor, espera que el creador de la sala genere el código y pégalo en el campo 'Código de Sala Recibido'. No olvides el Número de Control que te diga el creador.");
    });

    // Botones de "Volver"
    document.querySelectorAll('.back-to-start-btn').forEach(button => {
        button.addEventListener('click', resetGame);
    });

    // --- Funciones de Utilidad para Puzzles/Soluciones ---
    function getBitsFromMask(mask) {
        const bits = [];
        for (let i = 0; i < 8; i++) {
            if ((mask >> i) & 1) {
                bits.push(i); // Almacena el índice (0-7)
            }
        }
        return bits; // Retorna un array de los índices de bits activos
    }

    function maskFromBits(bitsArray) {
        let mask = 0;
        bitsArray.forEach(bit => {
            if (bit >= 0 && bit < 8) {
                mask |= (1 << bit);
            }
        });
        return mask;
    }

    /**
     * Selecciona 'count' números aleatorios (índices 0-7) de 'availableIndices',
     * priorizando los no tomados.
     * @param {number} count - Cantidad de elementos a seleccionar.
     * @param {Array<number>} takenIndices - Array de índices que ya han sido tomados.
     * @returns {Array<number>} Array de índices seleccionados.
     */
    function selectRandomIndices(count, takenIndices) {
        const available = [];
        for (let i = 0; i < 8; i++) {
            if (!takenIndices.includes(i)) {
                available.push(i);
            }
        }

        const selected = new Set();
        // Intentar seleccionar de los no tomados primero
        while (selected.size < count && available.length > 0) {
            const randomIndex = Math.floor(Math.random() * available.length);
            selected.add(available[randomIndex]);
            available.splice(randomIndex, 1); // Remover para no repetir del mismo pool
        }

        // Si aún necesitamos más, tomar de los ya tomados (menos deseable, pero necesario)
        if (selected.size < count) {
            const allIndices = Array.from({ length: 8 }, (_, i) => i);
            const remainingNeeded = count - selected.size;
            const shuffledAll = allIndices.sort(() => 0.5 - Math.random());
            let addedFromTaken = 0;
            for (const index of shuffledAll) {
                if (!selected.has(index)) {
                    selected.add(index);
                    addedFromTaken++;
                    if (addedFromTaken >= remainingNeeded) break;
                }
            }
        }
        return Array.from(selected);
    }

    // --- Funciones para la Lógica de Puzzles y Soluciones del Creador ---
    const creatorPuzzleDisplay = document.getElementById('creator-puzzle-display');
    const creatorSolutionDisplay = document.getElementById('creator-solution-display');

    function displayFixedCheckboxes(container, type, indices) {
        container.innerHTML = '';
        indices.sort((a, b) => a - b).forEach(index => {
            const div = document.createElement('div');
            div.className = 'checkbox-item';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `display-${type}-${index}`;
            checkbox.checked = true; // Siempre marcados para visualización
            checkbox.disabled = true; // No editables
            const label = document.createElement('label');
            label.htmlFor = `display-${type}-${index}`;
            label.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} ${index + 1}`;
            div.appendChild(checkbox);
            div.appendChild(label);
            container.appendChild(div);
        });
    }

    function generateCreatorInitialPuzzlesSolutions() {
        // Inicializar con todos los puzzles/soluciones disponibles (0-7)
        const allIndices = Array.from({ length: 8 }, (_, i) => i);

        // Paso 1: Seleccionar 3 puzzles al azar
        const creatorPuzzleIndices = selectRandomIndices(3, []);
        let currentPuzzleMask = maskFromBits(creatorPuzzleIndices);

        // Paso 2: Seleccionar 3 soluciones al azar que NO sean las de los puzzles seleccionados
        const forbiddenSolutionIndices = new Set(creatorPuzzleIndices); // Soluciones que no deben coincidir
        const potentialSolutionIndices = allIndices.filter(i => !forbiddenSolutionIndices.has(i));

        let creatorSolutionIndices = [];
        // Intentar tomar 3 soluciones de las no prohibidas
        if (potentialSolutionIndices.length >= 3) {
            // Mezclamos y tomamos los primeros 3
            creatorSolutionIndices = potentialSolutionIndices.sort(() => 0.5 - Math.random()).slice(0, 3);
        } else {
            // Si no hay suficientes no prohibidas, tomamos todas las no prohibidas y luego
            // rellenamos con las prohibidas hasta completar 3.
            creatorSolutionIndices = potentialSolutionIndices;
            const remainingNeeded = 3 - creatorSolutionIndices.length;
            const forbiddenShuffled = Array.from(forbiddenSolutionIndices).sort(() => 0.5 - Math.random());
            for(let i = 0; i < remainingNeeded; i++) {
                if (forbiddenShuffled[i] !== undefined) {
                    creatorSolutionIndices.push(forbiddenShuffled[i]);
                }
            }
        }
        let currentSolutionMask = maskFromBits(creatorSolutionIndices);

        // Actualizar UI del creador
        displayFixedCheckboxes(creatorPuzzleDisplay, 'puzzle', creatorPuzzleIndices);
        displayFixedCheckboxes(creatorSolutionDisplay, 'solution', creatorSolutionIndices);

        // Guardar las máscaras iniciales del creador en el estado global
        // para que puedan ser usadas al generar el código inicial
        // y para la validación final
        // Esto NO es el `originalGameConfig` aún, que solo se crea al pulsar "Generar Código".
        currentGameData = {
            numPlayers: parseInt(document.getElementById('creator-num-players').value), // Valor temporal
            endMinute: 0, // Valor temporal
            puzzleMask: currentPuzzleMask,
            solutionMask: currentSolutionMask,
            controlNumber: 0 // Valor temporal
        };
    }

    // --- Lógica del Jugador Creador (Generar Código Inicial) ---
    document.getElementById('generate-initial-code-btn').addEventListener('click', () => {
        try {
            totalPlayers = parseInt(document.getElementById('creator-num-players').value);
            const gameDuration = parseInt(document.getElementById('creator-game-duration').value);

            if (totalPlayers < 2 || totalPlayers > 8) throw new Error("Número de jugadores debe ser entre 2 y 8.");

            const now = new Date();
            const currentMinute = now.getMinutes();
            const endMinute = (currentMinute + gameDuration) % 60;

            const creatorId = 0; // El creador es el Jugador 0
            const controlNumber = Math.floor(Math.random() * 4); // Generar número de control

            // Finalizar la configuración inicial del juego con los valores definitivos
            originalGameConfig = {
                numPlayers: totalPlayers,
                endMinute,
                controlNumber,
                initialPuzzleMask: currentGameData.puzzleMask, // Las máscaras ya están en currentGameData
                initialSolutionMask: currentGameData.solutionMask
            };

            // Actualizar currentGameData con los valores definitivos de tiempo y control
            currentGameData.numPlayers = totalPlayers;
            currentGameData.endMinute = endMinute;
            currentGameData.controlNumber = controlNumber;

            const initialCode = encodeGameCode({
                numPlayers: currentGameData.numPlayers,
                endMinute: currentGameData.endMinute,
                puzzleMask: currentGameData.puzzleMask,
                solutionMask: currentGameData.solutionMask,
                currentPlayerId: creatorId,
                controlNumber: currentGameData.controlNumber
            });

            document.getElementById('creator-generated-code').textContent = initialCode;
            document.getElementById('creator-control-number').textContent = currentGameData.controlNumber;
            document.getElementById('creator-generated-code-display').style.display = 'block';

            // El creador pasa el código al primer jugador real (ID 1)
            currentPlayerTurnId = 1;
            dynamicPlayerSectionContainer.innerHTML = ''; // Limpiar cualquier sección anterior
            createPlayerSection(currentPlayerTurnId, initialCode);

            creatorFinalCheckSection.style.display = 'none'; // Ocultar hasta que sea el turno de validar

            alert(`Código inicial generado para Jugador ${currentPlayerTurnId + 1}. El número de control para TODA la partida es: ${currentGameData.controlNumber}. Anótalo, no se pasa en el código.`);

            // Ocultar la sección del creador para dar paso al flujo del jugador
            creatorSection.style.display = 'none';
            showSection(dynamicPlayerSectionContainer); // Mostrar la sección del primer jugador

        } catch (error) {
            alert("Error al generar código: " + error.message);
            console.error(error);
        }
    });

    document.getElementById('copy-creator-code-btn').addEventListener('click', () => {
        const codeToCopy = document.getElementById('creator-generated-code').textContent;
        const controlNumToCopy = document.getElementById('creator-control-number').textContent;
        const fullShareableText = `${codeToCopy} (Control: ${controlNumToCopy})`;

        navigator.clipboard.writeText(fullShareableText)
            .then(() => alert("Código y número de control copiados al portapapeles."))
            .catch(err => {
                console.error('Error al copiar: ', err);
                alert("No se pudo copiar el código. Por favor, cópialo manualmente: " + fullShareableText);
            });
    });


    // --- Lógica para Crear y Manejar una Sección de Jugador Dinámica ---
    function createPlayerSection(playerId, receivedCode = '') {
        const clonedSection = playerSectionTemplate.content.cloneNode(true);
        const section = clonedSection.querySelector('section');

        // Asignar IDs y texto para esta sección de jugador
        section.dataset.playerId = playerId; // Para identificar la sección
        section.querySelector('.current-player-display-id').textContent = playerId + 1; // Para mostrar Jugador 2, Jugador 3, etc.
        section.querySelector('.player-actual-id').textContent = playerId; // ID real para el currentPlayerId del código

        const roomCodeInput = section.querySelector('.player-room-code-input');
        roomCodeInput.value = receivedCode;
        const controlNumberInput = section.querySelector('.player-control-number-input');
        controlNumberInput.value = ''; // Siempre pedirlo al jugador

        const accumulatedPuzzleMaskSpan = section.querySelector('.accumulated-puzzle-mask');
        const accumulatedSolutionMaskSpan = section.querySelector('.accumulated-solution-mask');

        const playerPuzzleCheckboxesContainer = section.querySelector('.player-puzzle-checkboxes');
        const playerSolutionCheckboxesContainer = section.querySelector('.player-solution-checkboxes');

        const generateNextCodeBtn = section.querySelector('.process-player-code-btn');
        const generatedCodeDisplay = section.querySelector('.code-display');
        const generatedPlayerCodeSpan = section.querySelector('.generated-player-code');
        const nextPlayerNumSpan = section.querySelector('.next-player-display-id');

        // Lógica para el botón "Procesar Código y Generar Siguiente"
        generateNextCodeBtn.addEventListener('click', () => {
            try {
                const code = roomCodeInput.value.toUpperCase();
                const controlNum = parseInt(controlNumberInput.value);

                if (code.length !== CODE_LENGTH) throw new Error(`El código de sala debe tener ${CODE_LENGTH} caracteres.`);
                if (isNaN(controlNum) || controlNum < 0 || controlNum > 3) throw new Error("Por favor, ingresa un número de control válido (0-3).");

                const decodedInfo = decodeGameCode(code);

                // **Validación crucial para el flujo:**
                // Los jugadores deben validar que los datos centrales no cambien.
                if (!originalGameConfig) {
                    throw new Error("El juego no ha sido iniciado por un creador. Vuelve a la pantalla de inicio.");
                }
                if (decodedInfo.numPlayers !== originalGameConfig.numPlayers ||
                    decodedInfo.endMinute !== originalGameConfig.endMinute ||
                    decodedInfo.controlNumber !== originalGameConfig.controlNumber) {
                    throw new Error("¡Error de integridad del código! Los datos originales (jugadores, minuto final, control) no coinciden. Revisa el código o el número de control.");
                }

                // Mostrar máscaras acumuladas decodificadas
                accumulatedPuzzleMaskSpan.textContent = decodedInfo.puzzleMask.toString(2).padStart(8, '0');
                accumulatedSolutionMaskSpan.textContent = decodedInfo.solutionMask.toString(2).padStart(8, '0');

                // --- Lógica de selección y compensación de puzzles/soluciones para este jugador ---
                let newPlayerPuzzles = [];
                let newPlayerSolutions = [];

                const currentPuzzlesTaken = getBitsFromMask(decodedInfo.puzzleMask);
                const currentSolutionsTaken = getBitsFromMask(decodedInfo.solutionMask);

                // Criterio del último jugador (si este es el último)
                if (playerId === totalPlayers - 1) { // El último jugador tiene ID (totalPlayers - 1)
                    const uniquePuzzlesWithoutSolutions = new Set();
                    for(const p of currentPuzzlesTaken) {
                        if (!currentSolutionsTaken.includes(p)) {
                            uniquePuzzlesWithoutSolutions.add(p);
                        }
                    }
                    const numUnmatchedPuzzles = uniquePuzzlesWithoutSolutions.size;

                    // Si hay más de 3 puzzles sin soluciones
                    if (numUnmatchedPuzzles > 3) {
                        newPlayerSolutions = Array.from(uniquePuzzlesWithoutSolutions);
                        alert(`Eres el último jugador. Se han tomado ${numUnmatchedPuzzles} puzzles sin sus soluciones correspondientes. Debes tomar todas las soluciones faltantes (${newPlayerSolutions.map(idx => idx + 1).join(', ')}).`);
                    }
                    // Si hay 3 o menos puzzles sin soluciones
                    else if (numUnmatchedPuzzles > 0) {
                        newPlayerSolutions = Array.from(uniquePuzzlesWithoutSolutions);
                        const remainingToPick = 3 - newPlayerSolutions.length;
                        if (remainingToPick > 0) {
                            // Seleccionar soluciones adicionales al azar de las ya tomadas para rellenar
                            const allIndices = Array.from({length: 8}, (_,i)=>i);
                            const alreadyChosen = new Set([...currentPuzzlesTaken, ...currentSolutionsTaken, ...newPlayerSolutions]);
                            const availableForRepeat = allIndices.filter(idx => !alreadyChosen.has(idx)); // No seleccionar las ya "elegidas" para compensar
                            const randomRepeats = selectRandomIndices(remainingToPick, [...currentSolutionsTaken, ...newPlayerSolutions]); // Priorizar no repetir si es posible
                            newPlayerSolutions = [...newPlayerSolutions, ...randomRepeats].slice(0, 3); // Asegurarse de no exceder 3 y combinar
                        }
                        alert(`Eres el último jugador. Hay ${numUnmatchedPuzzles} puzzles sin sus soluciones. Debes tomar las soluciones ${newPlayerSolutions.map(idx => idx + 1).join(', ')}. Se han añadido soluciones adicionales para compensar si es necesario.`);

                    } else {
                        // Todos los puzzles tienen solución, elige 3 al azar sin prohibiciones
                        newPlayerPuzzles = selectRandomIndices(3, currentPuzzlesTaken);
                        newPlayerSolutions = selectRandomIndices(3, [...currentSolutionsTaken, ...newPlayerPuzzles]); // No tomar soluciones que coincidan con los nuevos puzzles
                        alert(`Eres el último jugador y todos los puzzles tienen solución. Elige 3 puzzles y 3 soluciones al azar.`);
                    }

                    // Limpiar y generar checkboxes para este último jugador
                    createCheckboxes(playerPuzzleCheckboxesContainer, 'puzzle', 8, `player-${playerId}`, maskFromBits(newPlayerPuzzles));
                    createCheckboxes(playerSolutionCheckboxesContainer, 'solution', 8, `player-${playerId}`, maskFromBits(newPlayerSolutions));

                } else { // No es el último jugador
                    // Seleccionar 3 puzzles al azar que no hayan sido tomados
                    newPlayerPuzzles = selectRandomIndices(3, currentPuzzlesTaken);
                    // Seleccionar 3 soluciones al azar que no hayan sido tomadas
                    // Y que no coincidan con los puzzles que se acaban de tomar
                    newPlayerSolutions = selectRandomIndices(3, [...currentSolutionsTaken, ...newPlayerPuzzles]);

                    // Generar checkboxes para el jugador actual y mostrarlos marcados
                    createCheckboxes(playerPuzzleCheckboxesContainer, 'puzzle', 8, `player-${playerId}`, maskFromBits(newPlayerPuzzles));
                    createCheckboxes(playerSolutionCheckboxesContainer, 'solution', 8, `player-${playerId}`, maskFromBits(newPlayerSolutions));
                    alert(`Jugador ${playerId + 1}: Selecciona 3 puzzles y 3 soluciones al azar para agregar. (Las preseleccionadas son sugerencias)`);
                }


                const finalPuzzleMaskForCode = decodedInfo.puzzleMask | getCheckboxMask(playerPuzzleCheckboxesContainer);
                const finalSolutionMaskForCode = decodedInfo.solutionMask | getCheckboxMask(playerSolutionCheckboxesContainer);


                // Actualizar el estado global del juego con las máscaras combinadas
                currentGameData.puzzleMask = finalPuzzleMaskForCode;
                currentGameData.solutionMask = finalSolutionMaskForCode;

                // Generar el nuevo código
                const newCode = encodeGameCode({
                    numPlayers: currentGameData.numPlayers,
                    endMinute: currentGameData.endMinute,
                    puzzleMask: currentGameData.puzzleMask,
                    solutionMask: currentGameData.solutionMask,
                    currentPlayerId: playerId, // Este jugador es quien genera el código
                    controlNumber: currentGameData.controlNumber
                });

                generatedPlayerCodeSpan.textContent = newCode;
                generatedCodeDisplay.style.display = 'block';

                // Si no es el último jugador, avanzar al siguiente turno
                if (playerId < totalPlayers - 1) {
                    currentPlayerTurnId++;
                    dynamicPlayerSectionContainer.innerHTML = ''; // Limpiar la sección anterior
                    createPlayerSection(currentPlayerTurnId, newCode); // Crear la siguiente sección con el nuevo código
                    currentSection.style.display = 'none'; // Ocultar la sección actual
                } else {
                    // Es el último jugador, mostrar la sección de validación final al creador
                    creatorFinalCheckSection.style.display = 'block';
                    finalRoomCodeInput.value = newCode; // Precargar el código final
                    finalControlNumberInput.value = originalGameConfig.controlNumber; // Precargar el control original
                    originalInfoPlayersSpan.textContent = originalGameConfig.numPlayers;
                    originalInfoEndMinuteSpan.textContent = originalGameConfig.endMinute;

                    dynamicPlayerSectionContainer.innerHTML = ''; // Limpiar la sección del último jugador
                    alert(`¡Último Jugador! Código final: ${newCode}. Pásalo al Creador.`);
                }
            } catch (error) {
                alert(`Error al procesar el turno del Jugador ${playerId + 1}: ` + error.message);
                console.error(error);
            }
        });

        dynamicPlayerSectionContainer.appendChild(section);
        section.style.display = 'block'; // Asegurarse de que la nueva sección sea visible
    }


    // --- Lógica de Validación Final del Creador ---
    document.getElementById('validate-final-code-btn').addEventListener('click', () => {
        try {
            if (!originalGameConfig) {
                throw new Error("Primero debes generar un código inicial en la sección 'Crear Sala'.");
            }

            const finalCode = document.getElementById('final-room-code-input').value.toUpperCase();
            if (finalCode.length !== CODE_LENGTH) {
                throw new Error(`El código final debe tener ${CODE_LENGTH} caracteres.`);
            }

            const enteredControlNumber = parseInt(document.getElementById('final-control-number-input').value);
            if (isNaN(enteredControlNumber) || enteredControlNumber < 0 || enteredControlNumber > 3) {
                throw new Error("Por favor, ingresa un número de control válido (0-3).");
            }

            const decodedFinalInfo = decodeGameCode(finalCode);

            let validationMessages = [];
            let isValid = true;

            // Validaciones de integridad
            if (decodedFinalInfo.numPlayers !== originalGameConfig.numPlayers) {
                validationMessages.push("ERROR: Cantidad de jugadores alterada.");
                isValid = false;
            } else {
                validationMessages.push(`Jugadores: ${decodedFinalInfo.numPlayers} (OK)`);
            }

            if (decodedFinalInfo.endMinute !== originalGameConfig.endMinute) {
                validationMessages.push("ERROR: Minuto de finalización alterado.");
                isValid = false;
            } else {
                validationMessages.push(`Minuto Final: ${decodedFinalInfo.endMinute} (OK)`);
            }

            if (decodedFinalInfo.controlNumber !== originalGameConfig.controlNumber) {
                validationMessages.push(`ERROR: Número de control (${decodedFinalInfo.controlNumber}) no coincide con el original (${originalGameConfig.controlNumber}).`);
                isValid = false;
            } else {
                validationMessages.push(`Número de Control: ${decodedFinalInfo.controlNumber} (OK)`);
            }

            // Mostrar resultados
            const validationResultSpan = document.getElementById('validation-result');
            validationResultSpan.textContent = isValid ? "CÓDIGO VÁLIDO 🎉" : "CÓDIGO INVÁLIDO ❌";
            validationResultSpan.style.color = isValid ? 'green' : 'red';

            document.getElementById('final-info-players').textContent = `${decodedFinalInfo.numPlayers}`;
            document.getElementById('final-info-end-minute').textContent = `${decodedFinalInfo.endMinute}`;
            document.getElementById('final-info-puzzle-mask').textContent = decodedFinalInfo.puzzleMask.toString(2).padStart(8, '0');
            document.getElementById('final-info-solution-mask').textContent = decodedFinalInfo.solutionMask.toString(2).padStart(8, '0');
            document.getElementById('final-info-current-player-id').textContent = decodedFinalInfo.currentPlayerId;

            document.getElementById('final-validation-info').style.display = 'block';
            console.log("Resultados de validación:", validationMessages);
            alert("Validación Final:\n" + validationMessages.join("\n"));

            // Aquí es donde, en un juego real, se usarían las máscaras finales para iniciar el juego.
            // Por ejemplo: `startGame(decodedFinalInfo.puzzleMask, decodedFinalInfo.solutionMask);`

        } catch (error) {
            alert("Error al validar el código final: " + error.message);
            console.error(error);
        }
    });

    // Asegurarse de empezar en la pantalla de inicio
    resetGame();
});