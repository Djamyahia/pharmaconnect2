import { Resend } from 'resend';
import type { NextApiRequest, NextApiResponse } from 'next';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' }); // ✅ JSON garanti
  }

  const { to, subject, content } = req.body;

  if (!to || !subject || !content) {
    return res.status(400).json({ message: 'Missing required fields' }); // ✅ JSON garanti
  }

  try {
    const result = await resend.emails.send({
      from: 'PharmaConnect <noreply@pharmaconnect-dz.com>',
      to,
      subject,
      html: content,
    });

    return res.status(200).json({ success: true, result }); // ✅ JSON garanti
  } catch (error) {
    console.error('Email send failed:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }); // ✅ JSON garanti
  }
}
