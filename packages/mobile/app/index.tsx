import { useChat } from "../hooks/useChat";
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

export default function IndexScreen() {
	const { messages, loading, apiUrl, saveApiUrl, sendMessage } = useChat();
	const [input, setInput] = useState("");
	const [localApiUrl, setLocalApiUrl] = useState(apiUrl);
	const scrollViewRef = useRef<ScrollView>(null);
	const fadeAnim = useRef(new Animated.Value(0)).current;

	// Bottom Sheet setup
	const bottomSheetModalRef = useRef<BottomSheetModal>(null);
	const snapPoints = useMemo(() => ["25%", "50%"], []);
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
								やっほー！エリシアだよ♡{"\n"}
								何でも話してね〜！
							</Text>
						</View>
							)}
							{messages.map((msg, idx) => (
								<View
									key={`${msg.role}-${idx}-${msg.content.slice(0, 20)}`}
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
						<Text style={styles.settingsTitle}>API設定</Text>
						<Text style={styles.settingsLabel}>サーバーURL:</Text>
						<TextInput
							style={styles.settingsInput}
							value={localApiUrl}
							onChangeText={setLocalApiUrl}
							placeholder="http://192.168.1.100:3000"
							autoCapitalize="none"
							autoCorrect={false}
						/>
						<Text style={styles.settingsHint}>
							ヒント: コンピューターのローカルIPアドレスを使用してください。
						</Text>
						<TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
							<Text style={styles.saveButtonText}>保存して閉じる</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.cancelButton} onPress={handleCloseModal}>
							<Text style={styles.cancelButtonText}>キャンセル</Text>
						</TouchableOpacity>
					</BottomSheetView>
				</BottomSheetModal>
			</BottomSheetModalProvider>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	gradient: {
		flex: 1,
	},
	messagesContainer: {
		flex: 1,
	},
	messagesContent: {
		padding: 16,
	},
	welcomeContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingTop: 60,
	},
	welcomeText: {
		fontSize: 18,
		color: "#fff",
		textAlign: "center",
		fontWeight: "600",
	},
	messageBubble: {
		maxWidth: "80%",
		padding: 12,
		borderRadius: 16,
		marginBottom: 12,
	},
	userBubble: {
		alignSelf: "flex-end",
		backgroundColor: "#fff",
	},
	assistantBubble: {
		alignSelf: "flex-start",
		backgroundColor: "rgba(255, 255, 255, 0.9)",
	},
	messageText: {
		fontSize: 16,
		color: "#333",
	},
	loadingContainer: {
		flexDirection: "row",
		alignItems: "center",
		padding: 12,
	},
	loadingText: {
		marginLeft: 8,
		color: "#fff",
		fontSize: 14,
	},
	inputContainer: {
		flexDirection: "row",
		padding: 12,
		backgroundColor: "rgba(255, 255, 255, 0.95)",
		alignItems: "center",
	},
	settingsIconButton: {
		padding: 8,
		marginRight: 8,
	},
	settingsIcon: {
		fontSize: 20,
	},
	input: {
		flex: 1,
		backgroundColor: "#f5f5f5",
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 10,
		fontSize: 16,
		maxHeight: 100,
	},
	sendButton: {
		marginLeft: 8,
		backgroundColor: "#FF69B4",
		width: 44,
		height: 44,
		borderRadius: 22,
		justifyContent: "center",
		alignItems: "center",
	},
	sendButtonDisabled: {
		opacity: 0.5,
	},
	sendButtonText: {
		fontSize: 24,
	},
	settingsContainer: {
		flex: 1,
		padding: 24,
		justifyContent: "center",
	},
	settingsTitle: {
		fontSize: 28,
		fontWeight: "bold",
		color: "#fff",
		marginBottom: 24,
		textAlign: "center",
	},
	settingsLabel: {
		fontSize: 16,
		color: "#fff",
		marginBottom: 8,
		fontWeight: "600",
	},
	settingsInput: {
		backgroundColor: "#fff",
		borderRadius: 12,
		padding: 16,
		fontSize: 16,
		marginBottom: 12,
	},
	settingsHint: {
		fontSize: 13,
		color: "rgba(255, 255, 255, 0.9)",
		marginBottom: 24,
		lineHeight: 20,
	},
	saveButton: {
		backgroundColor: "#fff",
		borderRadius: 12,
		padding: 16,
		alignItems: "center",
		marginBottom: 12,
	},
	saveButtonText: {
		fontSize: 18,
		fontWeight: "bold",
		color: "#FF69B4",
	},
	cancelButton: {
		backgroundColor: "rgba(255, 255, 255, 0.3)",
		borderRadius: 12,
		padding: 16,
		alignItems: "center",
	},
	cancelButtonText: {
		fontSize: 16,
		color: "#fff",
	},
	bottomSheetBackground: {
		backgroundColor: "#FF8AC6",
	},
	bottomSheetContent: {
		flex: 1,
		padding: 24,
	},
});

const markdownStyles = StyleSheet.create({
	body: {
		color: "#333",
		fontSize: 16,
	},
	link: {
		color: "#FF69B4",
		textDecorationLine: "underline",
	},
	strong: {
		fontWeight: "bold",
		color: "#FF1493",
	},
});
