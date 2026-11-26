'use client';
import type { TelegramClient } from '@/core/telegram/client';

export class MediaService {
  constructor(private client: TelegramClient) {}

  async uploadFile(file: File): Promise<{ id: bigint; parts: number; name: string; md5_checksum: string }> {
    // Chunked upload
    const fileId = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
    const chunkSize = 512 * 1024;
    const parts = Math.ceil(file.size / chunkSize);
    const name = file.name;

    for (let i = 0; i < parts; i++) {
      const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
      const bytes = new Uint8Array(await chunk.arrayBuffer());
      await this.client.call('upload.saveFilePart', { file_id: fileId, file_part: i, bytes });
    }

    return { id: fileId, parts, name, md5_checksum: '' };
  }

  async sendMedia(peer: unknown, file: File, caption = '') {
    const uploaded = await this.uploadFile(file);
    return this.client.call('messages.sendMedia', {
      peer,
      media: { _: 'inputMediaUploadedDocument', file: { _: 'inputFile', id: uploaded.id, parts: uploaded.parts, name: uploaded.name, md5_checksum: '' }, mime_type: file.type, attributes: [] },
      message: caption,
      random_id: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
    });
  }

  async downloadFile(location: unknown, offset = 0, limit = 1024 * 1024) {
    return this.client.call('upload.getFile', { location, offset, limit, cdn_supported: false });
  }
}
