'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bbosjuhhyzoadkvmflmd.supabase.co',
  'sb_publishable_7sg7jD8s3pszFaFse_uSKg_dlWqC8VN'
);

export default function Home() {
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState({ total: 0, loja: 0, shopee: 0, revenue: 0 });
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [bigNotify, setBigNotify] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioCtxRef = useRef(null);
  const newIdsRef = useRef(new Set());

  const [webhookUrl, setWebhookUrl] = useState('');
  useEffect(() => {
    setWebhookUrl(`${window.location.origin}/api/webhook`);
  }, []);

  // ── Audio ──
  function ensureAudio() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
  }

  function playCashSound() {
    if (muted) return;
    ensureAudio();
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;

    function playTone(freq, start, dur, vol) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + start + dur * 0.3);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3000, now + start);
      filter.Q.setValueAtTime(2, now + start);
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(vol, now + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur);
    }

    playTone(2200, 0, 0.12, 0.15);
    playTone(3300, 0, 0.12, 0.1);
    playTone(2800, 0.12, 0.2, 0.15);
    playTone(4200, 0.12, 0.2, 0.1);
    playTone(5200, 0.15, 0.3, 0.05);

    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3) * 0.08;
    }
    const noise = ctx.createBufferSource();
    const noiseFilter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();
    noise.buffer = buffer;
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 4000;
    noiseGain.gain.setValueAtTime(0.3, now + 0.3);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now + 0.3);
  }

  // ── Handle new sale ──
  const handleNewSale = useCallback((sale) => {
    setSales(prev => [{ ...sale, isNew: true }, ...prev].slice(0, 50));

    setStats(prev => ({
      total: prev.total + 1,
      loja: prev.loja + (sale.source === 'loja' ? 1 : 0),
      shopee: prev.shopee + (sale.source === 'shopee' ? 1 : 0),
      revenue: prev.revenue + parseFloat(sale.total || 0),
    }));

    setBigNotify(sale.total);
    setTimeout(() => setBigNotify(null), 3200);

    newIdsRef.current.add(sale.id);
    setTimeout(() => {
      newIdsRef.current.delete(sale.id);
      setSales(prev => prev.map(s => s.id === sale.id ? { ...s, isNew: false } : s));
    }, 2500);
  }, []);

  // ── Load initial sales & subscribe to Realtime ──
  useEffect(() => {
    async function loadInitial() {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('vendas')
        .select('*')
        .gte('data_venda', today)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data && data.length > 0) {
        setSales(data.map(s => ({ ...s, isNew: false })));
        const t = data.length;
        const l = data.filter(s => s.source === 'loja').length;
        const sh = data.filter(s => s.source === 'shopee').length;
        const r = data.reduce((acc, s) => acc + parseFloat(s.total || 0), 0);
        setStats({ total: t, loja: l, shopee: sh, revenue: r });
      }
    }

    loadInitial();

    const channel = supabase
      .channel('vendas-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vendas' },
        (payload) => {
          handleNewSale(payload.new);
          playCashSound();
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleNewSale]);

  // ── Simulate sale ──
  async function simulateSale() {
    ensureAudio();
    const isShopee = Math.random() > 0.5;
    const body = {
      data: {
        id: Date.now(),
        numero: Math.floor(13700 + Math.random() * 100),
        numeroLoja: isShopee ? `260206${Math.random().toString(36).substr(2, 7).toUpperCase()}` : '',
        total: parseFloat((Math.random() * 800 + 20).toFixed(2)),
        data: new Date().toISOString().split('T')[0],
        contato: { id: Math.floor(Math.random() * 999999999) },
        vendedor: { id: isShopee ? 0 : Math.floor(Math.random() * 999999999) },
        loja: { id: isShopee ? 204253495 : 0 },
        situacao: { id: 6, valor: 0 },
      },
    };

    await fetch('/api/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  // ── Copy to clipboard ──
  async function copyWebhook() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = webhookUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // ── Format ──
  const fmtMoney = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const fmtTime = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const jsonExample = `{
  "data": {
    "id": 25016825788,
    "numero": 13726,
    "numeroLoja": "",
    "total": 39.99,
    "data": "2026-02-05",
    "contato": { "id": 15895689714 },
    "vendedor": { "id": 15596517756 },
    "loja": { "id": 0 },
    "situacao": { "id": 6, "valor": 0 }
  }
}`;

  const n8nExample = `{
  "data": {{ JSON.stringify($json.body.data) }}
}`;

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --bg: #0a0a0f; --surface: #12121a; --surface-2: #1a1a26; --border: #2a2a3a;
          --text: #e8e8f0; --text-dim: #7a7a90; --accent: #00e68a; --accent-glow: rgba(0,230,138,0.15);
          --shopee: #ee4d2d; --shopee-glow: rgba(238,77,45,0.15);
          --loja: #4d9aff; --loja-glow: rgba(77,154,255,0.15);
          --gold: #ffd700;
        }
        body {
          font-family: 'Outfit', sans-serif; background: var(--bg); color: var(--text);
          min-height: 100vh; overflow-x: hidden;
        }
        body::before {
          content: ''; position: fixed; inset: 0;
          background: radial-gradient(ellipse at 20% 20%, rgba(0,230,138,0.03) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(77,154,255,0.03) 0%, transparent 50%);
          pointer-events: none; z-index: 0;
        }
        body::after {
          content: ''; position: fixed; inset: 0;
          background-image: linear-gradient(rgba(255,255,255,.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.015) 1px, transparent 1px);
          background-size: 60px 60px; pointer-events: none; z-index: 0;
        }
        .app { position: relative; z-index: 1; }
        .header {
          padding: 24px 40px; display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid var(--border); backdrop-filter: blur(20px);
          background: rgba(10,10,15,0.8); position: sticky; top: 0; z-index: 100;
        }
        .header-left { display: flex; align-items: center; gap: 16px; }
        .logo {
          width: 42px; height: 42px; background: linear-gradient(135deg, var(--accent), #00b36b);
          border-radius: 12px; display: flex; align-items: center; justify-content: center;
          font-size: 20px; font-weight: 800; color: var(--bg); box-shadow: 0 0 20px var(--accent-glow);
        }
        .header-title { font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
        .header-title span { color: var(--accent); }
        .header-right { display: flex; align-items: center; gap: 12px; }
        .connection-status {
          display: flex; align-items: center; gap: 8px; font-size: 13px;
          font-family: 'JetBrains Mono', monospace; color: var(--text-dim);
          padding: 8px 16px; border-radius: 100px; border: 1px solid var(--border); background: var(--surface);
        }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; }
        .status-dot.on { background: var(--accent); animation: pulse-dot 2s ease-in-out infinite; }
        .status-dot.off { background: #ff4444; }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 var(--accent-glow); }
          50% { opacity: 0.7; box-shadow: 0 0 0 6px transparent; }
        }
        .btn-icon {
          background: var(--surface-2); border: 1px solid var(--border); color: var(--text);
          width: 38px; height: 38px; border-radius: 10px; cursor: pointer; font-size: 16px;
          display: flex; align-items: center; justify-content: center; transition: all 0.2s;
        }
        .btn-icon:hover { background: var(--surface); border-color: var(--accent); }
        .btn-icon.muted { color: #ff4444; border-color: rgba(255,68,68,0.3); }
        .btn-icon.active { background: var(--accent); color: var(--bg); border-color: var(--accent); }
        .stats-bar { display: flex; gap: 16px; padding: 24px 40px; overflow-x: auto; }
        .stat-card {
          flex: 1; min-width: 180px; background: var(--surface); border: 1px solid var(--border);
          border-radius: 16px; padding: 20px 24px; position: relative; overflow: hidden;
        }
        .stat-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 16px 16px 0 0;
        }
        .stat-card.c-total::before { background: linear-gradient(90deg, var(--accent), #00b36b); }
        .stat-card.c-loja::before { background: linear-gradient(90deg, var(--loja), #3377cc); }
        .stat-card.c-shopee::before { background: linear-gradient(90deg, var(--shopee), #cc3322); }
        .stat-card.c-revenue::before { background: linear-gradient(90deg, var(--gold), #cc9900); }
        .stat-label {
          font-size: 12px; font-weight: 500; text-transform: uppercase;
          letter-spacing: 1.2px; color: var(--text-dim); margin-bottom: 8px;
        }
        .stat-value { font-size: 32px; font-weight: 800; letter-spacing: -1px; font-family: 'JetBrains Mono', monospace; }
        .c-total .stat-value { color: var(--accent); }
        .c-loja .stat-value { color: var(--loja); }
        .c-shopee .stat-value { color: var(--shopee); }
        .c-revenue .stat-value { color: var(--gold); }
        .main { padding: 0 40px 40px; display: flex; flex-direction: column; gap: 16px; }
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .section-title { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-dim); }
        .btn-test {
          background: var(--surface-2); border: 1px solid var(--border); color: var(--text-dim);
          font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 500;
          padding: 8px 20px; border-radius: 100px; cursor: pointer; transition: all 0.2s ease;
        }
        .btn-test:hover { background: var(--accent); color: var(--bg); border-color: var(--accent); box-shadow: 0 0 20px var(--accent-glow); }
        .empty-state {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 80px 20px; color: var(--text-dim); text-align: center;
        }
        .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.4; }
        .empty-text { font-size: 16px; }
        .empty-sub { font-size: 13px; margin-top: 8px; font-family: 'JetBrains Mono', monospace; opacity: 0.5; }
        .sale-card {
          background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
          padding: 24px; display: flex; align-items: center; gap: 20px;
          position: relative; overflow: hidden; transition: all 0.3s ease;
        }
        .sale-card:hover { border-color: rgba(255,255,255,0.1); transform: translateY(-1px); }
        .sale-card.is-new { animation: slideIn 0.5s cubic-bezier(0.16,1,0.3,1), glow 2s ease-out; }
        .sale-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
        .sale-card.s-loja::before { background: var(--loja); }
        .sale-card.s-shopee::before { background: var(--shopee); }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-30px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes glow {
          0% { box-shadow: 0 0 40px var(--accent-glow), inset 0 0 40px var(--accent-glow); }
          100% { box-shadow: none; }
        }
        .sale-icon {
          width: 52px; height: 52px; border-radius: 14px; display: flex;
          align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0;
        }
        .s-shopee .sale-icon { background: var(--shopee-glow); border: 1px solid rgba(238,77,45,0.2); }
        .s-loja .sale-icon { background: var(--loja-glow); border: 1px solid rgba(77,154,255,0.2); }
        .sale-info { flex: 1; min-width: 0; }
        .sale-top { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
        .sale-source-badge {
          font-size: 11px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.8px; padding: 3px 10px; border-radius: 6px;
        }
        .s-shopee .sale-source-badge { background: var(--shopee-glow); color: var(--shopee); }
        .s-loja .sale-source-badge { background: var(--loja-glow); color: var(--loja); }
        .sale-number { font-size: 13px; font-family: 'JetBrains Mono', monospace; color: var(--text-dim); }
        .sale-title { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
        .sale-meta { font-size: 13px; color: var(--text-dim); display: flex; gap: 16px; flex-wrap: wrap; }
        .sale-right { text-align: right; flex-shrink: 0; }
        .sale-amount {
          font-size: 28px; font-weight: 800; font-family: 'JetBrains Mono', monospace;
          color: var(--accent); letter-spacing: -1px;
        }
        .sale-amount small { font-size: 14px; font-weight: 500; color: var(--text-dim); margin-right: 2px; }
        .sale-time { font-size: 12px; font-family: 'JetBrains Mono', monospace; color: var(--text-dim); margin-top: 4px; }
        .big-notify {
          position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
          z-index: 9999; pointer-events: none; animation: bigNotifyAnim 3s ease-out forwards;
        }
        .big-notify-bg {
          position: absolute; inset: 0;
          background: radial-gradient(circle at center, rgba(0,230,138,0.08), transparent 70%);
        }
        .big-notify-content { text-align: center; z-index: 1; }
        .big-notify-emoji { font-size: 72px; display: block; margin-bottom: 16px; animation: bounceEmoji 0.6s cubic-bezier(0.34,1.56,0.64,1); }
        .big-notify-text {
          font-size: 42px; font-weight: 900; letter-spacing: -1px;
          background: linear-gradient(135deg, var(--accent), #00ffaa, var(--gold));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .big-notify-amount {
          font-size: 64px; font-weight: 900; font-family: 'JetBrains Mono', monospace;
          color: var(--accent); margin-top: 8px; letter-spacing: -2px;
        }
        @keyframes bigNotifyAnim {
          0% { opacity: 0; transform: scale(0.8); }
          15% { opacity: 1; transform: scale(1.05); }
          25% { transform: scale(1); }
          75% { opacity: 1; }
          100% { opacity: 0; transform: scale(0.95); }
        }
        @keyframes bounceEmoji { from { transform: scale(0) rotate(-10deg); } to { transform: scale(1) rotate(0deg); } }

        /* Config panel */
        .config-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
          z-index: 200; display: flex; align-items: center; justify-content: center;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .config-panel {
          background: var(--surface); border: 1px solid var(--border); border-radius: 20px;
          width: 90%; max-width: 640px; max-height: 85vh; overflow-y: auto;
          animation: panelSlide 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        @keyframes panelSlide { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: none; } }
        .config-header {
          padding: 24px 28px 0; display: flex; align-items: center; justify-content: space-between;
        }
        .config-title { font-size: 20px; font-weight: 700; }
        .config-title span { color: var(--accent); }
        .btn-close {
          background: var(--surface-2); border: 1px solid var(--border); color: var(--text-dim);
          width: 36px; height: 36px; border-radius: 10px; cursor: pointer; font-size: 18px;
          display: flex; align-items: center; justify-content: center; transition: all 0.2s;
        }
        .btn-close:hover { border-color: #ff4444; color: #ff4444; }
        .config-body { padding: 24px 28px 28px; }
        .config-section { margin-bottom: 24px; }
        .config-section:last-child { margin-bottom: 0; }
        .config-label {
          font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;
          color: var(--text-dim); margin-bottom: 10px; display: flex; align-items: center; gap: 8px;
        }
        .webhook-url-box {
          display: flex; align-items: center; gap: 0; border-radius: 12px; overflow: hidden;
          border: 1px solid var(--border); background: var(--bg);
        }
        .webhook-url-text {
          flex: 1; padding: 14px 16px; font-family: 'JetBrains Mono', monospace; font-size: 13px;
          color: var(--accent); background: transparent; overflow-x: auto; white-space: nowrap; user-select: all;
        }
        .btn-copy {
          padding: 14px 20px; background: var(--surface-2); border: none; border-left: 1px solid var(--border);
          color: var(--text); font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all 0.2s; white-space: nowrap; display: flex; align-items: center; gap: 6px;
        }
        .btn-copy:hover { background: var(--accent); color: var(--bg); }
        .btn-copy.copied { background: var(--accent); color: var(--bg); }
        .config-method {
          display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 6px;
          background: rgba(0,230,138,0.1); color: var(--accent); font-size: 12px; font-weight: 700;
          font-family: 'JetBrains Mono', monospace; margin-bottom: 12px;
        }
        .code-block {
          background: var(--bg); border: 1px solid var(--border); border-radius: 12px;
          padding: 16px; font-family: 'JetBrains Mono', monospace; font-size: 12px;
          color: #a0a0b8; line-height: 1.6; overflow-x: auto; white-space: pre; position: relative;
        }
        .config-hint {
          font-size: 13px; color: var(--text-dim); line-height: 1.6; margin-top: 12px;
          padding: 12px 16px; background: rgba(77,154,255,0.05); border-radius: 10px;
          border: 1px solid rgba(77,154,255,0.1);
        }
        .config-hint strong { color: var(--loja); font-weight: 600; }

        @media (max-width: 768px) {
          .header { padding: 16px 20px; }
          .stats-bar { padding: 16px 20px; gap: 10px; }
          .main { padding: 0 20px 20px; }
          .stat-card { min-width: 140px; padding: 16px; }
          .stat-value { font-size: 24px; }
          .sale-card { flex-wrap: wrap; padding: 16px; }
          .sale-amount { font-size: 22px; }
          .big-notify-text { font-size: 28px; }
          .big-notify-amount { font-size: 40px; }
          .config-panel { width: 95%; }
        }
      `}</style>

      <div className="app">
        <header className="header">
          <div className="header-left">
            <div className="logo">S</div>
            <div className="header-title">Space <span>Sales</span></div>
          </div>
          <div className="header-right">
            <button
              className={`btn-icon ${showConfig ? 'active' : ''}`}
              onClick={() => setShowConfig(!showConfig)}
              title="Configurações"
            >⚙️</button>
            <button
              className={`btn-icon ${muted ? 'muted' : ''}`}
              onClick={() => { setMuted(!muted); ensureAudio(); }}
              title="Mutar/Desmutar"
            >{muted ? '🔇' : '🔊'}</button>
            <div className="connection-status">
              <div className={`status-dot ${connected ? 'on' : 'off'}`} />
              <span>{connected ? 'Conectado' : 'Reconectando...'}</span>
            </div>
          </div>
        </header>

        <div className="stats-bar">
          <div className="stat-card c-total">
            <div className="stat-label">Total Vendas</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card c-loja">
            <div className="stat-label">Loja</div>
            <div className="stat-value">{stats.loja}</div>
          </div>
          <div className="stat-card c-shopee">
            <div className="stat-label">Shopee</div>
            <div className="stat-value">{stats.shopee}</div>
          </div>
          <div className="stat-card c-revenue">
            <div className="stat-label">Faturamento</div>
            <div className="stat-value">R$ {fmtMoney(stats.revenue)}</div>
          </div>
        </div>

        <div className="main">
          <div className="section-header">
            <div className="section-title">🔔 Vendas ao Vivo</div>
            <button className="btn-test" onClick={simulateSale}>⚡ Simular Venda</button>
          </div>

          {sales.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📡</div>
              <div className="empty-text">Aguardando vendas...</div>
              <div className="empty-sub">Conectado ao Supabase Realtime</div>
            </div>
          ) : (
            sales.map((sale) => (
              <div key={sale.id} className={`sale-card s-${sale.source} ${sale.isNew ? 'is-new' : ''}`}>
                <div className="sale-icon">{sale.source === 'shopee' ? '🛒' : '🏪'}</div>
                <div className="sale-info">
                  <div className="sale-top">
                    <span className="sale-source-badge">{sale.source === 'shopee' ? 'Shopee' : 'Loja'}</span>
                    <span className="sale-number">#{sale.numero}{sale.numero_loja ? ` • ${sale.numero_loja}` : ''}</span>
                  </div>
                  <div className="sale-title">Nova venda realizada!</div>
                  <div className="sale-meta">
                    <span>📋 Pedido #{sale.numero}</span>
                    <span>📅 {sale.data_venda}</span>
                    {sale.vendedor_id > 0 && <span>👤 Vendedor ID: {sale.vendedor_id}</span>}
                  </div>
                </div>
                <div className="sale-right">
                  <div className="sale-amount"><small>R$</small> {fmtMoney(sale.total)}</div>
                  <div className="sale-time">{fmtTime(sale.created_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {bigNotify !== null && (
          <div className="big-notify">
            <div className="big-notify-bg" />
            <div className="big-notify-content">
              <span className="big-notify-emoji">💰</span>
              <div className="big-notify-text">VENDA REALIZADA!</div>
              <div className="big-notify-amount">R$ {fmtMoney(bigNotify)}</div>
            </div>
          </div>
        )}

        {showConfig && (
          <div className="config-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowConfig(false); }}>
            <div className="config-panel">
              <div className="config-header">
                <div className="config-title">⚙️ <span>Configuração</span></div>
                <button className="btn-close" onClick={() => setShowConfig(false)}>✕</button>
              </div>
              <div className="config-body">
                <div className="config-section">
                  <div className="config-label">📡 Webhook URL</div>
                  <div className="webhook-url-box">
                    <div className="webhook-url-text">{webhookUrl}</div>
                    <button className={`btn-copy ${copied ? 'copied' : ''}`} onClick={copyWebhook}>
                      {copied ? '✓ Copiado!' : '📋 Copiar'}
                    </button>
                  </div>
                </div>

                <div className="config-section">
                  <div className="config-label">📤 Método</div>
                  <div className="config-method">POST</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Content-Type: application/json
                  </div>
                </div>

                <div className="config-section">
                  <div className="config-label">📦 Body JSON (exemplo)</div>
                  <div className="code-block">{jsonExample}</div>
                </div>

                <div className="config-section">
                  <div className="config-label">🔧 Exemplo para n8n</div>
                  <div className="code-block">{n8nExample}</div>
                  <div className="config-hint">
                    No <strong>n8n</strong>, use um nó <strong>HTTP Request</strong> com método POST apontando para a URL acima.
                    No body, envie o <strong>data</strong> do webhook da Bling conforme o exemplo.
                    O sistema identifica automaticamente se a venda é da <strong>Loja</strong> ou <strong>Shopee</strong>.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
