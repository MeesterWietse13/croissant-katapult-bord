import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Question } from './game';
import { shuffle } from './game';
import { drawPigeon, drawProjectile } from './originalArt';
import { playTone, speakFrench } from './audio';

type Ammo = 'croissant' | 'baguette' | 'schimmelkaas';
type Balloon = { x: number; y: number; vx: number; vy: number; radius: number; slot: number; word: string; correct: boolean; color: string };
type Bird = { x: number; y: number; vx: number; vy: number; radius: number; state: 'flying' | 'hit'; angle: number; spinSpeed: number; scale: number };
type Shot = { x: number; y: number; vx: number; vy: number; oldX: number; oldY: number; fired: boolean; grabbed: boolean; pointerId: number | null; ammo: Ammo };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type Engine = {
  width: number; height: number; scale: number; dpr: number; balloons: Balloon[]; birds: Bird[];
  shot: Shot; ammo: Ammo; locked: boolean; resetAt: number; correctStreak: number;
  particles: Particle[]; lastTime: number; question: Question | null;
};

const H = 620;
const colors = ['#fb7185', '#facc15', '#67c9f5'];

function makeEngine(): Engine {
  return {
    width: 420, height: H, scale: 1, dpr: 1, balloons: [], birds: [], particles: [],
    shot: { x: 210, y: 480, oldX: 210, oldY: 480, vx: 0, vy: 0, fired: false, grabbed: false, pointerId: null, ammo: 'croissant' },
    ammo: 'croissant', locked: false, resetAt: 0, correctStreak: 0, lastTime: 0, question: null,
  };
}

function anchor(engine: Engine) { return { x: engine.width / 2, y: H * 0.78 - 35 }; }
function resetShot(engine: Engine) {
  const point = anchor(engine);
  engine.shot = { x: point.x, y: point.y, oldX: point.x, oldY: point.y, vx: 0, vy: 0, fired: false, grabbed: false, pointerId: null, ammo: engine.ammo };
}
function resetBalloons(engine: Engine, question: Question, groupIndex: number) {
  // Als groepen dezelfde vraag zien, staat het juiste antwoord nooit op dezelfde plek.
  const seed = [...question.id].reduce((total, char) => total + char.charCodeAt(0), 0);
  const correctPosition = (seed + groupIndex) % 3;
  const options = shuffle(question.options.filter((option) => option !== question.answer));
  options.splice(correctPosition, 0, question.answer);
  const space = engine.width / 3;
  engine.balloons = options.map((word, index) => ({
    x: space * (index + .5), y: 132 + (index % 2) * 70,
    vx: (Math.random() - .5) * .7, vy: (Math.random() - .5) * .6,
    radius: 39, slot: index, word, correct: word === question.answer, color: colors[index],
  }));
}
function addBird(engine: Engine) {
  const fromLeft = Math.random() > .5;
  engine.birds.push({
    x: fromLeft ? -45 : engine.width + 45, y: 95 + Math.random() * 170,
    vx: fromLeft ? 1.25 + Math.random() : -1.25 - Math.random(), vy: (Math.random() - .5) * .35,
    radius: 26, state: 'flying', angle: 0, spinSpeed: 0, scale: 1,
  });
}
function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - x1 - t * dx, py - y1 - t * dy);
}
function burst(engine: Engine, x: number, y: number, color: string) {
  for (let index = 0; index < 15; index++) {
    const angle = Math.random() * Math.PI * 2, speed = 1 + Math.random() * 3;
    engine.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 35, color });
  }
}
function splitLines(ctx: CanvasRenderingContext2D, value: string, maxWidth: number): string[] {
  const words = value.split(/\s+/);
  const result: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) { result.push(line); line = word; }
    else line = candidate;
  }
  if (line) result.push(line);
  return result;
}

function draw(engine: Engine, ctx: CanvasRenderingContext2D) {
  const w = engine.width, h = H, cat = anchor(engine), shot = engine.shot;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#eef4fa'; ctx.fillRect(0, 0, w, h);
  // Zelfde rustige lucht en groene heuvels als in het oorspronkelijke spel.
  ctx.fillStyle = 'rgba(255,255,255,.82)';
  for (const [x, y, r] of [[w * .13, 70, 25], [w * .67, 55, 31], [w * .84, 106, 20]]) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.arc(x + r * .65, y - r * .2, r * .8, 0, Math.PI * 2); ctx.arc(x + r * 1.25, y, r * .6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#a7f3d0';
  ctx.beginPath(); ctx.arc(w * .1, h + 120, 225, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(w * .82, h + 195, 295, 0, Math.PI * 2); ctx.fill();

  for (const balloon of engine.balloons) {
    const b = balloon; ctx.save();
    ctx.strokeStyle = '#142847'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(b.x, b.y + b.radius); ctx.bezierCurveTo(b.x - 5, b.y + b.radius + 15, b.x + 5, b.y + b.radius + 30, b.x, b.y + b.radius + 40); ctx.stroke();
    ctx.fillStyle = b.color; ctx.beginPath(); ctx.ellipse(b.x, b.y, b.radius, b.radius * 1.15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.ellipse(b.x - b.radius * .4, b.y - b.radius * .4, b.radius * .2, b.radius * .3, Math.PI / 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = b.color; ctx.beginPath(); ctx.moveTo(b.x, b.y + b.radius * 1.15); ctx.lineTo(b.x - 6, b.y + b.radius * 1.15 + 8); ctx.lineTo(b.x + 6, b.y + b.radius * 1.15 + 8); ctx.closePath(); ctx.fill();
    const labelWidth = Math.min(150, Math.max(100, w / 3 - 9));
    let fontSize = 14, lines: string[] = [];
    while (fontSize >= 10) {
      ctx.font = `bold ${fontSize}px "Trebuchet MS", sans-serif`;
      lines = splitLines(ctx, b.word, labelWidth - 12);
      if (lines.length <= 5) break;
      fontSize--;
    }
    const lineHeight = fontSize + 2, boxHeight = Math.max(26, lines.length * lineHeight + 10);
    ctx.fillStyle = '#fefaf0'; ctx.beginPath(); ctx.roundRect(b.x - labelWidth / 2, b.y - boxHeight / 2, labelWidth, boxHeight, 7); ctx.fill();
    ctx.strokeStyle = '#142847'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#142847'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach((line, index) => ctx.fillText(line, b.x, b.y + (index - (lines.length - 1) / 2) * lineHeight, labelWidth - 11));
    ctx.restore();
  }
  for (const bird of engine.birds) drawPigeon(ctx, bird.x, bird.y, bird.scale, bird.angle, bird.state, bird.vx);

  const targetX = shot.grabbed ? shot.x : cat.x, targetY = shot.grabbed ? shot.y : cat.y;
  ctx.save(); ctx.strokeStyle = '#b45309'; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cat.x, cat.y + 35); ctx.lineTo(cat.x, cat.y + 135); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cat.x - 30, cat.y); ctx.lineTo(cat.x, cat.y + 35); ctx.lineTo(cat.x + 30, cat.y); ctx.stroke(); ctx.restore();
  ctx.strokeStyle = '#f87171'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cat.x - 30, cat.y); ctx.lineTo(targetX, targetY); ctx.stroke();
  drawProjectile(ctx, shot.ammo, shot.x, shot.y, 18, shot.fired ? Math.atan2(shot.vy, shot.vx) + Math.PI / 4 : 0);
  ctx.beginPath(); ctx.moveTo(targetX, targetY); ctx.lineTo(cat.x + 30, cat.y); ctx.stroke();
  for (const particle of engine.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / 35); ctx.fillStyle = particle.color;
    ctx.beginPath(); ctx.arc(particle.x, particle.y, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function GameLane({ groupIndex, question, progress, total, active, finished, pigeonsEnabled, sound, onCorrect }: {
  groupIndex: number; question: Question | null; progress: number; total: number; active: boolean; finished: boolean;
  pigeonsEnabled: boolean; sound: boolean; onCorrect: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine>(makeEngine());
  const latest = useRef({ active, finished, pigeonsEnabled, sound, onCorrect, progress, total });
  latest.current = { active, finished, pigeonsEnabled, sound, onCorrect, progress, total };
  const [ammo, setAmmo] = useState<Ammo>('croissant');
  const [feedback, setFeedback] = useState('');
  const theme = ['amber', 'blue', 'rose'][groupIndex] ?? 'amber';

  useEffect(() => {
    const engine = engineRef.current;
    engine.question = question;
    engine.locked = false; engine.resetAt = 0;
    if (!question) engine.birds = [];
    engine.particles = [];
    if (question) resetBalloons(engine, question, groupIndex); else engine.balloons = [];
    resetShot(engine);
    setFeedback('');
  }, [question?.id]);

  useEffect(() => { engineRef.current.ammo = ammo; if (!engineRef.current.shot.fired && !engineRef.current.shot.grabbed) engineRef.current.shot.ammo = ammo; }, [ammo]);
  useEffect(() => { if (!pigeonsEnabled) engineRef.current.birds = []; }, [pigeonsEnabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const engine = engineRef.current;
    let frame = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      engine.dpr = Math.min(window.devicePixelRatio || 1, 2);
      engine.scale = rect.height / H;
      const previousWidth = engine.width;
      engine.width = rect.width / engine.scale;
      for (const balloon of engine.balloons) balloon.x *= engine.width / previousWidth;
      for (const bird of engine.birds) bird.x *= engine.width / previousWidth;
      canvas.width = Math.round(rect.width * engine.dpr);
      canvas.height = Math.round(rect.height * engine.dpr);
      ctx.setTransform(engine.dpr * engine.scale, 0, 0, engine.dpr * engine.scale, 0, 0);
      resetShot(engine);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const tick = (now: number) => {
      const dt = Math.min(2, (now - (engine.lastTime || now)) / 16.67);
      engine.lastTime = now;
      if (latest.current.active && !latest.current.finished && engine.question) {
        for (const balloon of engine.balloons) {
          balloon.x += balloon.vx * dt; balloon.y += balloon.vy * dt;
          const column = engine.width / 3, margin = Math.min(82, column / 2 - 4);
          const minX = balloon.slot * column + margin, maxX = (balloon.slot + 1) * column - margin;
          if (balloon.x < minX || balloon.x > maxX) balloon.vx *= -1;
          if (balloon.y < 100 || balloon.y > 290) balloon.vy *= -1;
          balloon.x = Math.max(minX, Math.min(maxX, balloon.x));
          balloon.y = Math.max(100, Math.min(290, balloon.y));
        }
        for (const bird of engine.birds) {
          if (bird.state === 'flying') {
            bird.x += bird.vx * dt; bird.y += bird.vy * dt;
            if (bird.x < -48) bird.x = engine.width + 48;
            if (bird.x > engine.width + 48) bird.x = -48;
            if (bird.y < 70 || bird.y > 300) bird.vy *= -1;
          } else { bird.x += bird.vx * dt; bird.y += bird.vy * dt; bird.vy += .18 * dt; bird.angle += bird.spinSpeed * dt; bird.scale -= .015 * dt; }
        }
        engine.birds = engine.birds.filter((bird) => bird.scale > .01 && bird.y < H + 55);
        for (const particle of engine.particles) { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += .06 * dt; particle.life -= dt; }
        engine.particles = engine.particles.filter((particle) => particle.life > 0);
        const shot = engine.shot;
        if (shot.fired) {
          shot.oldX = shot.x; shot.oldY = shot.y;
          shot.vx *= Math.pow(.997, dt); shot.vy += .24 * dt;
          shot.x += shot.vx * dt; shot.y += shot.vy * dt;
          // Duiven staan vóór de ballonnen en kunnen een schot onderscheppen.
          const bird = engine.birds.find((b) => b.state === 'flying' && distanceToSegment(b.x, b.y, shot.oldX, shot.oldY, shot.x, shot.y) < b.radius + 15);
          if (bird) {
            shot.fired = false;
            if (shot.ammo === 'schimmelkaas') {
              bird.state = 'hit'; bird.vy = -3; bird.vx *= .65; bird.spinSpeed = .16;
              burst(engine, bird.x, bird.y, '#86efac'); setFeedback('Duif geraakt!'); playTone(latest.current.sound, true);
            } else {
              addBird(engine); addBird(engine); burst(engine, bird.x, bird.y, '#e7a960');
              setFeedback('Duif geraakt: twee duiven erbij!'); playTone(latest.current.sound, false);
              speakFrench(latest.current.sound, 'bread-pigeon');
            }
            engine.resetAt = now + 600;
          } else {
            const balloon = engine.balloons.find((b) => distanceToSegment(b.x, b.y, shot.oldX, shot.oldY, shot.x, shot.y) < b.radius + 14);
            if (balloon) {
              shot.fired = false;
              if (shot.ammo === 'schimmelkaas') {
                setFeedback('Stinkkaas is voor de duiven. Probeer brood!');
              } else if (balloon.correct) {
                engine.locked = true;
                burst(engine, balloon.x, balloon.y, balloon.color);
                engine.balloons = engine.balloons.filter((b) => b !== balloon);
                engine.correctStreak++;
                const remaining = latest.current.total - latest.current.progress - 1;
                if (remaining === 1) speakFrench(latest.current.sound, 'one-left');
                else if (remaining > 1 && engine.correctStreak === 3) speakFrench(latest.current.sound, 'three-in-a-row');
                setFeedback('Juist! Op naar de volgende vraag'); playTone(latest.current.sound, true);
                window.setTimeout(() => latest.current.onCorrect(), 550);
              } else {
                engine.correctStreak = 0;
                burst(engine, balloon.x, balloon.y, balloon.color);
                engine.balloons = engine.balloons.filter((b) => b !== balloon);
                if (latest.current.pigeonsEnabled) { addBird(engine); addBird(engine); }
                setFeedback(latest.current.pigeonsEnabled
                  ? 'Fout antwoord weg: twee duiven erbij!'
                  : 'Fout antwoord weg! Probeer dezelfde vraag opnieuw');
                playTone(latest.current.sound, false);
                engine.resetAt = now + 650;
              }
              if (!engine.locked && !engine.resetAt) engine.resetAt = now + 600;
            }
          }
          if (shot.fired && (shot.y > H + 30 || shot.y < -60 || shot.x < -50 || shot.x > engine.width + 50)) {
            shot.fired = false; engine.resetAt = now + 400;
            if (latest.current.pigeonsEnabled) addBird(engine);
            setFeedback(latest.current.pigeonsEnabled ? 'Mis: een duif erbij!' : 'Mis! Probeer opnieuw');
          }
        }
        if (engine.resetAt && now >= engine.resetAt) {
          engine.resetAt = 0;
          resetShot(engine);
        }
      }
      draw(engine, ctx);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  function pointerPosition(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const engine = engineRef.current;
    return { x: (event.clientX - rect.left) / engine.scale, y: (event.clientY - rect.top) / engine.scale };
  }
  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    const engine = engineRef.current, shot = engine.shot, point = pointerPosition(event);
    if (!active || finished || engine.locked || shot.fired || shot.pointerId !== null) return;
    if (Math.hypot(point.x - shot.x, point.y - shot.y) > 55) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    shot.pointerId = event.pointerId; shot.grabbed = true;
  }
  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const engine = engineRef.current, shot = engine.shot;
    if (shot.pointerId !== event.pointerId || !shot.grabbed) return;
    event.preventDefault();
    const point = pointerPosition(event), base = anchor(engine);
    const dx = point.x - base.x, dy = point.y - base.y;
    const factor = Math.min(1, 95 / (Math.hypot(dx, dy) || 1));
    shot.x = base.x + dx * factor; shot.y = base.y + dy * factor;
  }
  function onPointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    const engine = engineRef.current, shot = engine.shot;
    if (shot.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    shot.pointerId = null; shot.grabbed = false;
    const base = anchor(engine), pull = Math.hypot(base.x - shot.x, base.y - shot.y);
    if (pull < 12 || !active || finished) { resetShot(engine); return; }
    shot.vx = (base.x - shot.x) * .23;
    shot.vy = (base.y - shot.y) * .25;
    shot.oldX = shot.x; shot.oldY = shot.y; shot.fired = true; shot.ammo = engine.ammo;
  }

  return <section className={`lane lane-${theme}`} aria-label={`Groep ${groupIndex + 1}`}>
    <div className="lane-head">
      <div><span className="eyebrow">TEAM {groupIndex + 1}</span><h2>Groep {groupIndex + 1}</h2></div>
      <strong className="progress">{progress}/{total}</strong>
    </div>
    <div className="prompt" aria-label={active && question ? `Vertaal: ${question.prompt}` : undefined}>
      <strong>{finished ? 'Klaar!' : active && question ? question.prompt : 'Maak je klaar'}</strong>
    </div>
    <div className="playfield">
      <canvas ref={canvasRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} aria-label={`Katapult van groep ${groupIndex + 1}`} />
      <div className="lane-message" aria-live="polite">{finished ? '' : feedback}</div>
      {!active && <div className="lane-curtain">{finished ? '🏁 KLAAR' : 'Even wachten…'}</div>}
    </div>
    <div className="ammo-bar" aria-label={`Munitie van groep ${groupIndex + 1}`}>
      {([['croissant', '🥐', 'Croissant'], ['baguette', '🥖', 'Stokbrood'], ...(pigeonsEnabled ? [['schimmelkaas', '🧀', 'Stinkkaas'] as const] : [])] as const).map(([value, icon, label]) =>
        <button key={value} type="button" disabled={!active || finished} className={ammo === value ? 'selected' : ''} onClick={() => setAmmo(value)} aria-pressed={ammo === value}>
          <span>{icon}</span><small>{label}</small>
        </button>
      )}
    </div>
  </section>;
}
