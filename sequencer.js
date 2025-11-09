class Sequencer {
    constructor(audioEngine, visualEngine) {
        this.audioEngine = audioEngine;
        this.visualEngine = visualEngine;
        this.bpm = 123;
        this.steps = 16;
        this.currentStep = 0;
        this.isPlaying = false;
        this.intervalId = null;

        // Pattern data: { step: boolean, param: number, velocity: number (0.2-1.0) }
        this.patterns = {
            kick: Array(16).fill(null).map(() => ({ active: false, param: 5, velocity: 1.0 })),
            snare: Array(16).fill(null).map(() => ({ active: false, param: 5, velocity: 1.0 })),
            hihat: Array(16).fill(null).map(() => ({ active: false, param: 5, velocity: 1.0 })),
            tom: Array(16).fill(null).map(() => ({ active: false, param: 5, velocity: 1.0 }))
        };

        // Track consecutive hi-hat hits
        this.lastHihatStep = -2;
    }

    start() {
        if (this.isPlaying) return;

        this.audioEngine.init();
        this.isPlaying = true;
        this.currentStep = 0;

        this.scheduleTick();
    }

    stop() {
        if (!this.isPlaying) return;

        this.isPlaying = false;
        if (this.intervalId) {
            clearTimeout(this.intervalId);
            this.intervalId = null;
        }
        this.clearPlayingSteps();
    }

    scheduleTick() {
        if (!this.isPlaying) return;

        const bpm = this.getBPM();
        const stepDuration = (60 / bpm) * 1000 / 4; // 16th notes

        this.intervalId = setTimeout(() => {
            this.tick();
            this.scheduleTick();
        }, stepDuration);
    }

    getBPM() {
        const bpmInput = document.getElementById('bpmInput');
        return bpmInput ? parseInt(bpmInput.value) || 123 : 123;
    }

    tick() {
        this.clearPlayingSteps();

        // Play active patterns at current step
        Object.keys(this.patterns).forEach(instrument => {
            const pattern = this.patterns[instrument][this.currentStep];
            if (pattern.active) {
                this.playInstrument(instrument, pattern.param, pattern.velocity);
                this.highlightStep(instrument, this.currentStep);
            }
        });

        this.currentStep = (this.currentStep + 1) % this.steps;
    }

    playInstrument(instrument, param, velocity = 1.0) {
        const faders = this.getFaderValues();
        const volumes = this.getVolumeValues();

        // Apply velocity to volume
        const finalVolume = volumes[instrument] * velocity;

        switch (instrument) {
            case 'kick':
                this.audioEngine.playKick(param, faders.fader1, finalVolume);
                this.visualEngine.triggerKick(faders.fader1);
                break;

            case 'snare':
                this.audioEngine.playSnare(param, faders.fader2, finalVolume);
                this.visualEngine.triggerSnare(faders.fader2);
                break;

            case 'hihat':
                const consecutive = (this.currentStep === this.lastHihatStep + 1);
                this.audioEngine.playHihat(param, faders.fader3, finalVolume);
                this.visualEngine.triggerHihat(faders.fader3, consecutive);
                this.lastHihatStep = this.currentStep;
                break;

            case 'tom':
                this.audioEngine.playTom(param, faders.fader4, finalVolume);
                this.visualEngine.triggerTom(param, faders.fader4, faders.fader4);
                break;
        }
    }

    getFaderValues() {
        return {
            fader1: parseFloat(document.getElementById('fader1').value) / 100,
            fader2: parseFloat(document.getElementById('fader2').value) / 100,
            fader3: parseFloat(document.getElementById('fader3').value) / 100,
            fader4: parseFloat(document.getElementById('fader4').value) / 100
        };
    }

    getVolumeValues() {
        const getVolume = (instrument) => {
            const knob = document.querySelector(`.volume-knob[data-instrument="${instrument}"]`);
            return knob ? parseFloat(knob.value) / 100 : 0.7;
        };

        return {
            kick: getVolume('kick'),
            snare: getVolume('snare'),
            hihat: getVolume('hihat'),
            tom: getVolume('tom')
        };
    }

    toggleStep(instrument, step) {
        this.patterns[instrument][step].active = !this.patterns[instrument][step].active;
        this.updateStepUI(instrument, step);
    }

    setStepParam(instrument, step, value) {
        const clampedValue = Math.max(0, Math.min(10, value));
        this.patterns[instrument][step].param = clampedValue;
    }

    highlightStep(instrument, step) {
        const stepElement = document.querySelector(
            `[data-instrument="${instrument}"] .step[data-step="${step}"]`
        );
        if (stepElement) {
            stepElement.classList.add('playing');
        }
    }

    clearPlayingSteps() {
        document.querySelectorAll('.step.playing').forEach(el => {
            el.classList.remove('playing');
        });
    }

    updateStepUI(instrument, step) {
        const stepElement = document.querySelector(
            `[data-instrument="${instrument}"] .step[data-step="${step}"]`
        );
        if (stepElement) {
            const isActive = this.patterns[instrument][step].active;
            const velocity = this.patterns[instrument][step].velocity;

            stepElement.classList.toggle('active', isActive);

            if (isActive) {
                // Update visual size based on velocity
                const baseSize = 32;
                const size = baseSize * velocity;
                const sizeDiff = baseSize - size;
                const margin = sizeDiff / 2;

                stepElement.style.width = `${size}px`;
                stepElement.style.height = `${size}px`;
                stepElement.style.margin = `${margin}px`;

                // Update fill vs stroke based on velocity
                const velocityPercent = velocity * 100;
                if (velocityPercent >= 90) {
                    stepElement.style.background = '#fff';
                    stepElement.style.border = '2px solid #fff';
                } else {
                    stepElement.style.background = 'transparent';
                    stepElement.style.border = '2px solid #fff';
                }
            } else {
                // Reset to default size when inactive
                stepElement.style.width = '32px';
                stepElement.style.height = '32px';
                stepElement.style.margin = '0px';
                stepElement.style.background = '';
                stepElement.style.border = '';
            }
        }
    }

    reset() {
        // Reset all faders
        document.getElementById('fader1').value = 0;
        document.getElementById('fader2').value = 0;
        document.getElementById('fader3').value = 0;
        document.getElementById('fader4').value = 50;
        document.getElementById('fader5').value = 0;

        // Update value displays
        document.querySelectorAll('.fader').forEach((fader, index) => {
            const display = fader.nextElementSibling;
            if (display) {
                display.textContent = fader.value;
            }
        });

        // Clear all patterns
        this.clearPattern();
    }

    clearPattern() {
        Object.keys(this.patterns).forEach(instrument => {
            this.patterns[instrument].forEach((pattern, step) => {
                pattern.active = false;
                pattern.param = 5;
                pattern.velocity = 1.0;
                this.updateStepUI(instrument, step);
            });
        });

        // Clear param inputs
        document.querySelectorAll('.param-input').forEach(input => {
            input.value = '5.0';
            input.disabled = true;
        });
    }
}
