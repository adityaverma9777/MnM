// Environment variable type declarations for MnM
declare namespace NodeJS {
    interface ProcessEnv {
        // Supabase (Realtime only)
        NEXT_PUBLIC_SUPABASE_URL: string;
        NEXT_PUBLIC_SUPABASE_ANON_KEY: string;

        // Cloudflare R2 (S3-compatible)
        R2_ACCOUNT_ID: string;
        R2_ACCESS_KEY_ID: string;
        R2_SECRET_ACCESS_KEY: string;
        R2_BUCKET_NAME: string;

        // Application
        MNM_PASSWORD: string;
    }
}
