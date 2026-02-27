import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  'https://bbosjuhhyzoadkvmflmd.supabase.co',
  'sb_publishable_7sg7jD8s3pszFaFse_uSKg_dlWqC8VN'
);

export async function POST(request) {
  try {
    const body = await request.json();

    // Support both direct body and array format from n8n
    const raw = Array.isArray(body) ? body[0]?.body?.data : body?.data || body;

    const lojaId = raw.loja?.id || 0;
    const isShopee = raw.numeroLoja && raw.numeroLoja !== '' && lojaId > 0 && lojaId !== 205415370;
    const isParticular = lojaId === 205415370;

    const record = {
      venda_id: raw.id,
      numero: raw.numero,
      numero_loja: raw.numeroLoja || '',
      total: raw.total,
      data_venda: raw.data,
      contato_id: raw.contato?.id || null,
      vendedor_id: raw.vendedor?.id || null,
      loja_id: lojaId,
      situacao_id: raw.situacao?.id || null,
      source: isShopee ? 'shopee' : isParticular ? 'particular' : 'loja',
    };

    const { data, error } = await supabase.from('vendas').insert([record]).select();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, sale: data[0] });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
