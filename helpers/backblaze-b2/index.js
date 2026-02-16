const fs = require("fs");
const path = require("path");
const appRoot = path.dirname(require.main.filename);
const B2 = require("@stz184/backblaze-b2");
const sharp = require("sharp");
const { streamToBuffer, uploadFile } = require("./helper");
const { resizeImage } = require("../resize");

const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
  applicationKey: process.env.B2_APPLICATION_KEY,
});

function getDestination(req, file, cb) {
  cb(null, "/dev/null");
}

function BackblazeStorage(opts) {
  this.getDestination = opts?.destination || getDestination;
}

BackblazeStorage.prototype._handleFile = async function (req, file, cb) {
  const fileBuffer = await streamToBuffer(file.stream);
  const fileName = file.originalname;
  const mimeType = file.mimetype;
  const rand = Math.random().toString(36).substring(2, 15);

  // Save temporary file
  const tempFilePath = path.join(appRoot, "tmp", `${rand}.${fileName}`);
  await fs.promises.writeFile(tempFilePath, fileBuffer);

  // Resize image if necessary
  if (!mimeType.startsWith("image/")) {
    await fs.promises.unlink(tempFilePath);
    cb(null, null);
    return;
  }

  const {
    fileBuffer: resizedBuffer,
    fileName: resizedFileName,
    mimeType: resizedMimeType,
    width,
    height,
    size,
  } = await resizeImage(tempFilePath, mimeType, 800);
  await fs.promises.unlink(tempFilePath);

  const uploadResponse = await uploadFile(
    b2,
    resizedBuffer,
    resizedFileName,
    mimeType,
  );

  cb(null, {
    ...uploadResponse,
    width,
    height,
    size,
  });
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

BackblazeStorage.prototype.destroy = async function destroy(fileId, fileName) {
  await b2.authorize();
  return await b2.deleteFileVersion({
    fileId,
    fileName,
    // ...common arguments (optional)
  });
};

module.exports = function (opts) {
  return new BackblazeStorage(opts);
};
