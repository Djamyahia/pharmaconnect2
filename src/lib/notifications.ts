import { supabase } from './supabase'

type EmailTemplate = {
  subject: string
  content: string
}

// 🔧 Fonction pour récupérer le modèle d'email depuis la table Supabase
async function getEmailTemplate(type: string): Promise<EmailTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('subject, content')
      .eq('type', type)
      .single()

    if (error) {
      console.error('Erreur récupération template email :', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Erreur dans getEmailTemplate :', error)
    return null
  }
}

// 🔁 Remplace les {{variables}} par leurs vraies valeurs
function replacePlaceholders(text: string, replacements: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => replacements[key] || match)
}

// 📤 Envoie l'email en appelant ta Supabase Function sécurisée
async function sendEmail(to: string, subject: string, content: string) {
  try {
    const response = await fetch(
      'https://cdrjlcgnnyrwpmewivjn.functions.supabase.co/send-email-v2',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, // doit être défini dans .env ou Vercel
        },
        body: JSON.stringify({
          to,
          subject,
          content,
        }),
      }
    )

    const result = await response.json()

    if (!response.ok) {
      console.error('Erreur API Resend via Supabase Function :', result)
      throw new Error('Échec de l\'envoi de l\'email')
    }

    return { success: true }
  } catch (error) {
    console.error('Erreur d\'envoi de l\'email :', error)
    throw error
  }
}

// 📦 Fonction principale appelée lors d'une commande ou notification
export async function sendOrderNotification(
  type: string,
  recipientEmail: string,
  replacements: Record<string, string>
) {
  try {
    const template = await getEmailTemplate(type)
    if (!template) {
      throw new Error(`Modèle d'email introuvable pour le type : ${type}`)
    }

    const subject = replacePlaceholders(template.subject, replacements)
    const content = replacePlaceholders(template.content, replacements)

    await sendEmail(recipientEmail, subject, content)
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification email :', error)
    // On n'interrompt pas le reste de l'app même si ça échoue
  }
}
