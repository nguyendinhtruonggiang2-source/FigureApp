// app/(admin)/add-products.tsx
import * as ImagePicker from 'expo-image-picker';
import { router } from "expo-router";
import { addDoc, collection } from "firebase/firestore";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { IconSymbol } from "../../components/ui/icon-symbol";
import { db } from "../constants/firebase";

export default function AddProductsScreen() {
  const [products, setProducts] = useState([
    { category: "", name: "", price: "", imageUri: "", imageUrl: "", description: "" }
  ]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<number | null>(null);

  const addProductField = () => {
    setProducts([...products, { category: "", name: "", price: "", imageUri: "", imageUrl: "", description: "" }]);
  };

  const updateProduct = (index: number, field: string, value: string) => {
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    setProducts(newProducts);
  };

  const removeProduct = (index: number) => {
    if (products.length > 1) {
      const newProducts = products.filter((_, i) => i !== index);
      setProducts(newProducts);
    }
  };

  // Hàm chọn ảnh từ thư viện
  const pickImageFromGallery = async (index: number) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert("Cần quyền truy cập", "Vui lòng cho phép ứng dụng truy cập thư viện ảnh!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedImage = result.assets[0];
        updateProduct(index, "imageUri", selectedImage.uri);
        // Clear image URL nếu có ảnh mới
        updateProduct(index, "imageUrl", "");
      }
    } catch (error) {
      console.error("Lỗi khi chọn ảnh:", error);
      Alert.alert("Lỗi", "Không thể chọn ảnh từ thư viện");
    }
  };

  // Hàm chụp ảnh mới
  const takePhoto = async (index: number) => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert("Cần quyền truy cập", "Vui lòng cho phép ứng dụng sử dụng camera!");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const photo = result.assets[0];
        updateProduct(index, "imageUri", photo.uri);
        // Clear image URL nếu có ảnh mới
        updateProduct(index, "imageUrl", "");
      }
    } catch (error) {
      console.error("Lỗi khi chụp ảnh:", error);
      Alert.alert("Lỗi", "Không thể chụp ảnh");
    }
  };

  // Hàm xóa ảnh đã chọn
  const removeSelectedImage = (index: number) => {
    updateProduct(index, "imageUri", "");
    updateProduct(index, "imageUrl", "");
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Lọc ra các sản phẩm có đủ thông tin
      const validProducts = products.filter(
        p => p.category.trim() && p.name.trim() && p.price.trim()
      );

      if (validProducts.length === 0) {
        Alert.alert("Lỗi", "Vui lòng nhập ít nhất một sản phẩm hợp lệ");
        setLoading(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      // Thêm từng sản phẩm vào Firestore
      for (let i = 0; i < validProducts.length; i++) {
        const product = validProducts[i];
        setUploadingImage(i);
        
        try {
          let finalImageUrl = product.imageUrl;
          
          // Nếu có ảnh local (URI) nhưng chưa có URL, thông báo cần upload
          if (product.imageUri && !product.imageUrl) {
            Alert.alert(
              "Thông báo", 
              `Ảnh của "${product.name}" đang ở dạng local.\n\nTrong môi trường thực tế, bạn cần:\n1. Upload ảnh lên Firebase Storage\n2. Lấy URL public\n3. Lưu URL vào Firestore\n\nHiện tại sẽ sử dụng placeholder.`
            );
            finalImageUrl = `https://via.placeholder.com/300x300/333/fff?text=${encodeURIComponent(product.name.substring(0, 10))}`;
          } else if (!product.imageUri && !product.imageUrl) {
            // Nếu không có ảnh nào, dùng placeholder
            finalImageUrl = `https://via.placeholder.com/300x300/333/fff?text=${encodeURIComponent(product.name.substring(0, 10))}`;
          }

          // Tạo mô tả mặc định nếu không có
          let description = product.description.trim();
          if (!description) {
            description = generateDefaultDescription(product.name, product.category);
          }

          await addDoc(collection(db, "products"), {
            category: product.category.trim(),
            name: product.name.trim(),
            price: Number(product.price.replace(/\D/g, "")) || 0,
            image: finalImageUrl || "https://via.placeholder.com/300x300/333/fff?text=Figure",
            description: description,
            stock: Math.floor(Math.random() * 20) + 5,
            createdAt: new Date(),
          });
          successCount++;
        } catch (error) {
          console.error(`Lỗi khi thêm ${product.name}:`, error);
          errorCount++;
        } finally {
          setUploadingImage(null);
        }
      }

      Alert.alert(
        "Thành công", 
        `Đã thêm ${successCount} sản phẩm${errorCount > 0 ? `, ${errorCount} lỗi` : ''}`
      );
      
      if (successCount > 0) {
        setTimeout(() => {
          router.back();
        }, 1500);
      }
    } catch (error) {
      console.error("Lỗi tổng:", error);
      Alert.alert("Lỗi", "Không thể thêm sản phẩm");
    } finally {
      setLoading(false);
      setUploadingImage(null);
    }
  };

  // Hàm tạo mô tả mặc định
  const generateDefaultDescription = (name: string, category: string): string => {
    const descriptions: Record<string, string> = {
      'Nendoroid': `${name} - Nendoroid chất lượng cao với nhiều phụ kiện có thể thay đổi. Sản phẩm cao 10cm, làm từ chất liệu PVC an toàn.`,
      'Gundam': `${name} - Mô hình Gundam có thể lắp ráp với chi tiết sắc nét, khớp nối linh hoạt.`,
      'Genshin': `${name} - Figure nhân vật từ Genshin Impact với thiết kế tinh xảo, tái hiện chân thực.`,
      'Honkai': `${name} - Figure từ Honkai Impact 3rd với thiết kế động tác ấn tượng.`,
      'Zenless': `${name} - Nhân vật từ Zenless Zone Zero với thiết kế độc đáo.`,
      'Default': `${name} - Sản phẩm figure chất lượng cao.`
    };

    return descriptions[category] || descriptions['Default'];
  };

  // Dữ liệu mẫu
  const sampleProducts = [
    { 
      category: "Nendoroid", 
      name: "Raiden Shogun Nendoroid", 
      price: "950000", 
      imageUri: "",
      imageUrl: "",
      description: "Raiden Shogun Nendoroid từ Genshin Impact"
    },
    // ... các sản phẩm mẫu khác (giữ nguyên)
  ];

  const loadSampleData = () => {
    setProducts(sampleProducts);
    Alert.alert("Thành công", `Đã tải ${sampleProducts.length} sản phẩm mẫu!`);
  };

  const clearAllFields = () => {
    setProducts([{ category: "", name: "", price: "", imageUri: "", imageUrl: "", description: "" }]);
  };

  // Tự động điền mô tả
  const autoFillDescription = (index: number) => {
    const product = products[index];
    if (product.category && product.name && !product.description) {
      const description = generateDefaultDescription(product.name, product.category);
      updateProduct(index, "description", description);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📸 Thêm sản phẩm với ảnh</Text>
      
      <View style={styles.instructionBox}>
        <Text style={styles.instructionText}>
          📱 <Text style={styles.instructionBold}>Chức năng mới:</Text> Chọn ảnh từ thư viện hoặc chụp ảnh trực tiếp!
        </Text>
      </View>

      {products.map((product, index) => (
        <View key={index} style={styles.productCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.cardTitle}>Sản phẩm #{index + 1}</Text>
              {product.category && (
                <View style={[
                  styles.categoryTag,
                  { backgroundColor: getCategoryColor(product.category) }
                ]}>
                  <Text style={styles.categoryTagText}>{product.category}</Text>
                </View>
              )}
            </View>
            {products.length > 1 && (
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => removeProduct(index)}
              >
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <TextInput
            style={styles.input}
            placeholder="Danh mục * (Gundam, Genshin, Nendoroid...)"
            placeholderTextColor="#999"
            value={product.category}
            onChangeText={(text) => {
              updateProduct(index, "category", text);
              setTimeout(() => autoFillDescription(index), 300);
            }}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Tên sản phẩm *"
            placeholderTextColor="#999"
            value={product.name}
            onChangeText={(text) => {
              updateProduct(index, "name", text);
              setTimeout(() => autoFillDescription(index), 300);
            }}
          />
          
          <View style={styles.priceRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Giá (VD: 1200000) *"
              placeholderTextColor="#999"
              value={product.price}
              onChangeText={(text) => updateProduct(index, "price", text)}
              keyboardType="numeric"
            />
            {product.price && (
              <View style={styles.pricePreview}>
                <Text style={styles.pricePreviewText}>
                  {formatPrice(product.price)}
                </Text>
              </View>
            )}
          </View>
          
          {/* PHẦN HÌNH ẢNH MỚI */}
          <View style={styles.imageSection}>
            <View style={styles.imageSectionHeader}>
              <Text style={styles.sectionLabel}>Hình ảnh sản phẩm:</Text>
              {uploadingImage === index && (
                <ActivityIndicator size="small" color="#1a73e8" />
              )}
            </View>
            
            {product.imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image 
                  source={{ uri: product.imageUri }} 
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
                <View style={styles.imageActions}>
                  <TouchableOpacity 
                    style={[styles.imageActionButton, styles.changeButton]}
                    onPress={() => pickImageFromGallery(index)}
                  >
                    <IconSymbol name="photo" size={16} color="white" />
                    <Text style={styles.imageActionText}>Đổi ảnh</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.imageActionButton, styles.removeImageButton]}
                    onPress={() => removeSelectedImage(index)}
                  >
                    <IconSymbol name="trash" size={16} color="white" />
                    <Text style={styles.imageActionText}>Xóa</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.imageNote}>
                  ✅ Đã chọn ảnh từ thiết bị
                </Text>
              </View>
            ) : product.imageUrl ? (
              <View style={styles.urlImageContainer}>
                <View style={styles.urlImagePreview}>
                  <IconSymbol name="link" size={24} color="#4CAF50" />
                  <Text style={styles.urlImageText}>Đang sử dụng URL ảnh</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.urlInput]}
                  placeholder="URL hình ảnh"
                  placeholderTextColor="#999"
                  value={product.imageUrl}
                  onChangeText={(text) => updateProduct(index, "imageUrl", text)}
                />
              </View>
            ) : (
              <View style={styles.imagePickerContainer}>
                <Text style={styles.imagePickerTitle}>Chọn nguồn ảnh:</Text>
                <View style={styles.imagePickerButtons}>
                  <TouchableOpacity 
                    style={[styles.imagePickerButton, styles.galleryButton]}
                    onPress={() => pickImageFromGallery(index)}
                    disabled={uploadingImage !== null}
                  >
                    <IconSymbol name="photo.on.rectangle" size={20} color="white" />
                    <Text style={styles.imagePickerButtonText}>Thư viện</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.imagePickerButton, styles.cameraButton]}
                    onPress={() => takePhoto(index)}
                    disabled={uploadingImage !== null}
                  >
                    <IconSymbol name="camera" size={20} color="white" />
                    <Text style={styles.imagePickerButtonText}>Camera</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.imagePickerButton, styles.urlButton]}
                    onPress={() => {
                      updateProduct(index, "imageUrl", "");
                      updateProduct(index, "imageUri", "");
                    }}
                    disabled={uploadingImage !== null}
                  >
                    <IconSymbol name="link" size={20} color="white" />
                    <Text style={styles.imagePickerButtonText}>URL</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.imageHint}>
                  💡 Chọn từ thư viện, chụp mới, hoặc nhập URL
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.descriptionContainer}>
            <View style={styles.descriptionHeader}>
              <Text style={styles.descriptionLabel}>Mô tả sản phẩm:</Text>
              {!product.description && product.category && product.name && (
                <TouchableOpacity 
                  style={styles.autoFillButtonSmall}
                  onPress={() => autoFillDescription(index)}
                >
                  <Text style={styles.autoFillButtonTextSmall}>
                    ✨ Tự động tạo
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder="Nhập mô tả chi tiết..."
              placeholderTextColor="#999"
              value={product.description}
              onChangeText={(text) => updateProduct(index, "description", text)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {product.description && (
              <Text style={styles.charCount}>
                {product.description.length} ký tự
              </Text>
            )}
          </View>
        </View>
      ))}

      <TouchableOpacity 
        style={styles.addButton} 
        onPress={addProductField}
        disabled={loading}
      >
        <Text style={styles.addButtonText}>+ Thêm sản phẩm khác</Text>
      </TouchableOpacity>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryText}>
          📊 Tổng số sản phẩm: <Text style={styles.summaryNumber}>{products.length}</Text>
        </Text>
        <Text style={styles.summarySubText}>
          Sản phẩm có ảnh: {
            products.filter(p => p.imageUri || p.imageUrl).length
          } / {products.length}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, (loading || uploadingImage !== null) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading || uploadingImage !== null}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="white" size="small" />
            <Text style={styles.loadingText}>
              {uploadingImage !== null 
                ? `Đang xử lý ảnh...`
                : "Đang thêm sản phẩm..."}
            </Text>
          </View>
        ) : (
          <Text style={styles.submitButtonText}>
            📤 Thêm {products.filter(p => p.category.trim() && p.name.trim() && p.price.trim()).length} sản phẩm
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ------------------ HELPER FUNCTIONS ------------------ */
// Hàm format giá tiền
const formatPrice = (price: string): string => {
  const numPrice = Number(price.replace(/\D/g, ""));
  if (!isNaN(numPrice)) {
    return numPrice.toLocaleString('vi-VN') + 'đ';
  }
  return '0đ';
};

// Hàm lấy màu theo danh mục
const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    'Nendoroid': '#FF6B6B',
    'Gundam': '#4ECDC4',
    'Genshin': '#FFD166',
    'Honkai': '#A78BFA',
    'Zenless': '#F472B6',
    'Default': '#90BE6D'
  };
  return colors[category] || colors['Default'];
};

/* ------------------ STYLE ------------------ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  instructionBox: {
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  instructionText: {
    fontSize: 14,
    color: "#1565C0",
    lineHeight: 20,
  },
  instructionBold: {
    fontWeight: "bold",
  },
  productCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryTagText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ffebee",
    justifyContent: "center",
    alignItems: "center",
  },
  removeText: {
    color: "#d32f2f",
    fontSize: 16,
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#f9f9f9",
    fontSize: 14,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pricePreview: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#e8f5e9",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#c8e6c9",
  },
  pricePreviewText: {
    color: "#2e7d32",
    fontWeight: "600",
    fontSize: 12,
  },
  // Image Section Styles
  imageSection: {
    marginBottom: 15,
  },
  imageSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  imagePreviewContainer: {
    alignItems: "center",
  },
  imagePreview: {
    width: 150,
    height: 150,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  imageActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  imageActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  changeButton: {
    backgroundColor: "#2196F3",
  },
  removeImageButton: {
    backgroundColor: "#F44336",
  },
  imageActionText: {
    color: "white",
    fontWeight: "600",
    fontSize: 12,
  },
  imageNote: {
    fontSize: 12,
    color: "#4CAF50",
    fontStyle: "italic",
  },
  urlImageContainer: {
    backgroundColor: "#f0f9ff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  urlImagePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  urlImageText: {
    color: "#0369a1",
    fontWeight: "600",
    fontSize: 14,
  },
  urlInput: {
    backgroundColor: "white",
  },
  imagePickerContainer: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  imagePickerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  imagePickerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  imagePickerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 12,
    borderRadius: 8,
  },
  galleryButton: {
    backgroundColor: "#4CAF50",
  },
  cameraButton: {
    backgroundColor: "#2196F3",
  },
  urlButton: {
    backgroundColor: "#FF9800",
  },
  imagePickerButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 12,
  },
  imageHint: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
  },
  descriptionContainer: {
    marginTop: 5,
  },
  descriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  autoFillButtonSmall: {
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#c8e6c9",
  },
  autoFillButtonTextSmall: {
    color: "#2e7d32",
    fontSize: 10,
    fontWeight: "600",
  },
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  charCount: {
    textAlign: "right",
    fontSize: 11,
    color: "#999",
    marginTop: 4,
  },
  addButton: {
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: "center",
  },
  addButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  summaryBox: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  summaryText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 5,
  },
  summaryNumber: {
    fontWeight: "bold",
    color: "#2196F3",
  },
  summarySubText: {
    fontSize: 14,
    color: "#666",
  },
  submitButton: {
    backgroundColor: "#FF9800",
    padding: 16,
    borderRadius: 8,
    marginBottom: 30,
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    color: "white",
    fontWeight: "600",
    marginLeft: 10,
  },
  submitButtonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
  },
});