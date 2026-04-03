const EmailTemplate = require('../models/EmailTemplate');

exports.getEmailTemplate = async (req, res) => {
  const { templateId } = req.params;
  try {
    let template = await EmailTemplate.findOne({ templateId });
    
    // Seed default templates if they don't exist
    if (!template && templateId === 'book_approval') {
      template = await EmailTemplate.create({
        templateId: 'book_approval',
        subject: `Book Rental Approved - ${process.env.APP_NAME || 'Bible Rental'} App`,
        body: `Your request for the book "{{bookName}}" has been approved! 

You can collect the book at the following location:
41/C, Shakti Nagar, Palayamkottai, Tirunelveli, Tamil Nadu 627002

Google Maps: https://maps.app.goo.gl/6Dhy6YXJoQMDiMjz8`
      });
    }

    if (!template && templateId === 'book_rejection') {
      template = await EmailTemplate.create({
        templateId: 'book_rejection',
        subject: `Book Rental Request Rejected - ${process.env.APP_NAME || 'Bible Rental'} App`,
        body: `We regret to inform you that your request for the book "{{bookName}}" has been rejected. 

If you have any questions, please contact the admin.`
      });
    }

    if (!template) {
      return res.status(404).send({ status: 'error', data: 'Template not found' });
    }

    res.send({ status: 'Ok', data: template });
  } catch (error) {
    res.status(500).send({ status: 'error', data: error.message });
  }
};

exports.updateEmailTemplate = async (req, res) => {
  const { templateId, subject, body } = req.body;
  try {
    const template = await EmailTemplate.findOneAndUpdate(
      { templateId },
      { subject, body },
      { new: true, upsert: true }
    );
    res.send({ status: 'Ok', data: template });
  } catch (error) {
    res.status(500).send({ status: 'error', data: error.message });
  }
};
