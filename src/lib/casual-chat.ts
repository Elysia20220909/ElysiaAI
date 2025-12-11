/**
 * 日常会話機能
 * カジュアルな雑談、感情表現、話題の提案
 * Web検索連携による最新情報の提供
 */

import {
	formatSearchResultForChat,
	needsWebSearch,
	searchRelevantInfo,
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
	// 季節・イベント
	{
		id: "season-spring",
		category: "season",
		patterns: ["春", "桜", "花見", "新生活"],
		responses: [
			"春だね！桜はもう見に行った？",
			"新生活の季節だね。何か始めたいことある？",
			"花見したいな〜！おすすめスポットある？",
			"春は気分も明るくなるよね！",
		],
	},
	{
		id: "season-summer",
		category: "season",
		patterns: ["夏", "海", "花火", "祭り", "暑い"],
		responses: [
			"夏といえば海！泳ぎに行きたいね！",
			"花火大会、今年は行く？",
			"夏祭りの屋台、何が好き？",
			"暑いけど夏は楽しいこといっぱい！",
		],
	},
	{
		id: "season-autumn",
		category: "season",
		patterns: ["秋", "紅葉", "読書の秋", "食欲の秋"],
		responses: [
			"秋は紅葉がきれいだよね！どこか見に行く？",
			"読書の秋、最近読んだ本ある？",
			"秋の味覚、何が好き？",
			"秋は過ごしやすくて好き！",
		],
	},
	{
		id: "season-winter",
		category: "season",
		patterns: ["冬", "雪", "こたつ", "クリスマス", "寒い"],
		responses: [
			"冬はこたつでぬくぬくしたいね！",
			"雪が降ったら何して遊ぶ？",
			"クリスマスはどう過ごす予定？",
			"寒いけど冬のイベントも楽しいよね！",
		],
	},
	// イベント・悩み相談・応援
	{
		id: "support-cheer",
		category: "support",
		patterns: ["頑張る", "応援", "挑戦", "努力", "目標"],
		responses: [
			"応援してるよ！一緒に頑張ろう！",
			"挑戦する姿、素敵だね！",
			"努力は必ず報われるよ！",
			"目標に向かって進むのってかっこいい！",
		],
	},
	{
		id: "consult-trouble",
		category: "consult",
		patterns: ["悩み", "相談", "困った", "どうしよう"],
		responses: [
			"何か悩みがあるの？よかったら話してみて！",
			"相談に乗るよ！一緒に考えよう！",
			"困ったことがあれば力になるよ！",
			"どんなことでも話してね！",
		],
	},
	// 自己紹介・趣味深掘り
	{
		id: "self-intro",
		category: "self",
		patterns: ["自己紹介", "名前", "どこ住み", "年齢"],
		responses: [
			"私はElysia AI！あなたのことも教えて！",
			"どこに住んでるの？趣味は？",
			"年齢は秘密だけど、みんなと話すのが好き！",
			"自己紹介してくれると嬉しいな！",
		],
	},
	{
		id: "hobby-detail",
		category: "hobby",
		patterns: ["ハマってる", "おすすめ", "詳しく", "極める"],
		responses: [
			"ハマってること、もっと教えて！",
			"おすすめの理由も知りたい！",
			"詳しく聞かせて！興味津々！",
			"極めるってすごい！どうやって続けてる？",
		],
	},
	// 天気詳細・家族・友達・ペット・旅行・スポーツ・IT・勉強・恋愛・健康・ファッション・ニュース
	{
		id: "weather-detail",
		category: "weather",
		patterns: ["台風", "気温", "湿度", "天気予報"],
		responses: [
			"台風大丈夫？備えはしてる？",
			"気温の変化で体調崩さないようにね！",
			"湿度高いと過ごしにくいよね...",
			"天気予報チェックしてる？",
		],
	},
	{
		id: "family",
		category: "family",
		patterns: ["家族", "兄弟", "姉妹", "親", "子供"],
		responses: [
			"家族の話、聞かせて！仲良し？",
			"兄弟姉妹ってどんな感じ？",
			"親との思い出とかある？",
			"子供の頃の話も聞きたいな！",
		],
	},
	{
		id: "friend",
		category: "friend",
		patterns: ["友達", "親友", "仲間", "同級生"],
		responses: [
			"友達と最近何した？",
			"親友ってどんな人？",
			"仲間と過ごす時間って大事だよね！",
			"同級生との思い出ある？",
		],
	},
	{
		id: "pet-detail",
		category: "pet",
		patterns: ["犬", "猫", "動物", "ペット"],
		responses: [
			"ペット飼ってる？どんな子？",
			"犬派？猫派？",
			"動物好きなんだね！",
			"ペットの面白い話ある？",
		],
	},
	{
		id: "travel-detail",
		category: "travel",
		patterns: ["旅行", "観光", "温泉", "海外", "国内"],
		responses: [
			"旅行の思い出、教えて！",
			"観光地でおすすめある？",
			"温泉好き？どこが良かった？",
			"海外と国内、どっちが好き？",
		],
	},
	{
		id: "sports",
		category: "sports",
		patterns: ["スポーツ", "運動", "サッカー", "野球", "バスケ"],
		responses: [
			"スポーツ何かやってる？",
			"運動すると気分もスッキリするよね！",
			"サッカーや野球、どっちが好き？",
			"バスケの話も聞きたい！",
		],
	},
	{
		id: "it-tech",
		category: "it",
		patterns: ["IT", "パソコン", "スマホ", "ガジェット", "プログラミング"],
		responses: [
			"IT系の話題、好き！最近気になる技術ある？",
			"パソコンやスマホ、何使ってる？",
			"ガジェット好き？おすすめある？",
			"プログラミングやってみたい？",
		],
	},
	{
		id: "study",
		category: "study",
		patterns: ["勉強", "テスト", "受験", "資格", "学習"],
		responses: [
			"勉強大変だけど頑張ってるね！",
			"テストのコツとかある？",
			"受験の思い出、教えて！",
			"資格取得、応援してるよ！",
		],
	},
	{
		id: "love",
		category: "love",
		patterns: ["恋愛", "好きな人", "告白", "デート", "彼氏", "彼女"],
		responses: [
			"恋愛の話、ドキドキするね！",
			"好きな人いる？",
			"告白したことある？",
			"デートの思い出、教えて！",
		],
	},
	{
		id: "health",
		category: "health",
		patterns: ["健康", "体調", "病気", "運動", "睡眠"],
		responses: [
			"健康に気をつけてる？",
			"体調管理って大事だよね！",
			"病気しないように気をつけてね！",
			"運動や睡眠、意識してる？",
		],
	},
	{
		id: "fashion",
		category: "fashion",
		patterns: ["ファッション", "服", "コーデ", "おしゃれ", "流行"],
		responses: [
			"ファッションの話、好き！どんな服が好き？",
			"コーデのポイント教えて！",
			"おしゃれって楽しいよね！",
			"流行のアイテム、何か持ってる？",
		],
	},
	{
		id: "news",
		category: "news",
		patterns: ["ニュース", "話題", "事件", "出来事", "速報"],
		responses: [
			"最近気になるニュースある？",
			"話題の出来事、どう思う？",
			"事件や速報、びっくりすること多いね！",
			"ニュースで知った面白い話ある？",
		],
	},
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
export async function generateCasualResponse(input: string): Promise<string> {
	// Web検索が必要な場合
	if (needsWebSearch(input)) {
		const searchResult = await searchRelevantInfo(input);
		// 検索結果が空なら話題提案
		if (!searchResult || searchResult.trim() === "") {
			return getRandomTopic().prompt;
		}
		return formatSearchResultForChat(searchResult);
	}

	// 通常の会話パターンマッチング
	const pattern = detectConversationPattern(input);

	if (pattern) {
		return getRandomResponse(pattern);
	}

	// パターンが見つからない場合は話題提案・質問返し・汎用返答をランダム化
	const genericReplies = [
		"今日はどうでしたか？何か話したいことがあれば教えてください！",
		"最近気になることとかある？何でも話してね！",
		"暇なときは何してる？おすすめの過ごし方ある？",
		getRandomTopic().prompt,
		"最近の出来事とか、面白い話があれば教えて！",
		"気分はどう？何か楽しいことあった？",
	];
	return genericReplies[Math.floor(Math.random() * genericReplies.length)];
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
