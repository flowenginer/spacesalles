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

  const [selectedSound, setSelectedSound] = useState('coin');
  const [dateFilter, setDateFilter] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [loadingSales, setLoadingSales] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [vendedores, setVendedores] = useState([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  useEffect(() => {
    setWebhookUrl(`${window.location.origin}/api/webhook`);
    const saved = localStorage.getItem('spacesales-sound');
    if (saved) setSelectedSound(saved);
  }, []);

  // ── Audio ──
  function ensureAudio() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
  }

  function tone(ctx, type, freq, start, dur, vol) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
    gain.gain.setValueAtTime(vol, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + dur);
  }

  function toneRamp(ctx, type, freqStart, freqEnd, start, dur, vol) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime + start);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, ctx.currentTime + start + dur * 0.3);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3000, ctx.currentTime + start);
    filter.Q.setValueAtTime(2, ctx.currentTime + start);
    gain.gain.setValueAtTime(0, ctx.currentTime + start);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + dur);
  }

  const SOUNDS = {
    coin: {
      name: 'Moedinha',
      desc: 'Plin-plin estilo Hotmart',
      icon: '🪙',
      play: (ctx) => {
        tone(ctx, 'sine', 988, 0, 0.35, 0.25);
        tone(ctx, 'triangle', 1976, 0, 0.2, 0.08);
        tone(ctx, 'sine', 1319, 0.12, 0.45, 0.25);
        tone(ctx, 'triangle', 2638, 0.12, 0.25, 0.08);
      },
    },
    coin2: {
      name: 'Moeda Arcade',
      desc: 'Estilo Super Mario',
      icon: '👾',
      play: (ctx) => {
        tone(ctx, 'square', 988, 0, 0.08, 0.12);
        tone(ctx, 'square', 1319, 0.08, 0.4, 0.12);
        tone(ctx, 'sine', 1319, 0.08, 0.35, 0.1);
      },
    },
    coin3: {
      name: 'Moeda Tripla',
      desc: 'Três moedas caindo',
      icon: '💰',
      play: (ctx) => {
        tone(ctx, 'sine', 880, 0, 0.25, 0.2);
        tone(ctx, 'triangle', 1760, 0, 0.15, 0.06);
        tone(ctx, 'sine', 1109, 0.13, 0.25, 0.2);
        tone(ctx, 'triangle', 2218, 0.13, 0.15, 0.06);
        tone(ctx, 'sine', 1319, 0.26, 0.4, 0.25);
        tone(ctx, 'triangle', 2638, 0.26, 0.25, 0.08);
      },
    },
    cashRegister: {
      name: 'Caixa Registradora',
      desc: 'Cha-ching clássico',
      icon: '🛒',
      play: (ctx) => {
        toneRamp(ctx, 'square', 2200, 3300, 0, 0.12, 0.15);
        toneRamp(ctx, 'square', 3300, 4950, 0, 0.12, 0.1);
        toneRamp(ctx, 'square', 2800, 4200, 0.12, 0.2, 0.15);
        toneRamp(ctx, 'square', 4200, 6300, 0.12, 0.2, 0.1);
        toneRamp(ctx, 'square', 5200, 7800, 0.15, 0.3, 0.05);
        const now = ctx.currentTime;
        const bufferSize = ctx.sampleRate * 0.15;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const d = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3) * 0.08;
        const noise = ctx.createBufferSource();
        const nf = ctx.createBiquadFilter();
        const ng = ctx.createGain();
        noise.buffer = buffer;
        nf.type = 'highpass';
        nf.frequency.value = 4000;
        ng.gain.setValueAtTime(0.3, now + 0.3);
        noise.connect(nf);
        nf.connect(ng);
        ng.connect(ctx.destination);
        noise.start(now + 0.3);
      },
    },
    bell: {
      name: 'Sino',
      desc: 'Ding suave e elegante',
      icon: '🔔',
      play: (ctx) => {
        tone(ctx, 'sine', 1200, 0, 0.8, 0.25);
        tone(ctx, 'sine', 2400, 0, 0.5, 0.08);
        tone(ctx, 'sine', 3600, 0, 0.3, 0.04);
        tone(ctx, 'triangle', 1200, 0, 0.6, 0.06);
      },
    },
    success: {
      name: 'Sucesso',
      desc: 'Jingle de vitória',
      icon: '✨',
      play: (ctx) => {
        tone(ctx, 'sine', 523, 0, 0.15, 0.2);
        tone(ctx, 'sine', 659, 0.12, 0.15, 0.2);
        tone(ctx, 'sine', 784, 0.24, 0.15, 0.2);
        tone(ctx, 'sine', 1047, 0.36, 0.5, 0.25);
        tone(ctx, 'triangle', 1047, 0.36, 0.4, 0.08);
      },
    },
  };

  function playCashSound() {
    if (muted) return;
    ensureAudio();
    const sound = SOUNDS[selectedSound] || SOUNDS.coin;
    sound.play(audioCtxRef.current);
  }

  function playPreview(key) {
    ensureAudio();
    const sound = SOUNDS[key];
    if (sound) sound.play(audioCtxRef.current);
  }

  function handleSelectSound(key) {
    setSelectedSound(key);
    localStorage.setItem('spacesales-sound', key);
    ensureAudio();
    SOUNDS[key].play(audioCtxRef.current);
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

  // ── Date filter helpers (America/Sao_Paulo) ──
  function getDateRange(filter) {
    const now = new Date();
    const todayStr = dateSP(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = dateSP(yesterday);

    switch (filter) {
      case 'today':
        return { from: todayStr, to: todayStr };
      case 'yesterday':
        return { from: yesterdayStr, to: yesterdayStr };
      case '7days': {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        return { from: dateSP(d), to: todayStr };
      }
      case 'thisMonth': {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: dateSP(first), to: todayStr };
      }
      case 'lastMonth': {
        const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const last = new Date(now.getFullYear(), now.getMonth(), 0);
        return { from: dateSP(first), to: dateSP(last) };
      }
      case 'custom':
        return { from: customFrom || todayStr, to: customTo || todayStr };
      default:
        return { from: todayStr, to: todayStr };
    }
  }

  async function loadSales(filter) {
    setLoadingSales(true);
    const { from, to } = getDateRange(filter);
    const { data } = await supabase
      .from('vendas')
      .select('*')
      .gte('data_venda', from)
      .lte('data_venda', to)
      .order('created_at', { ascending: false })
      .limit(200);

    if (data && data.length > 0) {
      setSales(data.map(s => ({ ...s, isNew: false })));
      const t = data.length;
      const l = data.filter(s => s.source === 'loja').length;
      const sh = data.filter(s => s.source === 'shopee').length;
      const r = data.reduce((acc, s) => acc + parseFloat(s.total || 0), 0);
      setStats({ total: t, loja: l, shopee: sh, revenue: r });
    } else {
      setSales([]);
      setStats({ total: 0, loja: 0, shopee: 0, revenue: 0 });
    }
    setLoadingSales(false);
  }

  function handleFilterChange(filter) {
    setDateFilter(filter);
    if (filter !== 'custom') loadSales(filter);
  }

  function applyCustomFilter() {
    if (customFrom && customTo) loadSales('custom');
  }

  // ── Ranking ──
  function buildRanking(salesData, vendedoresData) {
    const map = {};
    for (const v of vendedoresData) {
      map[String(v.vendedor_id)] = { name: v.nome, count: 0, revenue: 0 };
    }
    for (const s of salesData) {
      const vid = String(s.vendedor_id || '');
      if (vid && vid !== '0' && map[vid]) {
        map[vid].count += 1;
        map[vid].revenue += parseFloat(s.total || 0);
      }
    }
    return Object.entries(map)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.revenue - a.revenue || b.count - a.count);
  }

  const ranking = buildRanking(sales, vendedores);

  // ── Load initial sales & subscribe to Realtime ──
  useEffect(() => {
    loadSales('today');
    supabase.from('vendedores').select('*').then(({ data }) => {
      if (data) setVendedores(data);
    });

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
        data: dateSP(new Date()),
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
  const TZ = 'America/Sao_Paulo';
  const fmtMoney = (v) => parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const fmtTime = (t) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: TZ });

  function dateSP(date) {
    return date.toLocaleDateString('sv-SE', { timeZone: TZ });
  }

  const filteredSales = sourceFilter === 'all' ? sales : sales.filter(s => s.source === sourceFilter);

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
        .main-grid {
          display: grid; grid-template-columns: 1fr 420px; gap: 24px;
          padding: 0 40px 40px; align-items: start;
        }
        .main { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
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

        .sound-grid { display: flex; flex-direction: column; gap: 8px; }
        .sound-option {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px; border-radius: 12px; cursor: pointer;
          border: 1px solid var(--border); background: var(--bg);
          transition: all 0.2s ease;
        }
        .sound-option:hover { border-color: rgba(255,255,255,0.15); background: var(--surface-2); }
        .sound-option.selected {
          border-color: var(--accent); background: rgba(0,230,138,0.06);
          box-shadow: 0 0 12px var(--accent-glow);
        }
        .sound-option-left { display: flex; align-items: center; gap: 12px; }
        .sound-option-icon { font-size: 24px; width: 36px; text-align: center; }
        .sound-option-name { font-size: 14px; font-weight: 600; }
        .sound-option.selected .sound-option-name { color: var(--accent); }
        .sound-option-desc { font-size: 12px; color: var(--text-dim); margin-top: 1px; }
        .btn-preview {
          width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--border);
          background: var(--surface-2); color: var(--text-dim); font-size: 12px;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .btn-preview:hover { background: var(--accent); color: var(--bg); border-color: var(--accent); }

        .filter-bar {
          padding: 0 40px 0; display: flex; flex-direction: column; gap: 12px;
        }
        .filter-pills {
          display: flex; gap: 8px; flex-wrap: wrap;
        }
        .filter-pill {
          padding: 8px 18px; border-radius: 100px; border: 1px solid var(--border);
          background: var(--surface); color: var(--text-dim); font-family: 'Outfit', sans-serif;
          font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s ease;
          white-space: nowrap;
        }
        .filter-pill:hover { border-color: rgba(255,255,255,0.15); color: var(--text); }
        .filter-pill.active {
          background: var(--accent); color: var(--bg); border-color: var(--accent);
          font-weight: 600; box-shadow: 0 0 16px var(--accent-glow);
        }
        .custom-date-row {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        }
        .date-input {
          padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border);
          background: var(--surface); color: var(--text); font-family: 'JetBrains Mono', monospace;
          font-size: 13px; outline: none; transition: border-color 0.2s;
        }
        .date-input:focus { border-color: var(--accent); }
        .date-sep { color: var(--text-dim); font-size: 13px; }
        .btn-apply {
          padding: 10px 22px; border-radius: 10px; border: 1px solid var(--accent);
          background: var(--accent); color: var(--bg); font-family: 'Outfit', sans-serif;
          font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        .btn-apply:hover { box-shadow: 0 0 20px var(--accent-glow); }

        .source-filter { display: flex; align-items: center; gap: 8px; }
        .source-filter-label {
          font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;
          color: var(--text-dim); margin-right: 4px;
        }
        .source-pill {
          padding: 7px 16px; border-radius: 100px; border: 1px solid var(--border);
          background: var(--surface); color: var(--text-dim); font-family: 'Outfit', sans-serif;
          font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s ease;
        }
        .source-pill:hover { border-color: rgba(255,255,255,0.15); color: var(--text); }
        .source-pill.active.all {
          background: var(--accent); color: var(--bg); border-color: var(--accent);
          font-weight: 600; box-shadow: 0 0 12px var(--accent-glow);
        }
        .source-pill.active.loja {
          background: var(--loja); color: #fff; border-color: var(--loja);
          font-weight: 600; box-shadow: 0 0 12px var(--loja-glow);
        }
        .source-pill.active.shopee {
          background: var(--shopee); color: #fff; border-color: var(--shopee);
          font-weight: 600; box-shadow: 0 0 12px var(--shopee-glow);
        }

        /* Ranking */
        .ranking-panel {
          background: var(--surface); border: 1px solid var(--border); border-radius: 20px;
          padding: 28px; position: sticky; top: 90px;
        }
        .ranking-header {
          margin-bottom: 20px; text-align: center;
        }
        .ranking-header .section-title { font-size: 16px; letter-spacing: 2px; }
        .ranking-empty {
          color: var(--text-dim); font-size: 14px; text-align: center; padding: 40px 0;
        }
        .ranking-list { display: flex; flex-direction: column; gap: 12px; }
        .rank-card {
          display: flex; align-items: center; gap: 14px; padding: 18px 20px;
          border-radius: 14px; border: 1px solid var(--border); background: var(--bg);
          transition: all 0.2s ease;
        }
        .rank-card.top-1 {
          border: none; background: rgba(255,215,0,0.08);
          box-shadow: 0 0 30px rgba(255,215,0,0.2), 0 0 60px rgba(255,215,0,0.08);
          padding: 24px 22px; position: relative; overflow: hidden;
        }
        .rank-card.top-1::before {
          content: ''; position: absolute; inset: -2px; border-radius: 16px; z-index: -1;
          background: conic-gradient(from var(--neon-angle, 0deg),
            #ffd700, #ffaa00, #ff8800, #ffd700, #fff7aa, #ffd700);
          animation: neonSpin 3s linear infinite;
        }
        .rank-card.top-1::after {
          content: ''; position: absolute; inset: 2px; border-radius: 13px;
          background: var(--bg); z-index: -1;
        }
        @property --neon-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes neonSpin {
          to { --neon-angle: 360deg; }
        }
        .rank-card.top-2 {
          border-color: #aaa; background: rgba(192,192,192,0.05);
          box-shadow: 0 0 12px rgba(192,192,192,0.08);
        }
        .rank-card.top-3 {
          border-color: #cd7f32; background: rgba(205,127,50,0.05);
          box-shadow: 0 0 12px rgba(205,127,50,0.08);
        }
        .rank-card.last-place {
          border-color: rgba(255,68,68,0.2); background: rgba(255,68,68,0.03);
          opacity: 0.6;
        }
        .rank-position {
          width: 44px; text-align: center; flex-shrink: 0;
        }
        .rank-medal { font-size: 32px; }
        .rank-card.top-1 .rank-medal { font-size: 38px; filter: drop-shadow(0 0 6px rgba(255,215,0,0.5)); }
        .rank-number {
          font-size: 18px; font-weight: 700; color: var(--text-dim);
          font-family: 'JetBrains Mono', monospace;
        }
        .rank-info { flex: 1; min-width: 0; }
        .rank-name { font-size: 17px; font-weight: 700; }
        .rank-card.top-1 .rank-name { font-size: 20px; color: var(--gold); }
        .rank-card.top-2 .rank-name { color: #ccc; }
        .rank-card.top-3 .rank-name { color: #cd7f32; }
        .rank-stats { font-size: 13px; color: var(--text-dim); margin-top: 3px; }
        .rank-revenue {
          font-family: 'JetBrains Mono', monospace; font-weight: 800;
          font-size: 18px; color: var(--accent); text-align: right; white-space: nowrap;
        }
        .rank-card.top-1 .rank-revenue { font-size: 22px; color: var(--gold); }
        .rank-revenue small {
          font-size: 12px; font-weight: 500; color: var(--text-dim); margin-right: 2px;
        }
        .rank-card.last-place .rank-revenue { color: var(--text-dim); }

        @media (max-width: 768px) {
          .header { padding: 16px 20px; }
          .stats-bar { padding: 16px 20px; gap: 10px; }
          .main { padding: 0; }
          .stat-card { min-width: 140px; padding: 16px; }
          .stat-value { font-size: 24px; }
          .sale-card { flex-wrap: wrap; padding: 16px; }
          .sale-amount { font-size: 22px; }
          .big-notify-text { font-size: 28px; }
          .big-notify-amount { font-size: 40px; }
          .config-panel { width: 95%; }
          .main-grid { grid-template-columns: 1fr; padding: 0 20px 20px; gap: 20px; }
          .ranking-panel { position: static; }
          .filter-bar { padding: 0 20px; }
          .filter-pills { gap: 6px; }
          .filter-pill { padding: 7px 14px; font-size: 12px; }
          .custom-date-row { flex-direction: column; align-items: stretch; }
          .date-input { width: 100%; }
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

        <div className="filter-bar">
          <div className="filter-pills">
            {[
              { key: 'today', label: 'Hoje' },
              { key: 'yesterday', label: 'Ontem' },
              { key: '7days', label: '7 dias' },
              { key: 'thisMonth', label: 'Este mês' },
              { key: 'lastMonth', label: 'Mês passado' },
              { key: 'custom', label: 'Personalizado' },
            ].map(f => (
              <button
                key={f.key}
                className={`filter-pill ${dateFilter === f.key ? 'active' : ''}`}
                onClick={() => handleFilterChange(f.key)}
              >{f.label}</button>
            ))}
          </div>
          {dateFilter === 'custom' && (
            <div className="custom-date-row">
              <input
                type="date"
                className="date-input"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <span className="date-sep">até</span>
              <input
                type="date"
                className="date-input"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
              <button className="btn-apply" onClick={applyCustomFilter}>Filtrar</button>
            </div>
          )}
          <div className="source-filter">
            <span className="source-filter-label">Canal:</span>
            <button
              className={`source-pill ${sourceFilter === 'all' ? 'active all' : ''}`}
              onClick={() => setSourceFilter('all')}
            >Todas</button>
            <button
              className={`source-pill ${sourceFilter === 'loja' ? 'active loja' : ''}`}
              onClick={() => setSourceFilter('loja')}
            >🏪 Loja</button>
            <button
              className={`source-pill ${sourceFilter === 'shopee' ? 'active shopee' : ''}`}
              onClick={() => setSourceFilter('shopee')}
            >🛒 Shopee</button>
          </div>
        </div>

        <div className="main-grid">
          <div className="main">
            <div className="section-header">
              <div className="section-title">
                {loadingSales ? '⏳ Carregando...' : `🔔 Vendas ${dateFilter === 'today' ? 'ao Vivo' : ''}`}
              </div>
              <button className="btn-test" onClick={simulateSale}>⚡ Simular Venda</button>
            </div>

            {filteredSales.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📡</div>
                <div className="empty-text">{sales.length === 0 ? 'Aguardando vendas...' : 'Nenhuma venda para este canal'}</div>
                <div className="empty-sub">{sales.length === 0 ? 'Conectado ao Supabase Realtime' : `Mostrando: ${sourceFilter === 'loja' ? 'Loja' : 'Shopee'}`}</div>
              </div>
            ) : (
              filteredSales.map((sale) => (
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

          <div className="ranking-panel">
            <div className="ranking-header">
              <div className="section-title">🏆 Ranking Vendedores</div>
            </div>
            {ranking.length === 0 ? (
              <div className="ranking-empty">Nenhum vendedor cadastrado</div>
            ) : (
              <div className="ranking-list">
                {ranking.map((v, i) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  const isTop3 = i < 3;
                  const isLast = i === ranking.length - 1 && ranking.length > 1;
                  return (
                    <div key={v.id} className={`rank-card ${isTop3 ? `top-${i + 1}` : ''} ${isLast && !isTop3 ? 'last-place' : ''}`}>
                      <div className="rank-position">
                        {isTop3 ? <span className="rank-medal">{medals[i]}</span> : <span className="rank-number">{i + 1}º</span>}
                      </div>
                      <div className="rank-info">
                        <div className="rank-name">{v.name}</div>
                        <div className="rank-stats">
                          <span>{v.count} venda{v.count !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div className="rank-revenue">
                        <small>R$</small> {fmtMoney(v.revenue)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
                  <div className="config-label">🔊 Som da Notificação</div>
                  <div className="sound-grid">
                    {Object.entries(SOUNDS).map(([key, s]) => (
                      <div
                        key={key}
                        className={`sound-option ${selectedSound === key ? 'selected' : ''}`}
                        onClick={() => handleSelectSound(key)}
                      >
                        <div className="sound-option-left">
                          <span className="sound-option-icon">{s.icon}</span>
                          <div>
                            <div className="sound-option-name">{s.name}</div>
                            <div className="sound-option-desc">{s.desc}</div>
                          </div>
                        </div>
                        <button
                          className="btn-preview"
                          onClick={(e) => { e.stopPropagation(); playPreview(key); }}
                          title="Ouvir som"
                        >▶</button>
                      </div>
                    ))}
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
