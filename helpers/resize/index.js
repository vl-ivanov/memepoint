const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

async function resizeImage(filePath, mimeType, targetWidth) {
  const baseName = path.basename(filePath);
  const rand = Math.random().toString(36).substring(2, 15);
  let newFileName = `${rand}.${baseName.split(".")[0]}`;

  const { width, height } = await sharp(filePath).metadata();
  if (width <= targetWidth) {
    // check if image is already webp
    const isWebp = mimeType === "image/webp";
    const isGif = mimeType === "image/gif";
    const sharpInstance = await sharp(filePath);

    let webpBuffer;
    if (!isWebp && !isGif) {
      webpBuffer = await sharpInstance.toFormat("webp").toBuffer();
      await fs.promises.unlink(filePath);
      await fs.promises.writeFile(filePath, webpBuffer);
      newFileName += ".webp";
    } else {
      webpBuffer = await fs.promises.readFile(filePath);
      if (isGif) {
        newFileName += ".gif";
      } else {
        newFileName += ".webp";
      }
    }

    return {
      fileBuffer: webpBuffer,
      fileName: newFileName,
      mimeType: isGif ? "image/gif" : "image/webp",
    };
  }

  const resizedBuffer = await sharp(filePath).resize(targetWidth).toBuffer();

  // Get metadata of the resized image
  const metadata = await sharp(resizedBuffer).metadata();

  return {
    fileBuffer: resizedBuffer,
    fileName: newFileName,
    mimeType: "image/webp",
    width: metadata.width,
    height: metadata.height,
    size: metadata.size,
  };
}

module.exports = {
  resizeImage,
};
