import { Inject, Injectable } from '@nestjs/common';
import { createTransport, Transport, Transporter } from 'nodemailer';
import { LoggerInstance } from 'winston';

/**
 * Provides an abstraction of nodemailer.
 *
 * @export
 * @class MailerService
 */
@Injectable()
export class MailerService {

    private transporter: Transporter;

    constructor(@Inject('LoggerService') private log: LoggerInstance) {
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
        if (process.env.EMAIL_PASS && process.env.EMAIL_PASS !== '') {
            console.log(process.env.EMAIL_PASS)
            options.from = 'shingo.it@usu.edu';
            return this.transporter.sendMail(options);
        }
    }

}
