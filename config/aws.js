const AWS = require("aws-sdk");

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: "ap-northeast-2", // 예: 'us-west-2'
});

const s3 = new AWS.S3();

async function generatePresignedUrl(params) {
  return new Promise((resolve, reject) => {
    s3.getSignedUrl("putObject", params, (err, url) => {
      if (err) reject(err);
      else resolve(url);
    });
  });
}

async function deleteImageFromS3(bucket, key) {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: bucket,
      Key: key,
    };

    s3.deleteObject(params, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}

const getUploadUrls = async (req, res, next) => {
  const user = req.session.passport.user[0];
  const imgCount = Number(req.query.imgCount) || 1;

  try {
    const bucket = "moram";
    let uploadData = [];
    const s3Client = new AWS.S3(); // Assuming AWS SDK has been set up earlier in the code.

    for (let i = 0; i < imgCount; i++) {
      const key = `community/${user.nickname}_${new Date().getTime()}_${i}`;
      const params = {
        Bucket: bucket,
        Key: key,
        Expires: 60 * 5,
        ContentType: "image/jpeg",
      };

      const presignedUrl = await s3Client.getSignedUrlPromise(
        "putObject",
        params
      );
      const imageUrl = `https://${bucket}.s3.${s3.config.region}.amazonaws.com/${key}`;
      uploadData.push({ presignedUrl: presignedUrl, imageUrl: imageUrl });
    }

    req.uploadData = uploadData; // Attach uploadData to the request object for the next middleware
    next();
  } catch (error) {
    console.error(error);
    res.status(500).send({
      error: "An error occurred while generating the presigned URLs.",
    });
  }
};

module.exports = {
  getUploadUrls,
  deleteImageFromS3,
  s3,
};
