// app/(admin)/edit-product.tsx → ĐỔI TÊN THÀNH profile.tsx HOẶC user-profile.tsx
import { router } from "expo-router";
import { signOut, updateProfile } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { auth } from "../constants/firebase";

export default function UserProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // Form fields - chỉ còn tên hiển thị
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setDisplayName(currentUser.displayName || "");
        
        // Lấy thêm thông tin metadata
        const metadata = currentUser.metadata;
        console.log("User metadata:", metadata);
      } else {
        // Chưa đăng nhập, chuyển về login
        router.replace("/(auth)/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateProfile = async () => {
    if (!user) return;

    try {
      setSaving(true);
      
      // Chỉ cập nhật displayName nếu có thay đổi
      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName });
        Alert.alert("✅ Thành công", "Đã cập nhật tên hiển thị");
        setEditMode(false);
        
        // Refresh user data
        const updatedUser = auth.currentUser;
        setUser(updatedUser);
      } else {
        Alert.alert("Thông báo", "Không có thay đổi nào để cập nhật");
        setEditMode(false);
      }
      
    } catch (error: any) {
      console.error("Update profile error:", error);
      
      let errorMessage = "Đã xảy ra lỗi. Vui lòng thử lại.";
      
      switch (error.code) {
        case "auth/requires-recent-login":
          errorMessage = "Vui lòng đăng nhập lại để cập nhật thông tin.";
          break;
        case "auth/email-already-in-use":
          errorMessage = "Email này đã được sử dụng.";
          break;
        case "auth/invalid-email":
          errorMessage = "Email không hợp lệ.";
          break;
      }
      
      Alert.alert("❌ Lỗi", errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Xác nhận đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất?",
      [
        {
          text: "Hủy",
          style: "cancel"
        },
        {
          text: "Đăng xuất",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
              Alert.alert("Thành công", "Đã đăng xuất thành công");
              router.replace("/(auth)/login");
            } catch (error) {
              Alert.alert("Lỗi", "Không thể đăng xuất");
            }
          }
        }
      ]
    );
  };

  const formatDate = (timestamp: string) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleDateString("vi-VN") + " " + date.toLocaleTimeString("vi-VN");
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Đang tải thông tin...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Không tìm thấy thông tin người dùng</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={styles.buttonText}>Đăng nhập</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>👤 Thông tin tài khoản</Text>
        
        {user.photoURL ? (
          <Image 
            source={{ uri: user.photoURL }} 
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
            </Text>
          </View>
        )}
        
        <Text style={styles.userName}>
          {user.displayName || "Chưa có tên hiển thị"}
        </Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>

      {editMode ? (
        // EDIT MODE - Chỉ chỉnh sửa tên hiển thị
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📝 Chỉnh sửa thông tin</Text>
          
          <Text style={styles.inputLabel}>Tên hiển thị</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập tên hiển thị"
            placeholderTextColor="#94a3b8"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={50}
          />
          
          <Text style={styles.inputNote}>
            * Tên hiển thị sẽ xuất hiện trong đơn hàng và thông tin cá nhân
          </Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleUpdateProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>💾 Lưu thay đổi</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setDisplayName(user.displayName || "");
                setEditMode(false);
              }}
              disabled={saving}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        // VIEW MODE - Hiển thị thông tin chi tiết
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📊 Thông tin chi tiết</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tên hiển thị:</Text>
            <Text style={styles.infoValue}>
              {user.displayName || "Chưa đặt tên"}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email đã xác minh:</Text>
            <Text style={[
              styles.infoValue,
              user.emailVerified ? styles.verified : styles.notVerified
            ]}>
              {user.emailVerified ? "✅ Đã xác minh" : "❌ Chưa xác minh"}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Số điện thoại:</Text>
            <Text style={styles.infoValue}>
              {user.phoneNumber || "Chưa cập nhật"}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User ID:</Text>
            <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="middle">
              {user.uid}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tài khoản tạo lúc:</Text>
            <Text style={styles.infoValue}>
              {user.metadata?.creationTime ? formatDate(user.metadata.creationTime) : "N/A"}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Đăng nhập lần cuối:</Text>
            <Text style={styles.infoValue}>
              {user.metadata?.lastSignInTime ? formatDate(user.metadata.lastSignInTime) : "N/A"}
            </Text>
          </View>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.editButton]}
              onPress={() => setEditMode(true)}
            >
              <Text style={styles.buttonText}>✏️ Chỉnh sửa tên</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.logoutButton]}
              onPress={handleLogout}
            >
              <Text style={styles.buttonText}>🚪 Đăng xuất</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.securityNote}>
            <Text style={styles.securityNoteText}>
              🔒 Lưu ý: Để đảm bảo an toàn, bạn không thể thay đổi email hoặc mật khẩu tại đây.
              Vui lòng sử dụng tính năng "Quên mật khẩu" nếu cần thay đổi.
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
    padding: 20,
  },
  header: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: "#020617",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#38bdf8",
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: "#38bdf8",
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#38bdf8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 3,
    borderColor: "#38bdf8",
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#020617",
  },
  userName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#e2e8f0",
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: "#94a3b8",
  },
  card: {
    backgroundColor: "#020617",
    margin: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#38bdf8",
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  infoLabel: {
    fontSize: 15,
    color: "#94a3b8",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 15,
    color: "#e2e8f0",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
    marginLeft: 10,
  },
  verified: {
    color: "#10b981",
  },
  notVerified: {
    color: "#ef4444",
  },
  inputLabel: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 12,
  },
  inputNote: {
    color: "#94a3b8",
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 8,
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    padding: 14,
    color: "white",
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  editButton: {
    backgroundColor: "#38bdf8",
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: "#10b981",
    marginRight: 8,
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#475569",
    marginLeft: 8,
  },
  logoutButton: {
    backgroundColor: "#ef4444",
    marginLeft: 8,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  cancelButtonText: {
    color: "#94a3b8",
  },
  loadingText: {
    color: "#94a3b8",
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  securityNote: {
    marginTop: 24,
    padding: 12,
    backgroundColor: "#1e293b",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#38bdf8",
  },
  securityNoteText: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 18,
  },
});