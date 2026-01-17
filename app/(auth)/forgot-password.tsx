// app/(auth)/forgot-password.tsx
import { router } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { auth } from "../constants/firebase";

const REGISTERED_EMAILS = [
  "elysia@gmail.com",
  "furina@gmail.com",
  "nguyendinhtruonggian@gmail.com"
];

export default function ForgotPassword() {
  const [email, setEmail] = useState(REGISTERED_EMAILS[0]);
  const [loading, setLoading] = useState(false);

  const handleSendResetEmail = async () => {
    if (!email.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập email");
      return;
    }

    const emailExists = REGISTERED_EMAILS.some(e => e.toLowerCase() === email.toLowerCase());
    
    if (!emailExists) {
      Alert.alert(
        "Email chưa đăng ký",
        "Vui lòng sử dụng một trong các email đã đăng ký:",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      setLoading(true);
      
      // Gửi email reset password
      await sendPasswordResetEmail(auth, email);
      
      Alert.alert(
        "✅ Thành công",
        `Email đặt lại mật khẩu đã được gửi đến: ${email}`,
        [
          { 
            text: "Đi đến Reset Password", 
            onPress: () => {
              // Sử dụng cách đơn giản nhất
              router.push("/(auth)/reset-password");
            }
          },
          { text: "Quay lại", onPress: () => router.back() }
        ]
      );
      
    } catch (error: any) {
      console.error("Forgot password error:", error);
      
      let errorMessage = "Đã xảy ra lỗi. Vui lòng thử lại.";
      
      switch (error.code) {
        case "auth/user-not-found":
          errorMessage = "Email này chưa được đăng ký.";
          break;
        case "auth/invalid-email":
          errorMessage = "Email không hợp lệ.";
          break;
      }
      
      Alert.alert("❌ Lỗi", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>🔐 Quên mật khẩu</Text>
        
        <ScrollView horizontal style={styles.emailList}>
          {REGISTERED_EMAILS.map((registeredEmail) => (
            <TouchableOpacity
              key={registeredEmail}
              onPress={() => setEmail(registeredEmail)}
              style={[
                styles.emailButton,
                email === registeredEmail && styles.emailButtonActive
              ]}
            >
              <Text style={[
                styles.emailText,
                email === registeredEmail && styles.emailTextActive
              ]}>
                {registeredEmail}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TextInput
          placeholder="Nhập email"
          placeholderTextColor="#94a3b8"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        <TouchableOpacity
          onPress={handleSendResetEmail}
          disabled={loading}
          style={[styles.button, loading && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
            {loading ? "Đang gửi..." : "Gửi link reset"}
          </Text>
        </TouchableOpacity>

        {/* Nút đến thẳng reset password */}
        <TouchableOpacity
          onPress={() => router.push("/(auth)/reset-password")}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>
            Đến trang Reset Password
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#020617",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#38bdf8",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#38bdf8",
    textAlign: "center",
    marginBottom: 20,
  },
  emailList: {
    marginBottom: 20,
  },
  emailButton: {
    padding: 12,
    backgroundColor: "#1e293b",
    borderRadius: 8,
    marginRight: 10,
  },
  emailButtonActive: {
    backgroundColor: "#38bdf8",
  },
  emailText: {
    color: "#cbd5e1",
  },
  emailTextActive: {
    color: "#020617",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    padding: 14,
    color: "white",
    marginBottom: 20,
    backgroundColor: "#1e293b",
  },
  button: {
    backgroundColor: "#38bdf8",
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#020617",
    fontWeight: "bold",
    textAlign: "center",
  },
  secondaryButton: {
    backgroundColor: "#334155",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: "#cbd5e1",
    textAlign: "center",
  },
  backButton: {
    padding: 12,
  },
  backButtonText: {
    color: "#94a3b8",
    textAlign: "center",
  },
});