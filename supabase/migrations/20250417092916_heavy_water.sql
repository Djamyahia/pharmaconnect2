/*
  # Update email templates for order cancellations

  1. Changes
    - Update order_canceled template to include cancellation details
    - Add more context about who canceled the order
*/

-- Update the order_canceled template
UPDATE email_templates 
SET content = 'Bonjour {{recipient_name}},

La commande {{order_id}} a été annulée.

Détails de la commande :
- Produit : {{product_name}}{{#if product_form}} ({{product_form}} {{product_dosage}}){{/if}}
{{#if product_brand}}- Marque : {{product_brand}}{{/if}}
{{#if product_category}}- Catégorie : {{product_category}}{{/if}}
- Quantité : {{quantity}} unités
- Prix unitaire : {{unit_price}} DZD
- Sous-total : {{subtotal}} DZD
- Montant total : {{total_amount}} DZD
- Statut : Annulée
- Raison : {{reason}}

Cette commande a été annulée {{canceled_by}}.

Pour plus d''informations, veuillez vous connecter à votre tableau de bord.

Cordialement,
L''équipe PharmaConnect'
WHERE type = 'order_canceled';