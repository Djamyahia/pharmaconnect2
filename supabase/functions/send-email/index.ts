import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'npm:resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

serve(async (req) => {
  const { to, subject, content } = await req.json()

  try {
    const data = await resend.emails.send({
      from: 'PharmaConnect <noreply@pharmaconnect-dz.com>',
      to: [to],
      subject: subject,
      text: content,
    })

    return new Response(
      JSON.stringify({ message: 'Email sent successfully', data }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ message: 'Error sending email', error }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
