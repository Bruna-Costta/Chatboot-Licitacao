export interface StoredFile {
  storedName: string;
  sizeBytes: number;
}

export interface StorageService {
  save(organizationId: string, mimeType: string, data: ArrayBuffer): Promise<StoredFile>;
  resolvePath(organizationId: string, storedName: string): string;
}
