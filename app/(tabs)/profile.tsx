// app/(tabs)/profile.tsx
import { router } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "../../components/themed-text";
import { auth, db } from "../constants/firebase";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userProducts, setUserProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  /* ---------- AUTH ---------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);

      if (u) {
        await loadUserProducts(u.uid);
      } else {
        setUserProducts([]);
      }
    });

    return unsub;
  }, []);

  /* ---------- FETCH USER PRODUCTS ---------- */
  const loadUserProducts = async (uid: string) => {
    setProductsLoading(true);
    try {
      const q = query(collection(db, "products"), where("ownerId", "==", uid));
      const snapshot = await getDocs(q);
      const products: Product[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        price: doc.data().price,
        category: doc.data().category,
      }));
      setUserProducts(products);
    } catch (error) {
      console.error("Lỗi tải sản phẩm:", error);
      Alert.alert("Lỗi", "Không thể tải sản phẩm của bạn");
    } finally {
      setProductsLoading(false);
    }
  };

  /* ---------- LOGOUT ---------- */
  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert("Thành công", "Đã đăng xuất");
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
      Alert.alert("Lỗi", "Không thể đăng xuất");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ThemedText>Đang tải...</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <ThemedText style={styles.avatarText}>
              {user ? user.email?.charAt(0).toUpperCase() : "?"}
            </ThemedText>
          </View>
        </View>

        <ThemedText type="title" style={styles.name}>
          {user ? user.email : "Khách"}
        </ThemedText>
        <ThemedText style={styles.role}>
          {user ? "Người dùng đã xác thực" : "Vui lòng đăng nhập"}
        </ThemedText>
      </View>

      {/* MENU TÀI KHOẢN */}
      <View style={styles.menuSection}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Tài khoản
        </ThemedText>

        {!user ? (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(auth)/login")}
          >
            <ThemedText style={styles.menuText}>Đăng nhập / Đăng ký</ThemedText>
          </TouchableOpacity>
        ) : (
          <>
            {/* Thêm sản phẩm mới */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push("/(admin)/add-products")}
            >
              <ThemedText style={styles.menuText}>📦 Thêm sản phẩm mới</ThemedText>
            </TouchableOpacity>

            {/* Danh sách sản phẩm của user */}
            {productsLoading ? (
              <ActivityIndicator style={{ marginVertical: 10 }} />
            ) : (
              userProducts.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.menuItem}
                  onPress={() =>
                    router.push({
                      pathname: './(admin)/edit-product/[id]',
                      params: { id: p.id },
                    })
                  }
                >
                  <ThemedText style={styles.menuText}>
                    ✏️ Chỉnh sửa: {p.name}
                  </ThemedText>
                </TouchableOpacity>
              ))
            )}

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                Alert.alert("Thông báo", "Tính năng đang phát triển")
              }
            >
              <ThemedText style={styles.menuText}>📋 Xem sản phẩm đã thêm</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() =>
                Alert.alert("Thông báo", "Tính năng đang phát triển")
              }
            >
              <ThemedText style={styles.menuText}>⚙️ Cài đặt tài khoản</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.logoutButton]}
              onPress={handleLogout}
            >
              <ThemedText style={[styles.menuText, styles.logoutText]}>
                🚪 Đăng xuất
              </ThemedText>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* MENU ỨNG DỤNG */}
      <View style={styles.menuSection}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Ứng dụng
        </ThemedText>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() =>
            Alert.alert("Thông tin", "Ứng dụng bán Figure v1.0")
          }
        >
          <ThemedText style={styles.menuText}>ℹ️ Giới thiệu</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() =>
            Alert.alert("Liên hệ", "Email: support@figureapp.com")
          }
        >
          <ThemedText style={styles.menuText}>📞 Liên hệ hỗ trợ</ThemedText>
        </TouchableOpacity>
      </View>

      {user && (
        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            Đăng nhập lần cuối: Hôm nay
          </ThemedText>
        </View>
      )}
    </ScrollView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: "#00aaff",
    padding: 30,
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  avatarContainer: { marginBottom: 15 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "white",
  },
  avatarText: { fontSize: 32, fontWeight: "bold", color: "white" },
  name: { color: "white", fontSize: 20, marginBottom: 5 },
  role: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
  menuSection: {
    backgroundColor: "white",
    margin: 15,
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: { fontSize: 16, marginBottom: 15, color: "#333" },
  menuItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  menuText: { fontSize: 16, color: "#333" },
  logoutButton: { borderBottomWidth: 0, marginTop: 10 },
  logoutText: { color: "#ff4444", fontWeight: "600" },
  footer: { padding: 20, alignItems: "center" },
  footerText: { color: "#888", fontSize: 12 },
});
