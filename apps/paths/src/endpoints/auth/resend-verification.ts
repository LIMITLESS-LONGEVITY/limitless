import type { Endpoint } from 'payload'
import crypto from 'crypto'

export const resendVerificationEndpoint: Endpoint = {
  path: '/auth/resend-verification',
  method: 'post',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = await req.payload.findByID({
      collection: 'users',
      id: req.user.id,
      overrideAccess: true,
      req,
    })

    if ((user as any)._verified) {
      return Response.json({ error: 'Email is already verified' }, { status: 400 })
    }

    // Generate new verification token
    const token = crypto.randomBytes(20).toString('hex')

    // Store the token on the user
    await req.payload.update({
      collection: 'users',
      id: req.user.id,
      data: { _verificationToken: token } as any,
      overrideAccess: true,
      req,
    })

    // Send verification email
    const url = `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}/verify-email?token=${token}`
    await req.payload.sendEmail({
      to: user.email,
      subject: 'Verify your PATHS account',
      html: `
        <div style="background-color: #0A0E1A; padding: 40px 20px; font-family: 'Inter', Arial, sans-serif;">
          <div style="max-width: 480px; margin: 0 auto; background-color: rgba(15,20,36,0.95); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 40px;">
            <h1 style="color: #FAFAFA; font-family: 'Georgia', serif; font-size: 24px; font-weight: 600; text-align: center; margin: 0 0 8px;">PATHS by LIMITLESS</h1>
            <p style="color: #B0B8C1; font-size: 14px; text-align: center; margin: 0 0 32px;">Verify your email address</p>
            <p style="color: #B0B8C1; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">Click the button below to verify your email address.</p>
            <div style="text-align: center; margin: 0 0 24px;">
              <a href="${url}" style="display: inline-block; padding: 12px 32px; border: 1px solid #C9A84C; color: #C9A84C; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.15em; text-decoration: none; border-radius: 9999px;">Verify Email</a>
            </div>
            <p style="color: #B0B8C1; font-size: 12px; line-height: 1.6; margin: 0 0 8px;">Or copy this link into your browser:</p>
            <p style="color: #C9A84C; font-size: 12px; word-break: break-all; margin: 0;">${url}</p>
          </div>
        </div>
      `,
    })

    return Response.json({ success: true, message: 'Verification email sent' })
  },
}
