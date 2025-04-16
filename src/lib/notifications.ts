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
      console.error('Erreur récupération template email :', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Erreur dans getEmailTemplate :', error)
    return null
  }
}

function replacePlaceholders(text: string, replacements: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => replacements[key] || match)
}

async function sendEmail(to: string, subject: string, content: string) {
  try {
    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email-fixed`
    
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
    })

    if (!response.ok) {
      const result = await response.json()
      console.error('Error response from send-email function:', result)
      throw new Error(`Failed to send email: ${result.message || 'Unknown error'}`)
    }

    const result = await response.json()
    return { success: true, result }
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
    console.error('Error sending order notification email:', error)
    // Don't throw the error to prevent breaking the app flow
  }
}