import { router } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "../../components/themed-text";
import { auth, db } from "../constants/firebase";

/* ================= TYPE ================= */
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

/* ================= SCREEN ================= */
export default function CartScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  /* ---------- AUTH LISTENER ---------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  /* ---------- REDIRECT ---------- */
  useEffect(() => {
    if (authReady && !user) {
      router.replace("/(auth)/login");
    }
  }, [authReady, user]);

  /* ---------- REALTIME CART ---------- */
  useEffect(() => {
    if (!authReady || !user) return;

    const ref = collection(db, "carts", user.uid, "items");
    const unsub = onSnapshot(ref, 
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CartItem, "id">),
        }));
        setItems(data);
        setLoading(false);
      },
      (error) => {
        console.error("Lỗi tải giỏ hàng:", error);
        Alert.alert("Lỗi", "Không thể tải giỏ hàng");
        setLoading(false);
      }
    );

    return unsub;
  }, [authReady, user]);

  /* ---------- UPDATE QTY ---------- */
  const updateQty = async (item: CartItem, change: number) => {
    if (!user) return;

    setUpdatingItems(prev => new Set(prev).add(item.id));

    try {
      const ref = doc(db, "carts", user.uid, "items", item.id);

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) return;

        const currentQty = snap.data().quantity;
        const newQty = currentQty + change;

        if (newQty < 1) {
          // Nếu số lượng mới < 1, xóa sản phẩm khỏi giỏ hàng
          tx.delete(ref);
          return;
        }

        // Cập nhật số lượng mới
        tx.update(ref, { quantity: newQty });
      });
    } catch (error) {
      console.error("Lỗi cập nhật số lượng:", error);
      Alert.alert("Lỗi", "Không thể cập nhật số lượng");
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  /* ---------- REMOVE ITEM (XÓA NGAY LẬP TỨC) ---------- */
  const removeItem = async (id: string) => {
    if (!user) return;

    Alert.alert(
      "Xóa sản phẩm", 
      "Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "carts", user.uid, "items", id));
            } catch (error) {
              console.error("Lỗi xóa sản phẩm:", error);
              Alert.alert("Lỗi", "Không thể xóa sản phẩm");
            }
          },
        },
      ]
    );
  };

  /* ---------- CHECKOUT ---------- */
  const handleCheckout = () => {
    if (items.length === 0) {
      Alert.alert("Giỏ hàng trống", "Vui lòng thêm sản phẩm vào giỏ hàng");
      return;
    }

    setCheckoutLoading(true);
    
    // ✅ ĐIỀU HƯỚNG ĐẾN CHECKOUT TRONG TABS
    router.push("/(tabs)/checkout");
    
    setTimeout(() => setCheckoutLoading(false), 500);
  };

  /* ---------- TOTAL ---------- */
  const total = items.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  /* ================= UI ================= */
  if (!authReady || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={styles.loadingText}>Đang tải giỏ hàng...</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>🛒 Giỏ hàng trống</Text>
        <TouchableOpacity
          style={styles.shopButton}
          onPress={() => router.navigate("/(tabs)")}
        >
          <Text style={styles.shopButtonText}>Mua sắm ngay</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Giỏ hàng của bạn</Text>
      
      {items.map((item) => {
        const isUpdating = updatingItems.has(item.id);
        const isMinusDisabled = item.quantity <= 1;

        return (
          <View key={item.id} style={styles.item}>
            <View style={styles.itemHeader}>
              <ThemedText type="defaultSemiBold" style={styles.itemName}>
                {item.name}
              </ThemedText>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeItem(item.id)}
                disabled={isUpdating}
                activeOpacity={0.6}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <Text style={styles.removeText}>✕</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.price}>
              {item.price.toLocaleString("vi-VN")}đ
            </Text>

            <View style={styles.qtyRow}>
              {/* Nút trừ (-) */}
              <TouchableOpacity
                style={[styles.qtyBtn, isMinusDisabled && styles.qtyBtnDisabled]}
                onPress={() => updateQty(item, -1)}
                disabled={isUpdating || isMinusDisabled}
                activeOpacity={0.6}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#666" />
                ) : (
                  <Text style={[styles.qtyBtnText, isMinusDisabled && styles.disabledBtn]}>−</Text>
                )}
              </TouchableOpacity>

              {/* Số lượng */}
              <Text style={styles.qty}>
                {isUpdating ? "..." : item.quantity}
              </Text>

              {/* Nút cộng (+) */}
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => updateQty(item, 1)}
                disabled={isUpdating}
                activeOpacity={0.6}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#666" />
                ) : (
                  <Text style={styles.qtyBtnText}>+</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.itemTotal}>
                {(item.price * item.quantity).toLocaleString("vi-VN")}đ
              </Text>
            </View>

            {/* Hiển thị thông báo khi số lượng = 1 */}
            {item.quantity === 1 && !isUpdating && (
              <Text style={styles.warningText}>
                ⚠️ Nhấn trừ lần nữa để xóa sản phẩm
              </Text>
            )}
          </View>
        );
      })}

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tạm tính</Text>
          <Text style={styles.summaryValue}>{total.toLocaleString("vi-VN")}đ</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
          <Text style={styles.summaryValue}>30.000đ</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tổng cộng</Text>
          <Text style={styles.totalValue}>{(total + 30000).toLocaleString("vi-VN")}đ</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.checkoutButton}
        onPress={handleCheckout}
        disabled={checkoutLoading}
        activeOpacity={0.8}
      >
        {checkoutLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.checkoutText}>TIẾN HÀNH THANH TOÁN</Text>
            <Text style={styles.checkoutSubtext}>{(total + 30000).toLocaleString("vi-VN")}đ</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.continueButton}
        onPress={() => router.back()}
        activeOpacity={0.6}
      >
        <Text style={styles.continueText}>← Tiếp tục mua sắm</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  emptyText: {
    fontSize: 20,
    color: "#666",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#1a1a1a",
  },
  item: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    flex: 1,
    marginRight: 12,
  },
  price: {
    color: "#1a73e8",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  qtyBtnDisabled: {
    backgroundColor: "#f5f5f5",
    borderColor: "#e0e0e0",
  },
  qtyBtnText: { 
    fontSize: 20, 
    fontWeight: "600",
    color: "#333",
  },
  disabledBtn: {
    color: "#ccc",
  },
  qty: { 
    fontSize: 16, 
    fontWeight: "600",
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: "center",
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#10b981",
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
  },
  removeText: { 
    color: "#dc2626", 
    fontSize: 16,
    fontWeight: "bold",
  },
  warningText: {
    fontSize: 12,
    color: "#f59e0b",
    marginTop: 8,
    fontStyle: "italic",
  },
  summary: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: "#666",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  totalValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1a73e8",
  },
  checkoutButton: {
    backgroundColor: "#10b981",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  checkoutSubtext: {
    color: "#fff",
    fontSize: 14,
    opacity: 0.9,
  },
  continueButton: {
    padding: 16,
    alignItems: "center",
    marginBottom: 32,
  },
  continueText: {
    color: "#6b7280",
    fontSize: 16,
  },
  shopButton: {
    backgroundColor: "#1a73e8",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});