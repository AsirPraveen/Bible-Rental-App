const ForumQuestion = require('../models/ForumQuestion');
const { notifyUserById } = require('../utils/notificationService');

// Create a new question
exports.createQuestion = async (req, res) => {
  try {
    const { questionText, isAnonymous } = req.body;
    const user = req.user._id;
    
    if (!questionText) {
      return res.status(400).json({ status: "Error", data: 'Question text is required.' });
    }

    const newQuestion = new ForumQuestion({
      organization: req.orgId,
      user,
      questionText,
      isAnonymous,
      visibility: 'org'
    });

    await newQuestion.save();
    return res.status(201).json({ status: "Success", data: newQuestion });
  } catch (error) {
    console.error('Error creating question:', error);
    return res.status(500).json({ status: "Error", data: 'Server error' });
  }
};

// Get all questions
exports.getAllQuestions = async (req, res) => {
  try {
    const questions = await ForumQuestion.find({ organization: req.orgId })
      .populate('user', 'name profilePic')
      .populate('answers.user', 'name profilePic')
      .sort({ createdAt: -1 });

    const parsedQuestions = questions.map(q => {
      let rq = q.toObject();
      if (rq.isAnonymous) {
        rq.user = { name: 'Anonymous' };
      }
      return rq;
    });

    return res.status(200).json({ status: "Success", data: parsedQuestions });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return res.status(500).json({ status: "Error", data: 'Server error' });
  }
};

// Add an answer
exports.addAnswer = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { answerText } = req.body;
    const user = req.user._id;

    if (!answerText) {
      return res.status(400).json({ status: "Error", data: 'Answer text is required.' });
    }

    const question = await ForumQuestion.findOne({
      _id: questionId,
      organization: req.orgId
    });
    
    if (!question) {
       return res.status(404).json({ status: "Error", data: 'Question not found or inaccessible' });
    }

    question.answers.push({ user, answerText });
    await question.save();
    
    // Notify the question owner
    if (question.user && question.user.toString() !== user.toString()) {
        await notifyUserById(
            question.user, 
            'forumActivity', 
            'New Answer in Forum ✍️', 
            `Someone has answered your question: "${question.questionText.substring(0, 50)}..."`,
            { questionId: question._id, type: 'forum' }
        );
    }
    
    const populatedQuestion = await ForumQuestion.findById(questionId)
        .populate('user', 'name profilePic')
        .populate('answers.user', 'name profilePic');

    let responseData = populatedQuestion.toObject();
    if(responseData.isAnonymous){
        responseData.user = { name: 'Anonymous' };
    }

    return res.status(201).json({ status: "Success", data: responseData });

  } catch (error) {
    console.error('Error adding answer:', error);
    return res.status(500).json({ status: "Error", data: 'Server error' });
  }
};
