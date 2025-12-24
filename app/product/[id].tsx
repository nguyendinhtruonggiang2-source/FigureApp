// app/product/[id].tsx
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
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
import { ThemedText } from "../../components/themed-text";
import { IconSymbol } from "../../components/ui/icon-symbol";
import { db } from "../constants/firebase";

// Định nghĩa kiểu dữ liệu Product chi tiết
interface ProductDetail {
  id: string;
  name: string;
  price: string;
  category: string;
  image?: string;
  description?: string;
  stock?: number;
  createdAt?: any;
}

// Mock giỏ hàng - trong thực tế bạn nên dùng Context/Redux/AsyncStorage
let mockCart: any[] = [];

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  // ✅ Lấy chi tiết sản phẩm từ Firestore
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const productRef = doc(db, "products", id);
        const productSnap = await getDoc(productRef);
        
        if (productSnap.exists()) {
          const productData = productSnap.data();
          setProduct({
            id: productSnap.id,
            name: productData.name || "Không có tên",
            price: formatPrice(productData.price),
            category: productData.category || "Không có danh mục",
            image: productData.image || "",
            description: productData.description || "Không có mô tả",
            stock: productData.stock || 0,
            createdAt: productData.createdAt,
          });
        } else {
          Alert.alert("Lỗi", "Không tìm thấy sản phẩm");
          router.back();
        }
      } catch (error) {
        console.error("Lỗi khi lấy sản phẩm:", error);
        Alert.alert("Lỗi", "Không thể tải thông tin sản phẩm");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Hàm format giá tiền
  const formatPrice = (price: any): string => {
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
  };

  // Hàm thêm vào giỏ hàng với xác nhận
  const handleAddToCart = () => {
    if (!product) return;

    if (product.stock !== undefined && product.stock <= 0) {
      Alert.alert("Hết hàng", "Sản phẩm này hiện đang hết hàng");
      return;
    }

    // Tạo item giỏ hàng
    const cartItem = {
      id: product.id,
      name: product.name,
      price: parseFloat(product.price.replace(/[^0-9.-]+/g, '')) || 0,
      category: product.category,
      image: product.image || `https://via.placeholder.com/100x100/333/fff?text=${product.name.substring(0, 1)}`,
      quantity: quantity,
      stock: product.stock || 10,
    };

    // Thêm vào giỏ hàng (mock)
    const existingItemIndex = mockCart.findIndex(item => item.id === product.id);
    
    if (existingItemIndex >= 0) {
      // Nếu đã có trong giỏ, cập nhật số lượng
      const newQuantity = mockCart[existingItemIndex].quantity + quantity;
      const maxQuantity = Math.min(newQuantity, cartItem.stock);
      
      mockCart[existingItemIndex] = {
        ...mockCart[existingItemIndex],
        quantity: maxQuantity,
      };
      
      Alert.alert(
        "Cập nhật giỏ hàng",
        `Đã cập nhật ${product.name}\nSố lượng: ${maxQuantity}`,
        [
          { 
            text: "Xem giỏ hàng", 
            onPress: () => router.push("/(tabs)/explore") 
          },
          { text: "Tiếp tục mua sắm", style: "cancel" }
        ]
      );
    } else {
      // Nếu chưa có, thêm mới
      mockCart.push(cartItem);
      
      Alert.alert(
        "Thêm vào giỏ hàng thành công! ✅",
        `Đã thêm ${quantity} ${product.name} vào giỏ hàng\n\nTổng: ${calculateTotal()}`,
        [
          { 
            text: "Xem giỏ hàng", 
            onPress: () => router.push("/(tabs)/explore"),
            style: "default"
          },
          { 
            text: "Tiếp tục mua sắm", 
            style: "cancel",
            onPress: () => console.log("Continue shopping")
          }
        ]
      );
    }

    // Log để kiểm tra (trong thực tế, lưu vào AsyncStorage/Context)
    console.log("Giỏ hàng hiện tại:", mockCart);
    console.log("Số lượng sản phẩm trong giỏ:", mockCart.length);
    
    // Reset quantity về 1
    setQuantity(1);
  };

  // Hàm mua ngay (direct checkout)
  const handleBuyNow = () => {
    if (!product) return;

    if (product.stock !== undefined && product.stock <= 0) {
      Alert.alert("Hết hàng", "Sản phẩm này hiện đang hết hàng");
      return;
    }

    // Tạo item giỏ hàng tạm thời
    const tempCartItem = {
      id: product.id,
      name: product.name,
      price: parseFloat(product.price.replace(/[^0-9.-]+/g, '')) || 0,
      category: product.category,
      image: product.image || `https://via.placeholder.com/100x100/333/fff?text=${product.name.substring(0, 1)}`,
      quantity: quantity,
      stock: product.stock || 10,
    };

    // Lưu vào AsyncStorage hoặc state tạm thời cho checkout
    // Ở đây tôi sẽ mock bằng Alert
    Alert.alert(
      "Mua ngay",
      `Bạn muốn mua ${quantity} ${product.name}\nTổng tiền: ${calculateTotal()}\n\nSản phẩm sẽ được giao trong 3-5 ngày làm việc.`,
      [
        { 
          text: "Hủy", 
          style: "cancel" 
        },
        { 
          text: "Thanh toán", 
          onPress: () => {
            // Chuyển đến trang checkout với item này
            Alert.alert(
              "Thanh toán thành công!",
              `Cảm ơn bạn đã mua hàng!\n\nSản phẩm: ${product.name}\nSố lượng: ${quantity}\nTổng tiền: ${calculateTotal()}\n\nMã đơn hàng: #${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
              [{ text: "OK", onPress: () => router.push("/(tabs)/") }]
            );
          }
        }
      ]
    );
  };

  // Tính tổng tiền
  const calculateTotal = (): string => {
    if (!product) return "0đ";
    const priceNumber = parseFloat(product.price.replace(/[^0-9.-]+/g, ''));
    if (isNaN(priceNumber)) return product.price;
    const total = priceNumber * quantity;
    return total.toLocaleString('vi-VN') + 'đ';
  };

  // Hàm chuyển đến giỏ hàng
  const goToCart = () => {
    router.push("/(tabs)/explore");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <ThemedText style={styles.loadingText}>Đang tải sản phẩm...</ThemedText>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <IconSymbol size={64} name="exclamationmark.triangle.fill" color="#ea4335" />
        <ThemedText style={styles.errorText}>Không tìm thấy sản phẩm</ThemedText>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ThemedText style={styles.backButtonText}>Quay lại</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* HÌNH ẢNH SẢN PHẨM */}
      <View style={styles.imageContainer}>
        {product.image ? (
          <Image
            source={{ uri: product.image }}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <IconSymbol size={80} name="photo.fill" color="#5f6368" />
            <ThemedText style={styles.placeholderText}>Không có hình ảnh</ThemedText>
          </View>
        )}
      </View>

      {/* THÔNG TIN SẢN PHẨM */}
      <View style={styles.infoContainer}>
        {/* DANH MỤC */}
        <View style={styles.categoryBadge}>
          <ThemedText style={styles.categoryText}>{product.category}</ThemedText>
        </View>

        {/* TÊN SẢN PHẨM */}
        <ThemedText type="title" style={styles.productName}>
          {product.name}
        </ThemedText>

        {/* GIÁ TIỀN */}
        <View style={styles.priceContainer}>
          <ThemedText type="title" style={styles.price}>
            {product.price}
          </ThemedText>
          {product.stock !== undefined && product.stock > 0 ? (
            <View style={styles.stockBadge}>
              <ThemedText style={styles.stockText}>
                Còn {product.stock} sản phẩm
              </ThemedText>
            </View>
          ) : (
            <View style={[styles.stockBadge, styles.outOfStock]}>
              <ThemedText style={styles.outOfStockText}>
                Hết hàng
              </ThemedText>
            </View>
          )}
        </View>

        {/* MÔ TẢ */}
        <View style={styles.descriptionSection}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Mô tả sản phẩm
          </ThemedText>
          <ThemedText style={styles.description}>
            {product.description}
          </ThemedText>
        </View>

        {/* CHỌN SỐ LƯỢNG */}
        <View style={styles.quantitySection}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Số lượng
          </ThemedText>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              <IconSymbol size={20} name="minus" color={quantity <= 1 ? "#ccc" : "#1a73e8"} />
            </TouchableOpacity>
            
            <View style={styles.quantityDisplay}>
              <ThemedText style={styles.quantityText}>{quantity}</ThemedText>
            </View>
            
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => {
                if (product.stock !== undefined && quantity < product.stock) {
                  setQuantity(quantity + 1);
                }
              }}
              disabled={product.stock !== undefined && quantity >= product.stock}
            >
              <IconSymbol 
                size={20} 
                name="plus" 
                color={product.stock !== undefined && quantity >= product.stock ? "#ccc" : "#1a73e8"} 
              />
            </TouchableOpacity>
          </View>
          
          {/* Thông báo số lượng tối đa */}
          {product.stock !== undefined && product.stock > 0 && quantity >= product.stock && (
            <ThemedText style={styles.maxQuantityWarning}>
              ⚠️ Đã đạt số lượng tối đa ({product.stock})
            </ThemedText>
          )}
        </View>

        {/* TỔNG TIỀN */}
        <View style={styles.totalSection}>
          <ThemedText style={styles.totalLabel}>Tổng cộng:</ThemedText>
          <ThemedText type="title" style={styles.totalPrice}>
            {calculateTotal()}
          </ThemedText>
        </View>

        {/* NÚT HÀNH ĐỘNG */}
        <View style={styles.actionButtons}>
          {/* THÊM VÀO GIỎ HÀNG */}
          <TouchableOpacity
            style={[styles.actionButton, styles.cartButton]}
            onPress={handleAddToCart}
            disabled={product.stock !== undefined && product.stock <= 0}
          >
            <IconSymbol size={22} name="cart.fill" color="#1a73e8" />
            <ThemedText style={styles.cartButtonText}>
              Thêm vào giỏ hàng
            </ThemedText>
          </TouchableOpacity>

          {/* MUA NGAY */}
          <TouchableOpacity
            style={[styles.actionButton, styles.buyButton]}
            onPress={handleBuyNow}
            disabled={product.stock !== undefined && product.stock <= 0}
          >
            <IconSymbol size={22} name="creditcard.fill" color="white" />
            <ThemedText style={styles.buyButtonText}>
              Mua ngay
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* NÚT XEM GIỎ HÀNG NHANH */}
        <TouchableOpacity
          style={styles.viewCartButton}
          onPress={goToCart}
        >
          <IconSymbol size={18} name="cart" color="white" />
          <ThemedText style={styles.viewCartButtonText}>
            Xem giỏ hàng ({mockCart.length})
          </ThemedText>
          <IconSymbol size={16} name="chevron.right" color="white" />
        </TouchableOpacity>

        {/* THÔNG TIN BỔ SUNG */}
        <View style={styles.additionalInfo}>
          <View style={styles.infoRow}>
            <IconSymbol size={18} name="shippingbox.fill" color="#5f6368" />
            <ThemedText style={styles.infoText}>
              Miễn phí vận chuyển cho đơn hàng trên 500.000đ
            </ThemedText>
          </View>
          
          <View style={styles.infoRow}>
            <IconSymbol size={18} name="arrow.clockwise.circle.fill" color="#5f6368" />
            <ThemedText style={styles.infoText}>
              Đổi trả trong 7 ngày nếu có lỗi sản xuất
            </ThemedText>
          </View>
          
          <View style={styles.infoRow}>
            <IconSymbol size={18} name="shield.fill" color="#5f6368" />
            <ThemedText style={styles.infoText}>
              Bảo hành 12 tháng
            </ThemedText>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

/* ------------------ STYLE ------------------ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 16,
    color: "#5f6368",
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 32,
  },
  errorText: {
    marginTop: 20,
    fontSize: 18,
    color: "#5f6368",
    textAlign: "center",
  },
  backButton: {
    marginTop: 20,
    backgroundColor: "#1a73e8",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: "white",
    fontWeight: "600",
  },
  imageContainer: {
    width: "100%",
    height: 350,
    backgroundColor: "white",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f1f3f4",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    marginTop: 12,
    color: "#5f6368",
    fontSize: 16,
  },
  infoContainer: {
    backgroundColor: "white",
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f8ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  categoryText: {
    color: "#1a73e8",
    fontSize: 14,
    fontWeight: "600",
  },
  productName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#202124",
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f4",
  },
  price: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a73e8",
  },
  stockBadge: {
    backgroundColor: "#34a853",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  outOfStock: {
    backgroundColor: "#ea4335",
  },
  stockText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  outOfStockText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#202124",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: "#5f6368",
  },
  quantitySection: {
    marginBottom: 24,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f1f3f4",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  quantityDisplay: {
    width: 60,
    height: 44,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
  },
  quantityText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#202124",
  },
  maxQuantityWarning: {
    fontSize: 12,
    color: "#ea4335",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  totalSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#f1f3f4",
  },
  totalLabel: {
    fontSize: 18,
    color: "#5f6368",
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a73e8",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  cartButton: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#1a73e8",
  },
  cartButtonText: {
    color: "#1a73e8",
    fontSize: 16,
    fontWeight: "600",
  },
  buyButton: {
    backgroundColor: "#1a73e8",
  },
  buyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  viewCartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#34a853",
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  viewCartButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  additionalInfo: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#5f6368",
  },
});