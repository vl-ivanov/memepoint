const getPublicUrl = (fileName) => {
  const bucketName = process.env.B2_BUCKET_NAME;
  const endpoint = process.env.B2_ENDPOINT;
  return `https://${endpoint}/file/${bucketName}/${fileName}`;
};

module.exports = {
  getPublicUrl,
};
