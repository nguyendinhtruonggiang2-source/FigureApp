import { router } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import {
    Alert,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { auth } from "../constants/firebase";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<"Nam" | "Nữ" | "Khác">("Nam");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !phone || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
      return;
    }

    try {
      setLoading(true);
      await createUserWithEmailAndPassword(auth, email, password);
      Alert.alert("Thành công", "Đăng ký thành công");
      router.replace("/(auth)/login");
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        Alert.alert("Lỗi", "Email đã được đăng ký");
      } else if (error.code === "auth/weak-password") {
        Alert.alert("Lỗi", "Mật khẩu phải từ 6 ký tự");
      } else {
        Alert.alert("Lỗi", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0f172a", justifyContent: "center", padding: 24 }}>
      <View style={{ backgroundColor: "#020617", borderRadius: 20, padding: 24, borderWidth: 1, borderColor: "#38bdf8" }}>
        <Text style={{ fontSize: 28, fontWeight: "700", color: "#38bdf8", textAlign: "center", marginBottom: 24 }}>
          Đăng ký
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
          placeholder="Số điện thoại"
          placeholderTextColor="#94a3b8"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 14, color: "white", marginBottom: 14 }}
        />

        <TextInput
          placeholder="Mật khẩu"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 14, color: "white", marginBottom: 20 }}
        />

        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          style={{ backgroundColor: "#38bdf8", paddingVertical: 14, borderRadius: 12, opacity: loading ? 0.6 : 1 }}
        >
          <Text style={{ color: "#020617", fontSize: 16, fontWeight: "700", textAlign: "center" }}>
            {loading ? "Đang đăng ký..." : "Đăng ký"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/(auth)/login")} style={{ marginTop: 16 }}>
          <Text style={{ color: "#94a3b8", textAlign: "center", fontSize: 14 }}>
            Đã có tài khoản?{" "}
            <Text style={{ color: "#38bdf8", fontWeight: "600" }}>Đăng nhập</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
