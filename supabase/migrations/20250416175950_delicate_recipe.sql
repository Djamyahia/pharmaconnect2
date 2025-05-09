/*
  # Update email templates to include product details

  1. Changes
    - Update existing email templates to include product details
    - Add quantity and price information
    - Support both medication and parapharmacy products
*/

-- Update the order_placed template
UPDATE email_templates 
SET content = 'Bonjour {{wholesaler_name}},

Une nouvelle commande a été passée par {{pharmacist_name}}.

Détails de la commande :
- Numéro de commande : {{order_id}}
- Produit : {{product_name}}{{product_form}}{{product_dosage}}
- Quantité : {{quantity}} unités
- Prix unitaire : {{unit_price}} DZD
- Sous-total : {{subtotal}} DZD
- Montant total : {{total_amount}} DZD

Veuillez vous connecter à votre tableau de bord pour examiner et traiter cette commande.

Cordialement,
L''équipe PharmaConnect'
WHERE type = 'order_placed';

-- Update the order_accepted template
UPDATE email_templates 
SET content = 'Bonjour {{pharmacist_name}},

Votre commande a été acceptée par {{wholesaler_name}}.

Détails de la commande :
- Numéro de commande : {{order_id}}
- Produit : {{product_name}}{{#if product_form}} ({{product_form}} {{product_dosage}}){{/if}}
{{#if product_brand}}- Marque : {{product_brand}}{{/if}}
{{#if product_category}}- Catégorie : {{product_category}}{{/if}}
- Quantité : {{quantity}} unités
- Prix unitaire : {{unit_price}} DZD
- Sous-total : {{subtotal}} DZD
- Date de livraison proposée : {{delivery_date}}
- Montant total : {{total_amount}} DZD

Veuillez vous connecter à votre tableau de bord pour confirmer la date de livraison.

Cordialement,
L''équipe PharmaConnect'
WHERE type = 'order_accepted';

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
- Raison : {{reason}}

Pour plus d''informations, veuillez vous connecter à votre tableau de bord.

Cordialement,
L''équipe PharmaConnect'
WHERE type = 'order_canceled';

-- Update the delivery_confirmed template
UPDATE email_templates 
SET content = 'Bonjour {{wholesaler_name}},

{{pharmacist_name}} a confirmé la date de livraison pour la commande {{order_id}}.

Détails de la commande :
- Produit : {{product_name}}{{#if product_form}} ({{product_form}} {{product_dosage}}){{/if}}
{{#if product_brand}}- Marque : {{product_brand}}{{/if}}
{{#if product_category}}- Catégorie : {{product_category}}{{/if}}
- Quantité : {{quantity}} unités
- Prix unitaire : {{unit_price}} DZD
- Sous-total : {{subtotal}} DZD
- Date de livraison : {{delivery_date}}
- Adresse : {{delivery_address}}

Veuillez vous assurer que la commande sera livrée à la date convenue.

Cordialement,
L''équipe PharmaConnect'
WHERE type = 'delivery_confirmed';

-- Update the delivery_rejected template
UPDATE email_templates 
SET content = 'Bonjour {{wholesaler_name}},

{{pharmacist_name}} a rejeté la date de livraison proposée pour la commande {{order_id}}.

Détails de la commande :
- Produit : {{product_name}}{{#if product_form}} ({{product_form}} {{product_dosage}}){{/if}}
{{#if product_brand}}- Marque : {{product_brand}}{{/if}}
{{#if product_category}}- Catégorie : {{product_category}}{{/if}}
- Quantité : {{quantity}} unités
- Prix unitaire : {{unit_price}} DZD
- Sous-total : {{subtotal}} DZD

Veuillez vous connecter à votre tableau de bord pour proposer une nouvelle date de livraison.

Cordialement,
L''équipe PharmaConnect'
WHERE type = 'delivery_rejected';