// backend/src/services/emailService.ts

import nodemailer from 'nodemailer';
import prisma from './prisma';
import settingsService from './settingsService';

export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;

  async initializeTransporter(): Promise<void> {
    try {
      const [smtpHost, smtpPort, smtpUser, smtpPassword, smtpFrom] = await Promise.all([
        settingsService.getString('smtp_host', ''),
        settingsService.getNumber('smtp_port', 0),
        settingsService.getString('smtp_user', ''),
        settingsService.getString('smtp_password', ''),
        settingsService.getString('smtp_from_email', ''),
      ]);

      // Fallback to environment variables if settings are not configured
      const envConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        user: process.env.SMTP_USER || '',
        password: process.env.SMTP_PASSWORD || '',
        from: process.env.SMTP_FROM_EMAIL || 'noreply@shamstores.com',
      };

      const emailConfig = {
        host: smtpHost || envConfig.host,
        port: smtpPort || envConfig.port,
        user: smtpUser || envConfig.user,
        password: smtpPassword || envConfig.password,
        from: smtpFrom || envConfig.from,
      };

      if (emailConfig.user && emailConfig.password) {
        this.transporter = nodemailer.createTransport({
          host: emailConfig.host,
          port: emailConfig.port,
          secure: emailConfig.port === 465,
          auth: {
            user: emailConfig.user,
            pass: emailConfig.password,
          },
        });
        this.config = emailConfig;
        console.log('✅ Email service initialized with SMTP');
      } else {
        console.warn('⚠️ SMTP credentials not configured. Email sending disabled.');
      }
    } catch (error) {
      console.error('Error initializing email service:', error);
    }
  }

  async generateVerificationCode(email: string, expiryMinutes: number = 15): Promise<string> {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiry time
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Delete any previous unused codes for this email
    await prisma.emailVerificationCode.deleteMany({
      where: {
        email,
        used: false,
      },
    });

    // Store the new code
    await prisma.emailVerificationCode.create({
      data: {
        email,
        code,
        expiresAt,
      },
    });

    return code;
  }

  async sendVerificationEmail(email: string, code: string): Promise<boolean> {
    try {
      if (!this.transporter) {
        await this.initializeTransporter();
      }

      if (!this.transporter || !this.config) {
        console.warn('Email service not initialized');
        return false;
      }

      const mailOptions = {
        from: this.config.from,
        to: email,
        subject: 'تحقق من بريدك الإلكتروني - Sham Stores',
        html: this.getVerificationEmailTemplate(code, email),
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Error sending verification email:', error);
      return false;
    }
  }

  async verifyCode(email: string, code: string): Promise<boolean> {
    try {
      const verificationRecord = await prisma.emailVerificationCode.findFirst({
        where: {
          email,
          code,
          used: false,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!verificationRecord) {
        return false;
      }

      // Mark code as used
      await prisma.emailVerificationCode.update({
        where: { id: verificationRecord.id },
        data: {
          used: true,
          usedAt: new Date(),
        },
      });

      return true;
    } catch (error) {
      console.error('Error verifying code:', error);
      return false;
    }
  }

  async resendVerificationCode(email: string): Promise<string | null> {
    try {
      const code = await this.generateVerificationCode(email);
      const sent = await this.sendVerificationEmail(email, code);
      
      if (!sent) {
        console.warn('Failed to send verification email');
        return null;
      }

      return code;
    } catch (error) {
      console.error('Error resending verification code:', error);
      return null;
    }
  }

  private getVerificationEmailTemplate(code: string, email: string): string {
    const rtlStyle = 'direction: rtl; text-align: right;';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Arial', sans-serif; background: #f5f5f5; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #082E24 0%, #0D4A3A 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 30px; }
          .code-box { background: #f0f4f8; border: 2px solid #C8E235; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .code { font-size: 36px; font-weight: bold; color: #0D4A3A; letter-spacing: 5px; }
          .footer { background: #f9f9f9; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; border-top: 1px solid #eee; }
        </style>
      </head>
      <body style="${rtlStyle}">
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Sham Stores</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">تحقق من بريدك الإلكتروني</p>
          </div>
          
          <div class="content" style="${rtlStyle}">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              مرحباً،
            </p>
            
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
              تم طلب تحقق من بريدك الإلكتروني. استخدم الكود أدناه للتحقق من حسابك:
            </p>
            
            <div class="code-box">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 12px;">كود التحقق</p>
              <div class="code">${code}</div>
              <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">ساري لمدة 15 دقيقة</p>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
              إذا لم تطلب هذا الكود، يرجى تجاهل هذا البريد.
            </p>
            
            <p style="font-size: 12px; color: #999;">
              إذا واجهت أي مشاكل، يرجى التواصل معنا على support@shamstores.com
            </p>
          </div>
          
          <div class="footer" style="${rtlStyle}">
            <p style="margin: 0;">© 2024 Sham Stores. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export default new EmailService();
