class VisualEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.effects = [];
        this.kickPatternIndex = 0;
        this.kickSquarePosition = 0; // 0: top-left, 1: top-right, 2: bottom-right, 3: bottom-left
        this.hihatSineOffset = 0;
        this.flowerMode = false;
        this.globalBlur = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    animate() {
        // Get global blur value
        const blurFader = document.getElementById('fader5');
        this.globalBlur = blurFader ? parseFloat(blurFader.value) / 10 : 0; // 0 to 10

        // Clear with fade effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Update and render all effects
        this.effects = this.effects.filter(effect => {
            effect.update();
            effect.render(this.ctx, this.globalBlur);
            return !effect.isDead();
        });

        requestAnimationFrame(() => this.animate());
    }

    // Kick effect - 10% flash, 90% square
    triggerKick(distortion = 0) {
        const useFlash = Math.random() < 0.1; // 10% chance for flash

        if (useFlash) {
            // Pattern 1: Full screen flash
            this.effects.push(new FlashEffect(this.canvas.width, this.canvas.height, distortion));
        } else {
            // Pattern 2: Moving square (1.5x larger)
            const size = Math.min(this.canvas.width, this.canvas.height) * 0.345; // 0.23 * 1.5
            let x, y;

            if (this.kickSquarePosition === 0) {
                x = size / 2;
                y = size / 2;
            } else if (this.kickSquarePosition === 1) {
                x = this.canvas.width - size / 2;
                y = size / 2;
            } else if (this.kickSquarePosition === 2) {
                x = this.canvas.width - size / 2;
                y = this.canvas.height - size / 2;
            } else if (this.kickSquarePosition === 3) {
                x = size / 2;
                y = this.canvas.height - size / 2;
            } else {
                // Random (can overlap)
                x = Math.random() * this.canvas.width;
                y = Math.random() * this.canvas.height;
            }

            this.effects.push(new SquareEffect(x, y, size, distortion));

            // Update position
            if (this.kickSquarePosition < 3) {
                this.kickSquarePosition++;
            } else {
                this.kickSquarePosition = Math.floor(Math.random() * 10) + 4; // Random after sequence
            }
        }
    }

    // Snare effect - Ripple
    triggerSnare(feedback = 0) {
        // Position near sequencer (center of screen)
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const offsetX = (Math.random() - 0.5) * 200;
        const offsetY = (Math.random() - 0.5) * 200;

        this.effects.push(new RippleEffect(
            centerX + offsetX,
            centerY + offsetY,
            feedback
        ));
    }

    // Hi-hat effect - Falling lines
    triggerHihat(sustain = 0, consecutiveHit = false) {
        let x;
        if (consecutiveHit) {
            // Use sine wave for continuous position
            this.hihatSineOffset += 0.3;
            x = this.canvas.width / 2 + Math.sin(this.hihatSineOffset) * (this.canvas.width / 3);
        } else {
            x = Math.random() * this.canvas.width;
            this.hihatSineOffset = 0;
        }

        const thickness = 2 + (sustain * 38); // 2 to 40px
        this.effects.push(new FallingLineEffect(x, thickness));
    }

    // Tom effect - Pyramid or Flower
    triggerTom(param = 5, pitchOffset = 0.5, blur = 0) {
        const x = Math.random() * this.canvas.width;
        const y = Math.random() * this.canvas.height;

        // Size based on param (10-40% of screen)
        const baseSize = Math.min(this.canvas.width, this.canvas.height);
        const size = baseSize * (0.1 + (param / 10) * 0.3);

        if (this.flowerMode) {
            this.effects.push(new FlowerEffect(x, y, size, blur));
        } else {
            this.effects.push(new PyramidEffect(x, y, size, blur));
        }
    }

    setFlowerMode(enabled) {
        this.flowerMode = enabled;
    }
}

// Effect Classes

class FlashEffect {
    constructor(width, height, distortion) {
        this.width = width;
        this.height = height;
        this.alpha = 0.5;
        this.distortion = distortion;
        this.life = 0;
    }

    update() {
        this.life += 0.016; // ~60fps
        this.alpha = Math.max(0, 0.5 - (this.life / 0.2) * 0.5);
    }

    render(ctx, globalBlur = 0) {
        ctx.save();

        if (globalBlur > 0.1) {
            ctx.filter = `blur(${globalBlur}px)`;
        }

        if (this.distortion > 0.3) {
            // Glitch effect
            const strips = 10;
            const stripHeight = this.height / strips;
            for (let i = 0; i < strips; i++) {
                const offset = (Math.random() - 0.5) * 50 * this.distortion;
                ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
                ctx.fillRect(offset, i * stripHeight, this.width, stripHeight);
            }
        } else {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
            ctx.fillRect(0, 0, this.width, this.height);
        }

        ctx.restore();
    }

    isDead() {
        return this.alpha <= 0;
    }
}

class SquareEffect {
    constructor(x, y, size, distortion) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.distortion = distortion;
        this.alpha = 1;
        this.life = 0;
        this.filled = Math.random() < 0.3; // 30% chance for filled, 70% for stroke
    }

    update() {
        this.life += 0.016;
        this.alpha = Math.max(0, 1 - (this.life / 0.2));
    }

    render(ctx, globalBlur = 0) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.strokeStyle = '#fff';
        ctx.fillStyle = '#fff';
        ctx.lineWidth = 10;

        if (globalBlur > 0.1) {
            ctx.filter = `blur(${globalBlur}px)`;
        }

        if (this.distortion > 0.3) {
            // Glitch distortion
            const segments = 8;
            const segmentSize = this.size / segments;
            for (let i = 0; i < segments; i++) {
                for (let j = 0; j < segments; j++) {
                    const offsetX = (Math.random() - 0.5) * 20 * this.distortion;
                    const offsetY = (Math.random() - 0.5) * 20 * this.distortion;
                    const x = this.x - this.size / 2 + i * segmentSize + offsetX;
                    const y = this.y - this.size / 2 + j * segmentSize + offsetY;

                    if (this.filled) {
                        ctx.fillRect(x, y, segmentSize, segmentSize);
                    } else {
                        ctx.strokeRect(x, y, segmentSize, segmentSize);
                    }
                }
            }
        } else {
            const x = this.x - this.size / 2;
            const y = this.y - this.size / 2;

            if (this.filled) {
                ctx.fillRect(x, y, this.size, this.size);
            } else {
                ctx.strokeRect(x, y, this.size, this.size);
            }
        }

        ctx.restore();
    }

    isDead() {
        return this.alpha <= 0;
    }
}

class RippleEffect {
    constructor(x, y, feedback) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = 300 + feedback * 200;
        this.alpha = 0.8;
        this.feedback = feedback;
        this.jagged = feedback > 0.3;
    }

    update() {
        this.radius += 8;
        this.alpha = Math.max(0, 0.8 * (1 - this.radius / this.maxRadius));
    }

    render(ctx, globalBlur = 0) {
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.alpha})`;
        ctx.lineWidth = 3 + this.feedback * 2;

        if (globalBlur > 0.1) {
            ctx.filter = `blur(${globalBlur}px)`;
        }

        if (this.jagged) {
            // Jagged ripple
            ctx.beginPath();
            const points = 24;
            for (let i = 0; i <= points; i++) {
                const angle = (i / points) * Math.PI * 2;
                const r = this.radius + (Math.random() - 0.5) * 20 * this.feedback;
                const x = this.x + Math.cos(angle) * r;
                const y = this.y + Math.sin(angle) * r;
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.stroke();
        } else {
            // Smooth ripple
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    isDead() {
        return this.radius >= this.maxRadius;
    }
}

class FallingLineEffect {
    constructor(x, thickness) {
        this.x = x;
        this.y = 0;
        this.thickness = thickness;
        this.height = window.innerHeight;
        this.speed = 15;
        this.alpha = 1;
    }

    update() {
        this.y += this.speed;
        if (this.y > this.height * 0.5) {
            this.alpha = Math.max(0, 1 - (this.y - this.height * 0.5) / (this.height * 0.5));
        }
    }

    render(ctx, globalBlur = 0) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = this.thickness;

        if (globalBlur > 0.1) {
            ctx.filter = `blur(${globalBlur}px)`;
        }

        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + 50);
        ctx.stroke();
        ctx.restore();
    }

    isDead() {
        return this.y > this.height;
    }
}

class PyramidEffect {
    constructor(x, y, size, blur) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.blur = blur;
        this.rotationY = 0;
        this.rotationZ = 0;
        this.rotationSpeed = 0.005; // Much slower rotation
        this.alpha = 1;
        this.life = 0;
    }

    update() {
        this.life += 0.016;
        this.rotationY += this.rotationSpeed;
        this.rotationZ += this.rotationSpeed * 0.7;

        if (this.life > 2) {
            // Fade out over 0.4 seconds
            this.alpha = Math.max(0, 1 - (this.life - 2) / 0.4);
        }
    }

    // 3D rotation helper
    rotate3D(x, y, z, rotY, rotZ) {
        // Rotate around Y axis
        let cosY = Math.cos(rotY);
        let sinY = Math.sin(rotY);
        let x1 = x * cosY - z * sinY;
        let z1 = x * sinY + z * cosY;
        let y1 = y;

        // Rotate around Z axis
        let cosZ = Math.cos(rotZ);
        let sinZ = Math.sin(rotZ);
        let x2 = x1 * cosZ - y1 * sinZ;
        let y2 = x1 * sinZ + y1 * cosZ;
        let z2 = z1;

        // Simple perspective projection
        let perspective = 300 / (300 + z2);
        return {
            x: x2 * perspective,
            y: y2 * perspective
        };
    }

    render(ctx, globalBlur = 0) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = this.alpha;

        if (globalBlur > 0.1) {
            ctx.filter = `blur(${globalBlur}px)`;
        }

        if (this.blur > 0.3) {
            ctx.shadowBlur = 20 * this.blur;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        }

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;

        // Define 3D pyramid vertices
        const s = this.size / 2;
        const vertices = [
            { x: -s, y: s, z: -s },   // 0: base bottom-left
            { x: s, y: s, z: -s },    // 1: base bottom-right
            { x: s, y: s, z: s },     // 2: base top-right
            { x: -s, y: s, z: s },    // 3: base top-left
            { x: 0, y: -s * 1.2, z: 0 }  // 4: apex
        ];

        // Project vertices to 2D
        const projected = vertices.map(v => this.rotate3D(v.x, v.y, v.z, this.rotationY, this.rotationZ));

        // Draw pyramid edges (wireframe)
        ctx.beginPath();

        // Base edges
        ctx.moveTo(projected[0].x, projected[0].y);
        ctx.lineTo(projected[1].x, projected[1].y);
        ctx.lineTo(projected[2].x, projected[2].y);
        ctx.lineTo(projected[3].x, projected[3].y);
        ctx.lineTo(projected[0].x, projected[0].y);

        // Apex to corners
        ctx.moveTo(projected[4].x, projected[4].y);
        ctx.lineTo(projected[0].x, projected[0].y);
        ctx.moveTo(projected[4].x, projected[4].y);
        ctx.lineTo(projected[1].x, projected[1].y);
        ctx.moveTo(projected[4].x, projected[4].y);
        ctx.lineTo(projected[2].x, projected[2].y);
        ctx.moveTo(projected[4].x, projected[4].y);
        ctx.lineTo(projected[3].x, projected[3].y);

        ctx.stroke();

        ctx.restore();
    }

    isDead() {
        return this.alpha <= 0;
    }
}

class FlowerEffect {
    constructor(x, y, size, blur) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.blur = blur;
        this.rotation = 0;
        this.rotationSpeed = 0.01; // Slower rotation
        this.alpha = 1;
        this.life = 0;
    }

    update() {
        this.life += 0.016;
        this.rotation += this.rotationSpeed;

        if (this.life > 2) {
            this.alpha = Math.max(0, 1 - (this.life - 2) / 0.4);
        }
    }

    render(ctx, globalBlur = 0) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.alpha;

        if (globalBlur > 0.1) {
            ctx.filter = `blur(${globalBlur}px)`;
        }

        if (this.blur > 0.3) {
            ctx.shadowBlur = 20 * this.blur;
            ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        }

        ctx.strokeStyle = '#fff';
        // Line width: 0.5-5px based on blur parameter
        ctx.lineWidth = 0.5 + (this.blur * 4.5);

        // Draw 5-petal flower (stroke only)
        const petals = 5;
        const petalSize = this.size / 3;

        for (let i = 0; i < petals; i++) {
            const angle = (i / petals) * Math.PI * 2;
            const px = Math.cos(angle) * petalSize;
            const py = Math.sin(angle) * petalSize;

            ctx.beginPath();
            ctx.arc(px, py, petalSize / 2, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Center (stroke only)
        ctx.beginPath();
        ctx.arc(0, 0, petalSize / 3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    isDead() {
        return this.alpha <= 0;
    }
}
