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
      .single();

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
        .eq('order_id', orderId)
        .single();

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
      } else if (orderItems) {
        // Add product details to replacements
        if (orderItems.is_parapharmacy && orderItems.parapharmacy_products) {
          replacements.product_name = orderItems.parapharmacy_products.name;
          replacements.product_brand = orderItems.parapharmacy_products.brand || '';
          replacements.product_category = orderItems.parapharmacy_products.category;
          replacements.product_form = ''; // Parapharmacy products don't have form/dosage
          replacements.product_dosage = '';
        } else if (!orderItems.is_parapharmacy && orderItems.medications) {
          replacements.product_name = orderItems.medications.commercial_name;
          replacements.product_form = orderItems.medications.form;
          replacements.product_dosage = orderItems.medications.dosage;
        }

        // Add quantity and unit price
        replacements.quantity = orderItems.quantity.toString();
        replacements.unit_price = orderItems.unit_price.toFixed(2);
        replacements.subtotal = (orderItems.quantity * orderItems.unit_price).toFixed(2);
      }
    }

    const template = await getEmailTemplate(type);
    if (!template) {
      throw new Error(`Email template not found for type: ${type}`);
    }

    const subject = replacePlaceholders(template.subject, replacements);
    const content = replacePlaceholders(template.content, replacements);

    await sendEmail(recipientEmail, subject, content);
  } catch (error) {
    console.error('Error sending order notification email:', error);
    // Don't throw the error to prevent breaking the app flow
  }
}