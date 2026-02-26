export interface TripCardData {
    city: string;
    summary: string;
    packingAdvice: string[];
    cautions: string[];
    createdAt?: string;
}
  
export interface PackingItemData {
    item: string;
    reason: string;
}
  
export interface PackingListData {
    items: PackingItemData[];
    totalItems: number;
    createdAt?: string;
}
  
export type FileStatus = 'pending' | 'uploading' | 'success' | 'error';
  
export interface FileUploadState {
    file: File;
    status: FileStatus;
    errorMessage?: string;
    uploadedUrl?: string;
}
  