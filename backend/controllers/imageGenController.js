require('dotenv').config();
const axios = require('axios');
const User = require('../models/UserDetails');
const Organization = require('../models/Organization');

const STABILITY_API_URL = process.env.STABILITY_API_URL
  || 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image';

/**
 * Generates a verse illustration.
 *
 * The Stability API key stays on the server. It used to be shipped inside the
 * app via expoConfig.extra, which meant anyone who unpacked the APK could read
 * it and spend the account's credits — a bundled mobile app cannot keep a
 * secret, so the call has to be proxied.
 *
 * Credit is deducted here too, atomically, so a client cannot generate an image
 * without paying for it by simply not calling the deduct endpoint afterwards.
 */
exports.generateVerseImage = async (req, res) => {
  const { prompt } = req.body;

  try {
    if (!process.env.STABILITY_API_KEY) {
      return res.status(503).json({ status: 'error', message: 'Image generation is not configured on the server.' });
    }
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
      return res.status(400).json({ status: 'error', message: 'A verse prompt is required.' });
    }
    if (prompt.length > 1500) {
      return res.status(400).json({ status: 'error', message: 'That prompt is too long.' });
    }

    // Respect the organization's feature switch.
    const org = await Organization.findById(req.orgId).select('features');
    if (org && org.features && org.features.imageGeneration === false) {
      return res.status(403).json({
        status: 'error',
        code: 'FEATURE_DISABLED',
        message: 'Image generation is switched off for this organization.'
      });
    }

    // Claim a credit atomically. If this returns null the user had none left,
    // and no call is made to the paid API.
    const charged = await User.findOneAndUpdate(
      { _id: req.user._id, image_generation_credits_available: { $gt: 0 } },
      { $inc: { image_generation_credits_available: -1 } },
      { new: true }
    );
    if (!charged) {
      return res.status(402).json({
        status: 'error',
        code: 'NO_CREDITS',
        message: 'You have no image generation credits left.'
      });
    }

    let response;
    try {
      response = await axios.post(
        STABILITY_API_URL,
        {
          text_prompts: [{ text: prompt, weight: 1 }],
          cfg_scale: 7, height: 1024, width: 1024, steps: 50, samples: 1,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: 90000,
        }
      );
    } catch (apiErr) {
      // Refund the credit — the user got nothing for it.
      await User.updateOne(
        { _id: req.user._id },
        { $inc: { image_generation_credits_available: 1 } }
      );
      console.error('Stability API error:', apiErr.response?.status, apiErr.message);
      return res.status(502).json({
        status: 'error',
        message: 'The image service did not respond. Your credit has not been used.'
      });
    }

    const base64 = response.data?.artifacts?.[0]?.base64;
    if (!base64) {
      await User.updateOne(
        { _id: req.user._id },
        { $inc: { image_generation_credits_available: 1 } }
      );
      return res.status(502).json({
        status: 'error',
        message: 'No image was returned. Your credit has not been used.'
      });
    }

    res.json({
      status: 'Ok',
      data: { base64 },
      remainingCredits: charged.image_generation_credits_available
    });
  } catch (error) {
    console.error('generateVerseImage error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to generate image.' });
  }
};
