
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateShayllaRole() {
    const email = 'shaylla.cadillo@chimivuelos.pe';
    console.log(`Updating role for Shaylla: ${email}...`);
    
    try {
        // 1. Get the user ID from Auth or Profile
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();
            
        if (fetchError || !profile) {
            console.error('User not found in profiles table.');
            return;
        }
        
        const userId = profile.id;
        
        // 2. Update Auth Metadata
        const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
            user_metadata: { role: 'admin' }
        });
        
        if (authError) {
            console.error('Error updating auth metadata:', authError.message);
        } else {
            console.log('Successfully updated Auth metadata.');
        }
        
        // 3. Update public.profiles role
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', userId);
            
        if (profileError) {
            console.error('Error updating profiles table:', profileError.message);
        } else {
            console.log('Successfully updated Profiles table.');
        }
        
        console.log(`Shaylla Cadillo is now an ADMIN in both Auth and Profiles.`);
        
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

updateShayllaRole();
