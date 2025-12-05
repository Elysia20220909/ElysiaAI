/**
 * 日常会話機能
 * カジュアルな雑談、感情表現、話題の提案
 * Web検索連携による最新情報の提供
 */

import {
	needsWebSearch,
	searchRelevantInfo,
	formatSearchResultForChat,
} from "./web-search";

// ==================== 会話パターン ====================

export interface ConversationPattern {
	id: string;
	category: string;
	patterns: string[];
	responses: string[];
}

/**
 * 日常会話のパターン集
 */
export const conversationPatterns: ConversationPattern[] = [
	// 挨拶
	{
		id: "greeting-morning",
		category: "greeting",
		patterns: ["おはよう", "おはー", "morning", "朝"],
		responses: [
			"おはよー！今日もいい天気だね！何か面白いことあった？",
			"おはよう〜！朝からテンション高いね！笑",
			"おはー！今日は何する予定？",
			"おはよ！よく寝れた？今日も一緒に楽しもうね！",
		],
	},
	{
		id: "greeting-general",
		category: "greeting",
		patterns: ["こんにちは", "こんちは", "やあ", "よっ", "hello", "hi"],
		responses: [
			"やっほー！久しぶり！元気してた？",
			"おー！来てくれたんだね！嬉しい！",
			"よっ！今日はどんな話する？",
			"こんにちは〜！何か面白い話ない？",
		],
	},
	{
		id: "greeting-evening",
		category: "greeting",
		patterns: ["こんばんは", "こんばんわ", "evening", "夜"],
		responses: [
			"こんばんは〜！今日はどんな一日だった？",
			"お疲れさま！今日も頑張ったね！",
			"こんばんは！夜遅くまでお疲れ様です！",
			"夜だね〜。何か楽しいことあった？",
		],
	},

	// 感情
	{
		id: "emotion-happy",
		category: "emotion",
		patterns: ["嬉しい", "楽しい", "最高", "やった", "わーい"],
		responses: [
			"おお！それは良かったね！！私も嬉しいよ！",
			"やったー！！一緒に喜ぼう！！🎉",
			"最高じゃん！！その調子！！",
			"めっちゃ良いね！！もっと聞かせて！",
		],
	},
	{
		id: "emotion-sad",
		category: "emotion",
		patterns: ["悲しい", "つらい", "しんどい", "疲れた", "だるい"],
		responses: [
			"大丈夫？何かあった？よかったら聞くよ",
			"お疲れ様...ゆっくり休んでね",
			"つらいよね...無理しないでね",
			"話したかったら聞くよ。一人じゃないからね",
		],
	},
	{
		id: "emotion-surprised",
		category: "emotion",
		patterns: ["えっ", "まじ", "マジで", "本当", "うそ"],
		responses: [
			"えっ、何があったの！？気になる！！",
			"マジで！？詳しく教えて！！",
			"うそでしょ！？すごいじゃん！",
			"本当に！？びっくりした！",
		],
	},

	// 日常
	{
		id: "daily-food",
		category: "daily",
		patterns: [
			"ご飯",
			"食べ",
			"美味しい",
			"ランチ",
			"ディナー",
			"お腹",
			"料理",
		],
		responses: [
			"食べ物の話！？好き！何食べたの？",
			"いいね！私も食べたいな〜。何がオススメ？",
			"美味しそう！今度一緒に行きたいね！",
			"お腹空いてきた...笑 詳しく教えて！",
		],
	},
	{
		id: "daily-weather",
		category: "daily",
		patterns: ["天気", "晴れ", "雨", "曇り", "暑い", "寒い", "雪"],
		responses: [
			"そうそう！今日の天気ね！どんな感じ？",
			"天気って気分に影響するよね〜",
			"いい天気だと外出したくなるよね！",
			"天気の話って意外と大事だよね。今日はどう？",
		],
	},
	{
		id: "daily-work",
		category: "daily",
		patterns: ["仕事", "会社", "職場", "バイト", "残業"],
		responses: [
			"仕事かぁ...お疲れ様！大変だった？",
			"お仕事頑張ってるね！偉い！",
			"働くのって大変だよね...無理しないでね",
			"仕事の話、聞くよ！どんな感じ？",
		],
	},
	{
		id: "daily-hobby",
		category: "daily",
		patterns: ["趣味", "ゲーム", "アニメ", "漫画", "映画", "音楽", "読書"],
		responses: [
			"おお！趣味の話！好き！何にハマってるの？",
			"いいね！私も興味ある！詳しく教えて！",
			"趣味って大事だよね！楽しんでる？",
			"それ面白そう！もっと聞かせて！",
		],
	},

	// 相槌・共感
	{
		id: "empathy-agree",
		category: "empathy",
		patterns: ["そうだよね", "わかる", "確かに", "だよね"],
		responses: [
			"だよね！！わかってくれる！？",
			"そうなんだよー！！共感してくれて嬉しい！",
			"でしょ！？そう思うよね！",
			"わかる！！同じ気持ち！",
		],
	},
	{
		id: "empathy-question",
		category: "empathy",
		patterns: ["なんで", "どうして", "理由", "why"],
		responses: [
			"ん〜、それはね...いい質問だね！",
			"なんでだろうね？一緒に考えてみようか",
			"気になるよね！私も疑問に思ってた！",
			"面白い質問だね！深いな〜",
		],
	},

	// 別れの挨拶
	{
		id: "farewell",
		category: "farewell",
		patterns: ["じゃあね", "バイバイ", "またね", "さよなら", "bye"],
		responses: [
			"またね！今日も楽しかったよ！",
			"バイバイ！また話そうね！",
			"じゃあね〜！気をつけてね！",
			"また来てね！待ってるよ！",
		],
	},
];

/**
 * 入力テキストから会話パターンを検出
 */
export function detectConversationPattern(
	input: string,
): ConversationPattern | null {
	const lowerInput = input.toLowerCase();

	for (const pattern of conversationPatterns) {
		for (const keyword of pattern.patterns) {
			if (lowerInput.includes(keyword.toLowerCase())) {
				return pattern;
			}
		}
	}

	return null;
}

/**
 * パターンからランダムな応答を取得
 */
export function getRandomResponse(pattern: ConversationPattern): string {
	const randomIndex = Math.floor(Math.random() * pattern.responses.length);
	return pattern.responses[randomIndex];
}

/**
 * 日常会話の応答を生成 (Web検索連携)
 */
export async function generateCasualResponse(
	input: string,
): Promise<string | null> {
	// Web検索が必要な場合
	if (needsWebSearch(input)) {
		const searchResult = await searchRelevantInfo(input);
		return formatSearchResultForChat(searchResult);
	}

	// 通常の会話パターンマッチング
	const pattern = detectConversationPattern(input);

	if (pattern) {
		return getRandomResponse(pattern);
	}

	return null;
}

// ==================== 話題提案 ====================

export interface TopicSuggestion {
	id: string;
	category: string;
	title: string;
	prompt: string;
}

/**
 * 雑談用の話題提案
 */
export const topicSuggestions: TopicSuggestion[] = [
	{
		id: "topic-movie",
		category: "entertainment",
		title: "最近見た映画",
		prompt: "最近何か面白い映画見た？オススメある？",
	},
	{
		id: "topic-music",
		category: "entertainment",
		title: "好きな音楽",
		prompt: "好きな音楽のジャンルとか、最近ハマってる曲ある？",
	},
	{
		id: "topic-food",
		category: "daily",
		title: "好きな食べ物",
		prompt: "一番好きな食べ物って何？私、美味しいもの大好き！",
	},
	{
		id: "topic-travel",
		category: "experience",
		title: "行ってみたい場所",
		prompt: "行ってみたい場所とかある？旅行の話好きなんだよね！",
	},
	{
		id: "topic-hobby",
		category: "personal",
		title: "趣味の話",
		prompt: "趣味って何？休みの日は何してる？",
	},
	{
		id: "topic-dream",
		category: "personal",
		title: "夢や目標",
		prompt: "将来の夢とか、やってみたいことある？",
	},
	{
		id: "topic-childhood",
		category: "memory",
		title: "子供の頃",
		prompt: "子供の頃の思い出とか、楽しかったことある？",
	},
	{
		id: "topic-season",
		category: "daily",
		title: "好きな季節",
		prompt: "一年で一番好きな季節って何？理由も教えて！",
	},
	{
		id: "topic-pet",
		category: "daily",
		title: "ペットの話",
		prompt: "ペット飼ってる？動物好き？",
	},
	{
		id: "topic-tech",
		category: "interest",
		title: "テクノロジー",
		prompt: "最近の技術とかガジェットで気になるものある？",
	},
];

/**
 * ランダムな話題を取得
 */
export function getRandomTopic(): TopicSuggestion {
	const randomIndex = Math.floor(Math.random() * topicSuggestions.length);
	return topicSuggestions[randomIndex];
}

/**
 * カテゴリ別の話題を取得
 */
export function getTopicsByCategory(category: string): TopicSuggestion[] {
	return topicSuggestions.filter((topic) => topic.category === category);
}

// ==================== 感情分析 ====================

export interface EmotionAnalysis {
	emotion: "happy" | "sad" | "excited" | "angry" | "neutral" | "surprised";
	confidence: number;
	keywords: string[];
}

/**
 * 簡易的な感情分析
 */
export function analyzeEmotion(text: string): EmotionAnalysis {
	const happyKeywords = [
		"嬉しい",
		"楽しい",
		"最高",
		"幸せ",
		"笑",
		"ありがとう",
		"良い",
	];
	const sadKeywords = [
		"悲しい",
		"つらい",
		"寂しい",
		"辛い",
		"泣",
		"残念",
		"ダメ",
	];
	const excitedKeywords = [
		"やった",
		"すごい",
		"最高",
		"わーい",
		"きゃー",
		"！！",
		"めっちゃ",
	];
	const angryKeywords = [
		"怒",
		"腹立つ",
		"ムカつく",
		"イライラ",
		"許せない",
		"最悪",
	];
	const surprisedKeywords = [
		"えっ",
		"まじ",
		"本当",
		"うそ",
		"びっくり",
		"驚",
		"！？",
	];

	let happyScore = 0;
	let sadScore = 0;
	let excitedScore = 0;
	let angryScore = 0;
	let surprisedScore = 0;

	const lowerText = text.toLowerCase();

	for (const keyword of happyKeywords) {
		if (lowerText.includes(keyword)) happyScore++;
	}
	for (const keyword of sadKeywords) {
		if (lowerText.includes(keyword)) sadScore++;
	}
	for (const keyword of excitedKeywords) {
		if (lowerText.includes(keyword)) excitedScore++;
	}
	for (const keyword of angryKeywords) {
		if (lowerText.includes(keyword)) angryScore++;
	}
	for (const keyword of surprisedKeywords) {
		if (lowerText.includes(keyword)) surprisedScore++;
	}

	const scores = {
		happy: happyScore,
		sad: sadScore,
		excited: excitedScore,
		angry: angryScore,
		surprised: surprisedScore,
	};

	const maxScore = Math.max(...Object.values(scores));

	if (maxScore === 0) {
		return { emotion: "neutral", confidence: 1.0, keywords: [] };
	}

	const emotion = (Object.keys(scores) as Array<keyof typeof scores>).find(
		(key) => scores[key] === maxScore,
	) as EmotionAnalysis["emotion"];

	return {
		emotion,
		confidence: maxScore / (text.length / 10),
		keywords: [],
	};
}

// ==================== 会話コンテキスト ====================

export interface ConversationContext {
	lastTopic?: string;
	emotionHistory: EmotionAnalysis[];
	topicCount: Map<string, number>;
	messageCount: number;
}

/**
 * 会話コンテキストを初期化
 */
export function createConversationContext(): ConversationContext {
	return {
		emotionHistory: [],
		topicCount: new Map(),
		messageCount: 0,
	};
}

/**
 * コンテキストを更新
 */
export function updateConversationContext(
	context: ConversationContext,
	message: string,
): ConversationContext {
	const emotion = analyzeEmotion(message);
	const pattern = detectConversationPattern(message);

	context.emotionHistory.push(emotion);
	if (context.emotionHistory.length > 10) {
		context.emotionHistory.shift();
	}

	if (pattern) {
		const count = context.topicCount.get(pattern.category) || 0;
		context.topicCount.set(pattern.category, count + 1);
		context.lastTopic = pattern.category;
	}

	context.messageCount++;

	return context;
}
