// app/(tabs)/index.tsx
import { ThemedText } from "@/components/themed-text";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  onSnapshot
} from "firebase/firestore";
import { auth, db } from "../constants/firebase";

// Định nghĩa kiểu dữ liệu Product
interface Product {
  id: string;
  name: string;
  price: string;
  category: string;
  image?: string;
}

export default function HomeScreen() {
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // ✅ Theo dõi trạng thái đăng nhập Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      setUserEmail(user?.email || "");
    });

    return unsubscribe;
  }, []);

  // ✅ Lấy dữ liệu từ Firestore với real-time updates
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const productsRef = collection(db, "products");
        
        // Dùng onSnapshot để lắng nghe real-time updates
        const unsubscribe = onSnapshot(productsRef, (snapshot) => {
          const productsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Product[];
          
          // Format giá tiền
          const formattedProducts = productsData.map(product => ({
            ...product,
            price: formatPrice(product.price)
          }));
          
          setProducts(formattedProducts);
          setLoading(false);
        });

        return unsubscribe; // Cleanup khi component unmount
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu:", error);
        Alert.alert("Lỗi", "Không thể tải danh sách sản phẩm");
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

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

  // Lọc sản phẩm theo category
  const filteredProducts =
    selectedCategory === "Tất cả"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  // ✅ Hàm điều hướng đến trang chi tiết sản phẩm
  const navigateToProductDetail = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  return (
    <View style={styles.background}>
      <ScrollView style={styles.overlay} showsVerticalScrollIndicator={false}>

        {/* ===== HEADER ===== */}
        <View style={styles.header}>
          {/* MENU BUTTON (3 gạch) */}
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={styles.menuButton}
          >
            <IconSymbol size={28} name="line.3.horizontal" color="#1a73e8" />
          </TouchableOpacity>

          {/* TITLE */}
          <ThemedText type="title" style={styles.title}>
            Mô Hình Robot & Figure MiHoYo
          </ThemedText>

          {/* LOGIN/LOGOUT BUTTON */}
          {!isLoggedIn ? (
            <TouchableOpacity
              onPress={() => router.push("/(auth)/login")}
              style={styles.loginButton}
            >
              <ThemedText style={styles.loginText}>Đăng nhập</ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleLogout}
              style={[styles.loginButton, { backgroundColor: "#e53935" }]}
            >
              <ThemedText style={[styles.loginText, { color: "white" }]}>
                Đăng xuất
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* ===== CATEGORIES ===== */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryContainer}
        >
          {CATEGORIES.map((cat, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.categoryItem,
                selectedCategory === cat && styles.categoryItemActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <ThemedText
                style={{
                  fontWeight: "600",
                  color: selectedCategory === cat ? "white" : "#333",
                }}
              >
                {cat}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ===== PRODUCT COUNTER ===== */}
        <ThemedText style={styles.counterText}>
          Hiển thị {filteredProducts.length} sản phẩm
          {selectedCategory !== "Tất cả" && ` trong "${selectedCategory}"`}
        </ThemedText>

        {/* ===== PRODUCT LIST ===== */}
        {loading ? (
          <ActivityIndicator size="large" color="#1a73e8" style={styles.loader} />
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>Không có sản phẩm nào</ThemedText>
            {isLoggedIn && (
              <TouchableOpacity
                onPress={() => router.push("/(admin)/add-products")}
                style={styles.emptyButton}
              >
                <ThemedText style={styles.emptyButtonText}>Thêm sản phẩm đầu tiên</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.productGrid}>
            {filteredProducts.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.productCard}
                // ✅ Thay Alert bằng navigation đến trang chi tiết
                onPress={() => navigateToProductDetail(item.id)}
                activeOpacity={0.7}
              >
                {/* Hình ảnh sản phẩm */}
                <View style={styles.imageContainer}>
                  {item.image ? (
                    <View style={styles.imageWrapper}>
                      {/* Cần import Image từ react-native nếu muốn hiển thị ảnh */}
                      <View style={styles.imagePlaceholder}>
                        <IconSymbol name="photo.fill" size={40} color="#5f6368" />
                        <ThemedText style={styles.imageHint}>Hình ảnh</ThemedText>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <ThemedText style={styles.placeholderText}>
                        {item.category.charAt(0)}
                      </ThemedText>
                    </View>
                  )}
                  <View style={styles.categoryBadge}>
                    <ThemedText style={styles.categoryBadgeText}>
                      {item.category}
                    </ThemedText>
                  </View>
                </View>
                
                {/* Thông tin sản phẩm */}
                <View style={styles.productInfo}>
                  <ThemedText type="defaultSemiBold" style={styles.productName} numberOfLines={2}>
                    {item.name}
                  </ThemedText>
                  <ThemedText type="subtitle" style={styles.price}>
                    {item.price}
                  </ThemedText>
                  
                  {/* Nút xem chi tiết */}
                  <TouchableOpacity 
                    style={styles.detailButton}
                    onPress={() => navigateToProductDetail(item.id)}
                  >
                    <ThemedText style={styles.detailButtonText}>
                      Xem chi tiết
                    </ThemedText>
                    <IconSymbol name="chevron.right" size={16} color="#1a73e8" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ===== FOOTER INFO ===== */}
        {!loading && (
          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              Tổng cộng: {products.length} sản phẩm
            </ThemedText>
            {!isLoggedIn && (
              <ThemedText style={styles.footerNote}>
                Đăng nhập để thêm sản phẩm mới
              </ThemedText>
            )}
          </View>
        )}

        {/* ===== MODAL MENU ===== */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={menuVisible}
          onRequestClose={() => setMenuVisible(false)}
        >
          <View style={styles.modalContainer}>
            {/* MENU CONTENT */}
            <View style={styles.menuContent}>
              {/* MENU HEADER */}
              <View style={styles.menuHeader}>
                <ThemedText type="title" style={styles.menuTitle}>Menu</ThemedText>
                <TouchableOpacity 
                  onPress={() => setMenuVisible(false)}
                  style={styles.closeButton}
                >
                  <IconSymbol size={24} name="xmark.circle.fill" color="white" />
                </TouchableOpacity>
              </View>

              {/* USER INFO (nếu đã đăng nhập) */}
              {isLoggedIn && (
                <View style={styles.userInfo}>
                  <View style={styles.menuAvatar}>
                    <ThemedText style={styles.menuAvatarText}>
                      {userEmail.charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                  <View style={styles.userDetails}>
                    <ThemedText style={styles.userEmail}>{userEmail}</ThemedText>
                    <ThemedText style={styles.userRole}>Người dùng</ThemedText>
                  </View>
                </View>
              )}

              {/* MENU ITEMS */}
              <View style={styles.menuItems}>
                {/* PROFILE */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    router.push("/(tabs)/profile");
                  }}
                >
                  <IconSymbol size={22} name="person.fill" color="#4285f4" />
                  <ThemedText style={styles.menuItemText}>Trang cá nhân</ThemedText>
                </TouchableOpacity>

                {/* THÊM SẢN PHẨM (chỉ hiện khi đăng nhập) */}
                {isLoggedIn && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuVisible(false);
                      router.push("/(admin)/add-products");
                    }}
                  >
                    <IconSymbol size={22} name="plus.circle.fill" color="#fbbc04" />
                    <ThemedText style={styles.menuItemText}>Thêm sản phẩm</ThemedText>
                  </TouchableOpacity>
                )}

                {/* CÀI ĐẶT */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    Alert.alert("Thông báo", "Tính năng đang phát triển");
                  }}
                >
                  <IconSymbol size={22} name="gearshape.fill" color="#34a853" />
                  <ThemedText style={styles.menuItemText}>Cài đặt</ThemedText>
                </TouchableOpacity>

                {/* GIỚI THIỆU */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    Alert.alert("Giới thiệu", "Ứng dụng bán Figure v1.0");
                  }}
                >
                  <IconSymbol size={22} name="info.circle.fill" color="#ea4335" />
                  <ThemedText style={styles.menuItemText}>Giới thiệu</ThemedText>
                </TouchableOpacity>

                {/* CHỈ HIỆN ĐĂNG NHẬP KHI CHƯA ĐĂNG NHẬP */}
                {!isLoggedIn && (
                  <TouchableOpacity
                    style={[styles.menuItem, styles.loginMenuItem]}
                    onPress={() => {
                      setMenuVisible(false);
                      router.push("/(auth)/login");
                    }}
                  >
                    <IconSymbol size={22} name="person.crop.circle" color="#4285f4" />
                    <ThemedText style={styles.menuItemText}>
                      Đăng nhập
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>

              {/* MENU FOOTER */}
              <View style={styles.menuFooter}>
                <ThemedText style={styles.versionText}>Figure App v1.0</ThemedText>
              </View>
            </View>

            {/* OVERLAY (click để đóng menu) */}
            <TouchableOpacity 
              style={styles.menuOverlay}
              activeOpacity={1}
              onPress={() => setMenuVisible(false)}
            />
          </View>
        </Modal>

      </ScrollView>
    </View>
  );
}

/* ------------------ CATEGORIES ------------------ */
const CATEGORIES = [
  "Tất cả",
  "Gundam",
  "Genshin",
  "Honkai",
  "Zenless",
  "Nendoroid",
];

/* ------------------ HELPER FUNCTION ------------------ */
// Hàm format giá tiền
function formatPrice(price: any): string {
  if (typeof price === 'number') {
    return price.toLocaleString('vi-VN') + 'đ';
  } else if (typeof price === 'string') {
    if (!price.includes('đ') && !price.includes('VND')) {
      const numPrice = parseFloat(price.replace(/[^0-9.-]+/g, ''));
      if (!isNaN(numPrice)) {
        return numPrice.toLocaleString('vi-VN') + 'đ';
      }
    }
  }
  return String(price);
}

/* ------------------ STYLE ------------------ */
const styles = StyleSheet.create({
  background: { 
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  overlay: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: "white",
  },
  // HEADER STYLES
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuButton: {
    padding: 8,
    backgroundColor: '#f1f3f4',
    borderRadius: 8,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    color: "#1a73e8",
    marginHorizontal: 10,
  },
  loginButton: {
    backgroundColor: "#1a73e8",
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    shadowColor: "#1a73e8",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  loginText: {
    color: "white",
    fontWeight: "600",
  },
  // CATEGORIES
  categoryContainer: { 
    marginTop: 15,
    marginBottom: 15,
  },
  categoryItem: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: "white",
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryItemActive: {
    backgroundColor: "#1a73e8",
    borderColor: '#1a73e8',
  },
  counterText: {
    textAlign: "center",
    color: "#5f6368",
    fontSize: 14,
    marginBottom: 15,
    fontWeight: '500',
  },
  loader: {
    marginTop: 40,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
  },
  emptyText: {
    textAlign: "center",
    color: "#5f6368",
    fontSize: 18,
    marginBottom: 20,
    fontWeight: '500',
  },
  emptyButton: {
    backgroundColor: "#1a73e8",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  emptyButtonText: {
    color: "white",
    fontWeight: "600",
  },
  // PRODUCT GRID
  productGrid: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  productCard: {
    width: "48%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    position: "relative",
    marginBottom: 10,
  },
  imageWrapper: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    overflow: "hidden",
  },
  imagePlaceholder: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    backgroundColor: "#f1f3f4",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  imageHint: {
    color: "#5f6368",
    fontSize: 12,
    marginTop: 8,
  },
  placeholderText: {
    color: "#5f6368",
    fontSize: 36,
    fontWeight: "bold",
  },
  categoryBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#1a73e8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: '600',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: "#202124",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    minHeight: 40,
  },
  price: {
    color: "#1a73e8",
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 8,
  },
  detailButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#f1f8ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d2e3fc",
  },
  detailButtonText: {
    color: "#1a73e8",
    fontSize: 12,
    fontWeight: "600",
  },
  footer: {
    marginTop: 20,
    marginBottom: 30,
    padding: 15,
    backgroundColor: "white",
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  footerText: {
    color: "#5f6368",
    fontSize: 14,
    marginBottom: 5,
    fontWeight: '500',
  },
  footerNote: {
    color: "#1a73e8",
    fontSize: 12,
    fontStyle: "italic",
  },
  // MODAL MENU STYLES
  modalContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  menuContent: {
    width: '75%',
    backgroundColor: '#ffffff',
    height: '100%',
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#1a73e8',
  },
  menuTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    padding: 5,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
    backgroundColor: '#f8f9fa',
  },
  menuAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4285f4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuAvatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 22,
  },
  userDetails: {
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
  },
  userRole: {
    fontSize: 14,
    color: '#5f6368',
    marginTop: 4,
  },
  menuItems: {
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  loginMenuItem: {
    borderBottomWidth: 0,
    marginTop: 10,
    backgroundColor: '#f1f8ff',
    marginHorizontal: 10,
    borderRadius: 8,
  },
  menuItemText: {
    fontSize: 16,
    color: '#202124',
    marginLeft: 15,
    flex: 1,
    fontWeight: '500',
  },
  menuFooter: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#9aa0a6',
  },
});