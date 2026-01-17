import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import {
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../constants/firebase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập email và mật khẩu");
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      Alert.alert("Thành công", "Đăng nhập thành công");
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Thất bại", "Sai email hoặc mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0f172a", justifyContent: "center", padding: 24 }}>
      <View style={{ backgroundColor: "#020617", borderRadius: 20, padding: 24, borderWidth: 1, borderColor: "#38bdf8" }}>
        
        <Text style={{ fontSize: 28, fontWeight: "700", color: "#38bdf8", textAlign: "center", marginBottom: 24 }}>
          Đăng nhập
        </Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor="#94a3b8"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 14, color: "white", marginBottom: 14 }}
        />

        <TextInput
          placeholder="Mật khẩu"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 14, color: "white", marginBottom: 10 }}
        />

        {/* ===== Quên mật khẩu (NEW) ===== */}
        <TouchableOpacity
          onPress={() => router.push("/(auth)/forgot-password")}
          style={{ alignSelf: "flex-end", marginBottom: 20 }}
        >
          <Text style={{ color: "#38bdf8", fontSize: 13 }}>
            Quên mật khẩu?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={{ backgroundColor: "#38bdf8", paddingVertical: 14, borderRadius: 12, opacity: loading ? 0.6 : 1 }}
        >
          <Text style={{ color: "#020617", fontSize: 16, fontWeight: "700", textAlign: "center" }}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/(auth)/register")} style={{ marginTop: 16 }}>
          <Text style={{ color: "#94a3b8", textAlign: "center", fontSize: 14 }}>
            Chưa có tài khoản?{" "}
            <Text style={{ color: "#38bdf8", fontWeight: "600" }}>Đăng ký</Text>
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}
