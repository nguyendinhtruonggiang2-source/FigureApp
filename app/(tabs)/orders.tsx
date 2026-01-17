import { router } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { auth, db } from '../constants/firebase';

type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentMethod: string;
  createdAt: any;
  shippingAddress?: {
    name: string;
    phone: string;
    address: string;
  };
}

export default function OrdersScreen() {
  const [isClient, setIsClient] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null);

  // Fix hydration error
  useEffect(() => {
    setIsClient(true);
    console.log('🔄 OrdersScreen client-side mounted');
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    console.log('🔍 OrdersScreen mounted - client only');
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('👤 User authenticated:', user.uid);
        loadOrders(user.uid);
      } else {
        console.log('👤 No user found');
        setOrders([]);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      console.log('🔍 OrdersScreen unmounted');
    };
  }, [isClient]);

  useEffect(() => {
    // Auto hide success message after 3 seconds
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        setShowSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

  const loadOrders = (userId: string) => {
    setLoading(true);
    setErrorMessage(null);
    console.log('🚀 Bắt đầu load orders cho user:', userId);
    
    try {
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      console.log('✅ Query đã tạo, đang subscribe...');

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          console.log(`📦 Nhận được snapshot với ${snapshot.size} documents`);
          
          if (snapshot.size === 0) {
            console.log('ℹ️ Không có đơn hàng nào cho user này');
          }
          
          const ordersData = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
            } as Order;
          });
          
          console.log('🎉 Orders đã được cập nhật:', ordersData.length);
          setOrders(ordersData);
          setLoading(false);
          setRefreshing(false);
        },
        (error) => {
          console.error('❌ Lỗi tải đơn hàng chi tiết:', error);
          
          setErrorMessage(`Lỗi: ${error.code} - ${error.message}`);
          setLoading(false);
          setRefreshing(false);
        }
      );

      return unsub;
    } catch (error: any) {
      console.error('💥 Lỗi khởi tạo query:', error);
      setErrorMessage(`Lỗi hệ thống: ${error.message}`);
      setLoading(false);
      setRefreshing(false);
      return () => {}; // Return empty cleanup function
    }
  };

  const handleCancelOrder = (orderId: string) => {
    console.log('🎯 [DEBUG] handleCancelOrder called with orderId:', orderId);
    console.log('📱 [DEBUG] Current user:', auth.currentUser?.uid);
    
    const orderToCancel = orders.find(o => o.id === orderId);
    console.log('📊 [DEBUG] Order to cancel:', orderToCancel);
    
    // Test: Thử không dùng Alert trước để debug
    console.log('🔧 [DEBUG] Calling cancelOrder directly for testing');
    cancelOrder(orderId);
    
    /*
    // Alert version (comment lại khi debug)
    Alert.alert(
      'Xác nhận hủy đơn hàng',
      'Bạn có chắc chắn muốn hủy đơn hàng này? Hành động này không thể hoàn tác.',
      [
        {
          text: 'Hủy bỏ',
          style: 'cancel',
          onPress: () => console.log('❌ User cancelled deletion')
        },
        {
          text: 'Xác nhận hủy',
          style: 'destructive',
          onPress: () => {
            console.log('✅ User confirmed, calling cancelOrder');
            cancelOrder(orderId);
          },
        },
      ]
    );
    */
  };

  const cancelOrder = async (orderId: string) => {
    console.log('🔄 [DEBUG] cancelOrder started for orderId:', orderId);
    
    try {
      setCancellingOrderId(orderId);
      
      const orderRef = doc(db, 'orders', orderId);
      
      console.log('📡 [DEBUG] Firestore document path:', orderRef.path);
      console.log('👤 [DEBUG] Current auth user:', auth.currentUser);
      
      // Kiểm tra xem order có tồn tại không
      const orderToDelete = orders.find(order => order.id === orderId);
      if (!orderToDelete) {
        console.error('❌ [DEBUG] Order not found in local state:', orderId);
        Alert.alert('Lỗi', 'Không tìm thấy đơn hàng để xóa');
        setCancellingOrderId(null);
        return;
      }
      
      console.log('🔍 [DEBUG] Order details:', {
        id: orderToDelete.id,
        userId: orderToDelete.userId,
        status: orderToDelete.status,
        total: orderToDelete.total
      });
      
      // Kiểm tra trạng thái: Chỉ cho phép xóa đơn hàng đang pending
      if (orderToDelete.status !== 'pending') {
        console.error('🚫 [DEBUG] Only pending orders can be cancelled');
        Alert.alert('Lỗi', 'Chỉ có thể hủy đơn hàng đang chờ xác nhận');
        setCancellingOrderId(null);
        return;
      }
      
      // Thực hiện xóa đơn hàng
      console.log('🗑️ [DEBUG] Attempting to delete document...');
      await deleteDoc(orderRef);
      
      console.log('✅ [DEBUG] Order successfully deleted:', orderId);
      setShowSuccessMessage('Đơn hàng đã được hủy thành công!');
      
      // Cập nhật danh sách local ngay lập tức
      setOrders(prevOrders => {
        const newOrders = prevOrders.filter(order => order.id !== orderId);
        console.log('📋 [DEBUG] Local orders updated, new count:', newOrders.length);
        return newOrders;
      });
      
    } catch (error: any) {
      console.error('❌ [DEBUG] Error in cancelOrder:', {
        code: error.code,
        message: error.message,
        details: error.details,
        stack: error.stack
      });
      
      let errorMessage = 'Không thể hủy đơn hàng. Vui lòng thử lại.';
      
      // Xử lý các lỗi cụ thể
      switch (error.code) {
        case 'permission-denied':
          errorMessage = 'Bạn không có quyền xóa đơn hàng này. Vui lòng kiểm tra Firestore Rules.';
          console.log('🔐 [DEBUG] Check Firestore Rules for collection "orders"');
          break;
        case 'not-found':
          errorMessage = 'Đơn hàng không tồn tại hoặc đã bị xóa.';
          break;
        case 'unavailable':
          errorMessage = 'Mất kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.';
          break;
        case 'cancelled':
          errorMessage = 'Thao tác đã bị hủy.';
          break;
      }
      
      Alert.alert('❌ Lỗi', errorMessage);
    } finally {
      setCancellingOrderId(null);
      console.log('🏁 [DEBUG] cancelOrder finished');
    }
  };

  const onRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true);
    const user = auth.currentUser;
    if (user) {
      loadOrders(user.uid);
    } else {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    const colors = {
      pending: '#f59e0b',
      paid: '#3b82f6',
      shipped: '#8b5cf6',
      delivered: '#10b981',
      cancelled: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  const getStatusText = (status: OrderStatus) => {
    const texts = {
      pending: 'Chờ xác nhận',
      paid: 'Đã thanh toán',
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
      });
    } catch (error) {
      console.warn('Lỗi format date:', timestamp);
      return '--/--/----';
    }
  };

  // Fix hydration - render loading on server
  if (!isClient) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00eaff" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  // Hiển thị lỗi nếu có
  if (errorMessage) {
    return (
      <View style={styles.center}>
        <IconSymbol name="exclamationmark.triangle" size={64} color="#ef4444" />
        <Text style={styles.errorTitle}>Đã xảy ra lỗi</Text>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            const user = auth.currentUser;
            if (user) loadOrders(user.uid);
          }}
        >
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00eaff" />
        <Text style={styles.loadingText}>Đang tải đơn hàng...</Text>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.center}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <IconSymbol name="bag" size={64} color="#9ca3af" />
        <Text style={styles.emptyTitle}>Chưa có đơn hàng</Text>
        <Text style={styles.emptyText}>Bạn chưa có đơn hàng nào</Text>
        <TouchableOpacity
          style={styles.shopButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.shopButtonText}>Mua sắm ngay</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <>
      {showSuccessMessage && (
        <View style={styles.successMessage}>
          <IconSymbol name="checkmark.circle" size={20} color="#10b981" />
          <Text style={styles.successText}>{showSuccessMessage}</Text>
        </View>
      )}
      
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Đơn hàng của tôi</Text>
          <Text style={styles.subtitle}>{orders.length} đơn hàng</Text>
        </View>

        {orders.map((order) => (
          <View key={order.id} style={styles.orderCard}>
            <TouchableOpacity
              onPress={() => {
                console.log('🔗 Navigating to order detail:', order.id);
                router.push(`/order-detail/${order.id}`);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderId}>Đơn hàng #{order.id.slice(-6)}</Text>
                  <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(order.status) + '20' },
                  ]}
                >
                  <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                    {getStatusText(order.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.orderInfo}>
                <View style={styles.infoRow}>
                  <IconSymbol name="cube" size={16} color="#6b7280" />
                  <Text style={styles.infoText}>
                    {order.items.length} sản phẩm
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <IconSymbol name="creditcard" size={16} color="#6b7280" />
                  <Text style={styles.infoText}>
                    {order.paymentMethod === 'cod' ? 'COD' : 'Thẻ'}
                  </Text>
                </View>
                {order.shippingAddress && (
                  <View style={styles.infoRow}>
                    <IconSymbol name="location" size={16} color="#6b7280" />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {order.shippingAddress.address}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.orderFooter}>
                <Text style={styles.totalLabel}>Tổng tiền:</Text>
                <Text style={styles.totalAmount}>
                  {order.total.toLocaleString('vi-VN')}đ
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.detailButton}
                onPress={() => {
                  console.log('📄 Detail button clicked for order:', order.id);
                  router.push(`/order-detail/${order.id}`);
                }}
              >
                <Text style={styles.detailButtonText}>Xem chi tiết</Text>
              </TouchableOpacity>
              
              {order.status === 'pending' && (
                <TouchableOpacity
                  style={[
                    styles.cancelButton,
                    cancellingOrderId === order.id && styles.cancelButtonDisabled
                  ]}
                  onPress={() => {
                    console.log('❌ Cancel button CLICKED for order:', order.id);
                    console.log('🖱️ Button is disabled?', cancellingOrderId === order.id);
                    handleCancelOrder(order.id);
                  }}
                  disabled={cancellingOrderId === order.id}
                >
                  {cancellingOrderId === order.id ? (
                    <ActivityIndicator size="small" color="#dc2626" />
                  ) : (
                    <>
                      <IconSymbol name="xmark" size={16} color="#dc2626" />
                      <Text style={styles.cancelButtonText}>Hủy đơn</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    flex: 1,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
    paddingTop: 12,
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a73e8',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  detailButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    gap: 6,
  },
  cancelButtonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  shopButton: {
    backgroundColor: '#00eaff',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#dc2626',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successMessage: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  successText: {
    color: '#065f46',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});