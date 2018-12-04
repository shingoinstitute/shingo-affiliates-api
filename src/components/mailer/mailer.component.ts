import { Component } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';

/**
 * Provides an abstraction of nodemailer.
 * 
 * @export
 * @class MailerService
 */
@Component()
export class MailerService {

    private transporter: Transporter;

    constructor() {
        const transport = {
            host: 'smtp.office365.com',
            port: 587,
            secure: false,
            auth: {
                user: 'shingo.it@aggies.usu.edu',
                pass: process.env.EMAIL_PASS
            },
            tls: {
                ciphers: 'SSLv3'
            },
            debug: true
        }
        this.transporter = createTransport(transport)
    }

    public async sendMail(options: { from?: string, to: string, subject: string, text: string, html?: string }) {
        options.from = 'shingo.it@usu.edu';
        return await this.transporter.sendMail(options);
    }

}