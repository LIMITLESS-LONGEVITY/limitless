import type { Endpoint } from 'payload'

export const registerEndpoint: Endpoint = {
  path: '/auth/register',
  method: 'post',
  handler: async (req) => {
    const body = (await req.json?.()) as
      | {
          email?: string
          password?: string
          firstName?: string
          lastName?: string
        }
      | undefined

    if (!body?.email || !body?.password || !body?.firstName || !body?.lastName) {
      return Response.json(
        { error: 'All fields are required: email, password, firstName, lastName' },
        { status: 400 },
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return Response.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Validate password length
    if (body.password.length < 8) {
      return Response.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 },
      )
    }

    // Check if email already exists
    const existing = await req.payload.find({
      collection: 'users',
      where: { email: { equals: body.email } },
      limit: 1,
      overrideAccess: true,
      req,
    })

    if (existing.totalDocs > 0) {
      return Response.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      )
    }

    // Look up the default free tier
    const freeTier = await req.payload.find({
      collection: 'membership-tiers',
      where: { slug: { equals: 'free' } },
      limit: 1,
      overrideAccess: true,
      req,
    })

    // Look up the default tenant
    const defaultTenant = await req.payload.find({
      collection: 'tenants',
      where: { slug: { equals: 'limitless' } },
      limit: 1,
      overrideAccess: true,
      req,
    })

    try {
      const user = await req.payload.create({
        collection: 'users',
        data: {
          email: body.email,
          password: body.password,
          firstName: body.firstName,
          lastName: body.lastName,
          role: 'user',
          ...(freeTier.docs[0] ? { tier: freeTier.docs[0].id } : {}),
          ...(defaultTenant.docs[0]
            ? { tenants: [{ tenant: defaultTenant.docs[0].id }] }
            : {}),
        } as any,
        overrideAccess: true,
        req,
      })

      // Log the user in immediately by calling the login operation
      const loginResult = await req.payload.login({
        collection: 'users',
        data: { email: body.email, password: body.password },
        req,
      })

      return Response.json(
        {
          message: 'Account created successfully',
          user: { id: user.id, email: user.email, firstName: user.firstName },
          token: loginResult.token,
          emailVerificationSent: true,
        },
        {
          status: 201,
          headers: loginResult.setCookie
            ? { 'Set-Cookie': loginResult.setCookie }
            : undefined,
        },
      )
    } catch (err: any) {
      req.payload.logger.error({ err, message: 'Registration failed' })
      return Response.json(
        { error: err?.message || 'Registration failed. Please try again.' },
        { status: 500 },
      )
    }
  },
}
