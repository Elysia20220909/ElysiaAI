import { renderHook, act } from "@testing-library/react-native";
import { useChat } from "./useChat";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe("useChat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with default messages", () => {
    const { result } = renderHook(() => useChat());
    expect(result.current.messages.length).toBe(1);
    expect(result.current.messages[0].role).toBe("assistant");
  });

  it("should add a user message and get a response", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => ({
          read: jest.fn()
            .mockResolvedValueOnce({ value: new TextEncoder().encode('data: {"content": "Hello"}\n\n'), done: false })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage("Hi");
    });

    expect(result.current.messages.some(m => m.content === "Hi")).toBe(true);
  });

  it("should clear messages", async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      result.current.clearMessages();
    });

    expect(result.current.messages.length).toBe(1); // Welcome message remains
  });
});
