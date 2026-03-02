
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const usersToMigrate = [
    { firstName: 'Contabilidad', lastName: 'Admin', email: 'contabilidad@chimivuelos.pe', password: 'ContaChimi84!', role: 'admin' },
    { firstName: 'Administracion', lastName: 'Admin', email: 'administracion@chimivuelos.pe', password: 'AdminVuelos27!', role: 'admin' },
    { firstName: 'Shaylla', lastName: 'Admin', email: 'shaylla.cadillo@chimivuelos.pe', password: 'ShayllaVu82!', role: 'admin' }, // Shaylla as Admin
    { firstName: 'Gabriela', lastName: 'Agente', email: 'operaciones@chimivuelos.pe', password: 'OperaChimi9!', role: 'agent' },
    { firstName: 'Ventas', lastName: 'Agente', email: 'ventas@chimivuelos.pe', password: 'VentasChimi45!', role: 'agent' },
    { firstName: 'Estefani', lastName: 'Agente', email: 'estefani@chimivuelos.pe', password: 'EstefaChimi19!', role: 'agent' },
    { firstName: 'Jenni', lastName: 'Agente', email: 'jenni@chimivuelos.pe', password: 'JenniVu73!', role: 'agent' },
    { firstName: 'Lorena', lastName: 'Agente', email: 'lorena@chimivuelos.pe', password: 'LoreChimi63!', role: 'agent' },
    { firstName: 'Karla', lastName: 'Agente', email: 'karla@chimivuelos.pe', password: 'KarlaVu24!', role: 'agent' },
    { firstName: 'Valeri', lastName: 'Agente', email: 'valeri@chimivuelos.pe', password: 'ValeChimi58!', role: 'agent' },
    { firstName: 'Jhon', lastName: 'Agente', email: 'jhon@chimivuelos.pe', password: 'JhonVu33!', role: 'agent' },
    { firstName: 'Elvio', lastName: 'Agente', email: 'elvio@chimivuelos.pe', password: 'ElvioChimi71!', role: 'agent' },
    { firstName: 'Antoni', lastName: 'Agente', email: 'antoni@chimivuelos.pe', password: 'AntoniVu90!', role: 'agent' },
    { firstName: 'Olenka', lastName: 'Agente', email: 'olenka@chimivuelos.pe', password: 'OlenkaChimi8!', role: 'agent' },
    { firstName: 'Pamela', lastName: 'Agente', email: 'pamela@chimivuelos.pe', password: 'PameVu46!', role: 'agent' },
    { firstName: 'Yeimi', lastName: 'Agente', email: 'yeimi@chimivuelos.pe', password: 'yei@@2026Mi', role: 'agent' },
    { firstName: 'Miguel', lastName: 'Agente', email: 'miguel.consulente@chimivuelos.pe', password: 'miguel20Cte', role: 'agent' },
    { firstName: 'Angel', lastName: 'Agente', email: 'angel@chimivuelos.pe', password: 'angEl20Cte', role: 'agent' },
    { firstName: 'Isabel', lastName: 'Agente', email: 'isabel@chimivuelos.pe', password: 'Isa20Cte26', role: 'agent' },
    { firstName: 'Enna', lastName: 'Agente', email: 'enna@chimivuelos.pe', password: 'enna26ADa@', role: 'agent' },
    { firstName: 'Rocio', lastName: 'Agente', email: 'rocio@chimivuelos.pe', password: 'RocioChimi12!', role: 'agent' },
    { firstName: 'Ventas 1', lastName: 'Agente', email: 'ventas01@chimivuelos.pe', password: 'Ventas01Chimi73!', role: 'agent' },
    { firstName: 'Ventas 2', lastName: 'Agente', email: 'ventas02@chimivuelos.pe', password: 'Ventas02Vu68!', role: 'agent' },
    { firstName: 'Ventas 3', lastName: 'Agente', email: 'ventas03@chimivuelos.pe', password: 'Ventas03Chimi94!', role: 'agent' },
];

async function cleanAndMigrate() {
    console.log('--- STARTING CLEAN MIGRATION ---');

    // 1. Get ALL users from Auth to find their IDs
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error('Error listing users:', listError);
        return;
    }

    const emailToIdMap = new Map(users.map(u => [u.email.toLowerCase(), u.id]));

    for (const user of usersToMigrate) {
        const lowerEmail = user.email.toLowerCase();
        console.log(`Processing ${user.email}...`);

        let userId = emailToIdMap.get(lowerEmail);

        try {
            if (!userId) {
                // Create user if they don't exist in Auth
                console.log(`Creating ${user.email} in Auth...`);
                const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                    email: user.email,
                    password: user.password,
                    email_confirm: true,
                    user_metadata: {
                        first_name: user.firstName,
                        last_name: user.lastName,
                        role: user.role
                    }
                });

                if (authError) {
                    console.error(`Error creating ${user.email}:`, authError.message);
                    continue;
                }
                userId = authData.user.id;
            } else {
                // Update existing user metadata if they already exist
                console.log(`User ${user.email} exists, updating Auth metadata...`);
                await supabase.auth.admin.updateUserById(userId, {
                    user_metadata: {
                        first_name: user.firstName,
                        last_name: user.lastName,
                        role: user.role
                    }
                });
            }

            // Sync to Profiles table
            console.log(`Syncing profile for ${user.email}...`);
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    email: user.email,
                    first_name: user.firstName,
                    last_name: user.lastName,
                    role: user.role,
                    active: true
                }, { onConflict: 'id' });

            if (profileError) {
                console.error(`Profile sync error for ${user.email}:`, profileError.message);
            } else {
                console.log(`SUCCESS: ${user.email} is ready.`);
            }

        } catch (err) {
            console.error(`Unexpected error for ${user.email}:`, err);
        }
    }

    console.log('--- CLEAN MIGRATION FINISHED ---');
}

cleanAndMigrate();
