import { createServerSupabase, supabaseStorageBucket } from "@/lib/supabase/server";

let bucketReady: string | null = null;

export async function ensureStorageBucket() {
  const bucket = supabaseStorageBucket();
  if (bucketReady === bucket) return bucket;

  const supabase = createServerSupabase();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) throw new Error(`Supabase storage list failed: ${listError.message}`);

  const exists = buckets?.some((b) => b.name === bucket);
  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(bucket, { public: false });
    if (createError && !/already exists/i.test(createError.message)) {
      throw new Error(`Supabase bucket create failed: ${createError.message}`);
    }
  }

  bucketReady = bucket;
  return bucket;
}

export async function uploadObject(key: string, data: Buffer, contentType?: string) {
  await ensureStorageBucket();
  const supabase = createServerSupabase();
  const { error } = await supabase.storage.from(supabaseStorageBucket()).upload(key, data, {
    upsert: true,
    contentType,
  });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);
  return key;
}

export async function downloadObject(key: string) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase.storage.from(supabaseStorageBucket()).download(key);

  if (error) throw new Error(`Supabase download failed: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}
