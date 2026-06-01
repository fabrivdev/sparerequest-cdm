UPDATE auth.users
SET encrypted_password = crypt('repuestos_cdm2026', gen_salt('bf')),
    updated_at = now()
WHERE email = 'javier.naleiro@cdm.com.py';