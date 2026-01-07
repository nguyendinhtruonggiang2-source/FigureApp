import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "../../components/themed-text";

import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../constants/firebase";

/* ================= TYPE ================= */
interface Product {
  id: string;
  name: string;
  price: any;
  category: string;
  image?: string;
}

/* ================= PRICE OPTIONS ================= */
const PRICE_OPTIONS = [
  { label: "Tất cả", min: 0, max: Infinity },
  { label: "Dưới 200.000đ", min: 0, max: 200000 },
  { label: "200.000đ – 500.000đ", min: 200000, max: 500000 },
  { label: "500.000đ – 1.000.000đ", min: 500000, max: 1000000 },
  { label: "Trên 1.000.000đ", min: 1000000, max: Infinity },
];

/* ================= SCREEN ================= */
export default function HomeScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // 🔍 FILTER
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  // 💸 PRICE FILTER
  const [priceRange, setPriceRange] = useState(PRICE_OPTIONS[0]);
  const [showPriceFilter, setShowPriceFilter] = useState(false);

  // ❤️ FAVORITES
  const [favorites, setFavorites] = useState<string[]>([]);

  /* ---------- AUTH ---------- */
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      setUserId(user?.uid ?? null);
    });
  }, []);

  /* ---------- FETCH PRODUCTS ---------- */
  useEffect(() => {
    const ref = collection(db, "products");
    return onSnapshot(ref, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Product[];
      setProducts(data);
      setLoading(false);
    });
  }, []);

  /* ---------- FETCH FAVORITES ---------- */
  useEffect(() => {
    if (!userId) return;
    const ref = collection(db, "favorites", userId, "items");
    return onSnapshot(ref, (snap) => {
      setFavorites(snap.docs.map((d) => d.id));
    });
  }, [userId]);

  /* ---------- CATEGORY ---------- */
  const categories = useMemo(
    () => ["all", ...new Set(products.map((p) => p.category))],
    [products]
  );

  /* ---------- FILTER LOGIC ---------- */
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const price = Number(p.price);
      return (
        p.name.toLowerCase().includes(search.toLowerCase()) &&
        (category === "all" || p.category === category) &&
        price >= priceRange.min &&
        price <= priceRange.max
      );
    });
  }, [products, search, category, priceRange]);

  /* ---------- ADD TO CART ---------- */
  const addToCart = async (product: Product) => {
    if (!userId) {
      Alert.alert("Cần đăng nhập");
      router.push("/(auth)/login");
      return;
    }

    const ref = doc(db, "carts", userId, "items", product.id);
    const snap = await getDoc(ref);

    await setDoc(
      ref,
      snap.exists()
        ? { quantity: (snap.data().quantity || 1) + 1 }
        : { ...product, quantity: 1 },
      { merge: true }
    );

    Alert.alert("🛒 Đã thêm vào giỏ");
  };

  /* ---------- FAVORITE ---------- */
  const toggleFavorite = async (productId: string) => {
    if (!userId) return;
    const ref = doc(db, "favorites", userId, "items", productId);
    favorites.includes(productId)
      ? await deleteDoc(ref)
      : await setDoc(ref, { createdAt: Date.now() });
  };

  /* ---------- LOGOUT ---------- */
  const logout = async () => {
    await signOut(auth);
    router.replace("/(auth)/login");
  };

  /* ================= UI ================= */
  return (
    <View style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <ThemedText type="title">Figure Shop</ThemedText>
          {isLoggedIn && (
            <TouchableOpacity onPress={logout}>
              <ThemedText style={{ color: "red" }}>Đăng xuất</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* SEARCH */}
        <TextInput
          placeholder="🔍 Tìm sản phẩm"
          style={styles.input}
          value={search}
          onChangeText={setSearch}
        />

        {/* CATEGORY */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, category === c && styles.chipActive]}
              onPress={() => setCategory(c)}
            >
              <ThemedText>{c}</ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* PRICE FILTER */}
        <TouchableOpacity
          style={styles.priceFilterBtn}
          onPress={() => setShowPriceFilter(true)}
        >
          <ThemedText>💸 {priceRange.label}</ThemedText>
        </TouchableOpacity>

        {/* PRODUCT LIST */}
        {loading ? (
          <ActivityIndicator size="large" />
        ) : (
          <View style={styles.grid}>
            {filteredProducts.map((item) => (
              <View key={item.id} style={styles.card}>
                {/* IMAGE */}
                <View style={styles.imageBox}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.image} />
                  ) : (
                    <ThemedText style={{ fontSize: 32 }}>
                      {item.category?.charAt(0)}
                    </ThemedText>
                  )}
                </View>

                <ThemedText style={styles.name}>{item.name}</ThemedText>

                <ThemedText style={styles.price}>
                  {Number(item.price).toLocaleString("vi-VN")}đ
                </ThemedText>

                {/* FAVORITE */}
                <TouchableOpacity onPress={() => toggleFavorite(item.id)}>
                  <ThemedText style={{ fontSize: 18 }}>
                    {favorites.includes(item.id) ? "❤️" : "🤍"}
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.detailBtn}
                  onPress={() => router.push(`/product/${item.id}`)}
                >
                  <ThemedText>Xem chi tiết</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cartBtn}
                  onPress={() => addToCart(item)}
                >
                  <ThemedText style={styles.cartText}>
                    🛒 Thêm vào giỏ
                  </ThemedText>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* PRICE FILTER POPOVER */}
      {showPriceFilter && (
        <View style={styles.overlay}>
          <View style={styles.popover}>
            {PRICE_OPTIONS.map((p) => (
              <TouchableOpacity
                key={p.label}
                style={styles.priceOption}
                onPress={() => {
                  setPriceRange(p);
                  setShowPriceFilter(false);
                }}
              >
                <ThemedText>{p.label}</ThemedText>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowPriceFilter(false)}>
              <ThemedText style={{ color: "red", textAlign: "center" }}>
                Đóng
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: "#f8f9fa" },
  container: { padding: 16 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 20,
    marginRight: 8,
  },

  chipActive: { backgroundColor: "#bfdbfe" },

  priceFilterBtn: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: "center",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  card: {
    width: "48%",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },

  imageBox: {
    height: 120,
    backgroundColor: "#eee",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  image: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },

  name: { fontWeight: "600" },
  price: { color: "#1a73e8", fontWeight: "700" },

  detailBtn: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 6,
    borderRadius: 6,
    alignItems: "center",
  },

  cartBtn: {
    marginTop: 6,
    backgroundColor: "#1a73e8",
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
  },

  cartText: { color: "white", fontWeight: "600" },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },

  popover: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
  },

  priceOption: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});
