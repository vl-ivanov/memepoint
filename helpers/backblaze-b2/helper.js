const getPublicUrl = (fileName) => {
  const bucketName = process.env.B2_BUCKET_NAME;
  const endpoint = process.env.B2_ENDPOINT;
  return `https://${endpoint}/file/${bucketName}/${fileName}`;
};

const streamToBuffer = async (stream) => {
  return new Promise((resolve, reject) => {
    const data = [];

    stream.on("data", (chunk) => {
      data.push(chunk);
    });

    stream.on("end", () => {
      resolve(Buffer.concat(data));
    });

    stream.on("error", (err) => {
      reject(err);
    });
  });
};

const uploadFile = async (b2, fileBuffer, fileName, mimeType) => {
  await b2.authorize(); // Authorize with Backblaze B2 (valid for 24 hours)

  const bucketName = process.env.B2_BUCKET_NAME; // Replace with actual bucket name

  const bucketResponse = await b2.getBucket({ bucketName });

  // Get upload URL and token
  const uploadUrlResponse = await b2.getUploadUrl({
    bucketId: bucketResponse.data.buckets[0].bucketId,
  });

  const uploadUrl = uploadUrlResponse.data.uploadUrl;
  const authToken = uploadUrlResponse.data.authorizationToken;

  // Upload to Backblaze B2 using the obtained upload URL and token
  const uploadResponse = await b2.uploadFile({
    uploadUrl: uploadUrl,
    uploadAuthToken: authToken,
    fileName: fileName,
    data: fileBuffer,
    mime: mimeType,
    // Optional: onUploadProgress: (event) => { /* handle progress */ },
  });

  // Construct public URL
  return {
    fileId: uploadResponse.data.fileId,
    fileName: uploadResponse.data.fileName,
    size: uploadResponse.data.contentLength,
  };
};

module.exports = {
  getPublicUrl,
  streamToBuffer,
  uploadFile,
};
