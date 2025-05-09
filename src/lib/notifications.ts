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
  } catch (error) {
    console.error('Error in getEmailTemplate:', error);
    return null;
  }
}

function replacePlaceholders(text: string, replacements: Record<string, string>): string {
  // Handle conditional blocks first
  text = text.replace(/{{#if ([^}]+)}}(.*?){{\/if}}/g, (match, condition, content) => {
    const conditionValue = replacements[condition];
    return conditionValue ? content : '';
  });

  // Then replace regular placeholders
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => replacements[key] || match);
}

async function sendEmail(to: string, subject: string, content: string) {
  try {
    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email-fixed`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        to,
        subject,
        content,
      }),
    });

    if (!response.ok) {
      const result = await response.json();
      console.error('Error response from send-email function:', result);
      throw new Error(`Failed to send email: ${result.message || 'Unknown error'}`);
    }

    const result = await response.json();
    return { success: true, result };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

export async function sendOrderNotification(
  type: string,
  recipientEmail: string,
  replacements: Record<string, string>
) {
  try {
    // If this is an order notification, fetch the order details
    if (type === 'order_accepted' || type === 'order_placed' || type === 'order_canceled') {
      const orderId = replacements.order_id;
      
      // Get order items with product details
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          quantity,
          unit_price,
          is_parapharmacy,
          medications (
            commercial_name,
            form,
            dosage
          ),
          parapharmacy_products (
            name,
            brand,
            category
          )
        `)
        .eq('order_id', orderId);

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
      } else if (orderItems && orderItems.length > 0) {
        // Process each order item
        const processedItems = orderItems.map(item => {
          if (item.is_parapharmacy && item.parapharmacy_products) {
            return {
              name: item.parapharmacy_products.name,
              brand: item.parapharmacy_products.brand || '',
              category: item.parapharmacy_products.category,
              form: '',
              dosage: '',
              quantity: item.quantity,
              unit_price: item.unit_price
            };
          } else if (!item.is_parapharmacy && item.medications) {
            return {
              name: item.medications.commercial_name,
              form: item.medications.form,
              dosage: item.medications.dosage,
              quantity: item.quantity,
              unit_price: item.unit_price
            };
          }
          return null;
        }).filter(Boolean);

        // Create a formatted product list for the email
        const productsList = processedItems
          .map(item => `- ${item.name}${item.form ? ` - ${item.form}` : ''}${item.dosage ? ` ${item.dosage}` : ''} (${item.quantity} unités à ${item.unit_price.toFixed(2)} DZD = ${(item.quantity * item.unit_price).toFixed(2)} DZD)`)
          .join('\n');

        replacements.products_list = productsList;
      }
    }

    // Special handling for offer orders
    if (replacements.offer_name) {
      replacements.product_name = replacements.offer_name;
      replacements.product_form = '';
      replacements.product_dosage = '';
      replacements.product_brand = '';
      replacements.product_category = replacements.offer_type || '';
      
      // For threshold offers, include the minimum purchase amount in the email
      if (replacements.offer_type === 'Offre sur achats libres' && replacements.min_purchase_amount) {
        replacements.min_purchase_amount = replacements.min_purchase_amount;
      }
      
      // Create a special template for pack orders if it doesn't exist
      if (!await getEmailTemplate('pack_order_placed')) {
        // Create a custom email content for pack orders
        const packOrderContent = `Bonjour {{wholesaler_name}},

Une nouvelle commande de pack a été passée par {{pharmacist_name}}.

Détails de la commande :
- Numéro de commande : {{order_id}}
- Nom du pack : {{offer_name}}
- Type : {{offer_type}}
{{#if min_purchase_amount}}- Montant minimum d'achat : {{min_purchase_amount}} DZD{{/if}}
- Montant total : {{total_amount}}

Liste des produits :
{{products_list}}

Veuillez vous connecter à votre espace grossiste sur PharmaConnect :
{{dashboard_url}}

Cordialement,
L'équipe PharmaConnect`;

        // Use this content instead of fetching from database
        const template = {
          subject: 'Nouvelle commande de pack reçue',
          content: packOrderContent
        };
        
        const subject = replacePlaceholders(template.subject, replacements);
        let content = replacePlaceholders(template.content, replacements);
        
        // Add dashboard URL
        content = content.replace('{{dashboard_url}}', `${window.location.origin}/wholesaler/orders`);

        // Add free text products if available
        if (replacements.free_text_products) {
          content = content.replace('Liste des produits :', `Liste des produits :\n\nProduits demandés par le pharmacien :\n${replacements.free_text_products}\n\nProduits inclus dans l'offre :`);
        }

        await sendEmail(recipientEmail, subject, content);
        return;
      }
    }

    const template = await getEmailTemplate(type);
    if (!template) {
      throw new Error(`Email template not found for type: ${type}`);
    }

    const subject = replacePlaceholders(template.subject, replacements);
    let content = replacePlaceholders(template.content, replacements);
    
    // Add dashboard URL based on the notification type
    if (type === 'order_placed') {
      content = content.replace(/Cordialement,/g, 
        `Vous pouvez consulter les détails de cette commande en vous connectant à votre espace grossiste sur PharmaConnect :\n${window.location.origin}/wholesaler/orders\n\nCordialement,`);
      
      // Add free text products if available
      if (replacements.free_text_products) {
        content = content.replace('Liste des produits :', `Liste des produits :\n\nProduits demandés par le pharmacien :\n${replacements.free_text_products}\n\nProduits inclus dans l'offre :`);
      }
    } else if (type === 'order_accepted') {
      content = content.replace(/Cordialement,/g, 
        `Vous pouvez consulter les détails de cette commande en vous connectant à votre espace pharmacien sur PharmaConnect :\n${window.location.origin}/pharmacist/orders\n\nCordialement,`);
    } else if (type === 'order_canceled') {
      content = content.replace(/Cordialement,/g, 
        `Vous pouvez consulter les détails de cette commande en vous connectant à votre espace sur PharmaConnect :\n${window.location.origin}\n\nCordialement,`);
    }

    await sendEmail(recipientEmail, subject, content);
  } catch (error) {
    console.error('Error sending order notification email:', error);
    // Don't throw the error to prevent breaking the app flow
  }
}