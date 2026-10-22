/**
 * Service d'envoi d'e-mails transactionnels pour CapVoyage.
 * Supporte le mode API (Resend), SMTP via Webhook/Relais, ou Fallback Sécurisé (Dev/Logs).
 */
export class EmailService {
  constructor(config = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.RESEND_API_KEY || '',
      from: config.from || process.env.EMAIL_FROM || 'CapVoyage <auth@capvoyage.com>',
      isProduction: config.isProduction !== undefined ? config.isProduction : ((config.nodeEnv || process.env.NODE_ENV) === 'production')
    };
    // Historique des derniers envois (très utile pour tests automatisés et monitoring)
    this.outbox = [];
  }

  /**
   * Envoie le code d'accès par e-mail
   * @param {string} toEmail - Destinataire
   * @param {string} code - Code à 6 chiffres
   * @returns {Promise<{ success: boolean, message: string, devCode?: string }>}
   */
  async sendLoginCode(toEmail, code) {
    if (!toEmail || !code) {
      throw new Error('Destinataire et code obligatoires');
    }

    const subject = `🧭 Votre code d'accès CapVoyage : ${code}`;
    const textBody = `Bonjour,\n\nVoici votre code d'accès sécurisé à CapVoyage : ${code}\n\nCe code est valable pendant 15 minutes.\nSi vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.\n\nL'équipe CapVoyage`;
    
    const htmlBody = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { background: #1e40af; padding: 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
          .content { padding: 32px 24px; text-align: center; }
          .code-box { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1e40af; background: #eff6ff; border: 2px dashed #93c5fd; border-radius: 8px; padding: 16px 24px; margin: 24px auto; display: inline-block; font-family: 'SFMono-Regular', Consolas, Monaco, monospace; }
          .footer { font-size: 12px; color: #64748b; padding: 16px 24px; background: #f1f5f9; border-top: 1px solid #e2e8f0; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🧭 CapVoyage</h1>
          </div>
          <div class="content">
            <h2 style="font-size: 18px; margin-top: 0;">Votre code de connexion</h2>
            <p style="font-size: 15px; color: #475569; line-height: 1.5;">Entrez le code suivant sur CapVoyage pour accéder à vos séjours et préparatifs :</p>
            <div class="code-box">${code}</div>
            <p style="font-size: 13px; color: #64748b;">⏱️ Ce code expire dans <strong>15 minutes</strong>.</p>
          </div>
          <div class="footer">
            <p style="margin: 0;">Si vous n'avez pas demandé ce code, vous pouvez ignorer cet e-mail en toute sécurité.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailRecord = {
      to: toEmail,
      from: this.config.from,
      subject,
      code,
      sentAt: new Date().toISOString()
    };
    this.outbox.push(emailRecord);

    // 1. Si une clé API Resend est configurée, appel HTTP natif direct
    if (this.config.apiKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: this.config.from,
            to: [toEmail],
            subject,
            text: textBody,
            html: htmlBody
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(`Erreur API Resend (${response.status}): ${errData.message || response.statusText}`);
        }
      } catch (err) {
        console.error('[EmailService] Échec de transmission e-mail distant:', err.message);
        if (this.config.isProduction) {
          throw err;
        }
      }
    } else {
      // 2. Mode Développeur / Sans Clé API configurée
      console.log(`\n======================================================`);
      console.log(`📧 [EmailService] E-mail simulé pour : ${toEmail}`);
      console.log(`🔑 Code d'accès : [ ${code} ] (Valable 15 minutes)`);
      console.log(`======================================================\n`);
    }

    const result = {
      success: true,
      email: toEmail,
      message: `Code d'authentification envoyé à ${toEmail}`
    };

    // En environnement de développement seulement, renvoyer devCode
    if (!this.config.isProduction) {
      result.devCode = code;
    }

    return result;
  }

  getLastSentEmail() {
    return this.outbox[this.outbox.length - 1] || null;
  }

  clearOutbox() {
    this.outbox = [];
  }
}
