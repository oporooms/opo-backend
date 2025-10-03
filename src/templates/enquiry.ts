export const EnquiryReceivedAdmin = ({
  enquiryId,
  name,
  email,
  phone,
  message,
  date,
}: {
  enquiryId: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  date?: string;
}) => {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>New Enquiry Received</title>
      <style>
        body{font-family: Arial, sans-serif;background:#f7fafc;margin:0;padding:20px;color:#333}
        .card{max-width:700px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 4px 20px rgba(16,24,40,0.08)}
        .header{background:#111827;color:#fff;padding:18px 24px}
        .header h2{margin:0;font-size:20px}
        .content{padding:20px}
        .meta{background:#f1f5f9;padding:12px;border-radius:6px;margin:12px 0}
        .footer{text-align:center;padding:14px;font-size:12px;color:#6b7280;background:#f8fafc}
        .label{color:#374151;font-weight:600}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2>New Enquiry Received</h2>
        </div>
        <div class="content">
          <p>Hi Admin,</p>
          <p>A new enquiry has been submitted. Please find the details below.</p>
          <div class="meta">
            <p><span class="label">Enquiry ID:</span> ${enquiryId}</p>
            <p><span class="label">Name:</span> ${name}</p>
            <p><span class="label">Email:</span> ${email}</p>
            ${phone ? `<p><span class="label">Phone:</span> ${phone}</p>` : ''}
            ${date ? `<p><span class="label">Date:</span> ${date}</p>` : ''}
          </div>
          <h4 style="margin-bottom:6px">Message</h4>
          <p style="white-space:pre-wrap;color:#374151">${message}</p>
        </div>
        <div class="footer">Open the admin panel to respond to this enquiry.</div>
      </div>
    </body>
  </html>`;
};

export const EnquiryAutoReplyUser = ({
  name,
  enquiryId,
}: {
  name: string;
  enquiryId: string;
}) => {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Thanks for Your Enquiry</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;background:#f9fafb;margin:0;padding:20px;color:#334155}
        .wrap{max-width:600px;margin:auto;background:#fff;padding:22px;border-radius:8px;box-shadow:0 6px 18px rgba(2,6,23,.06)}
        .brand{color:#0ea5a4;font-weight:700;font-size:18px;margin-bottom:8px}
        .muted{color:#64748b;font-size:14px}
        .cta{display:inline-block;margin-top:16px;padding:10px 16px;background:#0ea5a4;color:#fff;border-radius:6px;text-decoration:none}
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="brand">Thanks for reaching out, ${name}</div>
        <p class="muted">We have received your enquiry (ID: <strong>${enquiryId}</strong>). Our team will get back to you shortly.</p>
        <p class="muted">If you need immediate assistance, reply to this email or call our support.</p>
        <a class="cta" href="#">Visit Support</a>
      </div>
    </body>
  </html>`;
};
