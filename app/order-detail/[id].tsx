import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { auth, db } from '../constants/firebase';

type OrderStatus = 'pending' | 'paid' | 'failed' | 'shipped' | 'delivered' | 'cancelled';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentMethod: string;
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
  stripePaymentId?: string;
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOrderDetails(id);
    }
  }, [id]);

  const fetchOrderDetails = async (orderId: string) => {
    try {
      setLoading(true);
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);

      if (orderSnap.exists()) {
        const orderData = orderSnap.data() as Omit<Order, 'id'>;
        
        const currentUser = auth.currentUser;
        if (currentUser && orderData.userId !== currentUser.uid) {
          Alert.alert('Lỗi', 'Bạn không có quyền xem đơn hàng này');
          router.back();
          return;
        }

        setOrder({
          id: orderSnap.id,
          ...orderData,
        });
      } else {
        Alert.alert('Lỗi', 'Không tìm thấy đơn hàng');
        router.back();
      }
    } catch (error) {
      console.error('Lỗi tải chi tiết đơn hàng:', error);
      Alert.alert('Lỗi', 'Không thể tải chi tiết đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    const colors = {
      pending: '#f59e0b',
      paid: '#3b82f6',
      failed: '#ef4444',
      shipped: '#8b5cf6',
      delivered: '#10b981',
      cancelled: '#6b7280',
    };
    return colors[status] || '#6b7280';
  };

  const getStatusText = (status: OrderStatus) => {
    const texts = {
      pending: 'Chờ xác nhận',
      paid: 'Đã thanh toán',
      failed: 'Thanh toán thất bại',
      shipped: 'Đang giao hàng',
      delivered: 'Đã giao hàng',
      cancelled: 'Đã hủy',
    };
    return texts[status] || status;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '--/--/----';
    
    try {
      const date = timestamp.toDate();
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return '--/--/----';
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;

    Alert.alert(
      'Xác nhận hủy đơn hàng',
      'Bạn có chắc chắn muốn hủy đơn hàng này?',
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Có, hủy đơn',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              const orderRef = doc(db, 'orders', order.id);
              await updateDoc(orderRef, {
                status: 'cancelled',
                cancelledAt: new Date(),
              });
              
              Alert.alert('Thành công', 'Đơn hàng đã được hủy');
              router.back();
            } catch (error) {
              console.error('Lỗi hủy đơn hàng:', error);
              Alert.alert('Lỗi', 'Không thể hủy đơn hàng');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={styles.loadingText}>Đang tải chi tiết đơn hàng...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Không tìm thấy đơn hàng</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="arrow.left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Chi tiết đơn hàng</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Thông tin đơn hàng */}
      <View style={styles.section}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>Đơn hàng #{order.id.slice(-8).toUpperCase()}</Text>
            <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
              {getStatusText(order.status)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <IconSymbol name="creditcard" size={18} color="#6b7280" />
          <Text style={styles.infoLabel}>Phương thức thanh toán:</Text>
          <Text style={styles.infoValue}>
            {order.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Thẻ tín dụng/ghi nợ'}
          </Text>
        </View>

        {order.stripePaymentId && (
          <View style={styles.infoRow}>
            <IconSymbol name="receipt" size={18} color="#6b7280" />
            <Text style={styles.infoLabel}>Mã thanh toán:</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {order.stripePaymentId}
            </Text>
          </View>
        )}
      </View>

      {/* Thông tin giao hàng */}
      {order.shippingAddress && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin giao hàng</Text>
          <View style={styles.infoRow}>
            <IconSymbol name="person" size={18} color="#6b7280" />
            <Text style={styles.infoLabel}>Người nhận:</Text>
            <Text style={styles.infoValue}>{order.shippingAddress.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol name="phone" size={18} color="#6b7280" />
            <Text style={styles.infoLabel}>Số điện thoại:</Text>
            <Text style={styles.infoValue}>{order.shippingAddress.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol name="location" size={18} color="#6b7280" />
            <Text style={styles.infoLabel}>Địa chỉ:</Text>
            <Text style={styles.infoValue}>{order.shippingAddress.address}</Text>
          </View>
        </View>
      )}

      {/* Sản phẩm */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sản phẩm ({order.items.length})</Text>
        {order.items.map((item, index) => (
          <View key={index} style={styles.productItem}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productQty}>x{item.quantity}</Text>
            </View>
            <Text style={styles.productPrice}>
              {(item.price * item.quantity).toLocaleString('vi-VN')}đ
            </Text>
          </View>
        ))}
      </View>

      {/* Tổng thanh toán */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tổng thanh toán</Text>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tổng tiền hàng:</Text>
          <Text style={styles.totalValue}>
            {order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString('vi-VN')}đ
          </Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Phí vận chuyển:</Text>
          <Text style={styles.totalValue}>30.000đ</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.finalTotalLabel}>Tổng cộng:</Text>
          <Text style={styles.finalTotalValue}>{order.total.toLocaleString('vi-VN')}đ</Text>
        </View>
      </View>

      {/* Nút hành động */}
      <View style={styles.actions}>
        {order.status === 'pending' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelOrder}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color="#dc2626" size="small" />
            ) : (
              <Text style={styles.cancelButtonText}>HỦY ĐƠN HÀNG</Text>
            )}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.trackButton}
          onPress={() => {
            // TODO: Implement tracking
            Alert.alert('Thông báo', 'Tính năng đang phát triển');
          }}
        >
          <Text style={styles.trackButtonText}>THEO DÕI ĐƠN HÀNG</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  orderDate: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
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
  divider: {
    height: 1,
    backgroundColor: '#f1f1f1',
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 12,
    marginRight: 8,
    minWidth: 120,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  productInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  productName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  productQty: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a73e8',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    color: '#333',
  },
  finalTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  finalTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a73e8',
  },
  actions: {
    padding: 16,
    marginBottom: 32,
  },
  cancelButton: {
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelButtonText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
  },
  trackButton: {
    backgroundColor: '#1a73e8',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#1a73e8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});