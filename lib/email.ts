import { Resend } from 'resend'
import { formatCurrency, formatDate } from './utils'

// Initialize Resend client with graceful degradation
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

if (!resend) {
  console.warn('RESEND_API_KEY not set - emails will not be sent')
}

// Email sender configuration
// Using Resend's default for now; update when custom domain is verified
const EMAIL_FROM = 'The Body Biz <onboarding@resend.dev>'

export interface WelcomeEmailData {
  clientName: string
  clientEmail: string
  programName: string
  trainerName: string
  amount: number
  durationMonths: number | null
  startDate: Date
  cardLast4: string | null
}

export interface EmailResult {
  success: boolean
  error?: string
}

/**
 * Send a welcome/receipt email to a new client after checkout completion
 */
export async function sendWelcomeReceiptEmail(data: WelcomeEmailData): Promise<EmailResult> {
  if (!resend) {
    console.warn('Email not sent - Resend not configured')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: data.clientEmail,
      subject: 'Welcome to The Body Biz!',
      html: generateWelcomeReceiptHtml(data),
    })

    if (error) {
      console.error('Failed to send welcome email:', error)
      return { success: false, error: error.message }
    }

    console.log(`Welcome email sent to ${data.clientEmail}`)
    return { success: true }
  } catch (err) {
    console.error('Error sending welcome email:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send email'
    }
  }
}

/**
 * Generate HTML content for the welcome/receipt email
 */
function generateWelcomeReceiptHtml(data: WelcomeEmailData): string {
  const durationText = data.durationMonths
    ? `${data.durationMonths} month${data.durationMonths > 1 ? 's' : ''}`
    : 'Ongoing'

  const billingDay = data.startDate.getDate()
  const billingOrdinal = getOrdinalSuffix(billingDay)

  const cardInfo = data.cardLast4
    ? `Your card ending in <strong>${data.cardLast4}</strong> will be charged ${formatCurrency(data.amount)} on the <strong>${billingDay}${billingOrdinal}</strong> of each month.`
    : `You will be charged ${formatCurrency(data.amount)} monthly.`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to The Body Biz</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f4f4f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .card {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 32px;
      margin-top: 20px;
    }
    .header {
      text-align: center;
      padding-bottom: 24px;
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 24px;
    }
    .header h1 {
      color: #111827;
      font-size: 24px;
      margin: 0 0 8px 0;
    }
    .header p {
      color: #6b7280;
      margin: 0;
    }
    .details {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin: 24px 0;
    }
    .details h3 {
      margin: 0 0 16px 0;
      color: #111827;
      font-size: 16px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      color: #6b7280;
    }
    .detail-value {
      color: #111827;
      font-weight: 500;
    }
    .billing-info {
      background: #fef3c7;
      border: 1px solid #fcd34d;
      padding: 16px;
      border-radius: 8px;
      margin: 24px 0;
      color: #92400e;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      padding-top: 24px;
      margin-top: 24px;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>Welcome to The Body Biz!</h1>
        <p>Thank you for starting your fitness journey with us</p>
      </div>

      <p>Hi ${escapeHtml(data.clientName)},</p>

      <p>Thank you for signing up for <strong>${escapeHtml(data.programName)}</strong> with <strong>${escapeHtml(data.trainerName)}</strong>!</p>

      <div class="details">
        <h3>Your Subscription Details</h3>
        <div class="detail-row">
          <span class="detail-label">Program</span>
          <span class="detail-value">${escapeHtml(data.programName)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Trainer</span>
          <span class="detail-value">${escapeHtml(data.trainerName)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount</span>
          <span class="detail-value">${formatCurrency(data.amount)}/month</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Duration</span>
          <span class="detail-value">${durationText}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Start Date</span>
          <span class="detail-value">${formatDate(data.startDate)}</span>
        </div>
      </div>

      <div class="billing-info">
        ${cardInfo}
      </div>

      <p>Questions? Reply to this email or contact your trainer directly.</p>

      <p><strong>Let's get to work!</strong></p>

      <div class="footer">
        <p><strong>The Body Biz Team</strong></p>
        <p>Columbus, OH</p>
      </div>
    </div>
  </div>
</body>
</html>
`
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char])
}
