import { FileUploadState } from "@/lib/types"
import { toast } from "@/lib/toast";

export async function uploadFilesToCloudinary(
    filesToUpload: FileList,
    setFileUploadStates: React.Dispatch<React.SetStateAction<FileUploadState[]>>
  ): Promise<{ type: 'file'; mediaType: string; url: string }[]> {
    setFileUploadStates(
      Array.from(filesToUpload).map(file => ({ file, status: 'uploading' }))
    );
  
    const results = await Promise.all(
      Array.from(filesToUpload).map(async (file, index) => {
        try {
          const formData = new FormData();
          formData.append('file', file);
          const response = await fetch('/api/upload', { method: 'POST', body: formData });
          if (!response.ok) throw new Error('Upload failed');
          const { files: uploadedFiles } = await response.json();
          const uploadedUrl = uploadedFiles[0]?.url;
  
          setFileUploadStates(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], status: 'success', uploadedUrl };
            return updated;
          });
          return { type: 'file' as const, mediaType: file.type || 'application/octet-stream', url: uploadedUrl };
        } catch {
          setFileUploadStates(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], status: 'error', errorMessage: `Failed to upload ${file.name}` };
            return updated;
          });
          toast.error(`Failed to upload ${file.name}`);
          return null;
        }
      })
    );
  
    return results.filter(Boolean) as { type: 'file'; mediaType: string; url: string }[];
}