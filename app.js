// --- UTILIDADES DE CODIFICACIÓN BASE 36 ---
const BASE_36_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function numToBase36Char(num) {
    if (num < 0 || num >= BASE_36_CHARS.length) {
        throw new Error(`Número fuera de rango para base 36: ${num}`);
    }
    return BASE_36_CHARS[num];
}

function base36CharToNum(char) {
    const num = BASE_36_CHARS.indexOf(char.toUpperCase());
    if (num === -1) {
        throw new Error(`Carácter inválido para base 36: ${char}`);
    }
    return num;
}

// --- LÓGICA DE CODIFICACIÓN / DECODIFICACIÓN (del script anterior) ---

/**
 * Genera los dos primeros caracteres del código del juego.
 * @param {object} options
 * @param {number} options.numPlayers - Cantidad de jugadores (1-8).
 * @param {number} options.endMinute - Minuto de finalización del juego (0-59).
 * @returns {string[]} Un array con los dos caracteres generados.
 */
function generateGameCodePrefix({ numPlayers, endMinute }) {
    if (numPlayers < 1 || numPlayers > 8) {
        throw new Error("La cantidad de jugadores debe estar entre 1 y 8.");
    }
    if (endMinute < 0 || endMinute > 59) {
        throw new Error("El minuto de finalización debe estar entre 0 y 59.");
    }

    let firstCharValue = 0;
    firstCharValue |= (numPlayers - 1);
    const isSecondHalf = endMinute >= 30;
    if (isSecondHalf) {
        firstCharValue |= (1 << 3);
    }
    const firstChar = numToBase36Char(firstCharValue);

    let secondCharValue = endMinute % 30;
    const secondChar = numToBase36Char(secondCharValue);

    return [firstChar, secondChar];
}

/**
 * Decodifica los dos primeros caracteres del código del juego.
 * @param {string} codePrefix - Los dos primeros caracteres del código (ej. "G7").
 * @returns {object} Un objeto con { numPlayers, endMinute, isSecondHalf }
 */
function decodeGameCodePrefix(codePrefix) {
    if (typeof codePrefix !== 'string' || codePrefix.length !== 2) {
        throw new Error("El prefijo del código debe ser una cadena de 2 caracteres.");
    }

    const firstChar = codePrefix[0];
    const secondChar = codePrefix[1];

    const firstCharValue = base36CharToNum(firstChar);
    const decodedNumPlayers = (firstCharValue & 0b00000111) + 1;
    const decodedIsSecondHalf = (firstCharValue & 0b00001000) !== 0;

    const decodedEndMinuteRelative = base36CharToNum(secondChar);
    const actualEndMinute = decodedEndMinuteRelative + (decodedIsSecondHalf ? 30 : 0);

    return {
        numPlayers: decodedNumPlayers,
        endMinute: actualEndMinute,
        isSecondHalf: decodedIsSecondHalf
    };
}


// --- INTERACCIÓN CON LA UI ---
document.addEventListener('DOMContentLoaded', () => {
    // Elementos de la UI
    const numPlayersInput = document.getElementById('num-players');
    const gameDurationInput = document.getElementById('game-duration');
    const generateCodeBtn = document.getElementById('generate-code-btn');
    const generatedCodeDisplay = document.getElementById('generated-code-display');
    const generatedCodeSpan = document.getElementById('generated-code');
    const copyCodeBtn = document.getElementById('copy-code-btn');

    const roomCodeInput = document.getElementById('room-code-input');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const joinedGameInfo = document.getElementById('joined-game-info');
    const infoPlayersSpan = document.getElementById('info-players');
    const infoTimeLeftSpan = document.getElementById('info-time-left');

    // Manejar generación de código
    generateCodeBtn.addEventListener('click', () => {
        try {
            const numPlayers = parseInt(numPlayersInput.value);
            const gameDuration = parseInt(gameDurationInput.value);

            // Calcular el minuto de finalización
            const now = new Date();
            const currentMinute = now.getMinutes();
            const endMinute = (currentMinute + gameDuration) % 60;

            const [char1, char2] = generateGameCodePrefix({ numPlayers, endMinute });

            // TODO: Aquí integraríamos la lógica para las dos últimas letras de desafíos
            // Por ahora, usamos 'AA' como placeholder
            const fullCode = char1 + char2 + 'AA';

            generatedCodeSpan.textContent = fullCode;
            generatedCodeDisplay.style.display = 'block'; // Mostrar el display del código
        } catch (error) {
            alert("Error al generar código: " + error.message);
            console.error(error);
        }
    });

    // Manejar copia de código
    copyCodeBtn.addEventListener('click', () => {
        const codeToCopy = generatedCodeSpan.textContent;
        navigator.clipboard.writeText(codeToCopy)
            .then(() => {
                alert("Código copiado al portapapeles: " + codeToCopy);
            })
            .catch(err => {
                console.error('Error al copiar el código: ', err);
                alert("No se pudo copiar el código. Por favor, cópialo manualmente: " + codeToCopy);
            });
    });

    // Manejar unirse a sala
    joinRoomBtn.addEventListener('click', () => {
        try {
            const roomCode = roomCodeInput.value.toUpperCase(); // Convertir a mayúsculas para consistencia
            if (roomCode.length !== 4) { // Asegurarse de que el código sea de 4 caracteres
                throw new Error("El código de sala debe tener 4 caracteres.");
            }

            const prefix = roomCode.substring(0, 2); // Tomar los dos primeros caracteres
            const decodedInfo = decodeGameCodePrefix(prefix);

            infoPlayersSpan.textContent = decodedInfo.numPlayers;

            // Calcular el tiempo restante para el jugador que se une
            const now = new Date();
            const currentMinute = now.getMinutes();
            let timeLeftMinutes = decodedInfo.endMinute - currentMinute;

            // Ajuste si el minuto de finalización ya pasó en la misma hora,
            // o si el juego termina en la siguiente hora (ej. de 55 a 05)
            if (timeLeftMinutes < 0) {
                timeLeftMinutes += 60; // Asume que termina en la próxima hora dentro del mismo día
            }

            infoTimeLeftSpan.textContent = `${timeLeftMinutes} minutos`;
            joinedGameInfo.style.display = 'block'; // Mostrar la info de la sala

            // TODO: Aquí iría la lógica para procesar los dos últimos caracteres
            // para los desafíos
            const challengeCode = roomCode.substring(2, 4);
            console.log("Código de desafíos (para procesar):", challengeCode);

        } catch (error) {
            alert("Error al unirse a la sala: " + error.message);
            console.error(error);
        }
    });
});