'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bbosjuhhyzoadkvmflmd.supabase.co',
  'sb_publishable_7sg7jD8s3pszFaFse_uSKg_dlWqC8VN'
);

export default function Vendedores() {
  const [vendedores, setVendedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [vendedorId, setVendedorId] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editVendedorId, setEditVendedorId] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    loadVendedores();
  }, []);

  async function loadVendedores() {
    setLoading(true);
    const { data, error } = await supabase
      .from('vendedores')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setVendedores(data);
    if (error) showMsg('Erro ao carregar vendedores', 'error');
    setLoading(false);
  }

  function showMsg(text, type = 'success') {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!nome.trim() || !vendedorId.trim()) {
      showMsg('Preencha todos os campos', 'error');
      return;
    }

    // Check duplicate vendedor_id
    const exists = vendedores.find(v => String(v.vendedor_id).trim() === vendedorId.trim());
    if (exists) {
      showMsg(`ID "${vendedorId}" já está cadastrado para "${exists.nome}"`, 'error');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('vendedores')
      .insert([{ vendedor_id: vendedorId.trim(), nome: nome.trim() }]);

    if (error) {
      showMsg('Erro ao cadastrar: ' + error.message, 'error');
    } else {
      showMsg(`Vendedor "${nome.trim()}" cadastrado com sucesso!`);
      setNome('');
      setVendedorId('');
      await loadVendedores();
    }
    setSaving(false);
  }

  async function handleUpdate(id) {
    if (!editNome.trim() || !editVendedorId.trim()) {
      showMsg('Preencha todos os campos', 'error');
      return;
    }

    const duplicate = vendedores.find(
      v => String(v.vendedor_id).trim() === editVendedorId.trim() && v.id !== id
    );
    if (duplicate) {
      showMsg(`ID "${editVendedorId}" já está cadastrado para "${duplicate.nome}"`, 'error');
      return;
    }

    const { error } = await supabase
      .from('vendedores')
      .update({ nome: editNome.trim(), vendedor_id: editVendedorId.trim() })
      .eq('id', id);

    if (error) {
      showMsg('Erro ao atualizar: ' + error.message, 'error');
    } else {
      showMsg('Vendedor atualizado com sucesso!');
      setEditingId(null);
      await loadVendedores();
    }
  }

  async function handleDelete(id) {
    const { error } = await supabase
      .from('vendedores')
      .delete()
      .eq('id', id);

    if (error) {
      showMsg('Erro ao excluir: ' + error.message, 'error');
    } else {
      showMsg('Vendedor excluído com sucesso!');
      setConfirmDelete(null);
      await loadVendedores();
    }
  }

  function startEdit(v) {
    setEditingId(v.id);
    setEditNome(v.nome);
    setEditVendedorId(v.vendedor_id);
    setConfirmDelete(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditNome('');
    setEditVendedorId('');
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --bg: #0a0a0f; --surface: #12121a; --surface-2: #1a1a26; --border: #2a2a3a;
          --text: #e8e8f0; --text-dim: #7a7a90; --accent: #00e68a; --accent-glow: rgba(0,230,138,0.15);
          --danger: #ff4466; --danger-glow: rgba(255,68,102,0.15);
          --warning: #ffaa00; --warning-glow: rgba(255,170,0,0.15);
          --loja: #4d9aff;
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
        .app { position: relative; z-index: 1; max-width: 900px; margin: 0 auto; padding: 0 20px; }

        .header {
          padding: 24px 0; display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid var(--border); margin-bottom: 32px;
        }
        .header-left { display: flex; align-items: center; gap: 16px; }
        .logo {
          width: 42px; height: 42px; background: linear-gradient(135deg, var(--accent), #00b36b);
          border-radius: 12px; display: flex; align-items: center; justify-content: center;
          font-size: 20px; font-weight: 800; color: var(--bg); box-shadow: 0 0 20px var(--accent-glow);
        }
        .header-title { font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
        .header-title span { color: var(--accent); }
        .btn-back {
          background: var(--surface-2); border: 1px solid var(--border); color: var(--text);
          padding: 8px 16px; border-radius: 10px; cursor: pointer; font-size: 14px;
          font-family: 'Outfit', sans-serif; transition: all 0.2s; text-decoration: none;
          display: flex; align-items: center; gap: 8px;
        }
        .btn-back:hover { border-color: var(--accent); color: var(--accent); }

        .section-title {
          font-size: 16px; font-weight: 600; margin-bottom: 16px;
          display: flex; align-items: center; gap: 8px;
        }

        /* Form */
        .form-card {
          background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
          padding: 24px; margin-bottom: 32px;
        }
        .form-row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
        .form-group { flex: 1; min-width: 180px; }
        .form-label {
          display: block; font-size: 13px; color: var(--text-dim); margin-bottom: 6px;
          font-weight: 500;
        }
        .form-input {
          width: 100%; padding: 10px 14px; background: var(--surface-2); border: 1px solid var(--border);
          border-radius: 10px; color: var(--text); font-size: 14px; font-family: 'Outfit', sans-serif;
          outline: none; transition: all 0.2s;
        }
        .form-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
        .form-input::placeholder { color: var(--text-dim); opacity: 0.5; }
        .btn-add {
          background: linear-gradient(135deg, var(--accent), #00b36b); border: none;
          color: var(--bg); padding: 10px 24px; border-radius: 10px; cursor: pointer;
          font-size: 14px; font-weight: 600; font-family: 'Outfit', sans-serif;
          transition: all 0.2s; white-space: nowrap;
        }
        .btn-add:hover { transform: translateY(-1px); box-shadow: 0 4px 20px var(--accent-glow); }
        .btn-add:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        /* Table */
        .table-card {
          background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
          overflow: hidden;
        }
        .table-header {
          display: grid; grid-template-columns: 60px 1fr 1fr 160px;
          padding: 14px 20px; background: var(--surface-2); border-bottom: 1px solid var(--border);
          font-size: 12px; font-weight: 600; color: var(--text-dim); text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .table-row {
          display: grid; grid-template-columns: 60px 1fr 1fr 160px;
          padding: 14px 20px; border-bottom: 1px solid rgba(42,42,58,0.5);
          align-items: center; transition: background 0.15s;
        }
        .table-row:hover { background: rgba(255,255,255,0.02); }
        .table-row:last-child { border-bottom: none; }
        .row-id {
          font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text-dim);
        }
        .row-name { font-weight: 500; }
        .row-vid {
          font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--loja);
        }
        .row-actions { display: flex; gap: 8px; justify-content: flex-end; }
        .btn-edit, .btn-delete, .btn-save, .btn-cancel {
          border: 1px solid var(--border); padding: 6px 12px; border-radius: 8px;
          cursor: pointer; font-size: 13px; font-family: 'Outfit', sans-serif;
          transition: all 0.2s; background: var(--surface-2); color: var(--text);
        }
        .btn-edit:hover { border-color: var(--loja); color: var(--loja); }
        .btn-delete { color: var(--danger); }
        .btn-delete:hover { border-color: var(--danger); background: var(--danger-glow); }
        .btn-save {
          background: var(--accent); color: var(--bg); border-color: var(--accent); font-weight: 600;
        }
        .btn-save:hover { box-shadow: 0 2px 12px var(--accent-glow); }
        .btn-cancel:hover { border-color: var(--text-dim); }

        /* Edit inline */
        .edit-input {
          width: 100%; padding: 6px 10px; background: var(--bg); border: 1px solid var(--accent);
          border-radius: 8px; color: var(--text); font-size: 14px; font-family: 'Outfit', sans-serif;
          outline: none;
        }
        .edit-input.mono { font-family: 'JetBrains Mono', monospace; font-size: 13px; }

        /* Confirm delete */
        .confirm-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 200;
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(4px);
        }
        .confirm-box {
          background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
          padding: 28px; max-width: 400px; text-align: center;
        }
        .confirm-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
        .confirm-text { font-size: 14px; color: var(--text-dim); margin-bottom: 20px; }
        .confirm-actions { display: flex; gap: 12px; justify-content: center; }
        .btn-confirm-delete {
          background: var(--danger); border: none; color: #fff; padding: 10px 24px;
          border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600;
          font-family: 'Outfit', sans-serif; transition: all 0.2s;
        }
        .btn-confirm-delete:hover { box-shadow: 0 4px 20px var(--danger-glow); }
        .btn-confirm-cancel {
          background: var(--surface-2); border: 1px solid var(--border); color: var(--text);
          padding: 10px 24px; border-radius: 10px; cursor: pointer; font-size: 14px;
          font-family: 'Outfit', sans-serif; transition: all 0.2s;
        }
        .btn-confirm-cancel:hover { border-color: var(--text-dim); }

        /* Message toast */
        .toast {
          position: fixed; top: 24px; right: 24px; z-index: 300;
          padding: 14px 24px; border-radius: 12px; font-size: 14px; font-weight: 500;
          animation: slideIn 0.3s ease;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .toast.success {
          background: linear-gradient(135deg, rgba(0,230,138,0.15), rgba(0,179,107,0.15));
          border: 1px solid var(--accent); color: var(--accent);
        }
        .toast.error {
          background: linear-gradient(135deg, rgba(255,68,102,0.15), rgba(200,50,80,0.15));
          border: 1px solid var(--danger); color: var(--danger);
        }
        @keyframes slideIn {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        /* Empty */
        .empty-state {
          text-align: center; padding: 48px 20px; color: var(--text-dim);
        }
        .empty-icon { font-size: 48px; margin-bottom: 12px; }
        .empty-text { font-size: 16px; font-weight: 500; }
        .empty-sub { font-size: 13px; margin-top: 4px; }

        /* Loading */
        .loading-text { text-align: center; padding: 40px; color: var(--text-dim); }

        /* Count badge */
        .count-badge {
          background: var(--surface-2); border: 1px solid var(--border);
          padding: 2px 10px; border-radius: 100px; font-size: 13px; color: var(--text-dim);
          font-family: 'JetBrains Mono', monospace;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .table-header, .table-row { grid-template-columns: 40px 1fr 1fr 120px; padding: 12px 14px; }
          .form-row { flex-direction: column; }
          .form-group { min-width: 100%; }
          .btn-add { width: 100%; text-align: center; }
        }
      `}</style>

      <div className="app">
        <div className="header">
          <div className="header-left">
            <div className="logo">S</div>
            <div className="header-title">Space<span>Sales</span> — Vendedores</div>
          </div>
          <a href="/" className="btn-back">← Voltar ao Dashboard</a>
        </div>

        {/* Form de cadastro */}
        <div className="section-title">➕ Cadastrar Vendedor</div>
        <div className="form-card">
          <form onSubmit={handleAdd}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nome do Vendedor</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Ex: João Silva"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">ID do Vendedor (Bling)</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Ex: 15596517756"
                  value={vendedorId}
                  onChange={(e) => setVendedorId(e.target.value)}
                />
              </div>
              <button className="btn-add" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : '+ Cadastrar'}
              </button>
            </div>
          </form>
        </div>

        {/* Lista de vendedores */}
        <div className="section-title">
          👥 Vendedores Cadastrados
          <span className="count-badge">{vendedores.length}</span>
        </div>

        <div className="table-card">
          {loading ? (
            <div className="loading-text">Carregando vendedores...</div>
          ) : vendedores.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👤</div>
              <div className="empty-text">Nenhum vendedor cadastrado</div>
              <div className="empty-sub">Cadastre o primeiro vendedor usando o formulário acima</div>
            </div>
          ) : (
            <>
              <div className="table-header">
                <div>#</div>
                <div>Nome</div>
                <div>ID Vendedor</div>
                <div style={{ textAlign: 'right' }}>Ações</div>
              </div>
              {vendedores.map((v, i) => (
                <div className="table-row" key={v.id}>
                  <div className="row-id">{i + 1}</div>

                  {editingId === v.id ? (
                    <>
                      <div>
                        <input
                          className="edit-input"
                          value={editNome}
                          onChange={(e) => setEditNome(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div>
                        <input
                          className="edit-input mono"
                          value={editVendedorId}
                          onChange={(e) => setEditVendedorId(e.target.value)}
                        />
                      </div>
                      <div className="row-actions">
                        <button className="btn-save" onClick={() => handleUpdate(v.id)}>Salvar</button>
                        <button className="btn-cancel" onClick={cancelEdit}>Cancelar</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="row-name">{v.nome}</div>
                      <div className="row-vid">{v.vendedor_id}</div>
                      <div className="row-actions">
                        <button className="btn-edit" onClick={() => startEdit(v)}>Editar</button>
                        <button className="btn-delete" onClick={() => setConfirmDelete(v)}>Excluir</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Toast de mensagem */}
        {msg && <div className={`toast ${msg.type}`}>{msg.text}</div>}

        {/* Modal de confirmação de exclusão */}
        {confirmDelete && (
          <div className="confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null); }}>
            <div className="confirm-box">
              <div className="confirm-title">Excluir vendedor?</div>
              <div className="confirm-text">
                Tem certeza que deseja excluir <strong>{confirmDelete.nome}</strong> (ID: {confirmDelete.vendedor_id})?
                Esta ação não pode ser desfeita.
              </div>
              <div className="confirm-actions">
                <button className="btn-confirm-delete" onClick={() => handleDelete(confirmDelete.id)}>
                  Sim, excluir
                </button>
                <button className="btn-confirm-cancel" onClick={() => setConfirmDelete(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
