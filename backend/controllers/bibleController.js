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

const fetchStandardDictionary = async (word) => {
  try {
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"]/g, "").trim();
    if (!cleanWord) return null;

    // Deliberately short. This is a free best-effort lookup that saves a Groq
    // call when it works; if it does not answer quickly it is not worth waiting
    // for, because the Groq fallback produces a better answer for this app
    // anyway (a contextual biblical meaning rather than a generic definition).
    //
    // The provider has been observed responding in ~20s for every request, so
    // this budget will usually be missed and the miss is logged as
    // "Dictionary API failed for ... timeout of 1200ms exceeded". That log line
    // is expected and harmless -- the lookup falls through to Groq.
    const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`, {
      timeout: 1200
    });

    if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
      const entry = response.data[0];
      const phonetic = entry.phonetic || (entry.phonetics && entry.phonetics.find(p => p.text)?.text) || '';
      
      let meaningText = phonetic ? `Pronunciation: ${phonetic}\n\n` : '';
      
      if (Array.isArray(entry.meanings)) {
        entry.meanings.slice(0, 3).forEach((meaning) => {
          const partOfSpeech = meaning.partOfSpeech || '';
          meaningText += `[${partOfSpeech}]\n`;
          if (Array.isArray(meaning.definitions)) {
            meaning.definitions.slice(0, 2).forEach((def, dIdx) => {
              meaningText += `${dIdx + 1}. ${def.definition}\n`;
              if (def.example) {
                meaningText += `   Example: "${def.example}"\n`;
              }
            });
          }
          meaningText += '\n';
        });
      }
      return meaningText.trim();
    }
  } catch (error) {
    console.log(`Dictionary API failed for "${word}":`, error.message);
  }
  return null;
};

exports.getDictionaryMeaning = async (req, res) => {
  try {
    const { word, verseContext, language } = req.body;

    if (!word) {
      return res.status(400).json({ status: 'Error', message: 'Word is required' });
    }

    // 1. Try standard dictionary if language is English
    if (language && language.toLowerCase() === 'english') {
      const standardMeaning = await fetchStandardDictionary(word);
      if (standardMeaning) {
        return res.status(200).json({
          status: 'Ok',
          data: { word, meaning: standardMeaning, source: 'dictionary' }
        });
      }
    }

    // 2. Fallback to AI definition (Groq)
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ status: 'Error', message: 'GROQ_API_KEY is not configured in environment variables' });
    }

    const prompt = `You are a biblical dictionary. Give a short, concise dictionary meaning and contextual significance for the word "${word}" found in the verse: "${verseContext}". Language: ${language}. Keep the response strictly under 50 words.`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        // Configurable, because Groq retires model ids on its own schedule and
        // a hardcoded one turns that into a code deploy. When the id is stale the
        // API answers 404 model_not_found, which now reaches the user verbatim.
        // List what this key can actually use:
        //   curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
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

    res.status(200).json({ status: 'Ok', data: { word, meaning, source: 'ai' } });
  } catch (error) {
    const upstream = error.response?.data;
    console.error('Error fetching meaning:', upstream || error.message);

    // Surface WHY it failed. A flat "Failed to fetch dictionary meaning" told
    // the user nothing and, combined with the client reporting every failure as
    // a connectivity problem, sent people looking at their wifi when the real
    // cause was upstream (a rejected key, a decommissioned model, a rate limit).
    // Only the provider's own error text is forwarded -- never the request,
    // which carries the API key.
    const reason =
      upstream?.error?.message ||
      upstream?.message ||
      (error.code === 'ECONNABORTED' ? 'The dictionary provider timed out.' : error.message);

    res.status(502).json({
      status: 'Error',
      message: `Dictionary lookup failed: ${reason}`,
    });
  }
};
