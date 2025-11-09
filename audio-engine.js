class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.7;
        this.masterGain.connect(this.audioContext.destination);

        this.initialized = true;
    }

    // Kick Drum - FM synthesis with feedback
    playKick(param = 5, distortion = 0) {
        if (!this.initialized) return;

        const now = this.audioContext.currentTime;
        const duration = 0.5;

        // FM synthesis parameters
        const baseFreq = 60;
        const modFreq = 80;
        const modIndex = 10 + (param * 2);
        const feedback = 0.5 + (distortion * 0.5);

        // Carrier oscillator
        const carrier = this.audioContext.createOscillator();
        carrier.type = 'sine';
        carrier.frequency.setValueAtTime(baseFreq, now);
        carrier.frequency.exponentialRampToValueAtTime(30, now + duration);

        // Modulator oscillator
        const modulator = this.audioContext.createOscillator();
        modulator.type = 'sine';
        modulator.frequency.setValueAtTime(modFreq, now);

        const modGain = this.audioContext.createGain();
        modGain.gain.setValueAtTime(modIndex * baseFreq * feedback, now);
        modGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.3);

        // Distortion
        let outputNode = modGain;
        if (distortion > 0.1) {
            const distortionNode = this.audioContext.createWaveShaper();
            distortionNode.curve = this.makeDistortionCurve(400 * distortion);
            modGain.connect(distortionNode);
            outputNode = distortionNode;
        }

        modulator.connect(modGain);
        outputNode.connect(carrier.frequency);

        // Envelope
        const envelope = this.audioContext.createGain();
        envelope.gain.setValueAtTime(1, now);
        envelope.gain.exponentialRampToValueAtTime(0.01, now + duration);

        carrier.connect(envelope);
        envelope.connect(this.masterGain);

        carrier.start(now);
        modulator.start(now);
        carrier.stop(now + duration);
        modulator.stop(now + duration);
    }

    // Snare Drum - Noisy FM synthesis
    playSnare(param = 5, feedback = 0) {
        if (!this.initialized) return;

        const now = this.audioContext.currentTime;
        const baseDuration = 0.15;
        const duration = baseDuration + (feedback * 0.45); // Max 0.6sec

        // Tonal component
        const tonal = this.audioContext.createOscillator();
        tonal.type = 'sine';
        tonal.frequency.setValueAtTime(200 + (param * 10), now);
        tonal.frequency.exponentialRampToValueAtTime(100, now + duration);

        // Noise component
        const noiseBuffer = this.createNoiseBuffer(duration);
        const noise = this.audioContext.createBufferSource();
        noise.buffer = noiseBuffer;

        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(2000 - (feedback * 500), now);

        noise.connect(noiseFilter);

        // FM modulation for feedback
        const modulator = this.audioContext.createOscillator();
        modulator.type = 'sine';
        modulator.frequency.setValueAtTime(100, now);

        const modGain = this.audioContext.createGain();
        const modAmount = 50 * (1 + feedback * 2);
        modGain.gain.setValueAtTime(modAmount, now);

        modulator.connect(modGain);
        modGain.connect(tonal.frequency);

        // Mix and envelope
        const mixer = this.audioContext.createGain();
        const envelope = this.audioContext.createGain();
        envelope.gain.setValueAtTime(0.8, now);
        envelope.gain.exponentialRampToValueAtTime(0.01, now + duration);

        tonal.connect(mixer);
        noiseFilter.connect(mixer);
        mixer.connect(envelope);
        envelope.connect(this.masterGain);

        tonal.start(now);
        noise.start(now);
        modulator.start(now);

        tonal.stop(now + duration);
        noise.stop(now + duration);
        modulator.stop(now + duration);
    }

    // Hi-hat - Filtered noise
    playHihat(param = 5, sustain = 0) {
        if (!this.initialized) return;

        const now = this.audioContext.currentTime;
        const baseDuration = 0.05;
        const duration = baseDuration + (sustain * 0.2);

        // Noise
        const noiseBuffer = this.createNoiseBuffer(duration);
        const noise = this.audioContext.createBufferSource();
        noise.buffer = noiseBuffer;

        // High-pass filter
        const highpass = this.audioContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.setValueAtTime(7000 + (param * 200), now);

        // Band-pass filter
        const bandpass = this.audioContext.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(10000, now);
        bandpass.Q.setValueAtTime(1, now);

        noise.connect(highpass);
        highpass.connect(bandpass);

        // Envelope
        const envelope = this.audioContext.createGain();
        envelope.gain.setValueAtTime(0.5, now);
        envelope.gain.exponentialRampToValueAtTime(0.01, now + duration);

        bandpass.connect(envelope);
        envelope.connect(this.masterGain);

        noise.start(now);
        noise.stop(now + duration);
    }

    // Tom - Pitched sine wave
    playTom(param = 5, pitchOffset = 0) {
        if (!this.initialized) return;

        const now = this.audioContext.currentTime;
        const duration = 0.4;

        // Pitch calculation (±7 semitones)
        const semitones = (pitchOffset - 0.5) * 14; // -7 to +7
        const pitchMultiplier = Math.pow(2, semitones / 12);
        const baseFreq = 150 + (param * 10);
        const freq = baseFreq * pitchMultiplier;

        // Oscillator
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + duration);

        // Envelope
        const envelope = this.audioContext.createGain();
        envelope.gain.setValueAtTime(0.7, now);
        envelope.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.connect(envelope);
        envelope.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration);
    }

    // Helper: Create noise buffer
    createNoiseBuffer(duration) {
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        return buffer;
    }

    // Helper: Distortion curve
    makeDistortionCurve(amount) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;

        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
        }

        return curve;
    }
}
