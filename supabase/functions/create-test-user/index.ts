import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateTestUserRequest {
  email: string
  full_name: string
  role: 'admin' | 'user'
  subscription_status: 'active' | 'trial' | 'cancelled' | 'none'
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify admin authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Verify requesting user is admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Check if requesting user is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Parse request body
    const { email, full_name, role, subscription_status }: CreateTestUserRequest = await req.json()

    if (!email || !full_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email and name are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const userExists = existingUsers?.users?.some((user) => user.email === email)

    if (userExists) {
      return new Response(
        JSON.stringify({ success: false, error: 'User with this email already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      )
    }

    // Generate a temporary password
    const tempPassword = `Test${Date.now().toString(36)}!`

    // Create user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        must_change_password: true,
      },
    })

    if (createError) {
      throw createError
    }

    if (!newUser?.user) {
      throw new Error('Failed to create user')
    }

    // Create profile
    const profileData: Record<string, unknown> = {
      id: newUser.user.id,
      email,
      full_name,
    }

    // Add subscription status if not 'none'
    if (subscription_status !== 'none') {
      profileData.subscription_status = subscription_status
      profileData.account_status = 'active'
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      // Don't fail completely, user is created
    }

    // Assign role if admin
    if (role === 'admin') {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert(
          { user_id: newUser.user.id, role: 'admin' },
          { onConflict: 'user_id,role' }
        )

      if (roleError) {
        console.error('Error assigning admin role:', roleError)
      }
    }

    // Generate password reset link for the user
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${Deno.env.get('SITE_URL') || req.headers.get('origin')}/auth?type=recovery`,
      },
    })

    if (resetError) {
      console.error('Error generating reset link:', resetError)
    }

    // Send welcome email with password reset link
    const siteUrl = Deno.env.get('SITE_URL') || req.headers.get('origin') || ''
    
    try {
      await supabaseAdmin.functions.invoke('send-email', {
        body: {
          to: email,
          template_type: 'welcome',
          variables: {
            user_name: full_name,
            app_name: 'FitResults',
            user_email: email,
            password_reset_link: resetData?.properties?.action_link || `${siteUrl}/auth?type=recovery`,
          },
        },
      })
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError)
      // Don't fail the request if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test user created successfully',
        user: {
          id: newUser.user.id,
          email,
          full_name,
          role,
          subscription_status,
        },
        password_reset_link: resetData?.properties?.action_link,
        note: 'A welcome email has been sent to the user with a password reset link',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201 
      }
    )
  } catch (error: unknown) {
    console.error('Error creating test user:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
