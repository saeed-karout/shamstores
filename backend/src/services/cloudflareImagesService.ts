interface CloudflareApiError {
  message: string;
}

interface CloudflareApiResponse<T> {
  success: boolean;
  errors?: CloudflareApiError[];
  result: T;
}

interface CloudflareUploadResult {
  id: string;
  variants: string[];
}

interface UploadedImage {
  id: string;
  url: string;
}

class CloudflareImagesService {
  private getConfig() {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_IMAGES_API_TOKEN;
    const deliveryUrl = process.env.CLOUDFLARE_IMAGES_DELIVERY_URL?.replace(/\/+$/, '');
    const variant = process.env.CLOUDFLARE_IMAGES_VARIANT || 'public';

    if (!accountId || !apiToken) {
      throw new Error('Cloudflare Images is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_IMAGES_API_TOKEN.');
    }

    return { accountId, apiToken, deliveryUrl, variant };
  }

  private getErrorMessage(errors?: CloudflareApiError[]): string {
    if (!errors || errors.length === 0) {
      return 'Cloudflare Images request failed';
    }

    return errors.map((err) => err.message).join(', ');
  }

  private buildEndpoint(accountId: string, imageId?: string): string {
    const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`;
    return imageId ? `${base}/${imageId}` : base;
  }

  private resolveImageUrl(result: CloudflareUploadResult, deliveryUrl?: string, variant = 'public'): string {
    if (Array.isArray(result.variants) && result.variants.length > 0) {
      return result.variants[0];
    }

    if (!deliveryUrl) {
      throw new Error('Cloudflare Images upload succeeded but no delivery URL is available. Set CLOUDFLARE_IMAGES_DELIVERY_URL.');
    }

    return `${deliveryUrl}/${result.id}/${variant}`;
  }

  async uploadImage(
    file: Express.Multer.File,
    metadata: Record<string, string | undefined> = {}
  ): Promise<UploadedImage> {
    const { accountId, apiToken, deliveryUrl, variant } = this.getConfig();

    if (!file?.buffer || file.buffer.length === 0) {
      throw new Error('Invalid upload file buffer.');
    }

    const FormDataCtor = (globalThis as any).FormData;
    const BlobCtor = (globalThis as any).Blob;
    const fetchFn = (globalThis as any).fetch as ((input: any, init?: any) => Promise<any>) | undefined;

    if (!FormDataCtor || !BlobCtor || !fetchFn) {
      throw new Error('This Node.js runtime does not support fetch/FormData/Blob required for Cloudflare uploads.');
    }

    const formData = new FormDataCtor();
    const blob = new BlobCtor([file.buffer], { type: file.mimetype || 'application/octet-stream' });
    formData.append('file', blob, file.originalname || 'upload');
    formData.append('requireSignedURLs', 'false');

    const cleanMetadata = Object.fromEntries(
      Object.entries(metadata).filter(([, value]) => value !== undefined && value !== '')
    );
    if (Object.keys(cleanMetadata).length > 0) {
      formData.append('metadata', JSON.stringify(cleanMetadata));
    }

    const response = await fetchFn(this.buildEndpoint(accountId), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`
      },
      body: formData
    });

    const payload = (await response.json()) as CloudflareApiResponse<CloudflareUploadResult>;

    if (!response.ok || !payload.success || !payload.result?.id) {
      throw new Error(this.getErrorMessage(payload.errors));
    }

    return {
      id: payload.result.id,
      url: this.resolveImageUrl(payload.result, deliveryUrl, variant)
    };
  }

  extractImageIdFromUrl(imageUrl?: string): string | null {
    if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
      return null;
    }

    try {
      const parsedUrl = new URL(imageUrl);
      const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);

      const cdnCgiMatch = parsedUrl.pathname.match(/\/cdn-cgi\/imagedelivery\/[^/]+\/([^/]+)/);
      if (cdnCgiMatch?.[1]) {
        return cdnCgiMatch[1];
      }

      const deliveryBase = process.env.CLOUDFLARE_IMAGES_DELIVERY_URL;
      if (deliveryBase) {
        try {
          const parsedDeliveryBase = new URL(deliveryBase);
          if (parsedDeliveryBase.host === parsedUrl.host) {
            const baseSegments = parsedDeliveryBase.pathname.split('/').filter(Boolean);
            const hasBasePrefix = baseSegments.every((segment, index) => pathSegments[index] === segment);
            if (hasBasePrefix) {
              const imageId = pathSegments[baseSegments.length];
              if (imageId) {
                return imageId;
              }
            }
          }
        } catch {
          // ignore invalid delivery base URL and continue with fallback extraction
        }
      }

      if (parsedUrl.hostname.includes('imagedelivery.net') && pathSegments.length >= 2) {
        return pathSegments[1];
      }
    } catch (error) {
      console.error('Failed to parse Cloudflare image URL:', error);
    }

    return null;
  }

  async deleteImageById(imageId: string): Promise<void> {
    const { accountId, apiToken } = this.getConfig();
    const fetchFn = (globalThis as any).fetch as ((input: any, init?: any) => Promise<any>) | undefined;

    if (!fetchFn) {
      throw new Error('This Node.js runtime does not support fetch required for Cloudflare image deletion.');
    }

    const response = await fetchFn(this.buildEndpoint(accountId, imageId), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiToken}`
      }
    });

    const payload = (await response.json()) as CloudflareApiResponse<{ id: string }>;

    if (!response.ok || !payload.success) {
      throw new Error(this.getErrorMessage(payload.errors));
    }
  }

  async deleteImageByUrl(imageUrl?: string): Promise<void> {
    const imageId = this.extractImageIdFromUrl(imageUrl);
    if (!imageId) {
      return;
    }

    await this.deleteImageById(imageId);
  }
}

export default new CloudflareImagesService();
