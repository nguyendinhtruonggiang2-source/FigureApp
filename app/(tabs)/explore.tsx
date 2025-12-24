// app/(tabs)/explore.tsx
import { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

// Mock data for cart items
const mockCartItems = [
  {
    id: '1',
    name: 'Paimon Nendoroid',
    price: 850000,
    category: 'Nendoroid',
    image: 'https://via.placeholder.com/100x100/FF6B6B/fff?text=P',
    quantity: 2,
    stock: 10,
  },
  {
    id: '2',
    name: 'Gundam Wing Zero EW',
    price: 1800000,
    category: 'Gundam',
    image: 'https://via.placeholder.com/100x100/4ECDC4/fff?text=G',
    quantity: 1,
    stock: 5,
  },
  {
    id: '3',
    name: 'Raiden Shogun Figure',
    price: 2450000,
    category: 'Genshin',
    image: 'https://via.placeholder.com/100x100/FFD166/fff?text=R',
    quantity: 1,
    stock: 3,
  },
];

export default function CartScreen() {
  const [cartItems, setCartItems] = useState(mockCartItems);
  const [promoCode, setPromoCode] = useState('');

  // Hàm format giá tiền
  const formatPrice = (price: number) => {
    return price.toLocaleString('vi-VN') + 'đ';
  };

  // Tính tổng tiền
  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Tính phí vận chuyển
  const calculateShipping = () => {
    const subtotal = calculateSubtotal();
    return subtotal > 500000 ? 0 : 30000;
  };

  // Tính tổng cộng
  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping();
  };

  // Cập nhật số lượng
  const updateQuantity = (id: string, change: number) => {
    setCartItems(prevItems =>
      prevItems.map(item => {
        if (item.id === id) {
          const newQuantity = Math.max(1, Math.min(item.stock, item.quantity + change));
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  // Xóa sản phẩm khỏi giỏ hàng
  const removeItem = (id: string) => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?",
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Xóa", 
          style: "destructive",
          onPress: () => {
            setCartItems(prevItems => prevItems.filter(item => item.id !== id));
            Alert.alert("Thành công", "Đã xóa sản phẩm khỏi giỏ hàng");
          }
        }
      ]
    );
  };

  // Xóa toàn bộ giỏ hàng
  const clearCart = () => {
    if (cartItems.length === 0) return;
    
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng?",
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Xóa tất cả", 
          style: "destructive",
          onPress: () => {
            setCartItems([]);
            Alert.alert("Thành công", "Đã xóa toàn bộ giỏ hàng");
          }
        }
      ]
    );
  };

  // Áp dụng mã giảm giá
  const applyPromoCode = () => {
    if (!promoCode.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập mã giảm giá");
      return;
    }

    const validCodes = ['MIHOYO10', 'FIGURE20', 'GUNDAM15'];
    if (validCodes.includes(promoCode.toUpperCase())) {
      Alert.alert("Thành công", `Đã áp dụng mã giảm giá ${promoCode.toUpperCase()}!`);
      // Ở đây bạn có thể thêm logic tính toán giảm giá
    } else {
      Alert.alert("Lỗi", "Mã giảm giá không hợp lệ hoặc đã hết hạn");
    }
    setPromoCode('');
  };

  // Thanh toán
  const handleCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert("Giỏ hàng trống", "Vui lòng thêm sản phẩm vào giỏ hàng trước khi thanh toán");
      return;
    }

    Alert.alert(
      "Xác nhận thanh toán",
      `Tổng thanh toán: ${formatPrice(calculateTotal())}\n\nBạn có chắc chắn muốn thanh toán?`,
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Thanh toán", 
          onPress: () => {
            Alert.alert(
              "Thanh toán thành công!",
              `Cảm ơn bạn đã mua hàng!\n\nMã đơn hàng: #${Math.random().toString(36).substr(2, 9).toUpperCase()}\nTổng tiền: ${formatPrice(calculateTotal())}\n\nSản phẩm sẽ được giao trong 3-5 ngày làm việc.`,
              [{ text: "OK", onPress: () => setCartItems([]) }]
            );
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* HEADER */}
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>
          🛒 Giỏ hàng của bạn
        </ThemedText>
        {cartItems.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearCart}>
            <ThemedText style={styles.clearButtonText}>Xóa tất cả</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* CART ITEMS */}
      {cartItems.length === 0 ? (
        <View style={styles.emptyCartContainer}>
          <IconSymbol size={80} name="cart.fill" color="#d1d5db" />
          <ThemedText type="title" style={styles.emptyCartTitle}>
            Giỏ hàng trống
          </ThemedText>
          <ThemedText style={styles.emptyCartText}>
            Hãy thêm sản phẩm yêu thích vào giỏ hàng!
          </ThemedText>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => Alert.alert("Thông báo", "Quay lại trang chủ để mua sắm")}
          >
            <ThemedText style={styles.shopButtonText}>Mua sắm ngay</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* DANH SÁCH SẢN PHẨM */}
          <ThemedView style={styles.cartSection}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Sản phẩm ({cartItems.length})
            </ThemedText>
            
            {cartItems.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                {/* HÌNH ẢNH */}
                <View style={styles.itemImageContainer}>
                  <Image 
                    source={{ uri: item.image }} 
                    style={styles.itemImage}
                    resizeMode="cover"
                  />
                </View>

                {/* THÔNG TIN */}
                <View style={styles.itemInfo}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemCategory}>
                      <ThemedText style={styles.itemCategoryText}>
                        {item.category}
                      </ThemedText>
                    </View>
                    <TouchableOpacity 
                      style={styles.removeItemButton}
                      onPress={() => removeItem(item.id)}
                    >
                      <IconSymbol name="xmark" size={16} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                  
                  <ThemedText type="defaultSemiBold" style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </ThemedText>
                  
                  <ThemedText type="subtitle" style={styles.itemPrice}>
                    {formatPrice(item.price)}
                  </ThemedText>

                  {/* SỐ LƯỢNG */}
                  <View style={styles.quantityContainer}>
                    <ThemedText style={styles.quantityLabel}>Số lượng:</ThemedText>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={[styles.quantityButton, item.quantity <= 1 && styles.quantityButtonDisabled]}
                        onPress={() => updateQuantity(item.id, -1)}
                        disabled={item.quantity <= 1}
                      >
                        <IconSymbol 
                          name="minus" 
                          size={16} 
                          color={item.quantity <= 1 ? "#d1d5db" : "#1a73e8"} 
                        />
                      </TouchableOpacity>
                      
                      <View style={styles.quantityDisplay}>
                        <ThemedText style={styles.quantityText}>{item.quantity}</ThemedText>
                      </View>
                      
                      <TouchableOpacity
                        style={[styles.quantityButton, item.quantity >= item.stock && styles.quantityButtonDisabled]}
                        onPress={() => updateQuantity(item.id, 1)}
                        disabled={item.quantity >= item.stock}
                      >
                        <IconSymbol 
                          name="plus" 
                          size={16} 
                          color={item.quantity >= item.stock ? "#d1d5db" : "#1a73e8"} 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* TỔNG CHO SẢN PHẨM */}
                  <View style={styles.itemTotalContainer}>
                    <ThemedText style={styles.itemTotalLabel}>Tổng:</ThemedText>
                    <ThemedText type="defaultSemiBold" style={styles.itemTotalPrice}>
                      {formatPrice(item.price * item.quantity)}
                    </ThemedText>
                  </View>
                </View>
              </View>
            ))}
          </ThemedView>

          {/* MÃ GIẢM GIÁ */}
          <ThemedView style={styles.promoSection}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              🎁 Mã giảm giá
            </ThemedText>
            <View style={styles.promoInputContainer}>
              <TextInput
                style={styles.promoInput}
                placeholder="Nhập mã giảm giá..."
                placeholderTextColor="#9ca3af"
                value={promoCode}
                onChangeText={setPromoCode}
              />
              <TouchableOpacity 
                style={styles.promoButton}
                onPress={applyPromoCode}
              >
                <ThemedText style={styles.promoButtonText}>Áp dụng</ThemedText>
              </TouchableOpacity>
            </View>
            <ThemedText style={styles.promoHint}>
              Mã giảm giá có sẵn: MIHOYO10, FIGURE20, GUNDAM15
            </ThemedText>
          </ThemedView>

          {/* TÓM TẮT ĐƠN HÀNG */}
          <ThemedView style={styles.summarySection}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              📝 Tóm tắt đơn hàng
            </ThemedText>
            
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Tạm tính:</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {formatPrice(calculateSubtotal())}
              </ThemedText>
            </View>
            
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Phí vận chuyển:</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {calculateShipping() === 0 ? "MIỄN PHÍ" : formatPrice(calculateShipping())}
              </ThemedText>
            </View>
            
            {calculateShipping() === 0 && calculateSubtotal() < 500000 && (
              <ThemedText style={styles.freeShippingNote}>
                🚚 Miễn phí vận chuyển cho đơn hàng trên 500.000đ
              </ThemedText>
            )}
            
            <View style={styles.totalRow}>
              <ThemedText type="defaultSemiBold" style={styles.totalLabel}>
                Tổng cộng:
              </ThemedText>
              <ThemedText type="title" style={styles.totalValue}>
                {formatPrice(calculateTotal())}
              </ThemedText>
            </View>

            {/* NÚT THANH TOÁN */}
            <TouchableOpacity 
              style={styles.checkoutButton}
              onPress={handleCheckout}
            >
              <IconSymbol name="creditcard.fill" size={22} color="white" />
              <ThemedText style={styles.checkoutButtonText}>
                Thanh toán ngay
              </ThemedText>
            </TouchableOpacity>

            {/* THÔNG TIN BỔ SUNG */}
            <View style={styles.additionalInfo}>
              <View style={styles.infoRow}>
                <IconSymbol name="shield.fill" size={16} color="#10b981" />
                <ThemedText style={styles.infoText}>
                  Thanh toán an toàn với SSL
                </ThemedText>
              </View>
              <View style={styles.infoRow}>
                <IconSymbol name="clock.fill" size={16} color="#f59e0b" />
                <ThemedText style={styles.infoText}>
                  Giao hàng trong 3-5 ngày làm việc
                </ThemedText>
              </View>
              <View style={styles.infoRow}>
                <IconSymbol name="arrow.clockwise.circle.fill" size={16} color="#3b82f6" />
                <ThemedText style={styles.infoText}>
                  Đổi trả trong 7 ngày nếu có lỗi
                </ThemedText>
              </View>
            </View>
          </ThemedView>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 22,
    color: '#1f2937',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyCartTitle: {
    fontSize: 20,
    color: '#6b7280',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyCartText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 30,
  },
  shopButton: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cartSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 16,
  },
  cartItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    marginBottom: 12,
  },
  itemImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemInfo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  itemCategory: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemCategoryText: {
    color: '#0369a1',
    fontSize: 10,
    fontWeight: '600',
  },
  removeItemButton: {
    padding: 4,
  },
  itemName: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#1a73e8',
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quantityLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  quantityDisplay: {
    width: 40,
    height: 32,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  itemTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  itemTotalLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  itemTotalPrice: {
    fontSize: 14,
    color: '#dc2626',
  },
  promoSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  promoInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#f9fafb',
  },
  promoButton: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  promoButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  promoHint: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  summarySection: {
    margin: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1f2937',
  },
  freeShippingNote: {
    fontSize: 12,
    color: '#10b981',
    backgroundColor: '#d1fae5',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#f3f4f6',
  },
  totalLabel: {
    fontSize: 16,
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 20,
    color: '#dc2626',
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#dc2626',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 16,
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  additionalInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
});