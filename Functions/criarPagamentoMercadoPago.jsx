export default async function criarPagamentoMercadoPago({ plano, user_email, user_name }) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('Token do Mercado Pago não configurado');
  }

  const planoPrecos = {
    basico: { valor: 29.90, titulo: 'Plano Básico - ProServ' },
    premium: { valor: 49.90, titulo: 'Plano Premium - ProServ' }
  };

  const planoInfo = planoPrecos[plano];
  
  if (!planoInfo) {
    throw new Error('Plano inválido');
  }

  // Criar preferência de pagamento
  const preference = {
    items: [
      {
        title: planoInfo.titulo,
        quantity: 1,
        unit_price: planoInfo.valor,
        currency_id: 'BRL'
      }
    ],
    payer: {
      email: user_email,
      name: user_name
    },
    back_urls: {
      success: `${process.env.APP_URL || 'https://app.base44.com'}/?payment=success&plano=${plano}`,
      failure: `${process.env.APP_URL || 'https://app.base44.com'}/?payment=failure`,
      pending: `${process.env.APP_URL || 'https://app.base44.com'}/?payment=pending`
    },
    auto_return: 'approved',
    external_reference: JSON.stringify({ plano, user_email }),
    notification_url: `${process.env.APP_URL || 'https://app.base44.com'}/webhook/mercadopago`
  };

  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(preference)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao criar pagamento: ${error}`);
  }

  const data = await response.json();
  
  return {
    init_point: data.init_point,
    preference_id: data.id
  };
}
