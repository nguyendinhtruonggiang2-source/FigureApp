import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { ThemedText } from "../../components/themed-text";
import { auth, db } from "../constants/firebase";

/* ================= TYPE ================= */
interface Product {
  id: string;
  name: string;
  price: any;
  category: string;
  image?: string;
  description?: string;
}

/* ================= SCREEN ================= */
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [suggests, setSuggests] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  /* ---------- AUTH ---------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
    });
    return unsub;
  }, []);

  /* ---------- FETCH PRODUCT ---------- */
  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      const ref = doc(db, "products", id);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setProduct({ id: snap.id, ...(snap.data() as any) });
      }

      setLoading(false);
    };

    fetchProduct();
  }, [id]);

  /* ---------- FETCH RANDOM SUGGEST ---------- */
  useEffect(() => {
    if (!id) return;

    const fetchSuggests = async () => {
      const snap = await getDocs(collection(db, "products"));

      let list: Product[] = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .filter((p) => p.id !== id);

      // random
      list = list.sort(() => 0.5 - Math.random()).slice(0, 4);

      setSuggests(list);
    };

    fetchSuggests();
  }, [id]);

  /* ---------- ADD TO CART ---------- */
  const addToCart = async () => {
    if (!userId) {
      Alert.alert("Yêu cầu đăng nhập", "Vui lòng đăng nhập để mua hàng");
      router.push("/(auth)/login");
      return;
    }

    if (!product) return;

    const itemRef = doc(db, "carts", userId, "items", product.id);
    const snap = await getDoc(itemRef);

    if (snap.exists()) {
      await setDoc(
        itemRef,
        { quantity: (snap.data().quantity || 1) + 1 },
        { merge: true }
      );
    } else {
      await setDoc(itemRef, {
        productId: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
        quantity: 1,
      });
    }

    Alert.alert("🛒 Thành công", "Đã thêm vào giỏ hàng");
  };

  /* ================= UI ================= */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <ThemedText>Không tìm thấy sản phẩm</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* IMAGE */}
      <View style={styles.imageBox}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.image} />
        ) : (
          <ThemedText style={{ fontSize: 48 }}>
            {product.category?.charAt(0)}
          </ThemedText>
        )}
      </View>

      {/* INFO */}
      <ThemedText type="title" style={styles.name}>
        {product.name}
      </ThemedText>

      <ThemedText style={styles.price}>
        {formatPrice(product.price)}
      </ThemedText>

      <ThemedText style={styles.category}>
        Danh mục: {product.category}
      </ThemedText>

      {product.description && (
        <ThemedText style={styles.desc}>
          {product.description}
        </ThemedText>
      )}

      {/* ACTION */}
      <TouchableOpacity style={styles.cartBtn} onPress={addToCart}>
        <ThemedText style={styles.cartText}>🛒 Thêm vào giỏ hàng</ThemedText>
      </TouchableOpacity>

      {/* ===== SẢN PHẨM GỢI Ý ===== */}
      {suggests.length > 0 && (
        <View style={styles.suggestBox}>
          <ThemedText type="defaultSemiBold" style={styles.suggestTitle}>
            🔥 Sản phẩm gợi ý
          </ThemedText>

          <View style={styles.suggestList}>
            {suggests.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.suggestItem}
                onPress={() =>
                  router.push(`/product/${item.id}`)
                }
              >
                <View style={styles.suggestImg}>
                  {item.image ? (
                    <Image
                      source={{ uri: item.image }}
                      style={styles.suggestImg}
                    />
                  ) : (
                    <ThemedText>{item.category?.charAt(0)}</ThemedText>
                  )}
                </View>

                <ThemedText numberOfLines={2}>
                  {item.name}
                </ThemedText>

                <ThemedText style={{ color: "#1a73e8" }}>
                  {formatPrice(item.price)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <ThemedText>← Quay lại</ThemedText>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ================= HELPERS ================= */
function formatPrice(price: any) {
  const n = Number(String(price).replace(/\D/g, ""));
  return isNaN(n) ? price : n.toLocaleString("vi-VN") + "đ";
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  imageBox: {
    height: 260,
    backgroundColor: "#eee",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  image: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },

  name: { fontSize: 22, marginBottom: 8 },
  price: { fontSize: 20, color: "#1a73e8", fontWeight: "700" },
  category: { marginVertical: 8, color: "#555" },
  desc: { marginTop: 12, lineHeight: 20 },

  cartBtn: {
    marginTop: 24,
    backgroundColor: "#1a73e8",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  cartText: { color: "white", fontWeight: "700" },

  /* ===== SUGGEST ===== */
  suggestBox: { marginTop: 32 },
  suggestTitle: { fontSize: 16, marginBottom: 12 },
  suggestList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  suggestItem: {
    width: "48%",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 12,
    elevation: 2,
  },
  suggestImg: {
    height: 100,
    borderRadius: 8,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  backBtn: {
    marginTop: 24,
    alignItems: "center",
  },
});
