import { useEffect, useMemo, useState } from 'react';
import { GameLane } from './GameLane';
import { Finale } from './Finale';
import { playFanfare, stopFrenchVoice } from './audio';
import { avoidCurrentDuplicate, contacts, getPool, makeOrders, makeQuestions, type Question, type Settings } from './game';
import './style.css';

type Phase = 'countdown' | 'playing' | 'complete';
type Session = {
  phase: Phase;
  countdown: number;
  questions: Question[];
  orders: string[][];
  progress: number[];
  finishOrder: number[];
};

const defaults: Settings = {
  groupCount: 3, contact: 'contact1', itemType: 'all', direction: 'NL_FR',
  questionCount: 15, pigeons: true, sound: true,
};

function readSettings(): Settings {
  try {
    const stored = JSON.parse(localStorage.getItem('croissant-bord-settings') || 'null');
    if (stored && (stored.groupCount === 2 || stored.groupCount === 3)) return { ...defaults, ...stored };
  } catch { /* Ongeldige of geblokkeerde browseropslag. */ }
  return defaults;
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(readSettings);
  const [session, setSession] = useState<Session | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const poolSize = useMemo(() => getPool(settings).length, [settings.contact, settings.itemType]);
  const count = Math.min(settings.questionCount, poolSize);

  useEffect(() => {
    try { localStorage.setItem('croissant-bord-settings', JSON.stringify(settings)); } catch { /* Opslag is optioneel. */ }
  }, [settings]);
  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  useEffect(() => {
    if (session?.phase !== 'countdown') return;
    const timer = window.setTimeout(() => {
      setSession((previous) => previous?.phase === 'countdown'
        ? { ...previous, countdown: previous.countdown - 1, phase: previous.countdown <= 1 ? 'playing' : 'countdown' }
        : previous);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [session?.phase, session?.countdown]);
  useEffect(() => { if (!settings.sound || paused) stopFrenchVoice(); }, [settings.sound, paused]);
  useEffect(() => {
    if (session?.phase === 'complete') {
      stopFrenchVoice();
      playFanfare(settings.sound);
    }
  }, [session?.phase]);

  function updateSettings(patch: Partial<Settings>) {
    setSettings((previous) => {
      const next = { ...previous, ...patch };
      const available = getPool(next).length;
      next.questionCount = Math.max(1, Math.min(next.questionCount, available));
      return next;
    });
  }
  function start() {
    try {
      const normalized = { ...settings, questionCount: count };
      const questions = makeQuestions(normalized);
      const orders = makeOrders(questions, settings.groupCount);
      setSession({ phase: 'countdown', countdown: 2, questions, orders, progress: Array(settings.groupCount).fill(0), finishOrder: [] });
      stopFrenchVoice(); setPaused(false); setMenuOpen(false); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Het spel kon niet starten.'); }
  }
  function handleCorrect(groupIndex: number) {
    setSession((previous) => {
      if (!previous || previous.phase !== 'playing' || paused) return previous;
      if (previous.progress[groupIndex] >= previous.questions.length) return previous;
      const progress = [...previous.progress];
      progress[groupIndex]++;
      const finishOrder = [...previous.finishOrder];
      if (progress[groupIndex] === previous.questions.length) finishOrder.push(groupIndex);
      const orders = previous.orders.map((order) => [...order]);
      if (progress[groupIndex] < previous.questions.length) {
        const otherCurrentIds = orders.flatMap((order, index) =>
          index !== groupIndex && progress[index] < order.length ? [order[progress[index]]] : []);
        orders[groupIndex] = avoidCurrentDuplicate(orders[groupIndex], progress[groupIndex], otherCurrentIds);
      }
      return {
        ...previous, progress, orders, finishOrder,
        phase: finishOrder.length === settings.groupCount ? 'complete' : 'playing',
      };
    });
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { setError('Volledig scherm is in deze browser niet beschikbaar.'); }
    setMenuOpen(false);
  }

  const byId = useMemo(() => new Map(session?.questions.map((question) => [question.id, question]) ?? []), [session?.questions]);
  const winner = session?.finishOrder[0];

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-icon">🥐</span><div><strong>Croissant-Katapult</strong><small>Het Leeratelier · bordspel</small></div></div>
      <div className="topbar-status">{session ? <>{session.phase === 'countdown' ? 'Maak je klaar' : winner === undefined ? `${settings.groupCount} groepen spelen` : `Groep ${winner + 1} is als eerste klaar!`}</> : 'Klaar voor een nieuw spel'}</div>
      <button className="menu-button" onClick={() => setMenuOpen(true)} type="button" aria-label="Open spelmenu">☰ <span>Spelmenu</span></button>
    </header>

    {!session ? <main className="setup-wrap">
      <section className="setup-card">
        <div className="setup-intro"><div className="setup-kicker">SAMEN AAN HET BORD</div><h1>Wie schiet zich als eerste door de woorden?</h1><p>Elke groep krijgt dezelfde willekeurig gekozen vragen. De volgorde en de plaats van de antwoordballonnen verschillen per groep.</p></div>
        <div className="settings-grid">
          <fieldset><legend>Aantal groepen</legend><div className="segmented"><button className={settings.groupCount === 2 ? 'active' : ''} onClick={() => updateSettings({ groupCount: 2 })} type="button">2 groepen</button><button className={settings.groupCount === 3 ? 'active' : ''} onClick={() => updateSettings({ groupCount: 3 })} type="button">3 groepen</button></div></fieldset>
          <label className="field">Woordenreeks<select value={settings.contact} onChange={(event) => updateSettings({ contact: event.target.value })}><option value="all">Alle contacten samen</option>{contacts.map((key) => <option key={key} value={key}>Contact {key.replace('contact', '')}</option>)}</select></label>
          <label className="field">Soort vragen<select value={settings.itemType} onChange={(event) => updateSettings({ itemType: event.target.value as Settings['itemType'] })}><option value="all">Woordjes en uitdrukkingen</option><option value="woordje">Alleen woordjes</option><option value="uitdrukking">Alleen uitdrukkingen</option></select></label>
          <fieldset><legend>Vertaalrichting</legend><div className="segmented"><button className={settings.direction === 'NL_FR' ? 'active' : ''} onClick={() => updateSettings({ direction: 'NL_FR' })} type="button">Nederlands → Frans</button><button className={settings.direction === 'FR_NL' ? 'active' : ''} onClick={() => updateSettings({ direction: 'FR_NL' })} type="button">Frans → Nederlands</button></div></fieldset>
          <label className="field count-field">Aantal juiste antwoorden per groep<input type="number" min={1} max={poolSize} value={settings.questionCount} onChange={(event) => setSettings((previous) => ({ ...previous, questionCount: Number(event.target.value) || 1 }))} onBlur={() => updateSettings({})} /><small>{poolSize} vragen beschikbaar in deze selectie · geen herhalingen</small></label>
          <div className="toggle-list">
            <label className="toggle"><input type="checkbox" checked={settings.pigeons} onChange={(event) => updateSettings({ pigeons: event.target.checked })} /><span><strong>Duiven laten storen</strong><small>Misschot: één duif · fout antwoord: twee duiven · duif raken met brood of croissant: twee duiven · stinkkaas verjaagt ze</small></span></label>
            <label className="toggle"><input type="checkbox" checked={settings.sound} onChange={(event) => updateSettings({ sound: event.target.checked })} /><span><strong>Geluid</strong><small>Korte effecten, drie Franse zinnen en een fanfare op het einde</small></span></label>
          </div>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="setup-footer"><p>Een fout antwoord verdwijnt en de groep blijft bij dezelfde vraag. De eerste groep die {count} vragen juist beantwoordt, wint.</p><button className="start-button" type="button" onClick={start} disabled={!poolSize || count < 1}>Start het spel <span>→</span></button></div>
      </section>
    </main> : <main className={`game-layout groups-${settings.groupCount}`}>
      {Array.from({ length: settings.groupCount }, (_, index) => {
        const progress = session.progress[index];
        const finished = progress >= session.questions.length;
        const question = !finished ? byId.get(session.orders[index][progress]) ?? null : null;
        return <GameLane key={`${index}-${session.questions[0]?.id}`} groupIndex={index} question={question} progress={progress} total={session.questions.length} active={session.phase === 'playing' && !paused} finished={finished} pigeonsEnabled={settings.pigeons} sound={settings.sound} onCorrect={() => handleCorrect(index)} />;
      })}
      {session.phase === 'countdown' && <div className="countdown-overlay"><div><span>Maak je klaar</span><strong>{session.countdown}</strong></div></div>}
      {session.finishOrder.length > 0 && <div className="winner-ribbon" role="status">🏆 Groep {session.finishOrder[0] + 1} was als eerste klaar{session.phase === 'complete' ? ' · Alle groepen zijn klaar' : ''}</div>}
    </main>}

    {menuOpen && <div className="modal-backdrop" onPointerDown={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }}>
      <section className="menu-panel" role="dialog" aria-modal="true" aria-labelledby="menu-title">
        <div className="menu-head"><h2 id="menu-title">Spelmenu</h2><button type="button" onClick={() => setMenuOpen(false)} aria-label="Sluit spelmenu">✕</button></div>
        <button type="button" onClick={toggleFullscreen}>{fullscreen ? '▣ Volledig scherm verlaten' : '▣ Volledig scherm'}</button>
        <button type="button" onClick={() => updateSettings({ sound: !settings.sound })}>{settings.sound ? '🔊 Geluid uitschakelen' : '🔇 Geluid inschakelen'}</button>
        {session && <button type="button" onClick={() => { setPaused(!paused); setMenuOpen(false); }}>{paused ? '▶ Spel hervatten' : '⏸ Spel pauzeren'}</button>}
        {session && <button className="danger" type="button" onClick={() => { setSession(null); setPaused(false); setMenuOpen(false); }}>↺ Nieuw spel instellen</button>}
        <p>De knoppen blijven in dit menu bereikbaar, ook wanneer de browser op het digibord minder ruimte heeft.</p>
      </section>
    </div>}
    {paused && session && !menuOpen && <div className="pause-overlay"><strong>Spel gepauzeerd</strong><button type="button" onClick={() => setPaused(false)}>Hervatten</button></div>}
    {session?.phase === 'complete' && <Finale finishOrder={session.finishOrder} onReplay={start} onSettings={() => { setSession(null); setPaused(false); setMenuOpen(false); }} />}
  </div>;
}
