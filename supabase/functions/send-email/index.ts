import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'npm:resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

// ✅ Headers CORS corrects
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // ou 'https://www.pharmaconnect-dz.com'
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  // ✅ Répond aux requêtes preflight (OPTIONS) avec un 200
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const { to, subject, content } = await req.json()

    const result = await resend.emails.send({
      from: 'PharmaConnect <noreply@pharmaconnect-dz.com>',
      to: [to],
      subject,
      text: content,
    })

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: corsHeaders,
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Erreur lors de l’envoi de l’email',
        error,
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    )
  }
})
