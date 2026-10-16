# Supabase Storage for production uploads

The backend can store uploads in a Supabase Storage bucket using its S3-compatible endpoint. The bucket must be private. Authenticated attachment download routes continue to check the employee and existing module permissions before reading an object. The profile-photo URL route is currently unauthenticated: it serves an image only when the filename is referenced by an employee profile. Treat those photo URLs as publicly reachable, and do not use profile-photo storage for documents.

## Supabase project setup

1. Create a Supabase project on the Free plan and select a region appropriate for the company.
2. In Storage, create a **private** bucket, for example `hr-portal-uploads`.
3. Keep the bucket's file size limit at least 10 MB. The application rejects uploads larger than 10 MB.
4. In Storage settings, enable the S3 protocol and create an S3 access key pair. These server-side keys grant broad access to storage and must never be put in frontend variables or committed to Git.
5. Copy the S3 endpoint and region shown in the Supabase settings.

## Render backend environment

Set these variables in the backend service's Render environment settings before deploying:

```text
STORAGE_PROVIDER=supabase
SUPABASE_STORAGE_ENDPOINT=https://<project-ref>.storage.supabase.co/storage/v1/s3
SUPABASE_STORAGE_REGION=<region shown in Supabase S3 settings>
SUPABASE_STORAGE_BUCKET=hr-portal-uploads
SUPABASE_STORAGE_ACCESS_KEY_ID=<S3 access key>
SUPABASE_STORAGE_SECRET_ACCESS_KEY=<S3 secret key>
```

Enter the secret key directly in Render's secret environment variable field. Do not place real credentials in this file, `.env.example`, browser code, or a commit. The backend should use the exact endpoint and region displayed by Supabase.

## Free plan limits and existing files

Supabase Free currently includes 1 GB of file storage and 5 GB of egress per billing period. Free projects can pause after a week of low activity. Plan limits and pause behavior can change; check the [current billing limits](https://supabase.com/docs/guides/platform/billing-on-supabase) and [free project pause policy](https://supabase.com/docs/guides/platform/free-project-pausing) before relying on them. Monitor usage; staying within the free allowances is necessary to keep storage at $0.

Switching providers does not copy existing files. Any files still available on the old server disk need to be copied into the Supabase bucket with their existing `uploads/<filename>` object keys so database references keep working. Files already missing from Render must be restored from a backup or uploaded again.
