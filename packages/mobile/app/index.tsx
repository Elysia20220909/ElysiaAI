import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Animated,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Markdown from "react-native-markdown-display";
import { useChat } from "../hooks/useChat";
import { useAuth } from "../hooks/useAuth";

export default function IndexScreen() {
	const { messages, loading, apiUrl, saveApiUrl, sendMessage } = useChat();
	const { isAuthenticated, login, logout, loading: authLoading } = useAuth(apiUrl);
	
	const [input, setInput] = useState("");
	const [localApiUrl, setLocalApiUrl] = useState(apiUrl);
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	
	const scrollViewRef = useRef<ScrollView>(null);
	const fadeAnim = useRef(new Animated.Value(0)).current;

	// Bottom Sheet setup
	const bottomSheetModalRef = useRef<BottomSheetModal>(null);
	const snapPoints = useMemo(() => ["25%", "60%"], []);
	const handlePresentModalPress = useCallback(() => {
		bottomSheetModalRef.current?.present();
	}, []);
	const handleCloseModal = useCallback(() => {
		bottomSheetModalRef.current?.dismiss();
	}, []);

	useEffect(() => {
		setLocalApiUrl(apiUrl);
	}, [apiUrl]);

	// Premium animation for thinking state
	useEffect(() => {
		if (loading) {
			Animated.loop(
				Animated.sequence([
					Animated.timing(fadeAnim, {
						toValue: 1,
						duration: 800,
						useNativeDriver: true,
					}),
					Animated.timing(fadeAnim, {
						toValue: 0.3,
						duration: 800,
						useNativeDriver: true,
					}),
				]),
			).start();
		} else {
			fadeAnim.setValue(0);
		}
	}, [loading, fadeAnim]);

	const handleSend = async () => {
		if (!input.trim() || loading) return;
		const text = input.trim();
		setInput("");
		try {
			await sendMessage(text);
		} catch (error) {
			Alert.alert("エラー", "メッセージの送信に失敗したよ…(´;ω;｀)");
			console.error(error);
		}
	};

	const handleSaveSettings = async () => {
		try {
			const success = await saveApiUrl(localApiUrl);
			if (success) {
				handleCloseModal();
				Alert.alert("成功", "設定を保存したよ！✨");
			}
		} catch (error) {
			Alert.alert("エラー", "設定の保存に失敗しちゃった…");
			console.error(error);
		}
	};

	const handleLogin = async () => {
		const success = await login(username, password);
		if (!success) {
			Alert.alert("認証失敗", "ユーザー名かパスワードが違うみたい…");
		}
	};

	if (authLoading) {
		return (
			<View style={styles.centerContainer}>
				<ActivityIndicator size="large" color="#FF69B4" />
			</View>
		);
	}

	if (!isAuthenticated) {
		return (
			<View style={styles.container}>
				<LinearGradient colors={["#FFB7D5", "#FF8AC6"]} style={styles.gradient}>
					<View style={styles.loginContainer}>
						<Text style={styles.loginEmoji}>ฅ(՞˵• ⤙ •˵՞)ฅ</Text>
						<Text style={styles.loginTitle}>Elysia Sovereign Login</Text>
						<Text style={styles.loginSubtitle}>アクセス権限を確認するね♡</Text>
						
						<TextInput
							style={styles.loginInput}
							placeholder="Username"
							placeholderTextColor="#999"
							value={username}
							onChangeText={setUsername}
							autoCapitalize="none"
						/>
						<TextInput
							style={styles.loginInput}
							placeholder="Password"
							placeholderTextColor="#999"
							value={password}
							onChangeText={setPassword}
							secureTextEntry
						/>
						
						<TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
							<Text style={styles.loginButtonText}>認証する ✨</Text>
						</TouchableOpacity>
						
						<TouchableOpacity style={styles.settingsLink} onPress={handlePresentModalPress}>
							<Text style={styles.settingsLinkText}>サーバー設定を変更 ⚙️</Text>
						</TouchableOpacity>
					</View>
					
					<BottomSheetModalProvider>
						<BottomSheetModal
							ref={bottomSheetModalRef}
							index={1}
							snapPoints={snapPoints}
							backgroundStyle={styles.bottomSheetBackground}
							handleIndicatorStyle={{ backgroundColor: "#fff" }}
						>
							<BottomSheetView style={styles.bottomSheetContent}>
								<Text style={styles.settingsTitle}>Server Config</Text>
								<TextInput
									style={styles.settingsInput}
									value={localApiUrl}
									onChangeText={setLocalApiUrl}
									placeholder="http://192.168.1.100:3000"
								/>
								<TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
									<Text style={styles.saveButtonText}>保存</Text>
								</TouchableOpacity>
							</BottomSheetView>
						</BottomSheetModal>
					</BottomSheetModalProvider>
				</LinearGradient>
			</View>
		);
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<BottomSheetModalProvider>
				<KeyboardAvoidingView
					style={styles.container}
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					keyboardVerticalOffset={100}
				>
					<LinearGradient colors={["#FFB7D5", "#FF8AC6"]} style={styles.gradient}>
						<ScrollView
							ref={scrollViewRef}
							style={styles.messagesContainer}
							contentContainerStyle={styles.messagesContent}
							onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
						>
							{messages.length === 0 && (
								<View style={styles.welcomeContainer}>
									<Text style={styles.welcomeText}>
										ฅ(՞៸៸&gt; ᗜ &lt;៸៸՞)ฅ♡{"\n\n"}
										おかえり！エリシアだよ♡{"\n"}
										安全な通信が確立されたよ〜！
									</Text>
								</View>
							)}
							{messages.map((msg, idx) => (
								<View
									key={`${msg.role}-${idx}`}
									style={[
										styles.messageBubble,
										msg.role === "user" ? styles.userBubble : styles.assistantBubble,
									]}
								>
									{msg.role === "assistant" ? (
										<Markdown style={markdownStyles}>{msg.content}</Markdown>
									) : (
										<Text style={styles.messageText}>{msg.content}</Text>
									)}
								</View>
							))}
							{loading && (
								<Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
									<ActivityIndicator size="small" color="#FF69B4" />
									<Text style={styles.loadingText}>エリシアが考え中…♡</Text>
								</Animated.View>
							)}
						</ScrollView>

						<View style={styles.inputContainer}>
							<TouchableOpacity style={styles.settingsIconButton} onPress={handlePresentModalPress}>
								<Text style={styles.settingsIcon}>⚙️</Text>
							</TouchableOpacity>
							<TextInput
								style={styles.input}
								value={input}
								onChangeText={setInput}
								placeholder="メッセージを入力…♡"
								placeholderTextColor="#999"
								multiline
								maxLength={500}
								editable={!loading}
							/>
							<TouchableOpacity
								style={[styles.sendButton, loading && styles.sendButtonDisabled]}
								onPress={handleSend}
								disabled={loading || !input.trim()}
							>
								<Text style={styles.sendButtonText}>💌</Text>
							</TouchableOpacity>
						</View>
					</LinearGradient>
				</KeyboardAvoidingView>

				<BottomSheetModal
					ref={bottomSheetModalRef}
					index={1}
					snapPoints={snapPoints}
					backgroundStyle={styles.bottomSheetBackground}
					handleIndicatorStyle={{ backgroundColor: "#fff" }}
				>
					<BottomSheetView style={styles.bottomSheetContent}>
						<Text style={styles.settingsTitle}>Sovereign Settings</Text>
						<Text style={styles.settingsLabel}>サーバーURL:</Text>
						<TextInput
							style={styles.settingsInput}
							value={localApiUrl}
							onChangeText={setLocalApiUrl}
							placeholder="http://192.168.1.100:3000"
						/>
						<TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
							<Text style={styles.saveButtonText}>設定保存</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.logoutButton} onPress={logout}>
							<Text style={styles.logoutButtonText}>ログアウト (Disconnect)</Text>
						</TouchableOpacity>
					</BottomSheetView>
				</BottomSheetModal>
			</BottomSheetModalProvider>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	gradient: { flex: 1 },
	centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
	loginContainer: { flex: 1, justifyContent: "center", padding: 32, alignItems: "center" },
	loginEmoji: { fontSize: 60, marginBottom: 20 },
	loginTitle: { fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 8 },
	loginSubtitle: { fontSize: 16, color: "rgba(255,255,255,0.8)", marginBottom: 32 },
	loginInput: { width: "100%", backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16 },
	loginButton: { width: "100%", backgroundColor: "#FF1493", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
	loginButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
	settingsLink: { marginTop: 24 },
	settingsLinkText: { color: "#fff", opacity: 0.7 },
	messagesContainer: { flex: 1 },
	messagesContent: { padding: 16 },
	welcomeContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 },
	welcomeText: { fontSize: 18, color: "#fff", textAlign: "center", fontWeight: "600" },
	messageBubble: { maxWidth: "80%", padding: 12, borderRadius: 16, marginBottom: 12 },
	userBubble: { alignSelf: "flex-end", backgroundColor: "#fff" },
	assistantBubble: { alignSelf: "flex-start", backgroundColor: "rgba(255, 255, 255, 0.9)" },
	messageText: { fontSize: 16, color: "#333" },
	loadingContainer: { flexDirection: "row", alignItems: "center", padding: 12 },
	loadingText: { marginLeft: 8, color: "#fff", fontSize: 14 },
	inputContainer: { flexDirection: "row", padding: 12, backgroundColor: "rgba(255, 255, 255, 0.95)", alignItems: "center" },
	settingsIconButton: { padding: 8, marginRight: 8 },
	settingsIcon: { fontSize: 20 },
	input: { flex: 1, backgroundColor: "#f5f5f5", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, maxHeight: 100 },
	sendButton: { marginLeft: 8, backgroundColor: "#FF69B4", width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
	sendButtonDisabled: { opacity: 0.5 },
	sendButtonText: { fontSize: 24 },
	bottomSheetBackground: { backgroundColor: "#FF8AC6" },
	bottomSheetContent: { flex: 1, padding: 24 },
	settingsTitle: { fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 20, textAlign: "center" },
	settingsLabel: { color: "#fff", marginBottom: 8 },
	settingsInput: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 24 },
	saveButton: { backgroundColor: "#fff", borderRadius: 12, padding: 16, alignItems: "center" },
	saveButtonText: { color: "#FF69B4", fontWeight: "bold", fontSize: 16 },
	logoutButton: { marginTop: 20, padding: 16, alignItems: "center" },
	logoutButtonText: { color: "#fff", opacity: 0.8 },
});

const markdownStyles = StyleSheet.create({
	body: { color: "#333", fontSize: 16 },
	link: { color: "#FF69B4", textDecorationLine: "underline" },
	strong: { fontWeight: "bold", color: "#FF1493" },
});
