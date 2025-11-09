// Initialize engines
const audioEngine = new AudioEngine();
const visualEngine = new VisualEngine('visualCanvas');
const sequencer = new Sequencer(audioEngine, visualEngine);

// Update step visuals based on velocity
function updateStepVisuals(stepElement, instrument, stepIndex) {
    const pattern = sequencer.patterns[instrument][stepIndex];
    const velocity = pattern.velocity;

    // Size: 20% to 100% (0.2 to 1.0)
    const baseSize = 32;
    const size = baseSize * velocity;
    const sizeDiff = baseSize - size;
    const margin = sizeDiff / 2;

    stepElement.style.width = `${size}px`;
    stepElement.style.height = `${size}px`;
    stepElement.style.margin = `${margin}px`;

    // Fill vs stroke: 89% and below = stroke only, 90-100% = fill
    const velocityPercent = velocity * 100;
    if (velocityPercent >= 90) {
        stepElement.style.background = '#fff';
        stepElement.style.border = '2px solid #fff';
    } else {
        stepElement.style.background = 'transparent';
        stepElement.style.border = '2px solid #fff';
    }
}

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
            step.dataset.instrument = instrument;

            // Click to toggle, drag to adjust velocity
            let isDragging = false;
            let hasDragged = false;
            let startY = 0;
            let startVelocity = 1.0;

            step.addEventListener('mousedown', (e) => {
                isDragging = true;
                hasDragged = false;
                startY = e.clientY;
                if (sequencer.patterns[instrument][i].active) {
                    startVelocity = sequencer.patterns[instrument][i].velocity;
                    e.preventDefault();
                }
            });

            document.addEventListener('mousemove', (e) => {
                if (isDragging && sequencer.patterns[instrument][i].active) {
                    const deltaY = Math.abs(startY - e.clientY);

                    // Only start dragging if moved more than 5 pixels
                    if (deltaY > 5) {
                        hasDragged = true;
                        const velocityDelta = (startY - e.clientY) / 100; // Upward = increase
                        let newVelocity = startVelocity + velocityDelta;
                        newVelocity = Math.max(0.2, Math.min(1.0, newVelocity));

                        sequencer.patterns[instrument][i].velocity = newVelocity;
                        updateStepVisuals(step, instrument, i);
                    }
                }
            });

            document.addEventListener('mouseup', () => {
                isDragging = false;
            });

            // Click to toggle (only if not dragged)
            step.addEventListener('click', (e) => {
                if (!hasDragged) {
                    sequencer.toggleStep(instrument, i);
                    updateStepVisuals(step, instrument, i);
                }
                hasDragged = false;
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

    // BPM controls
    const bpmFader = document.getElementById('bpmFader');
    const bpmInput = document.getElementById('bpmInput');

    if (bpmFader && bpmInput) {
        bpmFader.addEventListener('input', (e) => {
            bpmInput.value = e.target.value;
        });

        bpmInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (value >= 60 && value <= 180) {
                bpmFader.value = value;
            }
        });
    }
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
