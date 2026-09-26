import { useEffect, useRef } from 'react';
import { drawPigeon } from './originalArt';

type Confetti = { x: number; y: number; size: number; speed: number; drift: number; angle: number; turn: number; color: string };
type FlyingPigeon = { x: number; y: number; speed: number; scale: number };

const confettiColors = ['#ffda63', '#fb7185', '#67c9f5', '#a7f3d0', '#ffffff', '#c4b5fd'];

export function Finale({ finishOrder, onReplay, onSettings }: {
  finishOrder: number[];
  onReplay: () => void;
  onSettings: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let frame = 0;
    let width = 0, height = 0, lastTime = 0;
    let confetti: Confetti[] = [];
    let pigeons: FlyingPigeon[] = [];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width; height = bounds.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const pieceSize = Math.max(7, Math.min(width / 180, 18));
      confetti = Array.from({ length: Math.min(240, Math.max(100, Math.round(width * height / 9000))) }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: pieceSize * (.6 + Math.random() * .7),
        speed: 1.2 + Math.random() * 2.5,
        drift: (Math.random() - .5) * 1.5,
        angle: Math.random() * Math.PI,
        turn: (Math.random() - .5) * .08,
        color: confettiColors[index % confettiColors.length],
      }));
      const pigeonScale = Math.max(1.1, Math.min(width / 750, 2.7));
      pigeons = [
        { x: -80, y: height * .16, speed: 1.5, scale: pigeonScale },
        { x: width * .35, y: height * .31, speed: -1.15, scale: pigeonScale * .85 },
        { x: width + 60, y: height * .23, speed: -1.7, scale: pigeonScale },
        { x: width * .72, y: height * .43, speed: 1.25, scale: pigeonScale * .75 },
      ];
    };

    const draw = (now: number) => {
      const step = Math.min(2, (now - (lastTime || now)) / 16.67);
      lastTime = now;
      ctx.clearRect(0, 0, width, height);
      for (const piece of confetti) {
        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.angle);
        ctx.fillStyle = piece.color;
        ctx.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
        ctx.restore();
        if (!reduceMotion) {
          piece.x += piece.drift * step;
          piece.y += piece.speed * step;
          piece.angle += piece.turn * step;
          if (piece.y > height + piece.size) { piece.y = -piece.size; piece.x = Math.random() * width; }
          if (piece.x < -piece.size) piece.x = width + piece.size;
          if (piece.x > width + piece.size) piece.x = -piece.size;
        }
      }
      ctx.globalAlpha = .86;
      for (const bird of pigeons) {
        drawPigeon(ctx, bird.x, bird.y, bird.scale, 0, 'flying', bird.speed);
        if (!reduceMotion) {
          bird.x += bird.speed * step;
          if (bird.speed > 0 && bird.x > width + 100) bird.x = -100;
          if (bird.speed < 0 && bird.x < -100) bird.x = width + 100;
        }
      }
      ctx.globalAlpha = 1;
      if (!reduceMotion) frame = requestAnimationFrame(draw);
    };

    const observer = new ResizeObserver(() => { resize(); if (reduceMotion) draw(performance.now()); });
    observer.observe(canvas);
    resize();
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  const displayOrder = [2, 1, 3];
  const podium = finishOrder.map((group, index) => ({ group, rank: index + 1 }))
    .sort((left, right) => displayOrder.indexOf(left.rank) - displayOrder.indexOf(right.rank));

  return <section className="finale-screen" role="dialog" aria-modal="true" aria-labelledby="finale-title">
    <canvas ref={canvasRef} className="finale-effects" aria-hidden="true" />
    <div className="finale-content">
      <div className="finale-kicker">ALLE GROEPEN ZIJN KLAAR</div>
      <h1 id="finale-title">Het podium!</h1>
      <p>Iedereen schoot zich door dezelfde oefeningen.</p>
      <div className={`finale-podium ${finishOrder.length === 2 ? 'two-groups' : ''}`} aria-label="Eindstand">
        {podium.map(({ group, rank }) => <div className={`podium-place rank-${rank}`} key={group}>
          <div className="podium-team"><span className="podium-medal" aria-hidden="true">{['🥇', '🥈', '🥉'][rank - 1]}</span><strong>Groep {group + 1}</strong></div>
          <div className="podium-step"><span>{rank}</span></div>
        </div>)}
      </div>
      <div className="finale-actions">
        <button type="button" className="finale-replay" onClick={onReplay}>Nog eens spelen</button>
        <button type="button" className="finale-settings" onClick={onSettings}>Instellingen aanpassen</button>
      </div>
    </div>
  </section>;
}
