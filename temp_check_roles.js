
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRoles() {
    const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .limit(10);
    
    if (error) {
        console.error('Error fetching roles:', error);
        return;
    }
    
    console.log('Existing roles in profiles table:', Array.from(new Set(data.map(d => d.role))));
}

checkRoles();
