import { supabase } from './supabase';

type EmailTemplate = {
  subject: string;
  content: string;
};

async function getEmailTemplate(type: string): Promise<EmailTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('subject, content')
      .eq('type', type)
      .maybeSingle();
    if (error) {
      console.error('Error fetching email template:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Error in getEmailTemplate:', err);
    return null;
  }
}

function replacePlaceholders(text: string, replacements: Record<string, string>): string {
  // Handle conditional blocks first
  text = text.replace(/{{#if ([^}]+)}}([\s\S]*?){{\/if}}/g, (_, key, content) =>
    replacements[key] ? content : ''
  );
  // Then replace regular placeholders
  return text.replace(/{{(\w+)}}/g, (_, key) => replacements[key] || '');
}

async function sendEmail(to: string, subject: string, content: string) {
  try {
    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email-fixed`;
    const res = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ to, subject, content }),
    });
    if (!res.ok) {
      const result = await res.json();
      console.error('Error response from send-email:', result);
      throw new Error(`Failed to send email: ${result.message || res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error('Error sending email:', err);
    throw err;
  }
}

export async function sendOrderNotification(
  type: string,
  recipientEmail: string,
  replacements: Record<string, string>
) {
  try {
    const orderTypes = ['order_accepted', 'order_placed', 'order_canceled'];
    if (orderTypes.includes(type)) {
      const orderId = replacements.order_id;
      // Fetch order metadata to detect pack
      const { data: orderMeta, error: metaErr } = await supabase
        .from('orders')
        .select('metadata')
        .eq('id', orderId)
        .single();
      if (metaErr) console.error('Error fetching order metadata:', metaErr);

      const offerId = orderMeta?.metadata?.offer_id;
      let productsList = '';

      if (offerId) {
        // Pack: fetch offer_products to get %UG
        const { data: offerProducts, error: opErr } = await supabase
          .from('offer_products')
          .select('quantity, price, free_units_percentage, medications(commercial_name, form, dosage)')
          .eq('offer_id', offerId);
        if (opErr) console.error('Error fetching offer_products:', opErr);
        else if (offerProducts) {
          productsList = offerProducts
            .map(op => {
              const { commercial_name, form, dosage } = op.medications;
              const label = `${commercial_name}${form ? ` – ${form}` : ''}${dosage ? ` ${dosage}` : ''}`;
              const paidQty = op.quantity;
              const unitPrice = op.price;
              const total = (paidQty * unitPrice).toFixed(2);
              const ugPct = op.free_units_percentage || 0;
              let line = `- ${label} : ${paidQty} unité(s) payante(s)`;
              if (ugPct > 0) {
                line += `, +${ugPct}% UG`;
              }
              line += ` à ${unitPrice.toFixed(2)} DZD chacune (Total payé = ${total} DZD)`;
              return line;
            })
            .join('\n');
        }
      } else {
        // Normal: fetch order_items
        const { data: orderItems, error: itemsErr } = await supabase
          .from('order_items')
          .select('quantity, unit_price, is_parapharmacy, medications(commercial_name, form, dosage), parapharmacy_products(name)')
          .eq('order_id', orderId);
        if (itemsErr) console.error('Error fetching order_items:', itemsErr);
        else if (orderItems) {
          productsList = orderItems
            .map(item => {
              const name = item.is_parapharmacy ? item.parapharmacy_products!.name : item.medications!.commercial_name;
              const form = item.medications?.form || '';
              const dosage = item.medications?.dosage || '';
              const qty = item.quantity;
              const price = item.unit_price;
              const total = (qty * price).toFixed(2);
              return `- ${name}${form ? ` – ${form}` : ''}${dosage ? ` ${dosage}` : ''}` +
                     ` : ${qty} unité(s) à ${price.toFixed(2)} DZD chacune (Total = ${total} DZD)`;
            })
            .join('\n');
        }
      }
      replacements.products_list = productsList;
    }

    // Pack inline template override
    if (replacements.offer_name) {
      const tpl = `Bonjour {{wholesaler_name}},

Une nouvelle commande de pack a été passée par {{pharmacist_name}}.

Détails de la commande :
- Numéro de commande : {{order_id}}
- Nom du pack          : {{offer_name}}
- Type de pack         : {{offer_type}}
{{#if min_purchase_amount}}- Montant minimum d'achat : {{min_purchase_amount}} DZD{{/if}}
- Montant total        : {{total_amount}}

Liste des produits (UG indiquées par produit) :
{{products_list}}

Vous pouvez consulter cette commande dans votre espace grossiste :
{{dashboard_url}}

Cordialement,
L'équipe PharmaConnect`;
      const subject = replacePlaceholders('Nouvelle commande de pack reçue', replacements);
      let content = replacePlaceholders(tpl, replacements);
      content = content.replace('{{dashboard_url}}', `${window.location.origin}/wholesaler/orders`);
      await sendEmail(recipientEmail, subject, content);
      return;
    }

    // Standard templates
    const template = await getEmailTemplate(type);
    if (!template) throw new Error(`Template not found: ${type}`);
    let content = replacePlaceholders(template.content, replacements);
    const subject = replacePlaceholders(template.subject, replacements);
    if (type === 'order_placed') content = `Vous pouvez consulter votre commande : ${window.location.origin}/wholesaler/orders\n\n` + content;
    else if (type === 'order_accepted') content = `Vous pouvez consulter votre commande : ${window.location.origin}/pharmacist/orders\n\n` + content;
    await sendEmail(recipientEmail, subject, content);
  } catch (err) {
    console.error('Error in sendOrderNotification:', err);
  }
}
