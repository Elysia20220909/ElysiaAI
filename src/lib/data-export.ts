/**
 * Data Export Service
 * CSV/JSON/Markdownエクスポート機能
 */

import { feedbackService, knowledgeService } from './database';
import { logger } from './logger';

/**
 * フィードバックをCSVにエクスポート
 */
export async function exportFeedbackToCSV(): Promise<string> {
  const feedbacks = await feedbackService.getRecent(1000);

  const headers = [
    'ID',
    '作成日時',
    'ユーザーID',
    '質問',
    '回答',
    '評価',
    '理由',
  ];
  const rows = feedbacks.map((f) => [
    f.id,
    new Date(f.createdAt).toLocaleString('ja-JP'),
    f.userId || '匿名',
    `"${f.query.replace(/"/g, '""')}"`,
    `"${f.answer.replace(/"/g, '""')}"`,
    f.rating,
    f.reason ? `"${f.reason.replace(/"/g, '""')}"` : '',
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  logger.info('Feedback exported to CSV', { count: feedbacks.length });
  return csv;
}

/**
 * ナレッジベースをJSONにエクスポート
 */
export async function exportKnowledgeToJSON(): Promise<string> {
  const knowledge = await knowledgeService.getAll(false);

  const data = {
    exportDate: new Date().toISOString(),
    totalEntries: knowledge.length,
    knowledge: knowledge.map((k) => ({
      id: k.id,
      question: k.question,
      answer: k.answer,
      source: k.source,
      verified: k.verified,
      createdAt: k.createdAt,
      updatedAt: k.updatedAt,
    })),
  };

  logger.info('Knowledge exported to JSON', { count: knowledge.length });
  return JSON.stringify(data, null, 2);
}

/**
 * ナレッジベースをMarkdownにエクスポート
 */
export async function exportKnowledgeToMarkdown(): Promise<string> {
  const knowledge = await knowledgeService.getAll(true); // 検証済みのみ

  const lines = [
    '# Elysia AI - ナレッジベース',
    '',
    `> エクスポート日: ${new Date().toLocaleString('ja-JP')}`,
    `> 総エントリー数: ${knowledge.length}`,
    '',
    '---',
    '',
  ];

  for (const k of knowledge) {
    lines.push(`## ${k.question}`);
    lines.push('');
    lines.push(k.answer);
    lines.push('');
    if (k.source) {
      lines.push(`*ソース: ${k.source}*`);
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  logger.info('Knowledge exported to Markdown', { count: knowledge.length });
  return lines.join('\n');
}

/**
 * すべてのデータを一括エクスポート
 */
export async function exportAllData(): Promise<{
	feedback: string;
	knowledgeJSON: string;
	knowledgeMarkdown: string;
}> {
  const [feedback, knowledgeJSON, knowledgeMarkdown] = await Promise.all([
    exportFeedbackToCSV(),
    exportKnowledgeToJSON(),
    exportKnowledgeToMarkdown(),
  ]);

  logger.info('All data exported');

  return { feedback, knowledgeJSON, knowledgeMarkdown };
}
