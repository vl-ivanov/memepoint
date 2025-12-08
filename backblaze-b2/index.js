var fs = require("fs");
const B2 = require("@stz184/backblaze-b2");

const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
  applicationKey: process.env.B2_APPLICATION_KEY,
});

// Source - https://stackoverflow.com/a/65793537
// Posted by Slimani
// Retrieved 2025-11-29, License - CC BY-SA 4.0

async function streamToBuffer(stream) {
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
}

function getDestination(req, file, cb) {
  cb(null, "/dev/null");
}

function BackblazeStorage(opts) {
  this.getDestination = opts?.destination || getDestination;
}

BackblazeStorage.prototype.b2UploadFile = async function (
  fileBuffer,
  fileName,
  mimeType,
) {
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
  const publicUrl = `https://f002.backblazeb2.com/file/${bucketName}/${uploadResponse.data.fileName}`;
  return {
    fileId: uploadResponse.data.fileId,
    size: uploadResponse.data.contentLength,
    publicUrl: publicUrl,
  };
};

BackblazeStorage.prototype._handleFile = async function (req, file, cb) {
  const fileBuffer = await streamToBuffer(file.stream);
  const fileName = file.originalname;
  const mimeType = file.mimetype;

  const uploadResponse = await this.b2UploadFile(
    fileBuffer,
    fileName,
    mimeType,
  );

  console.log("File uploaded successfully:", uploadResponse.data);

  cb(null, uploadResponse);
};

BackblazeStorage.prototype._removeFile = function _removeFile(req, file, cb) {
  b2.deleteFileVersion({
    fileId: file.path,
    fileName: file.originalname,
    // ...common arguments (optional)
  })
    .then(() => {
      cb(null);
    })
    .catch((err) => {
      console.error("Error deleting file:", err);
      cb(err);
    });
};

BackblazeStorage.prototype.destroy = function destroy(fileId, fileName) {
  return b2.deleteFileVersion({
    fileId,
    fileName,
    // ...common arguments (optional)
  });
};

module.exports = function (opts) {
  return new BackblazeStorage(opts);
};
