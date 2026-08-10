import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestUser {
  email: string
  fullName: string
  role: string
}

const TEST_USERS: TestUser[] = [
  { email: 'admin@admin.com', fullName: 'Administrador', role: 'admin' },
  { email: 'user@test.com', fullName: 'Usuário Teste', role: 'user' },
  { email: 'gym@test.com', fullName: 'Academia Teste', role: 'academy_admin' },
  { email: 'pt@test.com', fullName: 'Personal Trainer Teste', role: 'personal_trainer' },
  { email: 'content@test.com', fullName: 'Criador de Conteúdo Teste', role: 'content_creator' },
]

const DEFAULT_PASSWORD = 'Temp@123'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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

    const results: { email: string; status: string; role: string }[] = []

    // Get existing users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingEmails = new Set(existingUsers?.users?.map(u => u.email) || [])

    for (const testUser of TEST_USERS) {
      try {
        // Check if user already exists
        if (existingEmails.has(testUser.email)) {
          // User exists - just ensure profile and role are set
          const { data: userData } = await supabaseAdmin.auth.admin.listUsers()
          const existingUser = userData?.users?.find(u => u.email === testUser.email)
          
          if (existingUser) {
            // Ensure profile exists
            await supabaseAdmin
              .from('profiles')
              .upsert({
                id: existingUser.id,
                email: testUser.email,
                full_name: testUser.fullName,
                subscription_status: 'active',
                account_status: 'active',
              }, { onConflict: 'id' })

            // Ensure role exists
            await supabaseAdmin
              .from('user_roles')
              .upsert({
                user_id: existingUser.id,
                role: testUser.role,
              }, { onConflict: 'user_id,role' })

            results.push({
              email: testUser.email,
              status: 'updated',
              role: testUser.role,
            })
          }
          continue
        }

        // Create new user (no email sent with email_confirm: true)
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: testUser.email,
          password: DEFAULT_PASSWORD,
          email_confirm: true, // Skip email confirmation
          user_metadata: {
            full_name: testUser.fullName,
            must_change_password: true,
          },
        })

        if (createError) {
          console.error(`Error creating ${testUser.email}:`, createError)
          results.push({
            email: testUser.email,
            status: `error: ${createError.message}`,
            role: testUser.role,
          })
          continue
        }

        if (newUser?.user) {
          // Create profile
          await supabaseAdmin
            .from('profiles')
            .upsert({
              id: newUser.user.id,
              email: testUser.email,
              full_name: testUser.fullName,
              subscription_status: 'active',
              account_status: 'active',
            }, { onConflict: 'id' })

          // Assign role
          await supabaseAdmin
            .from('user_roles')
            .upsert({
              user_id: newUser.user.id,
              role: testUser.role,
            }, { onConflict: 'user_id,role' })

          results.push({
            email: testUser.email,
            status: 'created',
            role: testUser.role,
          })
        }
      } catch (userError) {
        console.error(`Error processing ${testUser.email}:`, userError)
        results.push({
          email: testUser.email,
          status: `error: ${userError instanceof Error ? userError.message : 'Unknown'}`,
          role: testUser.role,
        })
      }
    }

    const created = results.filter(r => r.status === 'created').length
    const updated = results.filter(r => r.status === 'updated').length
    const errors = results.filter(r => r.status.startsWith('error')).length

    return new Response(
      JSON.stringify({
        success: true,
        message: `Provisioned ${created} new users, updated ${updated} existing users, ${errors} errors`,
        defaultPassword: DEFAULT_PASSWORD,
        note: 'All users must change password on first login',
        results,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error: unknown) {
    console.error('Error provisioning test users:', error)
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
