import api from './api';

interface UploadResponse {
  signedUrl: string;
  fileUrl: string;
}

export const uploadToS3 = async (file: File): Promise<string> => {
  try {
    // First, get a signed URL from our server
    const { data } = await api.post<UploadResponse>('/upload/sign-s3', {
      fileName: file.name,
      fileType: file.type,
    });

    // Upload the file directly to S3 using the signed URL
    const uploadResponse = await fetch(data.signedUrl, {
      method: 'PUT',
      headers: { 
        'Content-Type': file.type,
        // Removed x-amz-acl as we're using bucket policies for access control
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('S3 Upload Error:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: errorText,
        signedUrl: data.signedUrl,
        fileInfo: {
          name: file.name,
          type: file.type,
          size: file.size
        }
      });
      throw new Error(`Upload failed with status ${uploadResponse.status}: ${uploadResponse.statusText}`);
    }

    // Return the public URL of the uploaded file
    return data.fileUrl;
  } catch (error) {
    console.error('Upload failed:', error);
    throw new Error('Failed to upload file. Please try again.');
  }
};
