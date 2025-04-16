import { Resend } from 'resend';
import type { NextApiRequest, NextApiResponse } from 'next';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { to, subject, content } = req.body;

    if (!to || !subject || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const result = await resend.emails.send({
        from: 'PharmaConnect <noreply@pharmaconnect-dz.com>',
        to: [to],
        subject,
        html: content, // ou text: content si tu veux du texte brut
      });

      return res.status(200).json({ success: true, result });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: String(error) });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
