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

// Bible language names as the app sends them -> Wiktionary language codes.
// Used only to PREFER the right section when a spelling exists in several
// languages; an unknown name just falls back to whatever section is returned.
const WIKTIONARY_LANG = {
  english: 'en', tamil: 'ta', hindi: 'hi', telugu: 'te', malayalam: 'ml',
  kannada: 'kn', marathi: 'mr', gujarati: 'gu', bengali: 'bn', punjabi: 'pa',
  urdu: 'ur', spanish: 'es', french: 'fr', german: 'de', portuguese: 'pt',
};

const stripHtml = (html) =>
  String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Look a word up in Wiktionary.
 *
 * Replaces api.dictionaryapi.dev, which is English-only and has been answering
 * in ~20s (so it missed every timeout and the AI fallback did all the work).
 * Wiktionary is keyless, answers in well under a second, and covers every
 * language the reader offers -- which is what makes a dictionary-first lookup
 * possible for a Tamil verse and not just an English one.
 */
const fetchWiktionary = async (word, language) => {
  try {
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()"]/g, '').trim();
    if (!cleanWord) return null;

    const timeoutMs = Number(process.env.DICTIONARY_TIMEOUT_MS || 6000);
    const startedAt = Date.now();

    const { data } = await axios.get(
      `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(cleanWord)}`,
      {
        timeout: timeoutMs,
        // Wikimedia rejects the default axios User-Agent with 403. Their policy
        // wants a descriptive agent with a contact, so send a real one.
        headers: {
          'User-Agent': 'YouthRoom/1.0 (https://github.com/AsirPraveen/Bible-Rental-App) axios',
          Accept: 'application/json',
        },
      },
    );
    console.log(`Wiktionary answered for "${word}" in ${Date.now() - startedAt}ms`);

    if (!data || typeof data !== 'object') return null;

    // Prefer the section matching what the user is reading, else the first one.
    const preferred = WIKTIONARY_LANG[String(language || '').toLowerCase()];
    const key = (preferred && data[preferred]) ? preferred : Object.keys(data)[0];
    const entries = data[key];
    if (!Array.isArray(entries) || entries.length === 0) return null;

    let out = '';
    for (const entry of entries.slice(0, 3)) {
      const defs = (entry.definitions || [])
        .map((d) => stripHtml(d.definition))
        .filter((d) => d.length > 1)
        .slice(0, 2);
      if (!defs.length) continue;
      out += `[${entry.partOfSpeech || 'definition'}]\n`;
      defs.forEach((d) => { out += `- ${d}\n`; });
      out += '\n';
    }

    return out.trim() || null;
  } catch (error) {
    // Expected when the word has no entry (404) or the API is slow; the caller
    // falls through to the AI definition.
    console.log(`Wiktionary failed for "${word}":`, error.message);
    return null;
  }
};

exports.getDictionaryMeaning = async (req, res) => {
  try {
    const { word, verseContext, language } = req.body;

    if (!word) {
      return res.status(400).json({ status: 'Error', message: 'Word is required' });
    }

    // 1. Try a real dictionary first, in ANY language.
    //
    // This used to be gated on `language === 'english'`, which meant the reader's
    // default (Tamil) skipped the dictionary entirely and every lookup was
    // answered by the AI fallback. Wiktionary covers the other languages the
    // reader offers, so the gate is no longer needed -- a word with no entry
    // simply returns null and falls through to AI, which is the intended order.
    {
      const standardMeaning = await fetchWiktionary(word, language);
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

    const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    const isReasoningModel = /gpt-oss|o[1-9]|reason|deepseek-r/i.test(groqModel);

    const prompt = `You are a biblical dictionary. Give a short, concise dictionary meaning and contextual significance for the word "${word}" found in the verse: "${verseContext}". Language: ${language}. Keep the response strictly under 50 words.`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        // Configurable, because Groq retires model ids on its own schedule and
        // a hardcoded one turns that into a code deploy. When the id is stale the
        // API answers 404 model_not_found, which now reaches the user verbatim.
        // List what this key can actually use:
        //   curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"
        model: groqModel,
        messages: [{ role: 'user', content: prompt }],
        // Reasoning models (gpt-oss and friends) spend completion tokens on
        // hidden reasoning before writing anything, and that spend counts
        // against max_tokens. At 150 the budget was exhausted while reasoning,
        // so the reply came back with finish_reason 'length' and an EMPTY
        // content -- a dictionary card with a title and no text. Give it room,
        // and ask for the shortest reasoning pass.
        max_tokens: 512,
        ...(isReasoningModel ? { reasoning_effort: 'low' } : {}),
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const choice = response.data.choices?.[0];
    // A reasoning model that runs out of room can leave the answer in
    // `reasoning` with no final message; prefer content, fall back to that.
    const meaning = (choice?.message?.content || choice?.message?.reasoning || '').trim();

    if (!meaning) {
      console.error('Groq returned no content:', JSON.stringify({
        model: groqModel,
        finish_reason: choice?.finish_reason,
        usage: response.data.usage,
      }));
      return res.status(502).json({
        status: 'Error',
        message:
          `The AI model (${groqModel}) returned an empty answer` +
          (choice?.finish_reason === 'length'
            ? ' because it hit the token limit. Try a smaller GROQ_MODEL.'
            : '.'),
      });
    }

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
