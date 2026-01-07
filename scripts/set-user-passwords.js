// Quick script to set passwords for test users
// Run with: node scripts/set-user-passwords.js

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Need service role key for admin operations
)

const users = [
  { id: 'ed39d4f3-e13d-4170-9473-e3f6af68b5cb', email: 'mhlauf1+manager@gmail.com', name: 'Lexie' },
  { id: '14c7e33d-ccf4-49f5-a9f5-73bad09fc799', email: 'mhlauf1+trainer@gmail.com', name: 'Mattie' },
]

async function setPasswords() {
  for (const user of users) {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: 'testpass123'
    })

    if (error) {
      console.error(`Failed to set password for ${user.name}:`, error.message)
    } else {
      console.log(`✓ Password set for ${user.name} (${user.email})`)
    }
  }

  console.log('\nDone! All users can now login with password: testpass123')
}

setPasswords()
