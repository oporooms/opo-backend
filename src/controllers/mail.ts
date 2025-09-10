"use server";
import nodemailer from "nodemailer";

type Params = {
    email: string | string[],
    html: string,
    sub: string
}

const handleMail = async ({ email, html, sub }: Params) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.NODEMAILER_EMAIL,
            pass: process.env.NODEMAILER_PW,
        },
    });

    const mailOptions = {
        from: "d21350180@gmail.com",
        to: email,
        subject: sub || "Mail",
        html,
    };

    await new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (err, response) => {
            if (err) {
                reject(err);
            } else {
                resolve(response);
            }
        });
    });
}

export default handleMail