// src/lib/notifications.ts
import { supabase } from './supabase'

type EmailTemplate = {
  subject: string
  content: string
}

async function getEmailTemplate(type: string): Promise<EmailTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('subject, content')
      .eq('type', type)
      .maybeSingle()
    if (error) {
      console.error('Error fetching email template:', error)
      return null
    }
    return data
  } catch (err) {
    console.error('Error in getEmailTemplate:', err)
    return null
  }
}

function replacePlaceholders(text: string, replacements: Record<string, string>): string {
  // Blocs conditionnels {{#if key}}…{{/if}}
  text = text.replace(/{{#if ([^}]+)}}([\s\S]*?){{\/if}}/g, (_, key, content) =>
    replacements[key] ? content : ''
  )
  // Remplacements simples {{key}}
  return text.replace(/{{(\w+)}}/g, (_, key) => replacements[key] || '')
}

async function sendEmail(to: string, subject: string, content: string) {
  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email-fixed`
  const res = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ to, subject, content }),
  })
  if (!res.ok) {
    const result = await res.json()
    console.error('Error response from send-email:', result)
    throw new Error(`Failed to send email: ${result.message || res.statusText}`)
  }
  return res.json()
}

export async function sendOrderNotification(
  type: string,
  recipientEmail: string,
  replacements: Record<string, string>
) {
  try {
    // --- 1) Notification "Commande acceptée – Appel d'offres" ---
    if (type === 'tender_order_accepted') {
      const tenderId = replacements.tender_id
      const { data: tender, error: tenderErr } = await supabase
        .from('tenders')
        .select(`
          *,
          items:tender_items (
            *,
            medication:medications (commercial_name, form, dosage)
          ),
          responses:tender_responses (
            *,
            wholesaler:users (company_name, email, phone),
            items:tender_response_items (
              *,
              tender_item:tender_items (
                *,
                medication:medications (commercial_name, form, dosage)
              )
            )
          )
        `)
        .eq('id', tenderId)
        .single()
      if (tenderErr || !tender) {
        console.error('Error fetching tender:', tenderErr)
        throw new Error('Impossible de récupérer l’appel d’offres pour l’email')
      }

      // On ne garde que la réponse du destinataire
      const response = tender.responses.find(r => r.wholesaler.email === recipientEmail)

      let responsesHtml: string
      if (response) {
        const total = response.items
          .reduce((sum, ri) => sum + ri.price * (ri.tender_item?.quantity || 0), 0)
          .toFixed(2)
        const itemsHtml = response.items
          .map(ri => {
            const ti = ri.tender_item!
            const lineTotal = (ri.price * (ti.quantity || 0)).toFixed(2)
            return `
              <li style="margin:4px 0;font-size:14px;line-height:1.4;">
                <strong>${ti.medication.commercial_name}</strong>
                ${ti.medication.form ? `– ${ti.medication.form}` : ''}
                ${ti.medication.dosage ? ti.medication.dosage : ''},
                Qté: ${ti.quantity}, PU: ${ri.price.toFixed(2)} DZD,
                UG: ${ri.free_units_percentage ?? '-'}%, Total: ${lineTotal} DZD,
                Livraison: ${new Date(ri.delivery_date).toLocaleDateString('fr-FR')}
              </li>`
          })
          .join('')
        responsesHtml = `
          <div style="background:#f9fafb;padding:12px 16px;border-radius:6px;border:1px solid #e5e7eb;margin:16px 0;">
            <h2 style="font-size:16px;color:#4F46E5;margin:0 0 8px;line-height:1.3;">Votre réponse</h2>
            <ul style="padding-left:20px;margin:0;">${itemsHtml}</ul>
            <p style="margin:12px 0 4px;font-size:14px;line-height:1.5;"><strong>Total :</strong> ${total} DZD</p>
          </div>`
      } else {
        responsesHtml = `<p style="margin:12px 0 4px;font-size:14px;line-height:1.5;">Aucune réponse trouvée pour vous.</p>`
      }

      // Construire l’URL du tableau de bord grossiste
      const baseUrl = import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, '')

      // Template inline avec styles
      const rawHtml = `
<!DOCTYPE html>
<html lang="fr"><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#333;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
    <div style="background:#4F46E5;padding:16px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:20px;line-height:1.2;">Commande acceptée</h1>
    </div>
    <div style="padding:16px;">
      <p style="margin:12px 0 4px;font-size:14px;line-height:1.5;">Bonjour {{wholesaler_name}},</p>
      <p style="margin:12px 0 4px;font-size:14px;line-height:1.5;">
        Le pharmacien a accepté votre proposition et a passé commande.
      </p>

      <div style="background:#f9fafb;padding:12px 16px;border-radius:6px;border:1px solid #e5e7eb;margin:16px 0;">
        <h2 style="font-size:16px;color:#4F46E5;margin:0 0 8px;line-height:1.3;">Détails de la commande</h2>
        <p style="margin:6px 0;font-size:14px;line-height:1.5;"><strong>Numéro :</strong> {{order_id}}</p>
        <p style="margin:6px 0;font-size:14px;line-height:1.5;"><strong>Appel d'offres :</strong> {{tender_title}}</p>
        <p style="margin:6px 0;font-size:14px;line-height:1.5;"><strong>Date de livraison :</strong> {{delivery_date}}</p>
        <p style="margin:6px 0;font-size:14px;line-height:1.5;"><strong>Montant total :</strong> {{total_amount}} DZD</p>
      </div>

      
      ${responsesHtml}
      <div style="background:#eef6ff;padding:12px 16px;border-radius:6px;border:1px solid #cddffc;margin:16px 0;">
        <h2 style="font-size:16px;color:#2563eb;margin:0 0 8px;line-height:1.3;">
          Coordonnées du pharmacien
        </h2>
        <p style="margin:4px 0;font-size:14px;line-height:1.5;">
          <strong>Nom :</strong> {{pharmacist_name}}
        </p>
        <p style="margin:4px 0;font-size:14px;line-height:1.5;">
          <strong>Email :</strong> <a href="mailto:{{pharmacist_email}}">{{pharmacist_email}}</a>
        </p>
        <p style="margin:4px 0;font-size:14px;line-height:1.5;">
          <strong>Téléphone :</strong> {{pharmacist_phone}}
        </p>
        <p style="margin:4px 0;font-size:14px;line-height:1.5;">
          <strong>Adresse :</strong> {{pharmacist_address}}, {{pharmacist_wilaya}}
        </p>
        <p style="margin:12px 0 0;font-size:14px;line-height:1.5;">
          Merci de prendre directement contact avec le pharmacien pour finaliser votre commande.
        </p>
      </div>


      

      


      <p style="margin:12px 0 4px;font-size:14px;line-height:1.5;">Cordialement,<br/>L’équipe PharmaConnect</p>
    </div>
    <div style="font-size:12px;color:#777;text-align:center;padding:16px;border-top:1px solid #eee;">
      Cet email a été envoyé automatiquement par PharmaConnect.<br/>
      © ${new Date().getFullYear()} PharmaConnect. Tous droits réservés.
    </div>
  </div>
</body></html>
      `

      // On remplace enfin les {{…}} par leurs valeurs
      const html = replacePlaceholders(rawHtml, replacements)

      await sendEmail(
        recipientEmail,
        `Commande acceptée – Appel d'offres : ${replacements.tender_title}`,
        html
      )
      return
    }

    //
    // 2) Les autres notifications (order_placed, order_accepted classique, pack…)
    //
    const template = await getEmailTemplate(type)
    if (!template) throw new Error(`Template not found: ${type}`)
    const body = replacePlaceholders(template.content, replacements)
    const subject = replacePlaceholders(template.subject, replacements)
    await sendEmail(recipientEmail, subject, body)
  } catch (err) {
    console.error('Error in sendOrderNotification:', err)
  }
}
