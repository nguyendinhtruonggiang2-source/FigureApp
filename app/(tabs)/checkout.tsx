import { router, useLocalSearchParams } from "expo-router";
import { User, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { auth, db } from "../constants/firebase";

// Conditional import for Stripe
let CardField: any = () => null;
let useConfirmPayment: any = () => ({ 
  confirmPayment: async () => ({ error: null, paymentIntent: null }), 
  loading: false 
});

if (Platform.OS !== 'web') {
  try {
    const stripe = require('@stripe/stripe-react-native');
    CardField = stripe.CardField;
    useConfirmPayment = stripe.useConfirmPayment;
  } catch (error) {
    console.log('Stripe not available on web');
  }
}

/* ================= TYPE ================= */
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id?: string;
  items: CartItem[];
  total: number;
  status: "pending" | "paid" | "failed" | "shipped" | "delivered";
  paymentMethod: "card" | "cod";
  shippingAddress?: {
    name: string;
    phone: string;
    address: string;
    city: string;
    district: string;
    ward: string;
  };
  createdAt: any;
  userId: string;
}

/* ================= SCREEN ================= */
export default function CheckoutScreen() {
  const { fromCart = "true", total: paramTotal = "0" } = useLocalSearchParams<{ 
    fromCart?: string; 
    total?: string;
    itemCount?: string;
  }>();
  
  const [user, setUser] = useState<User | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cod">("cod");
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [shippingInfo, setShippingInfo] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    district: "",
    ward: "",
  });

  const { confirmPayment, loading: stripeLoading } = useConfirmPayment();

  /* ---------- AUTH & CART ---------- */
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        router.replace("/(auth)/login");
      }
    });

    return unsubAuth;
  }, []);

  useEffect(() => {
    if (!user) return;

    const cartRef = collection(db, "carts", user.uid, "items");
    const unsub = onSnapshot(
      cartRef,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<CartItem, "id">),
        }));
        setCartItems(items);
        setLoading(false);
      },
      (error) => {
        console.error("Lỗi tải giỏ hàng:", error);
        setLoading(false);
      }
    );

    return unsub;
  }, [user]);

  /* ---------- TÍNH TỔNG ---------- */
  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const calculateShipping = () => {
    return cartItems.length > 0 ? 30000 : 0;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping();
  };

  /* ---------- XỬ LÝ THANH TOÁN ---------- */
  const handlePayment = async () => {
    if (!user) {
      Alert.alert("Lỗi", "Vui lòng đăng nhập để thanh toán");
      return;
    }

    if (cartItems.length === 0) {
      Alert.alert("Giỏ hàng trống", "Vui lòng thêm sản phẩm vào giỏ hàng");
      router.back();
      return;
    }

    // Validate thông tin giao hàng
    const requiredFields = ['name', 'phone', 'address'];
    const missingFields = requiredFields.filter(field => !shippingInfo[field as keyof typeof shippingInfo]);
    
    if (missingFields.length > 0) {
      Alert.alert(
        "Thiếu thông tin", 
        `Vui lòng nhập: ${missingFields.map(f => getFieldLabel(f)).join(', ')}`
      );
      return;
    }

    // Validate số điện thoại
    const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
    if (!phoneRegex.test(shippingInfo.phone)) {
      Alert.alert("Lỗi", "Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (10 số, bắt đầu bằng 0)");
      return;
    }

    setProcessing(true);

    try {
      // Web chỉ hỗ trợ COD
      if (Platform.OS === 'web' && paymentMethod === "card") {
        Alert.alert(
          "Thông báo", 
          "Trên trình duyệt web, chỉ hỗ trợ thanh toán khi nhận hàng (COD). Vui lòng sử dụng ứng dụng di động để thanh toán bằng thẻ."
        );
        setPaymentMethod("cod");
        setProcessing(false);
        return;
      }

      let orderId: string | null = null;

      if (paymentMethod === "cod") {
        // Thanh toán khi nhận hàng
        orderId = await createOrder("cod");
        if (orderId) {
          // Chuyển đến trang thành công với orderId
          router.push({
            pathname: '/checkout/success',
            params: { orderId }
          });
        }
      } else {
        // Thanh toán bằng thẻ (chỉ mobile)
        if (!cardDetails?.complete) {
          Alert.alert("Thiếu thông tin", "Vui lòng nhập đầy đủ thông tin thẻ");
          setProcessing(false);
          return;
        }

        // Hiển thị cảnh báo chế độ thử nghiệm
        Alert.alert(
          "Chế độ thử nghiệm",
          "Đang sử dụng chế độ thử nghiệm. Sử dụng thẻ test: 4242 4242 4242 4242",
          [
            {
              text: "Hủy",
              style: "cancel",
              onPress: () => setProcessing(false),
            },
            {
              text: "Tiếp tục",
              onPress: async () => {
                try {
                  // Giả lập thanh toán
                  await new Promise(resolve => setTimeout(resolve, 1500));
                  
                  // Tạo order
                  orderId = await createOrder("card", "mock_payment_" + Date.now());
                  
                  if (orderId) {
                    // Thanh toán thành công, chuyển đến success
                    router.push({
                      pathname: '/checkout/success',
                      params: { orderId }
                    });
                  }
                } catch (error: any) {
                  // Thanh toán thất bại, chuyển đến failed
                  router.push({
                    pathname: '/checkout/failed',
                    params: {
                      errorCode: 'processing_error',
                      errorMessage: error.message || 'Thanh toán thất bại',
                      orderId: orderId || '',
                      paymentMethod: 'card'
                    }
                  });
                }
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error("Lỗi thanh toán:", error);
      
      // Chuyển đến trang thất bại
      router.push({
        pathname: '/checkout/failed',
        params: {
          errorCode: error.code || 'unknown_error',
          errorMessage: error.message || 'Có lỗi xảy ra trong quá trình thanh toán',
          paymentMethod: paymentMethod
        }
      });
    } finally {
      setProcessing(false);
    }
  };

  /* ---------- TẠO ĐƠN HÀNG ---------- */
  const createOrder = async (method: "card" | "cod", paymentId?: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const batch = writeBatch(db);
      
      // Tạo order document reference
      const orderRef = doc(collection(db, "orders"));
      
      const order: Order = {
        items: cartItems,
        total: calculateTotal(),
        status: method === "cod" ? "pending" : "paid",
        paymentMethod: method,
        shippingAddress: shippingInfo,
        createdAt: serverTimestamp(),
        userId: user.uid,
      };

      if (paymentId) {
        (order as any).stripePaymentId = paymentId;
      }

      // Add order to batch
      batch.set(orderRef, order);

      // Xóa giỏ hàng
      cartItems.forEach((item) => {
        const cartItemRef = doc(db, "carts", user.uid, "items", item.id);
        batch.delete(cartItemRef);
      });

      // Execute batch
      await batch.commit();
      
      console.log('✅ Order created with ID:', orderRef.id);
      return orderRef.id;
      
    } catch (error) {
      console.error("Lỗi tạo đơn hàng:", error);
      throw error;
    }
  };

  /* ---------- XỬ LÝ INPUT ---------- */
  const handleInputChange = (field: keyof typeof shippingInfo, value: string) => {
    setShippingInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /* ---------- UI LOADING ---------- */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={styles.loadingText}>Đang tải thông tin...</Text>
      </View>
    );
  }

  if (cartItems.length === 0 && fromCart === "true") {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Giỏ hàng trống</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.navigate("/(tabs)")}
        >
          <Text style={styles.buttonText}>Mua sắm ngay</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Thanh toán</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Thông tin giao hàng */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin giao hàng</Text>
        
        {/* Họ và tên */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Họ và tên *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập họ và tên"
            value={shippingInfo.name}
            onChangeText={(text) => handleInputChange('name', text)}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>

        {/* Số điện thoại */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Số điện thoại *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập số điện thoại"
            value={shippingInfo.phone}
            onChangeText={(text) => handleInputChange('phone', text)}
            keyboardType="phone-pad"
            maxLength={10}
            returnKeyType="next"
          />
          {shippingInfo.phone && !/^(0[3|5|7|8|9])+([0-9]{8})$/.test(shippingInfo.phone) && (
            <Text style={styles.errorText}>Số điện thoại không hợp lệ</Text>
          )}
        </View>

        {/* Địa chỉ */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Địa chỉ *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập địa chỉ (số nhà, tên đường)"
            value={shippingInfo.address}
            onChangeText={(text) => handleInputChange('address', text)}
            returnKeyType="next"
          />
        </View>

        {/* Thành phố */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Thành phố/Tỉnh</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập thành phố/tỉnh"
            value={shippingInfo.city}
            onChangeText={(text) => handleInputChange('city', text)}
            returnKeyType="next"
          />
        </View>

        {/* Quận/Huyện */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Quận/Huyện</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập quận/huyện"
            value={shippingInfo.district}
            onChangeText={(text) => handleInputChange('district', text)}
            returnKeyType="next"
          />
        </View>

        {/* Phường/Xã */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Phường/Xã</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập phường/xã"
            value={shippingInfo.ward}
            onChangeText={(text) => handleInputChange('ward', text)}
            returnKeyType="done"
          />
        </View>

        <Text style={styles.noteText}>* Thông tin bắt buộc</Text>
      </View>

      {/* Phương thức thanh toán */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
        
        {/* Chỉ hiển thị thẻ trên mobile */}
        {Platform.OS !== 'web' && (
          <>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === "card" && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod("card")}
            >
              <Text style={styles.paymentText}>💳 Thẻ tín dụng/ghi nợ</Text>
              {paymentMethod === "card" && <View style={styles.radioSelected} />}
            </TouchableOpacity>

            {paymentMethod === "card" && (
              <View style={styles.cardFieldContainer}>
                <CardField
                  postalCodeEnabled={false}
                  placeholders={{
                    number: "4242 4242 4242 4242",
                    expiration: "MM/YY",
                    cvc: "CVC",
                  }}
                  cardStyle={styles.cardField}
                  style={styles.cardFieldWrapper}
                  onCardChange={(cardDetails: any) => {
                    setCardDetails(cardDetails);
                  }}
                />
                <Text style={styles.cardHint}>
                  💡 Sử dụng thẻ test: 4242 4242 4242 4242
                </Text>
              </View>
            )}
          </>
        )}

        <TouchableOpacity
          style={[
            styles.paymentOption,
            paymentMethod === "cod" && styles.paymentOptionSelected,
          ]}
          onPress={() => setPaymentMethod("cod")}
        >
          <Text style={styles.paymentText}>📦 Thanh toán khi nhận hàng (COD)</Text>
          {paymentMethod === "cod" && <View style={styles.radioSelected} />}
        </TouchableOpacity>

        {Platform.OS === 'web' && paymentMethod === "card" && (
          <Text style={styles.webNote}>
            ⚠️ Trên trình duyệt web, chỉ hỗ trợ thanh toán COD. 
            Vui lòng sử dụng ứng dụng di động để thanh toán bằng thẻ.
          </Text>
        )}
      </View>

      {/* Tóm tắt đơn hàng */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tóm tắt đơn hàng</Text>
        {cartItems.map((item) => (
          <View key={item.id} style={styles.orderItem}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.itemQty}>x{item.quantity}</Text>
            </View>
            <Text style={styles.itemPrice}>
              {(item.price * item.quantity).toLocaleString("vi-VN")}đ
            </Text>
          </View>
        ))}

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tạm tính</Text>
          <Text style={styles.summaryValue}>
            {calculateSubtotal().toLocaleString("vi-VN")}đ
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
          <Text style={styles.summaryValue}>
            {calculateShipping().toLocaleString("vi-VN")}đ
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Tổng cộng</Text>
          <Text style={styles.totalValue}>
            {calculateTotal().toLocaleString("vi-VN")}đ
          </Text>
        </View>
      </View>

      {/* Nút thanh toán */}
      <TouchableOpacity
        style={[styles.payButton, processing && styles.payButtonDisabled]}
        onPress={handlePayment}
        disabled={processing || stripeLoading}
      >
        {processing || stripeLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.payButtonText}>
            {paymentMethod === "cod" ? "ĐẶT HÀNG" : "THANH TOÁN NGAY"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>← Quay lại giỏ hàng</Text>
      </TouchableOpacity>

      <Text style={styles.testNote}>
        ⚠️ Đang sử dụng chế độ thử nghiệm
      </Text>
    </ScrollView>
  );
}

/* ================= HELPER FUNCTIONS ================= */
const getFieldLabel = (key: string): string => {
  const labels: Record<string, string> = {
    name: "họ tên",
    phone: "số điện thoại",
    address: "địa chỉ",
    city: "thành phố",
    district: "quận/huyện",
    ward: "phường/xã",
  };
  return labels[key] || key;
};

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  closeButton: {
    fontSize: 24,
    color: "#666",
    padding: 8,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#333",
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#555",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 4,
    marginLeft: 4,
  },
  noteText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 8,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
  },
  paymentOptionSelected: {
    backgroundColor: "#e8f0fe",
    borderColor: "#1a73e8",
    borderWidth: 1,
  },
  paymentText: {
    fontSize: 16,
    color: "#333",
  },
  radioSelected: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1a73e8",
  },
  cardFieldContainer: {
    marginBottom: 16,
    marginTop: 8,
  },
  cardFieldWrapper: {
    height: 50,
    marginBottom: 8,
  },
  cardField: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
  },
  cardHint: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 4,
  },
  webNote: {
    fontSize: 12,
    color: "#f59e0b",
    backgroundColor: "#fffbeb",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    textAlign: "center",
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  itemInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  itemName: {
    fontSize: 16,
    color: "#333",
    flex: 1,
    marginRight: 10,
  },
  itemQty: {
    fontSize: 14,
    color: "#666",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a73e8",
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 12,
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
    color: "#333",
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a73e8",
  },
  payButton: {
    backgroundColor: "#10b981",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonDisabled: {
    backgroundColor: "#ccc",
  },
  payButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  backButton: {
    padding: 16,
    alignItems: "center",
  },
  backButtonText: {
    color: "#666",
    fontSize: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#1a73e8",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  testNote: {
    textAlign: "center",
    fontSize: 12,
    color: "#f59e0b",
    marginTop: 16,
    marginBottom: 32,
    padding: 8,
    backgroundColor: "#fffbeb",
    borderRadius: 8,
  },
});