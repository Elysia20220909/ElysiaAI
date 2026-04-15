import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect } from "react";

const ACCESS_TOKEN_KEY = "@elysia_access_token";
const REFRESH_TOKEN_KEY = "@elysia_refresh_token";

export function useAuth(apiUrl: string) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
            setIsAuthenticated(!!token);
        } catch (e) {
            console.error("Auth check failed", e);
        } finally {
            setLoading(false);
        }
    };

    const login = async (username: string, password: string): Promise<boolean> => {
        try {
            const response = await fetch(`${apiUrl}/auth/token`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) return false;

            const data = await response.json();
            await AsyncStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
            await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
            setIsAuthenticated(true);
            return true;
        } catch (e) {
            console.error("Login failed", e);
            return false;
        }
    };

    const logout = async () => {
        await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
        await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
        setIsAuthenticated(false);
    };

    return { isAuthenticated, loading, login, logout, checkAuth };
}
