export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("API /api/send-email HIT");
  console.log("BODY:", req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { to, subject, content } = req.body;

  if (!to || !subject || !content) {
    return res.status(400).json({ message: 'Missing required fields: to, subject, content' });
  }

  try {
    const result = await resend.emails.send({
      from: 'PharmaConnect <noreply@pharmaconnect-dz.com>',
      to,
      subject,
      html: content,
    });

    console.log("Email sent:", result);

    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('Email send failed:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
