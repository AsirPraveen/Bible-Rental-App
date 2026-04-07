const BibleChapter = require('../models/BibleChapter');
const axios = require('axios');

exports.getLanguages = async (req, res) => {
  try {
    const languages = await BibleChapter.distinct('language');
    res.status(200).json({ status: 'Ok', data: languages });
  } catch (error) {
    console.error('Error fetching languages:', error);
    res.status(500).json({ status: 'Error', message: 'Failed to fetch languages' });
  }
};

exports.getBooks = async (req, res) => {
  try {
    const { language } = req.query;
    if (!language) {
      return res.status(400).json({ status: 'Error', message: 'Language is required' });
    }

    // Aggregate to get books and their max chapter numbers
    const books = await BibleChapter.aggregate([
      { $match: { language } },
      {
        $group: {
          _id: { bookNumber: "$bookNumber", bookName: "$bookName" },
          chapterCount: { $max: "$chapterNumber" }
        }
      },
      {
        $project: {
          _id: 0,
          bookNumber: "$_id.bookNumber",
          bookName: "$_id.bookName",
          chapterCount: 1
        }
      },
      { $sort: { bookNumber: 1 } }
    ]);

    res.status(200).json({ status: 'Ok', data: books });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ status: 'Error', message: 'Failed to fetch books' });
  }
};

exports.getChapter = async (req, res) => {
  try {
    const { language, bookNumber, chapterNumber } = req.query;
    
    if (language === undefined || bookNumber === undefined || chapterNumber === undefined) {
      return res.status(400).json({ status: 'Error', message: 'language, bookNumber, and chapterNumber are required' });
    }

    const chapter = await BibleChapter.findOne({
      language,
      bookNumber: parseInt(bookNumber, 10),
      chapterNumber: parseInt(chapterNumber, 10)
    });

    if (!chapter) {
      return res.status(404).json({ status: 'Error', message: 'Chapter not found' });
    }

    res.status(200).json({ status: 'Ok', data: chapter });
  } catch (error) {
    console.error('Error fetching chapter:', error);
    res.status(500).json({ status: 'Error', message: 'Failed to fetch chapter' });
  }
};

exports.getVerse = async (req, res) => {
  try {
    const { language, bookNumber, chapterNumber, verseNumber } = req.query;
    
    if (language === undefined || bookNumber === undefined || chapterNumber === undefined || verseNumber === undefined) {
      return res.status(400).json({ status: 'Error', message: 'All parameters (language, bookNumber, chapterNumber, verseNumber) are required' });
    }

    const chapter = await BibleChapter.findOne({
      language,
      bookNumber: parseInt(bookNumber, 10),
      chapterNumber: parseInt(chapterNumber, 10)
    });

    if (!chapter) {
      return res.status(404).json({ status: 'Error', message: 'Chapter not found' });
    }

    const vNum = parseInt(verseNumber, 10);
    const verse = chapter.verses.find(v => v.verseNumber === vNum);
    
    if (!verse) {
      return res.status(404).json({ status: 'Error', message: 'Verse not found in this chapter' });
    }

    res.status(200).json({ 
      status: 'Ok', 
      data: {
        language: chapter.language,
        bookName: chapter.bookName,
        chapterNumber: chapter.chapterNumber,
        verseNumber: verse.verseNumber,
        text: verse.text
      }
    });
  } catch (error) {
    console.error('Error fetching verse:', error);
    res.status(500).json({ status: 'Error', message: 'Failed to fetch verse' });
  }
};

exports.getDictionaryMeaning = async (req, res) => {
  try {
    const { word, verseContext, language } = req.body;

    if (!word) {
      return res.status(400).json({ status: 'Error', message: 'Word is required' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ status: 'Error', message: 'GROQ_API_KEY is not configured in environment variables' });
    }

    const prompt = `You are a biblical dictionary. Give a short, concise dictionary meaning and contextual significance for the word "${word}" found in the verse: "${verseContext}". Language: ${language}. Keep the response strictly under 50 words.`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const meaning = response.data.choices[0].message.content.trim();

    res.status(200).json({ status: 'Ok', data: { word, meaning } });
  } catch (error) {
    console.error('Error fetching Groq meaning:', error.response?.data || error.message);
    res.status(500).json({ status: 'Error', message: 'Failed to fetch dictionary meaning' });
  }
};
