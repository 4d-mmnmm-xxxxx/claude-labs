class Sequencer {
    constructor(audioEngine, visualEngine) {
        this.audioEngine = audioEngine;
        this.visualEngine = visualEngine;
        this.bpm = 123;
        this.steps = 16;
        this.currentStep = 0;
        this.isPlaying = false;
        this.intervalId = null;

        // Pattern data: { step: boolean, param: number }
        this.patterns = {
            kick: Array(16).fill(null).map(() => ({ active: false, param: 5 })),
            snare: Array(16).fill(null).map(() => ({ active: false, param: 5 })),
            hihat: Array(16).fill(null).map(() => ({ active: false, param: 5 })),
            tom: Array(16).fill(null).map(() => ({ active: false, param: 5 }))
        };

        // Track consecutive hi-hat hits
        this.lastHihatStep = -2;
    }

    start() {
        if (this.isPlaying) return;

        this.audioEngine.init();
        this.isPlaying = true;
        this.currentStep = 0;

        const stepDuration = (60 / this.bpm) * 1000 / 4; // 16th notes
        this.intervalId = setInterval(() => this.tick(), stepDuration);
    }

    stop() {
        if (!this.isPlaying) return;

        this.isPlaying = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.clearPlayingSteps();
    }

    tick() {
        this.clearPlayingSteps();

        // Play active patterns at current step
        Object.keys(this.patterns).forEach(instrument => {
            const pattern = this.patterns[instrument][this.currentStep];
            if (pattern.active) {
                this.playInstrument(instrument, pattern.param);
                this.highlightStep(instrument, this.currentStep);
            }
        });

        this.currentStep = (this.currentStep + 1) % this.steps;
    }

    playInstrument(instrument, param) {
        const faders = this.getFaderValues();
        const volumes = this.getVolumeValues();

        switch (instrument) {
            case 'kick':
                this.audioEngine.playKick(param, faders.fader1, volumes.kick);
                this.visualEngine.triggerKick(faders.fader1);
                break;

            case 'snare':
                this.audioEngine.playSnare(param, faders.fader2, volumes.snare);
                this.visualEngine.triggerSnare(faders.fader2);
                break;

            case 'hihat':
                const consecutive = (this.currentStep === this.lastHihatStep + 1);
                this.audioEngine.playHihat(param, faders.fader3, volumes.hihat);
                this.visualEngine.triggerHihat(faders.fader3, consecutive);
                this.lastHihatStep = this.currentStep;
                break;

            case 'tom':
                this.audioEngine.playTom(param, faders.fader4, volumes.tom);
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
            stepElement.classList.toggle('active', isActive);
        }
    }

    reset() {
        // Reset all faders
        document.getElementById('fader1').value = 0;
        document.getElementById('fader2').value = 0;
        document.getElementById('fader3').value = 0;
        document.getElementById('fader4').value = 50;

        // Update value displays
        document.querySelectorAll('.fader').forEach((fader, index) => {
            const display = fader.nextElementSibling;
            if (display) {
                display.textContent = fader.value;
            }
        });

        // Keep patterns intact
    }

    clearPattern() {
        Object.keys(this.patterns).forEach(instrument => {
            this.patterns[instrument].forEach((pattern, step) => {
                pattern.active = false;
                pattern.param = 5;
                this.updateStepUI(instrument, step);
            });
        });

        // Clear param inputs
        document.querySelectorAll('.param-input').forEach(input => {
            input.value = '5.0';
        });
    }
}
