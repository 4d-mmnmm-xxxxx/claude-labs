// Initialize engines
const audioEngine = new AudioEngine();
const visualEngine = new VisualEngine('visualCanvas');
const sequencer = new Sequencer(audioEngine, visualEngine);

// Initialize UI
function initUI() {
    // Create step buttons and param inputs for each instrument
    const instruments = ['kick', 'snare', 'hihat', 'tom'];

    instruments.forEach(instrument => {
        const stepsContainer = document.getElementById(`${instrument}-steps`);
        const paramsContainer = document.getElementById(`${instrument}-params`);

        for (let i = 0; i < 16; i++) {
            // Create step button
            const step = document.createElement('div');
            step.className = 'step';
            step.dataset.step = i;
            step.addEventListener('click', () => {
                sequencer.toggleStep(instrument, i);
            });
            stepsContainer.appendChild(step);

            // Create param input
            const paramInput = document.createElement('input');
            paramInput.type = 'number';
            paramInput.className = 'param-input';
            paramInput.value = '5.0';
            paramInput.min = '0.0';
            paramInput.max = '10.0';
            paramInput.step = '0.1';
            paramInput.disabled = true;

            paramInput.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                    sequencer.setStepParam(instrument, i, value);
                }
            });

            // Enable param input when step is active
            step.addEventListener('click', () => {
                const isActive = sequencer.patterns[instrument][i].active;
                paramInput.disabled = !isActive;
            });

            paramsContainer.appendChild(paramInput);
        }
    });

    // Play/Stop button
    const playButton = document.getElementById('playButton');
    playButton.addEventListener('click', () => {
        if (sequencer.isPlaying) {
            sequencer.stop();
            playButton.textContent = 'PLAY';
            playButton.classList.remove('playing');
        } else {
            sequencer.start();
            playButton.textContent = 'STOP';
            playButton.classList.add('playing');
        }
    });

    // Faders
    const faders = document.querySelectorAll('.fader');
    faders.forEach(fader => {
        const valueDisplay = fader.nextElementSibling;
        fader.addEventListener('input', (e) => {
            if (valueDisplay) {
                valueDisplay.textContent = e.target.value;
            }
        });

        // Initialize display
        if (valueDisplay) {
            valueDisplay.textContent = fader.value;
        }
    });
}

// Keyboard controls
let uiHidden = false;

document.addEventListener('keydown', (e) => {
    switch (e.key.toLowerCase()) {
        case 'f':
            // Toggle flower mode
            visualEngine.setFlowerMode(!visualEngine.flowerMode);
            console.log('Flower mode:', visualEngine.flowerMode ? 'ON' : 'OFF');
            break;

        case 'r':
            // Reset parameters
            sequencer.reset();
            console.log('Parameters reset');
            break;

        case 'b':
            // Toggle UI visibility - hide everything for VJ mode
            uiHidden = !uiHidden;
            const sequencerElement = document.getElementById('sequencer');
            const controlsElement = document.getElementById('controls');

            if (uiHidden) {
                sequencerElement.classList.add('hidden');
                controlsElement.classList.add('hidden');
            } else {
                sequencerElement.classList.remove('hidden');
                controlsElement.classList.remove('hidden');
            }
            console.log('UI:', uiHidden ? 'HIDDEN' : 'VISIBLE');
            break;

        case ' ':
            // Space bar to play/stop
            e.preventDefault();
            document.getElementById('playButton').click();
            break;
    }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
} else {
    initUI();
}

// Show welcome message
console.log('%c🎵 Audiovisual Sequencer 🎨', 'font-size: 20px; font-weight: bold;');
console.log('Controls:');
console.log('  Click steps to activate/deactivate');
console.log('  F: Toggle flower mode for Tom');
console.log('  R: Reset parameters');
console.log('  B: Hide/Show UI');
console.log('  Space: Play/Stop');
console.log('\nEnjoy creating! ✨');
