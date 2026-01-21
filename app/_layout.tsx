import { MaterialIcons } from "@expo/vector-icons";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import "react-native-reanimated";
import { useColorScheme } from "../hooks/use-color-scheme";

// Import Stripe config
import { STRIPE_CONFIG, STRIPE_PUBLISHABLE_KEY } from "./constants/stripe";

// ⚠️ CẬP NHẬT unstable_settings
export const unstable_settings = {
  // Chỉ định layout gốc là tabs
  initialRouteName: "(tabs)",
};

// CHỈ native mới dùng splash
if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync();
}

// Conditional Stripe Provider for web/mobile
const StripeProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  if (Platform.OS === "web") {
    // Trên web, không dùng StripeProvider
    return <>{children}</>;
  } else {
    // Trên mobile, dùng StripeProvider
    try {
      const { StripeProvider } = require('@stripe/stripe-react-native');
      return (
        <StripeProvider
          publishableKey={STRIPE_PUBLISHABLE_KEY}
          merchantIdentifier={STRIPE_CONFIG.merchantIdentifier}
          urlScheme={STRIPE_CONFIG.urlScheme}
          threeDSecureParams={{
            backgroundColor: "#FFFFFF",
            timeout: 5,
          }}
        >
          {children}
        </StripeProvider>
      );
    } catch (error) {
      console.warn("Stripe not available:", error);
      return <>{children}</>;
    }
  }
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [loaded] = useFonts({
    // Chỉ load font cho mobile, web sẽ dùng fallback
    ...(Platform.OS !== 'web' ? MaterialIcons.font : {}),
  });

  useEffect(() => {
    if (loaded && Platform.OS !== "web") {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // WEB KHÔNG BAO GIỜ RETURN NULL
  if (!loaded && Platform.OS !== "web") {
    return null;
  }

  return (
    // 🔥 BỌC ỨNG DỤNG VỚI STRIPE PROVIDER (chỉ mobile)
    <StripeProviderWrapper>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            // 🔧 Cấu hình mặc định cho tất cả screens
            headerStyle: {
              backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#ffffff",
            },
            headerTintColor: colorScheme === "dark" ? "#ffffff" : "#1a1a1a",
          }}
        >
          {/* Tabs Stack - LAYOUT CHÍNH */}
          <Stack.Screen 
            name="(tabs)" 
            options={{ 
              headerShown: false,
            }} 
          />
          
          {/* Auth Stack */}
          <Stack.Screen 
            name="(auth)" 
            options={{ 
              headerShown: false,
            }} 
          />
          
          {/* Order Detail */}
          <Stack.Screen
            name="order-detail/[id]"
            options={{
              title: "Chi tiết đơn hàng",
              headerShown: false,
            }}
          />
          
          {/* Checkout Screens */}
          <Stack.Screen
            name="checkout/success"
            options={{
              title: "Thanh toán thành công",
              headerShown: false,
            }}
          />
          
          <Stack.Screen
            name="checkout/failed"
            options={{
              title: "Thanh toán thất bại",
              headerShown: false,
            }}
          />
          
          {/* Admin Screens */}
          <Stack.Screen
            name="(admin)"
            options={{
              headerShown: false,
            }}
          />
          
          {/* KHÔNG ĐỊNH NGHĨA product/[id] Ở ĐÂY - Nó đã có trong cấu trúc thư mục */}
        </Stack>
        
        {/* Status Bar */}
        <StatusBar 
          style={colorScheme === "dark" ? "light" : "dark"} 
          backgroundColor={colorScheme === "dark" ? "#000000" : "#ffffff"}
        />
      </ThemeProvider>
    </StripeProviderWrapper>
  );
}