/**
 * AeroDAG Document Chunker
 * 
 * Splits structured travel knowledge documents into semantic, bounded chunks
 * while retaining all document and source metadata.
 */

import { KnowledgeDocument, KnowledgeChunk } from '../../types/travelKnowledge';

export class DocumentChunker {
  /**
   * Chunks a single knowledge document into semantic pieces
   */
  static chunkDocument(doc: KnowledgeDocument, maxWordsPerChunk = 160): KnowledgeChunk[] {
    const rawParagraphs = doc.content
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const chunks: KnowledgeChunk[] = [];
    let currentBlock: string[] = [];
    let currentWordCount = 0;

    const pushChunk = (text: string) => {
      const chunkId = `${doc.documentId}-chk-${chunks.length + 1}`;
      chunks.push({
        chunkId,
        documentId: doc.documentId,
        title: doc.title,
        text,
        destination: doc.destination,
        country: doc.country,
        category: doc.category,
        sourceName: doc.sourceName,
        sourceUrl: doc.sourceUrl,
        lastVerifiedAt: doc.lastVerifiedAt,
        trustLevel: doc.trustLevel,
        verificationNote: doc.verificationNote
      });
    };

    for (const para of rawParagraphs) {
      const paraWords = para.split(/\s+/).length;

      // If a single paragraph is larger than maxWordsPerChunk, split it by sentence
      if (paraWords > maxWordsPerChunk) {
        if (currentBlock.length > 0) {
          pushChunk(currentBlock.join('\n\n'));
          currentBlock = [];
          currentWordCount = 0;
        }

        const sentences = para.split(/(?<=[.!?])\s+/);
        let sentenceBlock: string[] = [];
        let sentenceWords = 0;

        for (const sentence of sentences) {
          const sw = sentence.split(/\s+/).length;
          if (sentenceWords + sw > maxWordsPerChunk && sentenceBlock.length > 0) {
            pushChunk(sentenceBlock.join(' '));
            sentenceBlock = [sentence];
            sentenceWords = sw;
          } else {
            sentenceBlock.push(sentence);
            sentenceWords += sw;
          }
        }
        if (sentenceBlock.length > 0) {
          pushChunk(sentenceBlock.join(' '));
        }
        continue;
      }

      // Check if adding this paragraph exceeds maxWordsPerChunk
      if (currentWordCount + paraWords > maxWordsPerChunk && currentBlock.length > 0) {
        pushChunk(currentBlock.join('\n\n'));
        currentBlock = [para];
        currentWordCount = paraWords;
      } else {
        currentBlock.push(para);
        currentWordCount += paraWords;
      }
    }

    if (currentBlock.length > 0) {
      pushChunk(currentBlock.join('\n\n'));
    }

    // Fallback if content was somehow empty
    if (chunks.length === 0) {
      pushChunk(doc.content);
    }

    return chunks;
  }

  /**
   * Chunks a collection of knowledge documents
   */
  static chunkDocuments(docs: KnowledgeDocument[], maxWordsPerChunk = 160): KnowledgeChunk[] {
    return docs.flatMap((doc) => this.chunkDocument(doc, maxWordsPerChunk));
  }
}
