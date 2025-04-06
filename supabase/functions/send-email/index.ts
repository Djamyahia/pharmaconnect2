import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'npm:resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*', // ou restreindre à ton domaine si tu veux
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  }
}

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('OK', {
      headers: corsHeaders(),
    })
  }

  try {
    const { to, subject, content } = await req.json()

    const data = await resend.emails.send({
      from: 'PharmaConnect <noreply@pharmaconnect-dz.com>',
      to: [to],
      subject,
      text: content,
    })

    return new Response(JSON.stringify({ message: 'Email sent successfully', data }), {
      status: 200,
      headers: corsHeaders(),
    })
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Error sending email', error }), {
      status: 500,
      headers: corsHeaders(),
    })
  }
})
