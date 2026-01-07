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
}

/* ================= SCREEN ================= */
export default function CartScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---------- AUTH LISTENER ---------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  /* ---------- REDIRECT (SAFE FOR WEB) ---------- */
  useEffect(() => {
    if (authReady && !user) {
      router.replace("/(auth)/login");
    }
  }, [authReady, user]);

  /* ---------- REALTIME CART ---------- */
  useEffect(() => {
    if (!authReady || !user) return;

    const ref = collection(db, "carts", user.uid, "items");
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CartItem, "id">),
      }));
      setItems(data);
      setLoading(false);
    });

    return unsub;
  }, [authReady, user]);

  /* ---------- UPDATE QTY ---------- */
  const updateQty = async (item: CartItem, change: number) => {
    if (!user) return;

    const ref = doc(db, "carts", user.uid, "items", item.id);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;

      const qty = snap.data().quantity;

      if (qty === 1 && change === -1) {
        tx.delete(ref);
        return;
      }

      const newQty = qty + change;
      if (newQty < 1) return;

      tx.update(ref, { quantity: newQty });
    });
  };

  /* ---------- REMOVE ITEM ---------- */
  const removeItem = async (id: string) => {
    if (!user) return;

    Alert.alert("Xóa sản phẩm?", "Bạn chắc chắn muốn xóa?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(doc(db, "carts", user.uid, "items", id));
        },
      },
    ]);
  };

  /* ---------- TOTAL ---------- */
  const total = items.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  /* ================= UI ================= */

  // ⛔ BẮT BUỘC – KHÔNG return null (fix #418)
  if (!authReady || loading) {
    return (
      <View style={styles.center}>
        <Text>Đang tải giỏ hàng...</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text>🛒 Giỏ hàng trống</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {items.map((item) => (
        <View key={item.id} style={styles.item}>
          <ThemedText type="defaultSemiBold">{item.name}</ThemedText>

          <Text style={styles.price}>
            {item.price.toLocaleString("vi-VN")}đ
          </Text>

          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateQty(item, -1)}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>

            <Text style={styles.qty}>{item.quantity}</Text>

            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateQty(item, 1)}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => removeItem(item.id)}
            >
              <Text style={styles.removeText}>Xóa</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <View style={styles.totalBox}>
        <Text style={styles.totalText}>
          Tổng: {total.toLocaleString("vi-VN")}đ
        </Text>
      </View>
    </ScrollView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  item: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
  },

  price: {
    color: "#1a73e8",
    marginVertical: 6,
    fontWeight: "600",
  },

  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  qtyBtn: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },

  qtyBtnText: { fontSize: 18, fontWeight: "600" },
  qty: { marginHorizontal: 12, fontSize: 16 },

  removeBtn: {
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#fee2e2",
  },

  removeText: { color: "#dc2626", fontWeight: "600" },

  totalBox: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
  },

  totalText: { fontSize: 18, fontWeight: "bold" },
});
