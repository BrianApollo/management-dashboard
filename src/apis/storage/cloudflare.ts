/**
 * Cloudflare R2 Storage API
 *
 * All uploads use presigned URLs for reliability.
 * Browser uploads directly to R2 - worker only handles metadata operations.
 *
 * Architecture:
 * - /presign: Generate signed upload URL
 * - /delete: Delete object by key
 * - Browser PUT directly to R2 with presigned URL
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const CF_STORAGE_WORKER_URL = import.meta.env.VITE_CF_STORAGE_WORKER_URL as string | undefined;
const CF_R2_PUBLIC_URL = import.meta.env.VITE_CF_R2_PUBLIC_URL as string | undefined;

/**
 * Check if Cloudflare storage is configured.
 */
export function isCloudflareConfigured(): boolean {
  return !!(CF_STORAGE_WORKER_URL && CF_R2_PUBLIC_URL);
}

function validateConfig(): void {
  const missing: string[] = [];
  if (!CF_STORAGE_WORKER_URL) missing.push('VITE_CF_STORAGE_WORKER_URL');
  if (!CF_R2_PUBLIC_URL) missing.push('VITE_CF_R2_PUBLIC_URL');
  if (missing.length > 0) {
    throw new Error(
      `Cloudflare Storage configuration error: Missing environment variables: ${missing.join(', ')}`
    );
  }
}

// =============================================================================
// TYPES
// =============================================================================

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  url: string;
  fileId: string; // R2 object key
}

export interface UploadOptions {
  /** Optional subfolder/prefix for the file (e.g., "videos", "images") */
  prefix?: string;
  /** Optional progress callback */
  onProgress?: (progress: UploadProgress) => void;
}

interface WorkerDeleteResponse {
  success: boolean;
  error?: string;
}

interface PresignResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresAt: string;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Build a public URL for an R2 object.
 */
export function buildPublicUrl(key: string): string {
  validateConfig();

  const cleanKey = key.startsWith('/') ? key.slice(1) : key;
  const baseUrl = CF_R2_PUBLIC_URL!.endsWith('/')
    ? CF_R2_PUBLIC_URL!.slice(0, -1)
    : CF_R2_PUBLIC_URL!;

  return `${baseUrl}/${cleanKey}`;
}

/**
 * Upload a file to Cloudflare R2 storage.
 */
export async function uploadFile(
  file: File,
  fileName: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  validateConfig();

  const { prefix, onProgress } = options;

  if (!fileName || fileName.trim() === '') {
    throw new Error('Upload blocked: fileName parameter is required');
  }

  const key = prefix
    ? `${prefix}/${fileName}`
    : fileName;

  console.log(`[CF Storage] Uploading file as: ${key} (size: ${file.size} bytes)`);

  return uploadWithPresignedUrl(file, key, onProgress);
}

async function uploadWithPresignedUrl(
  file: File,
  key: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const contentType = file.type || 'application/octet-stream';

  const presignResponse = await fetch(`${CF_STORAGE_WORKER_URL}/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, contentType, contentLength: file.size }),
  });

  if (!presignResponse.ok) {
    let errorMessage = `Failed to get presigned URL: ${presignResponse.status}`;
    try {
      const errorData = await presignResponse.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch { /* Use default error message */ }
    throw new Error(errorMessage);
  }

  const presignData: PresignResponse = await presignResponse.json();
  console.log(`[CF Storage] Got presigned URL, uploading directly to R2...`);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          });
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Presigned upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during presigned upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Presigned upload was aborted'));
    });

    xhr.open('PUT', presignData.uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.send(file);
  });

  console.log(`[CF Storage] Presigned upload complete: ${presignData.publicUrl}`);

  return { url: presignData.publicUrl, fileId: key };
}

/**
 * Delete a file from Cloudflare R2 storage.
 */
export async function deleteFile(key: string): Promise<void> {
  validateConfig();

  console.log(`[CF Storage] Deleting file: ${key}`);

  const response = await fetch(`${CF_STORAGE_WORKER_URL}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });

  if (response.status === 404) {
    console.log(`[CF Storage] File already deleted: ${key}`);
    return;
  }

  if (!response.ok) {
    let errorMessage = `Failed to delete file: ${response.status}`;
    try {
      const errorData: WorkerDeleteResponse = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch { /* Use default error message */ }
    throw new Error(errorMessage);
  }

  console.log(`[CF Storage] File deleted: ${key}`);
}
