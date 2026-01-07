// app/(admin)/edit-product/[id].tsx
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useEffect, useState } from "react";
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
import { db, storage } from "../constants/firebase";

interface Product {
  category: string;
  name: string;
  price: number;
  image: string;
  description: string;
}

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUri, setImageUri] = useState<string>("");

  /* ---------- LOAD PRODUCT ---------- */
  useEffect(() => {
    if (!id) return;

    const loadProduct = async () => {
      try {
        const refDoc = doc(db, "products", id);
        const snap = await getDoc(refDoc);

        if (!snap.exists()) {
          Alert.alert("Lỗi", "Sản phẩm không tồn tại");
          router.back();
          return;
        }

        setProduct(snap.data() as Product);
      } catch (err) {
        console.error(err);
        Alert.alert("Lỗi", "Không thể tải sản phẩm");
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  /* ---------- PICK IMAGE ---------- */
  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Cần quyền truy cập thư viện ảnh");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!res.canceled && res.assets[0]) {
      setImageUri(res.assets[0].uri);
    }
  };

  const removeImage = () => setImageUri("");

  /* ---------- SAVE ---------- */
  const handleUpdate = async () => {
    if (!product) return;
    if (!product.category || !product.name || !product.price) {
      Alert.alert("Thiếu thông tin");
      return;
    }

    setSaving(true);
    try {
      let finalImage = product.image;

      // Upload ảnh nếu user chọn ảnh mới
      if (imageUri) {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const storageRef = ref(storage, `products/${id}`);
        await uploadBytes(storageRef, blob);
        finalImage = await getDownloadURL(storageRef);
      }

      await updateDoc(doc(db, "products", id!), {
        category: product.category.trim(),
        name: product.name.trim(),
        price: Number(product.price),
        image: finalImage,
        description: product.description,
        updatedAt: new Date(),
      });

      Alert.alert("✅ Thành công", "Đã cập nhật sản phẩm");
      router.back();
    } catch (err) {
      console.error(err);
      Alert.alert("Lỗi", "Không thể cập nhật sản phẩm");
    } finally {
      setSaving(false);
    }
  };

  /* ================= UI ================= */
  if (loading || !product) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>✏️ Chỉnh sửa sản phẩm</Text>

      <TextInput
        style={styles.input}
        placeholder="Danh mục"
        value={product.category}
        onChangeText={(v) => setProduct({ ...product, category: v })}
      />

      <TextInput
        style={styles.input}
        placeholder="Tên sản phẩm"
        value={product.name}
        onChangeText={(v) => setProduct({ ...product, name: v })}
      />

      <TextInput
        style={styles.input}
        placeholder="Giá"
        keyboardType="numeric"
        value={product.price.toString()}
        onChangeText={(v) =>
          setProduct({ ...product, price: Number(v.replace(/\D/g, "")) })
        }
      />

      {/* IMAGE */}
      <View style={styles.imageBox}>
        {imageUri || product.image ? (
          <>
            <Image
              source={{ uri: imageUri || product.image }}
              style={styles.image}
            />
            <TouchableOpacity style={styles.removeBtn} onPress={removeImage}>
              <IconSymbol name="trash" size={16} color="white" />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.pickBtn} onPress={pickImage}>
            <Text>📸 Chọn ảnh</Text>
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        style={[styles.input, styles.desc]}
        placeholder="Mô tả"
        multiline
        value={product.description}
        onChangeText={(v) => setProduct({ ...product, description: v })}
      />

      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        onPress={handleUpdate}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.saveText}>💾 Cập nhật sản phẩm</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 12, textAlign: "center" },
  input: { backgroundColor: "white", borderRadius: 8, padding: 12, marginBottom: 10 },
  desc: { minHeight: 80, textAlignVertical: "top" },
  imageBox: { height: 180, backgroundColor: "#eee", borderRadius: 10, marginBottom: 12, justifyContent: "center", alignItems: "center" },
  image: { width: "100%", height: "100%", borderRadius: 10 },
  pickBtn: { padding: 12, backgroundColor: "#ddd", borderRadius: 6 },
  removeBtn: { position: "absolute", top: 10, right: 10, backgroundColor: "red", padding: 6, borderRadius: 20 },
  saveBtn: { backgroundColor: "#2196F3", padding: 16, borderRadius: 10, alignItems: "center", marginTop: 10 },
  saveText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
