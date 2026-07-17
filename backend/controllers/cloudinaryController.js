require('dotenv').config();
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;

const JWT_SECRET = process.env.JWT_SECRET;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.deleteImage = async (req, res) => {
  const { token, publicId, resourceType } = req.body;
  console.log('Delete request body:', req.body);
  
  try {
    // Verify JWT token
    const user = jwt.verify(token, JWT_SECRET);
    console.log('Authenticated user:', user.email);

    if (!publicId) {
      return res.status(400).send({ 
        status: "error", 
        data: "Public ID is required" 
      });
    }

    console.log('Attempting to delete asset with public_id:', publicId, 'resource_type:', resourceType);

    // Delete the image/video from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType || 'image'
    });
    console.log('Cloudinary deletion result:', result);

    if (result.result === 'ok') {
      res.send({ 
        status: "Ok", 
        data: "Image deleted successfully",
        result: result 
      });
    } else if (result.result === 'not found') {
      // Image doesn't exist, but that's fine - consider it successful
      res.send({ 
        status: "Ok", 
        data: "Image not found (already deleted)",
        result: result 
      });
    } else {
      res.send({ 
        status: "error", 
        data: "Failed to delete image",
        result: result 
      });
    }
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).send({ 
        status: "error", 
        data: "Invalid token" 
      });
    }
    
    res.status(500).send({ 
      status: "error", 
      data: error.message 
    });
  }
};