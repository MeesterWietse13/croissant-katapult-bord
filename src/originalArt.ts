// @ts-nocheck
// De vectorvormen hieronder zijn ongewijzigd overgenomen uit de originele
// Croissant-Katapult. Alleen de canvascontext is een expliciete parameter.

export function drawPigeon(ctx, x, y, scale, angle, state, vx) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.scale(vx > 0 ? 1 : -1, 1);
            ctx.scale(scale, scale);

            let flapY = state === 'flying' ? Math.sin(Date.now() / 110) * 8 : 0;

            // Lichaam (Lichtgrijs)
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath();
            ctx.ellipse(0, 0, 22, 16, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Kop (Lichtgrijs)
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath();
            ctx.arc(14, -12, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Glanzende nekstreep (Typisch paars-blauwe duivengloed)
            ctx.fillStyle = '#818cf8';
            ctx.beginPath();
            ctx.ellipse(8, -6, 4, 6, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();

            // Snavel (Oranje)
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.moveTo(22, -14);
            ctx.lineTo(30, -11);
            ctx.lineTo(21, -8);
            ctx.closePath();
            ctx.fill();

            // Oog (Wit met zwarte pupil)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(16, -14, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(17, -14, 1.2, 0, Math.PI * 2);
            ctx.fill();

            // Vleugel (Donkergrijs, geanimeerde flap)
            ctx.save();
            ctx.translate(-4, -2);
            ctx.rotate(flapY * 0.05);
            ctx.fillStyle = '#64748b';
            ctx.beginPath();
            ctx.ellipse(0, 0, 14, 8, -Math.PI / 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // Pootjes (Oranje)
            if (state === 'flying') {
                ctx.strokeStyle = '#f97316';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-5, 14);
                ctx.lineTo(-7, 20);
                ctx.moveTo(3, 14);
                ctx.lineTo(2, 20);
                ctx.stroke();
            }

            // Gekke sterretjes bij uitschakeling
            if (state === 'hit') {
                ctx.font = '16px Arial';
                ctx.fillText('💫', -15, -25);
                ctx.fillText('✨', 15, -20);
            }

            ctx.restore();
        }

export function drawProjectile(ctx, type, x, y, radius, rotation) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);

            if (type === 'croissant') {
                ctx.font = '42px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🥐', 0, 0);
            } else if (type === 'baguette') {
                ctx.font = '42px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🥖', 0, 0);
            } else if (type === 'schimmelkaas') {
                // Realistische 3D schimmelkaaspunt (Groene schimmelkaas)
                // 1. Korst aan de achterkant (Donkergroen)
                ctx.fillStyle = '#14532d';
                ctx.beginPath();
                ctx.moveTo(18, 16);
                ctx.quadraticCurveTo(24, 0, 18, -16);
                ctx.lineTo(0, 0);
                ctx.closePath();
                ctx.fill();

                // 2. Kaaslichaam (Zacht groen-geel)
                ctx.fillStyle = '#bbf7d0';
                ctx.beginPath();
                ctx.moveTo(-18, 0);
                ctx.lineTo(18, -16);
                ctx.lineTo(18, 16);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = '#15803d';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // 3. Kaasgaten (Donkergroen shadow)
                ctx.fillStyle = '#166534';
                ctx.beginPath();
                ctx.arc(6, -4, 3, 0, Math.PI * 2);
                ctx.arc(10, 6, 2, 0, Math.PI * 2);
                ctx.arc(-4, 0, 4, 0, Math.PI * 2);
                ctx.fill();

                // 4. Blauwe schimmelsporen op de kaas
                ctx.fillStyle = '#0e7490';
                ctx.beginPath();
                ctx.arc(12, -10, 2, 0, Math.PI * 2);
                ctx.arc(2, 6, 3, 0, Math.PI * 2);
                ctx.arc(-10, 1, 1.5, 0, Math.PI * 2);
                ctx.fill();

            } else if (type === 'stinkkaas') {
                // Realistische 3D Camembert stinkkaaspunt
                // 1. Witte zachte schimmelkorst aan de achterkant
                ctx.fillStyle = '#f3f4f6';
                ctx.beginPath();
                ctx.moveTo(18, 16);
                ctx.quadraticCurveTo(24, 0, 18, -16);
                ctx.lineTo(0, 0);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#e5e7eb';
                ctx.lineWidth = 1;
                ctx.stroke();

                // 2. Glanzend romig geel kaaslichaam
                ctx.fillStyle = '#fef08a';
                ctx.beginPath();
                ctx.moveTo(-18, 0);
                ctx.lineTo(18, -16);
                ctx.lineTo(18, 16);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = '#ca8a04';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // 3. Kaasgaten (Schaduwgeel)
                ctx.fillStyle = '#eab308';
                ctx.beginPath();
                ctx.arc(6, -4, 3, 0, Math.PI * 2);
                ctx.arc(10, 6, 2, 0, Math.PI * 2);
                ctx.arc(-4, 0, 4, 0, Math.PI * 2);
                ctx.fill();

                // 4. Stinkende groene walm-golfjes
                ctx.strokeStyle = 'rgba(34, 197, 94, 0.45)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(-12, -10);
                ctx.quadraticCurveTo(-15, -18, -10, -22);
                ctx.moveTo(0, -12);
                ctx.quadraticCurveTo(-3, -22, 4, -26);
                ctx.stroke();
            }

            ctx.restore();
        }
