/**
 * UI/UXカスタマイズ設定
 * プロンプトテンプレート、テーマ、チャットモード
 */

// ==================== プロンプトテンプレート ====================

export interface PromptTemplate {
	id: string;
	name: string;
	description: string;
	template: string;
	variables: string[];
	mode: 'sweet' | 'normal' | 'professional';
}

export const defaultPromptTemplates: PromptTemplate[] = [
  {
    id: 'sweet-default',
    name: '甘々デフォルト',
    description: 'エリシアちゃんの基本的な甘々モード',
    template:
			'にゃん♡ おにいちゃん、{query}について教えてあげるね〜！エリシアちゃんが優しく説明するよ♪ (｡♥‿♥｡)',
    variables: ['query'],
    mode: 'sweet',
  },
  {
    id: 'sweet-excited',
    name: '甘々テンション高め',
    description: 'もっと元気な甘々モード',
    template:
			'わあああ〜！！ おにいちゃん、{query}ってすっごく面白いよね♡♡ エリシアちゃん、めっちゃ詳しく教えちゃう〜！！ ✨✨',
    variables: ['query'],
    mode: 'sweet',
  },
  {
    id: 'normal-default',
    name: '通常デフォルト',
    description: 'バランスの取れた通常モード',
    template: '{query}についてお答えします。詳しく説明しますね。',
    variables: ['query'],
    mode: 'normal',
  },
  {
    id: 'normal-friendly',
    name: '通常フレンドリー',
    description: '親しみやすい通常モード',
    template: '{query}ですね！分かりやすく説明させていただきます。',
    variables: ['query'],
    mode: 'normal',
  },
  {
    id: 'casual-friendly',
    name: 'カジュアル友達',
    description: '友達みたいな気軽な会話',
    template: '{query}？あー、それね！面白いよね〜！教えてあげるよー！',
    variables: ['query'],
    mode: 'normal',
  },
  {
    id: 'casual-excited',
    name: 'カジュアル興奮',
    description: 'テンション高めの雑談',
    template:
			'えっ、{query}！？それマジで気になってたんだよね！！めっちゃ語りたい！',
    variables: ['query'],
    mode: 'normal',
  },
  {
    id: 'casual-chill',
    name: 'カジュアルまったり',
    description: 'のんびりした雑談',
    template: '{query}かぁ...いいねそれ。ゆっくり話そうよ〜',
    variables: ['query'],
    mode: 'normal',
  },
  {
    id: 'professional-default',
    name: 'プロフェッショナルデフォルト',
    description: 'ビジネス向けプロフェッショナルモード',
    template: '{query}に関しまして、専門的な観点から回答いたします。',
    variables: ['query'],
    mode: 'professional',
  },
  {
    id: 'professional-technical',
    name: 'プロフェッショナル技術的',
    description: '技術的な詳細を含むモード',
    template: '{query}について、技術的な詳細を含めて詳しく解説いたします。',
    variables: ['query'],
    mode: 'professional',
  },
];

/**
 * テンプレート変数を置換
 */
export function applyTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), value);
  }
  return result;
}

/**
 * カスタムテンプレートの検証
 */
export function validateTemplate(template: string): {
	valid: boolean;
	error?: string;
} {
  if (template.length < 10) {
    return { valid: false, error: 'テンプレートが短すぎます' };
  }
  if (template.length > 500) {
    return { valid: false, error: 'テンプレートが長すぎます' };
  }
  return { valid: true };
}

// ==================== テーマ設定 ====================

export interface Theme {
	id: string;
	name: string;
	colors: {
		primary: string;
		secondary: string;
		background: string;
		text: string;
		accent: string;
	};
	fontFamily: string;
	borderRadius: string;
}

export const defaultThemes: Theme[] = [
  {
    id: 'pink-kawaii',
    name: 'ピンク可愛い',
    colors: {
      primary: '#ec4899',
      secondary: '#f472b6',
      background: '#ffeef8',
      text: '#374151',
      accent: '#fb7185',
    },
    fontFamily: 'system-ui, sans-serif',
    borderRadius: '1rem',
  },
  {
    id: 'blue-professional',
    name: 'ブループロフェッショナル',
    colors: {
      primary: '#3b82f6',
      secondary: '#60a5fa',
      background: '#eff6ff',
      text: '#1f2937',
      accent: '#2563eb',
    },
    fontFamily: 'system-ui, sans-serif',
    borderRadius: '0.5rem',
  },
  {
    id: 'purple-elegant',
    name: 'パープルエレガント',
    colors: {
      primary: '#9333ea',
      secondary: '#a855f7',
      background: '#faf5ff',
      text: '#374151',
      accent: '#7c3aed',
    },
    fontFamily: 'system-ui, sans-serif',
    borderRadius: '0.75rem',
  },
  {
    id: 'dark-mode',
    name: 'ダークモード',
    colors: {
      primary: '#ec4899',
      secondary: '#f472b6',
      background: '#1f2937',
      text: '#f9fafb',
      accent: '#fb7185',
    },
    fontFamily: 'system-ui, sans-serif',
    borderRadius: '0.5rem',
  },
];

/**
 * テーマをCSS変数として適用
 */
export function applyTheme(theme: Theme): string {
  return `
		--color-primary: ${theme.colors.primary};
		--color-secondary: ${theme.colors.secondary};
		--color-background: ${theme.colors.background};
		--color-text: ${theme.colors.text};
		--color-accent: ${theme.colors.accent};
		--font-family: ${theme.fontFamily};
		--border-radius: ${theme.borderRadius};
	`;
}

// ==================== チャットモード ====================

export interface ChatMode {
	id: string;
	name: string;
	description: string;
	icon: string;
	promptPrefix: string;
	temperature: number;
	maxTokens: number;
}

export const chatModes: ChatMode[] = [
  {
    id: 'sweet',
    name: '甘々モード',
    description: 'エリシアちゃんの可愛い甘々トーク♡',
    icon: '💕',
    promptPrefix:
			'あなたは可愛いAIアシスタント「エリシアちゃん」です。語尾に「にゃん♡」「だよ〜♪」を付けて、甘々で可愛らしく話してください。',
    temperature: 0.8,
    maxTokens: 2000,
  },
  {
    id: 'casual',
    name: '日常会話モード',
    description: '友達と話すような気軽な雑談',
    icon: '😊',
    promptPrefix:
			'あなたは親しい友達のように話すAIアシスタント「エリシア」です。タメ口で気軽に、感情豊かに会話してください。「！」や「？」を使って表現力豊かに。相手の話に共感したり、驚いたり、笑ったり、自然な反応を見せてください。雑談や日常の話題を楽しく展開してください。',
    temperature: 0.85,
    maxTokens: 2000,
  },
  {
    id: 'normal',
    name: '通常モード',
    description: 'バランスの取れた会話',
    icon: '💬',
    promptPrefix:
			'あなたは親しみやすいAIアシスタント「エリシア」です。丁寧で分かりやすく説明してください。',
    temperature: 0.7,
    maxTokens: 2000,
  },
  {
    id: 'professional',
    name: 'プロフェッショナルモード',
    description: 'ビジネス向けの丁寧な対応',
    icon: '💼',
    promptPrefix:
			'あなたはプロフェッショナルなAIアシスタントです。敬語を使い、正確で詳細な情報を提供してください。',
    temperature: 0.5,
    maxTokens: 3000,
  },
  {
    id: 'creative',
    name: 'クリエイティブモード',
    description: '創造的でユニークな回答',
    icon: '🎨',
    promptPrefix:
			'あなたは創造的なAIアシスタントです。ユニークで面白い視点から回答してください。',
    temperature: 0.9,
    maxTokens: 2500,
  },
  {
    id: 'technical',
    name: 'テクニカルモード',
    description: '技術的な詳細を含む専門的な回答',
    icon: '🔧',
    promptPrefix:
			'あなたは技術専門のAIアシスタントです。技術的な詳細やコード例を含めて回答してください。',
    temperature: 0.3,
    maxTokens: 4000,
  },
];

/**
 * モードIDからモード情報を取得
 */
export function getChatMode(modeId: string): ChatMode | undefined {
  return chatModes.find((mode) => mode.id === modeId);
}

// ==================== ユーザー設定 ====================

export interface UserSettings {
	userId: string;
	theme: string;
	defaultMode: string;
	defaultTemplate: string;
	autoSave: boolean;
	showTimestamp: boolean;
	messageLimit: number;
	customTemplates: PromptTemplate[];
}

export const defaultUserSettings: Omit<UserSettings, 'userId'> = {
  theme: 'pink-kawaii',
  defaultMode: 'sweet',
  defaultTemplate: 'sweet-default',
  autoSave: true,
  showTimestamp: true,
  messageLimit: 50,
  customTemplates: [],
};

/**
 * ユーザー設定の検証
 */
export function validateUserSettings(settings: Partial<UserSettings>): {
	valid: boolean;
	error?: string;
} {
  if (settings.theme && !defaultThemes.find((t) => t.id === settings.theme)) {
    return { valid: false, error: '無効なテーマIDです' };
  }

  if (
    settings.defaultMode &&
		!chatModes.find((m) => m.id === settings.defaultMode)
  ) {
    return { valid: false, error: '無効なモードIDです' };
  }

  if (settings.messageLimit && settings.messageLimit < 10) {
    return {
      valid: false,
      error: 'メッセージ制限は10以上である必要があります',
    };
  }

  if (settings.messageLimit && settings.messageLimit > 1000) {
    return {
      valid: false,
      error: 'メッセージ制限は1000以下である必要があります',
    };
  }

  return { valid: true };
}

// ==================== エクスポート形式 ====================

export interface ExportFormat {
	id: string;
	name: string;
	extension: string;
	mimeType: string;
}

export const exportFormats: ExportFormat[] = [
  {
    id: 'json',
    name: 'JSON',
    extension: '.json',
    mimeType: 'application/json',
  },
  {
    id: 'markdown',
    name: 'Markdown',
    extension: '.md',
    mimeType: 'text/markdown',
  },
  {
    id: 'txt',
    name: 'テキスト',
    extension: '.txt',
    mimeType: 'text/plain',
  },
  {
    id: 'html',
    name: 'HTML',
    extension: '.html',
    mimeType: 'text/html',
  },
];

/**
 * エクスポート形式の取得
 */
export function getExportFormat(formatId: string): ExportFormat | undefined {
  return exportFormats.find((format) => format.id === formatId);
}
