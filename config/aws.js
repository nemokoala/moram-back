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

const getUploadUrls = async (req, res, next) => {
  const user = req.session.passport.user[0];
  const { imageCount } = req.body;

  try {
    const bucket = "moram";
    let uploadData = [];

    for (let i = 0; i < imageCount; i++) {
      const key = `community/${user.nickname}_${new Date().getTime()}_${i}`;
      const params = {
        Bucket: bucket,
        Key: key,
        Expires: 60 * 5,
        ContentType: "image/jpeg",
      };

      const presignedUrl = await generatePresignedUrl(params);
      const imageUrl = `https://${bucket}.s3.${s3.config.region}.amazonaws.com/${key}`;
      uploadData.push({ presignedUrl: presignedUrl, imageUrl: imageUrl });
    }

    req.uploadData = uploadData; // 미들웨어에서 다음 처리를 위해 uploadData를 요청 객체에 첨부
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
  s3,
};
