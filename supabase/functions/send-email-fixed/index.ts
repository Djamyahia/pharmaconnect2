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

    // Create HTML version of the email with proper formatting
    let htmlContent = content
      .replace(/\n/g, '<br/>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Format lists
    if (htmlContent.includes('Liste des produits :')) {
      htmlContent = htmlContent.replace(/Liste des produits :(.*?)(?=<br\/><br\/>|$)/s, (match, productsList) => {
        // Format the products list as an HTML list
        const formattedList = productsList
          .replace(/<br\/>/g, '')
          .split('-')
          .filter(item => item.trim())
          .map(line => `<li>${line.trim()}</li>`)
          .join('');
        
        return `<h3>Liste des produits :</h3><ul style="margin-top: 10px; margin-bottom: 10px;">${formattedList}</ul>`;
      });
    }
    
    // Add some styling
    htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        ${htmlContent}
      </div>
    `;

    const result = await resend.emails.send({
      from: 'PharmaConnect <noreply@pharmaconnect-dz.com>',
      to: [to],
      subject,
      html: htmlContent,
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