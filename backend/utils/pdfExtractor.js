const pdfParseModule = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * PDF Buffer'ından metni ve sayfa bazlı metinleri çeker
 */
async function extractRawTextFromPdf(pdfBuffer) {
  if (typeof pdfParseModule === 'function') {
    const data = await pdfParseModule(pdfBuffer);
    return { 
      text: data.text || '', 
      pages: [{ text: data.text || '', num: 1 }],
      numpages: data.numpages || 1 
    };
  } else if (pdfParseModule.PDFParse) {
    const parser = new pdfParseModule.PDFParse({ data: pdfBuffer });
    const result = await parser.getText();
    return { 
      text: result.text || '', 
      pages: result.pages && result.pages.length > 0 ? result.pages : [{ text: result.text || '', num: 1 }],
      numpages: result.total || (result.pages ? result.pages.length : 1) 
    };
  } else {
    throw new Error('PDF kütüphanesi başlatılamadı.');
  }
}

/**
 * Sayfa üstü/altı, filigran, site adı ve optik form atıklarını temizler
 */
function cleanPdfPage(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/www\s*\.\s*[a-z0-9\-\._]+\s*\.\s*[a-z]{2,}/gi, '')
    .replace(/www[\s\n\r]*matematikciler[\s\n\r]*\.com/gi, '')
    .replace(/matematikciler(\.com)?/gi, '')
    .replace(/\bwww\b/gi, '')
    .replace(/\.com\b/gi, '')
    .replace(/@[a-z0-9_]+/gi, '')
    .replace(/CEVAP\s*ANAHTARI[^\n]*/gi, '')
    .replace(/ANAHTARI/gi, '')
    .replace(/Bu testin cevap anahtarına[^\n]*/gi, '')
    .replace(/okutabilir veya sitemiz[^\n]*/gi, '')
    .replace(/Matematik, Matematikçiler[^\n]*/gi, '')
    .replace(/1KAZANIM TESTİ/gi, '')
    .replace(/sınıf\s*\.\s*\d+\s*Üslü İfadeler/gi, '')
    .replace(/Üslü İfadeler\s*DOĞAL SAYILARLA İŞLEMLER/gi, '')
    .replace(/DOĞAL SAYILARLA İŞLEMLER/gi, '')
    .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '')
    .replace(/^\s*\d+\.[\s\t]+\d+\.\s*$/gm, '');
}

/**
 * Ardışık numaralı soru çıkarıcı (Örn: "1 Defne...", "1. Metin...", "Soru 1:")
 */
function extractSequentialFromPage(text, startNum) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const questions = [];
  
  const qStartRegex = /^(?:Soru\s*)?(\d{1,2})[\.\-\)\:]\s*(.+)?/i;
  const inlineQStart = /^(\d{1,2})\s+([A-ZÇĞİÖŞÜ“\(\[][^\n]+)/;
  const inlineOptRegex = /(?:^|[\s\t])[\(\[]?([A-E])[\)\]\.\-\s]\s*([^\t\nA-E\(\[]+)/g;
  const optLineRegex = /^[\(\[]?([A-E])[\)\]\.\-]\s*(.+)/;

  let currentQ = null;

  for (const line of lines) {
    if (line.includes('HAFTA') || line.includes('Yeni Nesil Soru') || line.includes('Tema')) {
      continue;
    }

    const qMatch = line.match(qStartRegex) || line.match(inlineQStart);
    if (qMatch && !line.match(optLineRegex)) {
      if (currentQ && currentQ.text && currentQ.options.length > 0) {
        questions.push(currentQ);
      }
      currentQ = {
        number: questions.length + startNum,
        text: (qMatch[2] || '').trim(),
        type: 'MULTIPLE_CHOICE',
        options: []
      };
      continue;
    }

    if (currentQ) {
      const opts = [];
      let m;
      inlineOptRegex.lastIndex = 0;
      while ((m = inlineOptRegex.exec(line)) !== null) {
        opts.push({
          letter: m[1].toUpperCase(),
          text: m[2].trim(),
          isCorrect: opts.length === 0
        });
      }

      if (opts.length >= 2) {
        currentQ.options.push(...opts);
        continue;
      }

      const singleOptMatch = line.match(optLineRegex);
      if (singleOptMatch) {
        currentQ.options.push({
          letter: singleOptMatch[1].toUpperCase(),
          text: singleOptMatch[2].trim(),
          isCorrect: currentQ.options.length === 0
        });
        continue;
      }

      if (currentQ.options.length === 0) {
        currentQ.text += ' ' + line;
      }
    }
  }

  if (currentQ && currentQ.text && currentQ.options.length > 0) {
    questions.push(currentQ);
  }

  return questions;
}

/**
 * Blok / Çok sütunlu test çıkarıcı (Soru kökleri ile şık bloklarını eşleştirir)
 */
function extractBlockFromPage(text, startNum) {
  // 1. Şık gruplarını tespit et (Her grup 'A' ile başlar, en fazla 5 şık barındırır)
  const optTokenRegex = /(?:^|[\s\t])[\(\[]?([A-E])[\)\]\.\-\s]\s*([^\t\nA-E\(\[]+)/g;
  const tokens = [];
  let m;
  while ((m = optTokenRegex.exec(text)) !== null) {
    const letter = m[1].toUpperCase();
    const optText = m[2].trim();
    if (optText.length > 0 && optText.length < 250) {
      tokens.push({ letter, text: optText });
    }
  }

  const optionGroups = [];
  let currentGroup = [];
  for (const token of tokens) {
    if (token.letter === 'A' && currentGroup.length > 0) {
      optionGroups.push(currentGroup);
      currentGroup = [];
    }
    if (!currentGroup.some(g => g.letter === token.letter)) {
      currentGroup.push(token);
    }
  }
  if (currentGroup.length > 0) {
    optionGroups.push(currentGroup);
  }

  // 2. Soru köklerini tespit et
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const stems = [];
  let currentStem = '';

  for (const line of lines) {
    if (line.match(/^[\(\[]?[A-E][\)\]\.\-\s]/) || line.match(/^[A-E]\)\s*/)) {
      continue;
    }
    if (line.length < 3) continue;

    currentStem = (currentStem + ' ' + line).trim();
    if (
      currentStem.endsWith('?') ||
      currentStem.includes('hangisidir?') ||
      currentStem.includes('yanlıştır?') ||
      currentStem.includes('doğrudur?') ||
      currentStem.includes('eşittir?') ||
      currentStem.includes('farklıdır?') ||
      currentStem.includes('kaçtır?') ||
      currentStem.includes('nedir?') ||
      currentStem.endsWith('eşittir.') ||
      currentStem.endsWith('yazınız.') ||
      currentStem.endsWith('hesaplayınız.')
    ) {
      const cleanedStem = currentStem
        .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '')
        .replace(/^[\s\.\,\-]+/, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (cleanedStem.length > 10) {
        stems.push(cleanedStem);
      }
      currentStem = '';
    }
  }

  const questions = [];
  const count = Math.min(stems.length, optionGroups.length);

  for (let i = 0; i < count; i++) {
    questions.push({
      number: questions.length + startNum,
      text: stems[i],
      type: 'MULTIPLE_CHOICE',
      options: optionGroups[i].map((opt, idx) => ({
        text: opt.text,
        isCorrect: idx === 0
      }))
    });
  }

  return questions;
}

/**
 * Sayfalar genelinde soru ve şıkları ayrıştırma motoru
 */
function extractFromDocument(pages) {
  const allQuestions = [];

  for (let pIdx = 0; pIdx < pages.length; pIdx++) {
    const rawText = cleanPdfPage(pages[pIdx].text);
    
    // Önce ardışık numaralı soru arayalım
    const seqQuestions = extractSequentialFromPage(rawText, allQuestions.length + 1);
    if (seqQuestions.length >= 2) {
      allQuestions.push(...seqQuestions);
      continue;
    }

    // Blok/çift sütunlu test kağıdı mantığı
    const blockQuestions = extractBlockFromPage(rawText, allQuestions.length + 1);
    if (blockQuestions.length > 0) {
      allQuestions.push(...blockQuestions);
    }
  }

  // Hiçbir şey bulunamazsa genel metni kurtarmaya çalış
  if (allQuestions.length === 0) {
    const fullText = pages.map(p => p.text).join('\n');
    return [{
      number: 1,
      text: cleanPdfPage(fullText).slice(0, 500).trim(),
      type: 'OPEN_ENDED',
      options: []
    }];
  }

  return allQuestions;
}

/**
 * Yapay Zeka (Gemini API) ile Ayrıştırma (API Key varsa)
 * PDF belgesini doğrudan multimodal (görsel/belge) olarak işler.
 */
async function extractQuestionsWithAI(pdfBuffer, rawText, apiKey) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Sen uzman bir sınav hazırlama ve ölçme-değerlendirme asistanısın.
Sana bir sınav PDF belgesi verildi.
Lütfen belgedeki TÜM sayfaları baştan sona eksiksiz incele.
Sayfa başlıklarını, kapak yazılarını, okul/site isimlerini, filigranları ve cevap anahtarlarını TAMAMEN ATLA.
Sadece sınavdaki SORULARI ve ŞIKLARINI (A, B, C, D, E) tek tek ayıkla.
Her soruyu bağımsız bir nesne olarak aşağıdaki JSON formatında döndür. Hiçbir soruyu atlama.

Önemli Kurallar:
1. Her soru bağımsız olmalı, şıklar asla diğer sorularla birleşmemelidir.
2. Matematiksel ifadeleri ve üslü sayıları (örn. 5^4, 2^3, köklü ifadeler) metin olarak düzgün yaz.
3. Çoktan seçmeli sorular için seçenekleri "A", "B", "C", "D" (varsa "E") olarak ayır.
4. Doğru cevabı belirleyebiliyorsan isCorrect: true yap, belirleyemiyorsan varsayılan olarak ilk şıkkı true yap.

Format:
[
  {
    "number": 1,
    "text": "Soru metni...",
    "type": "MULTIPLE_CHOICE",
    "options": [
      { "text": "A şıkkı metni", "isCorrect": true },
      { "text": "B şıkkı metni", "isCorrect": false },
      { "text": "C şıkkı metni", "isCorrect": false },
      { "text": "D şıkkı metni", "isCorrect": false }
    ]
  }
]`;

    let result;
    try {
      // 1. Doğrudan PDF Belge Görseli / Multimodal Analiz
      result = await model.generateContent([
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: pdfBuffer.toString('base64')
          }
        },
        { text: prompt }
      ]);
    } catch (docErr) {
      // 2. Metin bazlı yedek analiz
      result = await model.generateContent([
        { text: prompt + '\n\nPDF Ham Metni:\n' + rawText.substring(0, 35000) }
      ]);
    }

    let responseText = result.response.text().trim();

    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(responseText);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((q, qIdx) => ({
        number: q.number || (qIdx + 1),
        text: q.text || 'Soru Metni',
        type: q.type || (q.options && q.options.length > 0 ? 'MULTIPLE_CHOICE' : 'OPEN_ENDED'),
        options: (q.options || []).map((opt, idx) => ({
          text: typeof opt === 'string' ? opt : (opt.text || ''),
          isCorrect: typeof opt === 'object' ? Boolean(opt.isCorrect) : (idx === 0)
        }))
      }));
    }

    return null;
  } catch (error) {
    console.warn('⚠️ Gemini AI hatası, gelişmiş yerel motor devrede:', error.message);
    return null;
  }
}

/**
 * Ana Dışa Aktarılan Fonksiyon
 */
async function processPdfQuestions(pdfBuffer, userApiKey = null) {
  try {
    const data = await extractRawTextFromPdf(pdfBuffer);
    const rawText = data.text;

    if (!rawText || rawText.trim().length === 0) {
      throw new Error('PDF dosyasından metin çıkarılamadı.');
    }

    // 1. Önce Gemini AI dene (Key varsa - Multimodal Doğrudan PDF Analizi)
    const aiQuestions = await extractQuestionsWithAI(pdfBuffer, rawText, userApiKey);
    if (aiQuestions && aiQuestions.length > 0) {
      return {
        success: true,
        totalPages: data.numpages,
        totalQuestions: aiQuestions.length,
        questions: aiQuestions
      };
    }

    // 2. Gelişmiş Yerel Ayrıştırıcı Motor
    const questions = extractFromDocument(data.pages);

    return {
      success: true,
      totalPages: data.numpages,
      totalQuestions: questions.length,
      questions
    };
  } catch (error) {
    console.error('processPdfQuestions error:', error);
    throw error;
  }
}

module.exports = {
  processPdfQuestions,
  cleanPdfPage,
  extractFromDocument
};
