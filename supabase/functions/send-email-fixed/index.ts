import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend@1.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }

    const resend = new Resend(resendApiKey)

    const { to, subject, content } = await req.json()

    if (!to || !subject || !content) {
      throw new Error('Missing required fields: to, subject, or content')
    }

    const result = await resend.emails.send({
      from: 'PharmaConnect <noreply@pharmaconnect-dz.com>',
      to: [to],
      subject,
      text: content,
    })

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred',
        error: error instanceof Error ? error.toString() : error,
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    )
  }
})