import { Component, Inject } from '@nestjs/common';
import { createTransport, Transport, Transporter } from 'nodemailer';
import { LoggerService } from '../logger/logger.component';

/**
 * Provides an abstraction of nodemailer.
 * 
 * @export
 * @class MailerService
 */
@Component()
export class MailerService {

    private transporter: Transporter;

    constructor( @Inject('LoggerService') private log: LoggerService = new LoggerService()) {
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
        this.log.debug('creating mailer with transport: %j', transport);
        this.transporter = createTransport(transport)
    }

    public async sendMail(options: { from?: string, to: string, subject: string, text: string, html?: string }) {
        options.from = 'shingo.it@usu.edu';
        return await this.transporter.sendMail(options);
    }

}