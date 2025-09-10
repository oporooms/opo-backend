export const MailWalletUpdate = ({ wallet }: {
    wallet: number;
}) => {
    return ` <!DOCTYPE html>
            <html>
                <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Wallet Balance Updated</title>
                <style>
                    body {
                    font-family: Arial, sans-serif;
                    background-color: #f9f9f9;
                    margin: 0;
                    padding: 20px;
                    color: #333;
                    }
                    .container {
                    max-width: 600px;
                    margin: auto;
                    background-color: #fff;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                    }
                    .header {
                    background-color: #5cb85c;
                    color: #fff;
                    text-align: center;
                    padding: 20px;
                    }
                    .header h1 {
                    margin: 0;
                    font-size: 24px;
                    }
                    .content {
                    padding: 20px;
                    }
                    .content p {
                    line-height: 1.6;
                    }
                    .details {
                    background-color: #f1f1f1;
                    border-radius: 4px;
                    padding: 15px;
                    margin: 20px 0;
                    }
                    .details p {
                    margin: 8px 0;
                    }
                    .footer {
                    text-align: center;
                    font-size: 12px;
                    color: #777;
                    padding: 15px;
                    background-color: #f4f4f4;
                    }
                </style>
                </head>
                <body>
                <div class="container">
                    <div class="header">
                    <h1>Wallet Balance Updated</h1>
                    </div>
                    <div class="content">
                    <p>Dear Admin,</p>
                    <p>Your wallet balance has been successfully updated. Please review the details below:</p>
                    <div class="details">
                        <p><strong>Updated Wallet Balance:</strong> &#8377;${wallet}</p>
                    </div>
                    <p>Thank you for keeping your wallet up to date.</p>
                    </div>
                    <div class="footer">
                    <p>Best regards,</p>
                    <p>Your Team</p>
                    </div>
                </div>
                </body>
            </html>`
}

export const MailWalletBalance = ({ wallet }: { wallet: number }) => {
    return ` <!DOCTYPE html>
            <html>
                <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Wallet Balance Alert</title>
                <style>
                    body {
                    font-family: Arial, sans-serif;
                    background-color: #f9f9f9;
                    margin: 0;
                    padding: 20px;
                    color: #333;
                    }
                    .container {
                    max-width: 600px;
                    margin: auto;
                    background-color: #fff;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                    }
                    .header {
                    background-color: #d9534f;
                    color: #fff;
                    text-align: center;
                    padding: 20px;
                    }
                    .header h1 {
                    margin: 0;
                    font-size: 24px;
                    }
                    .content {
                    padding: 20px;
                    }
                    .content p {
                    line-height: 1.6;
                    }
                    .details {
                    background-color: #f1f1f1;
                    border-radius: 4px;
                    padding: 15px;
                    margin: 20px 0;
                    }
                    .details p {
                    margin: 8px 0;
                    }
                    .footer {
                    text-align: center;
                    font-size: 12px;
                    color: #777;
                    padding: 15px;
                    background-color: #f4f4f4;
                    }
                </style>
                </head>
                <body>
                <div class="container">
                    <div class="header">
                    <h1>Wallet Balance Alert</h1>
                    </div>
                    <div class="content">
                    <p>Dear Admin,</p>
                    <p>Your wallet balance is running low. Please review the details below:</p>
                    <div class="details">
                        <p><strong>Current Wallet Balance:</strong> &#8377;${wallet}</p>
                    </div>
                    <p>Please take the necessary action to ensure smooth transactions.</p>
                    </div>
                    <div class="footer">
                    <p>Thank you for your prompt attention.</p>
                    </div>
                </div>
                </body>
            </html>`
}