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
      .single()

    if (error) {
      console.error('Error fetching email template:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getEmailTemplate:', error)
    return null
  }
}

function replacePlaceholders(text: string, replacements: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => replacements[key] || match)
}

async function sendEmail(to: string, subject: string, content: string) {
  try {
    const response = await fetch('https://cdrjlcgnnyrwpmewivjn.functions.supabase.co/send-email', {
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
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Resend API error:', error)
      throw new Error('Failed to send email')
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}

export async function sendOrderNotification(
  type: string,
  recipientEmail: string,
  replacements: Record<string, string>
) {
  try {
    const template = await getEmailTemplate(type)
    if (!template) {
      throw new Error(`Email template not found for type: ${type}`)
    }

    const subject = replacePlaceholders(template.subject, replacements)
    const content = replacePlaceholders(template.content, replacements)

    await sendEmail(recipientEmail, subject, content)
  } catch (error) {
    console.error('Error sending order notification:', error)
  }
}
