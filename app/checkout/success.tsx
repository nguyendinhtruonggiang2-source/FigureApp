// app/checkout/success.tsx
import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { auth, db } from '../constants/firebase';

interface Order {
  id: string;
  total: number;
  status: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  shippingAddress?: {
    name: string;
    phone: string;
    address: string;
  };
  paymentMethod: string;
  createdAt: any;
}

export default function CheckoutSuccessScreen() {
  const params = useLocalSearchParams();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      console.log('🔄 Fetching order details for ID:', orderId);
      
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      
      if (orderSnap.exists()) {
        console.log('✅ Order found:', orderSnap.id);
        const orderData = orderSnap.data();
        
        setOrder({
          id: orderSnap.id,
          ...orderData
        } as Order);
      } else {
        console.log('❌ Order not found with ID:', orderId);
        Alert.alert('Lỗi', 'Không tìm thấy thông tin đơn hàng');
      }
    } catch (error: any) {
      console.error('❌ Error fetching order:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      Alert.alert('Lỗi', 'Không thể tải thông tin đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  // Hàm fallback nếu không có orderId
  const handleFallbackData = () => {
    const fallbackOrder: Order = {
      id: 'DEMO-' + Date.now().toString().slice(-8),
      total: 0,
      status: 'pending',
      items: [],
      paymentMethod: 'cod',
      createdAt: new Date(),
      shippingAddress: {
        name: 'Khách hàng',
        phone: '0123 456 789',
        address: 'Địa chỉ mẫu'
      }
    };
    setOrder(fallbackOrder);
    setLoading(false);
  };

  useEffect(() => {
    if (!orderId) {
      console.log('⚠️ No orderId provided, using fallback');
      handleFallbackData();
    }
  }, []);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '--/--/----';
    try {
      const date = timestamp.toDate();
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '--/--/----';
    }
  };

  // Nếu không có orderId, hiển thị màn hình fallback
  if (!orderId && !loading) {
    return (
      <View style={styles.center}>
        <IconSymbol name="exclamationmark.triangle" size={80} color="#f59e0b" />
        <Text style={styles.title}>Không tìm thấy đơn hàng</Text>
        <Text style={styles.subtitle}>
          Vui lòng kiểm tra lại hoặc liên hệ hỗ trợ
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/(tabs)/orders')}
        >
          <Text style={styles.buttonText}>Xem đơn hàng của tôi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Tiếp tục mua sắm</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <View style={styles.loadingAnimation}>
          <IconSymbol name="checkmark.circle" size={80} color="#10b981" />
        </View>
        <Text style={styles.loadingText}>Đang tải thông tin đơn hàng...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Success Animation/Icon */}
      <View style={styles.successHeader}>
        <View style={styles.successIconContainer}>
          <IconSymbol name="checkmark.circle" size={100} color="#10b981" />
        </View>
        <Text style={styles.title}>🎉 Đặt hàng thành công!</Text>
        <Text style={styles.subtitle}>
          Cảm ơn bạn đã mua sắm tại cửa hàng chúng tôi
        </Text>
      </View>

      {/* Order Summary Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📦 Tóm tắt đơn hàng</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mã đơn hàng:</Text>
          <Text style={styles.infoValue}>#{order?.id?.slice(-8).toUpperCase() || orderId?.slice(-8) || 'N/A'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ngày đặt:</Text>
          <Text style={styles.infoValue}>
            {order?.createdAt ? formatDate(order.createdAt) : 'Vừa xong'}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tổng tiền:</Text>
          <Text style={[styles.infoValue, styles.totalAmount]}>
            {order?.total?.toLocaleString('vi-VN') || '0'}đ
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phương thức thanh toán:</Text>
          <Text style={styles.infoValue}>
            {order?.paymentMethod === 'cod' ? '💵 Thanh toán khi nhận hàng (COD)' : '💳 Thẻ tín dụng/ghi nợ'}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Trạng thái:</Text>
          <View style={[styles.statusBadge, { backgroundColor: '#fef3c7' }]}>
            <Text style={[styles.statusText, { color: '#d97706' }]}>
              {order?.status === 'pending' ? '⏳ Chờ xác nhận' : 
               order?.status === 'paid' ? '✅ Đã thanh toán' :
               order?.status === 'shipped' ? '🚚 Đang giao hàng' :
               order?.status === 'delivered' ? '📦 Đã giao hàng' : '🔄 Đang xử lý'}
            </Text>
          </View>
        </View>
      </View>

      {/* Shipping Information */}
      {order?.shippingAddress && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚚 Thông tin giao hàng</Text>
          
          <View style={styles.shippingInfo}>
            <View style={styles.infoRow}>
              <IconSymbol name="person" size={16} color="#6b7280" />
              <Text style={styles.shippingText}>{order.shippingAddress.name}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <IconSymbol name="phone" size={16} color="#6b7280" />
              <Text style={styles.shippingText}>{order.shippingAddress.phone}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <IconSymbol name="location" size={16} color="#6b7280" />
              <Text style={styles.shippingText}>{order.shippingAddress.address}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Order Items */}
      {order?.items && order.items.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🛒 Sản phẩm đã đặt ({order.items.length})</Text>
          
          {order.items.map((item, index) => (
            <View key={item.id || index} style={styles.orderItem}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name || `Sản phẩm ${index + 1}`}
                </Text>
                <Text style={styles.itemQuantity}>Số lượng: {item.quantity || 1}</Text>
              </View>
              <Text style={styles.itemPrice}>
                {item.price ? item.price.toLocaleString('vi-VN') : '0'}đ
              </Text>
            </View>
          ))}
          
          <View style={styles.orderTotal}>
            <Text style={styles.totalLabel}>Tổng cộng:</Text>
            <Text style={styles.totalValue}>
              {order.total?.toLocaleString('vi-VN') || '0'}đ
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🛒 Sản phẩm đã đặt</Text>
          <Text style={styles.noItemsText}>Không có thông tin sản phẩm</Text>
        </View>
      )}

      {/* Next Steps */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📝 Các bước tiếp theo</Text>
        
        <View style={styles.stepsContainer}>
          <View style={styles.step}>
            <View style={styles.stepIcon}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Xác nhận đơn hàng</Text>
              <Text style={styles.stepDescription}>
                Chúng tôi sẽ liên hệ xác nhận đơn hàng trong vòng 24 giờ
              </Text>
            </View>
          </View>
          
          <View style={styles.step}>
            <View style={styles.stepIcon}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Chuẩn bị & giao hàng</Text>
              <Text style={styles.stepDescription}>
                Đơn hàng sẽ được giao trong 2-5 ngày làm việc
              </Text>
            </View>
          </View>
          
          <View style={styles.step}>
            <View style={styles.stepIcon}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Nhận hàng & thanh toán</Text>
              <Text style={styles.stepDescription}>
                {order?.paymentMethod === 'cod' 
                  ? 'Thanh toán khi nhận hàng' 
                  : 'Đơn hàng đã được thanh toán'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => router.push(`/(tabs)/orders`)}
        >
          <IconSymbol name="bag" size={20} color="white" />
          <Text style={styles.primaryButtonText}>Xem đơn hàng của tôi</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => router.replace('/(tabs)')}
        >
          <IconSymbol name="house" size={20} color="#1a73e8" />
          <Text style={styles.secondaryButtonText}>Tiếp tục mua sắm</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.outlineButton]}
          onPress={() => {
            // Share order information
            const shareMessage = `🎉 Tôi vừa đặt hàng thành công tại Figure App! 
Mã đơn hàng: #${order?.id?.slice(-8) || orderId?.slice(-8)}
Tổng tiền: ${order?.total?.toLocaleString('vi-VN') || '0'}đ`;
            
            Alert.alert('Chia sẻ đơn hàng', shareMessage, [
              { text: 'Sao chép', onPress: () => {
                // Copy to clipboard
                alert('Đã sao chép thông tin đơn hàng');
              }},
              { text: 'Đóng', style: 'cancel' }
            ]);
          }}
        >
          <IconSymbol name="square.and.arrow.up" size={20} color="#6b7280" />
          <Text style={styles.outlineButtonText}>Chia sẻ đơn hàng</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.helpButton]}
          onPress={() => {
            // Contact support
            Alert.alert(
              '📞 Hỗ trợ khách hàng',
              'Hotline: 1900 1234\nEmail: support@figureapp.com\nGiờ làm việc: 8:00 - 22:00 hàng ngày',
              [{ text: 'Đóng', style: 'cancel' }]
            );
          }}
        >
          <IconSymbol name="questionmark.circle" size={20} color="#1a1a1a" />
          <Text style={styles.helpButtonText}>Cần hỗ trợ? Liên hệ chúng tôi</Text>
        </TouchableOpacity>
      </View>

      {/* Footer Note */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💌 Một email xác nhận đã được gửi đến {auth.currentUser?.email || 'email của bạn'}
        </Text>
        <Text style={styles.footerNote}>
          Nếu có bất kỳ câu hỏi nào, vui lòng liên hệ bộ phận chăm sóc khách hàng
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  loadingAnimation: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  successHeader: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: 'white',
  },
  successIconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  infoLabel: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'right',
  },
  totalAmount: {
    fontSize: 18,
    color: '#1a73e8',
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  shippingInfo: {
    marginTop: 8,
  },
  shippingText: {
    fontSize: 15,
    color: '#1a1a1a',
    marginLeft: 12,
    flex: 1,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 13,
    color: '#6b7280',
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a73e8',
  },
  noItemsText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#f1f1f1',
  },
  totalLabel: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a73e8',
  },
  stepsContainer: {
    marginTop: 8,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumber: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  actionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#1a73e8',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#1a73e8',
  },
  secondaryButtonText: {
    color: '#1a73e8',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  outlineButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  outlineButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  helpButton: {
    backgroundColor: '#f3f4f6',
  },
  helpButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  footerNote: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Thêm styles cho fallback screen
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});