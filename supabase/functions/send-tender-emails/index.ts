import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get request body
    const { tenderId } = await req.json()


    if (!tenderId) {
      throw new Error('Missing required parameter: tenderId')
    }

    // Fetch tender details
    const { data: tender, error: tenderError } = await supabase
      .from('tenders')
      .select(`
        *,
        items:tender_items (
          *,
          medication:medications (
            commercial_name,
            form,
            dosage
          )
        )
      `)
      .eq('id', tenderId)
      .single()

    if (tenderError) throw tenderError

    // Fetch all wholesalers
    const { data: wholesalers, error: wholesalersError } = await supabase
      .from('users')
      .select('id, email, company_name, delivery_wilayas')
      .eq('role', 'wholesaler')

    if (wholesalersError) throw wholesalersError

    // Filter wholesalers by delivery wilaya
    const eligibleWholesalers = wholesalers;
    


    // Generate email content
    const generateEmailContent = (wholesalerName: string) => {
      const tenderUrl = `${Deno.env.get('FRONTEND_URL') || 'https://www.pharmaconnect-dz.com'}/tenders/public/${tender.public_link}`
      
      let productsHtml = ''
      tender.items.forEach(item => {
        productsHtml += `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${item.medication.commercial_name}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${item.medication.form} ${item.medication.dosage}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
          </tr>
        `
      })

      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #4F46E5; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Nouvel appel d'offres</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9fafb;">
            <p>Bonjour ${wholesalerName},</p>
            
            <p>Un nouvel appel d'offres a été publié sur PharmaConnect et pourrait vous intéresser.</p>
            
            <div style="background-color: white; border-radius: 8px; padding: 15px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <h2 style="color: #4F46E5; margin-top: 0;">${tender.title}</h2>
              <p><strong>Wilaya:</strong> ${tender.wilaya}</p>
              <p><strong>Date limite:</strong> ${new Date(tender.deadline).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              
              <h3 style="margin-top: 20px;">Produits demandés:</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Médicament</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Forme/Dosage</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Quantité</th>
                  </tr>
                </thead>
                <tbody>
                  ${productsHtml}
                </tbody>
              </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${tenderUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Répondre à l'appel d'offres
              </a>
            </div>
            
            <p>Cet appel d'offres est anonyme. Les informations du pharmacien ne seront visibles qu'après acceptation d'une réponse.</p>
            
            <p>Cordialement,<br>L'équipe PharmaConnect</p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>Cet email a été envoyé automatiquement par PharmaConnect.</p>
            <p>© ${new Date().getFullYear()} PharmaConnect. Tous droits réservés.</p>
          </div>
        </div>
      `
    }

    // → Envoi des emails UN PAR UN pour éviter la surcharge concurrente
    for (const wholesaler of eligibleWholesalers) {
      try {
        const emailContent = generateEmailContent(wholesaler.company_name)
        const res = await fetch(`${supabaseUrl}/functions/v1/send-email-fixed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            to: wholesaler.email,
            subject: `Nouvel appel d'offres: ${tender.title}`,
            content: emailContent,
          }),
        })
        if (!res.ok) {
          const err = await res.text()
          console.error(`Échec envoi à ${wholesaler.email}:`, err)
        } else {
          console.log(`Email envoyé à ${wholesaler.email}`)
        }
      } catch (err) {
        console.error(`Erreur fatale pour ${wholesaler.email}:`, err)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Emails sent to ${eligibleWholesalers.length} wholesalers` 
      }),
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error sending tender emails:', error)
    
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

