export const PaymentReceiptUser = ({
  paymentId,
  amount,
  method,
  date,
  description,
}: {
  paymentId: string;
  amount: number;
  method: string;
  date?: string;
  description?: string;
}) => `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Payment Receipt</title>
  <style>body{font-family:Inter,Arial,sans-serif;background:#f6f9fc;margin:0;padding:22px;color:#0b1220}.card{max-width:640px;margin:auto;background:#fff;padding:18px;border-radius:10px;box-shadow:0 10px 30px rgba(2,6,23,.06)}.hdr{background:#10b981;color:#fff;padding:12px;border-radius:8px}.row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #eef2f6}.muted{color:#6b7280}</style></head><body>
  <div class="card"><div class="hdr"><strong>Payment Receipt</strong></div>
  <div style="padding:14px"><div class="row"><div>Receipt ID</div><div>${paymentId}</div></div>
  <div class="row"><div>Amount</div><div>₹${amount}</div></div>
  <div class="row"><div>Method</div><div>${method}</div></div>
  ${date?`<div class="row"><div>Date</div><div>${date}</div></div>`:''}
  ${description?`<div style="padding-top:8px;color:#374151">${description}</div>`:''}
  <p class="muted" style="margin-top:12px">Thank you for your payment.</p></div></div></body></html>`;

export const PaymentReceiptAdmin = ({paymentId,amount,method,date,forWhat}:{paymentId:string;amount:number;method:string;date?:string;forWhat?:string})=>`<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>New Payment</title>
  <style>body{font-family:Arial;background:#fff;color:#111}.wrap{max-width:700px;margin:18px auto;padding:16px;border:1px solid #eef2f5;border-radius:8px}</style></head><body>
  <div class="wrap"><h3>Payment Received</h3><p>Payment ${paymentId} for ${forWhat||'transaction'} received.</p><p>Amount: ₹${amount} via ${method}</p>${date?`<p>Date: ${date}</p>`:''}</div></body></html>`;
