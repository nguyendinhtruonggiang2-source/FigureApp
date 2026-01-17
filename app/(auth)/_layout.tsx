// app/(auth)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { TouchableOpacity } from "react-native";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#0f172a",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
        // Cấu hình back button đơn giản hơn
        headerLeft: ({ canGoBack }) =>
          canGoBack ? (
            <TouchableOpacity
              onPress={() => {
                // Sử dụng router back
                if (typeof window !== "undefined" && window.history.length > 1) {
                  window.history.back();
                }
              }}
              style={{ marginLeft: 15 }}
            >
              <Ionicons name="arrow-back" size={24} color="#38bdf8" />
            </TouchableOpacity>
          ) : null,
      }}
    >
      {/* Login Screen */}
      <Stack.Screen
        name="login"
        options={{
          title: "Đăng nhập",
          headerShown: true,
        }}
      />

      {/* Register Screen */}
      <Stack.Screen
        name="register"
        options={{
          title: "Đăng ký",
          headerShown: true,
        }}
      />

      {/* Forgot Password Screen */}
      <Stack.Screen
        name="forgot-password"
        options={{
          title: "Quên mật khẩu",
          headerShown: true,
        }}
      />

      {/* Reset Password Screen - QUAN TRỌNG: ĐẢM BẢO CÓ */}
      <Stack.Screen
        name="reset-password"
        options={{
          title: "Đặt lại mật khẩu",
          headerShown: true,
        }}
      />
    </Stack>
  );
}